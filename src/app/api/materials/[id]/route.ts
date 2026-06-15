import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const material = await prisma.material.findUnique({
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
    });

    if (!material) {
      return NextResponse.json(
        { success: false, error: "Material not found" },
        { status: 404 }
      );
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: { entityId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: { ...material, auditLogs },
    });
  } catch (error) {
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
    const body = await request.json();

    const existing = await prisma.material.findUnique({ where: { id } });

    // Build update data from request body
    const data: Record<string, unknown> = {};
    const textFields = ["category","materialName","productCode","materialId","brand","materialType","compatiblePrinter","colour","batchNumber","supplier","unit","storageLocation","status","remarks"];
    const numFields = ["diameter","reorderThreshold","initialQuantity","unusedQuantity","openedQuantity","expiredQuantity"];
    const dateFields = ["purchaseDate","receivedDate","openDate","expiryDate","disposalDate","manufacturingDate"];

    for (const f of textFields) {
      if (body[f] !== undefined) data[f] = body[f] === "" ? null : (body[f] || null);
    }
    for (const f of numFields) {
      if (body[f] !== undefined) data[f] = (body[f] === "" || body[f] === null) ? null : Number(body[f]);
    }
    for (const f of dateFields) {
      if (body[f] !== undefined) data[f] = body[f] ? new Date(body[f]) : null;
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
          staffName: body.staffName || "System",
          notes: `Manual quantity adjustment`,
        },
      });
    }

    await createAuditLog({
      entityType: "Material",
      entityId: id,
      action: "material_updated",
      staffName: body.staffName || "System",
      details: `Material ${body.materialName} updated`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
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
    return NextResponse.json(
      { success: false, error: "Failed to delete material" },
      { status: 500 }
    );
  }
}
