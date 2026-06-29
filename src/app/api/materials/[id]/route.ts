import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { materialFormSchema } from "@/lib/validators";
import { validateBody } from "@/lib/api-utils";
import { generateMaterialId } from "@/lib/material-id";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch material and audit logs in parallel (fix N+1)
    const [material, auditLogs] = await Promise.all([
      prisma.material.findUnique({
        where: { id },
        include: {
          materialUsage: {
            include: { case: true },
            orderBy: { usageDate: "desc" },
          },
          stockTransactions: {
            orderBy: { transactionDate: "desc" },
          },
        },
      }),
      prisma.auditLog.findMany({
        where: { entityId: id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!material) {
      return NextResponse.json(
        { success: false, error: "Material not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...material, auditLogs },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch material" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = await validateBody(request, materialFormSchema.partial());
    if (!parsed.success) return parsed.response;
    const raw = parsed.data as Record<string, unknown>;

    const existing = await prisma.material.findUnique({ where: { id } });

    // Build update data from request body
    const data: Record<string, unknown> = {};
    const textFields = ["category","materialName","productCode","materialId","brand","materialType","compatiblePrinter","colour","batchNumber","supplier","unit","storageLocation","status","remarks"];
    const numFields = ["diameter","reorderThreshold","initialQuantity","unusedQuantity","openedQuantity","expiredQuantity"];
    const dateFields = ["purchaseDate","receivedDate","openDate","expiryDate","disposalDate","manufacturingDate"];

    for (const f of textFields) {
      if (raw[f] !== undefined) data[f] = raw[f] === "" ? null : (raw[f] || null);
    }
    for (const f of numFields) {
      if (raw[f] !== undefined) data[f] = (raw[f] === "" || raw[f] === null) ? null : Number(raw[f]);
    }
    for (const f of dateFields) {
      if (raw[f] !== undefined) data[f] = raw[f] ? new Date(raw[f] as string) : null;
    }
    // Auto-generate materialId if empty (both existing and requested are blank)
    const existingMaterialId = existing?.materialId || "";
    const requestedMaterialId = data["materialId"] as string | undefined;
    if (!existingMaterialId && !requestedMaterialId) {
      const mergedData = { ...existing, ...data, category: data["category"] || existing?.category };
      const generated = await generateMaterialId(mergedData as Record<string, unknown>);
      if (generated) data["materialId"] = generated;
    }

    // Tank: always quantity 1
    const cat = (data["category"] as string) || existing?.category || "";
    if (cat === "Resin Tanks") {
      data["initialQuantity"] = 1;
      data["currentQuantity"] = 1;
      data["unusedQuantity"] = 0;
      data["openedQuantity"] = 0;
      data["expiredQuantity"] = 0;
      data["unit"] = "unit";
    }

    // Remain = Weight − Used (match Excel formula, keep existing opened/expired)
    const w = (data["initialQuantity"] !== undefined ? Number(data["initialQuantity"]) : (existing?.initialQuantity ?? 0)) as number;
    const u = (data["unusedQuantity"] !== undefined ? Number(data["unusedQuantity"]) : (existing?.unusedQuantity ?? 0)) as number;
    const o = (data["openedQuantity"] !== undefined ? Number(data["openedQuantity"]) : (existing?.openedQuantity ?? 0)) as number;
    const e = (data["expiredQuantity"] !== undefined ? Number(data["expiredQuantity"]) : (existing?.expiredQuantity ?? 0)) as number;
    data["currentQuantity"] = Math.max(0, w - u - o - e);

    const updated = await prisma.material.update({
      where: { id },
      data,
    });

    // Create stock transaction if quantity changed
    const newQty = data["currentQuantity"] as number;
    if (existing && existing.currentQuantity !== newQty) {
      const diff = newQty - existing.currentQuantity;
      await prisma.stockTransaction.create({
        data: {
          materialId: id,
          transactionType: "Adjustment",
          quantityChange: diff,
          quantityAfter: newQty,
          transactionDate: new Date(),
          staffName: (raw.staffName as string) || "System",
          notes: `Manual quantity adjustment`,
        },
      });
    }

    await createAuditLog({
      entityType: "Material",
      entityId: id,
      action: "material_updated",
      staffName: (raw.staffName as string) || "System",
      details: `Material ${raw.materialName} updated`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to update material" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const material = await prisma.material.findUnique({ where: { id } });
    if (!material) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    // Delete related records first (FK constraints)
    await prisma.stockTransaction.deleteMany({ where: { materialId: id } });
    await prisma.caseMaterialUsage.deleteMany({ where: { materialId: id } });
    await prisma.material.delete({ where: { id } });

    await createAuditLog({
      entityType: "Material",
      entityId: id,
      action: "material_deleted",
      staffName: "System",
      details: `Material ${material?.materialName} deleted`,
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to delete material" },
      { status: 500 }
    );
  }
}
