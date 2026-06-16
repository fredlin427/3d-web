import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { materialFormSchema } from "@/lib/validators";
import { validateBody } from "@/lib/api-utils";
import { generateMaterialId } from "@/lib/material-id";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const status = searchParams.get("status") || "";
    const lowStock = searchParams.get("lowStock") || "";
    const expiring = searchParams.get("expiring") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "0", 10); // 0 = all

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { materialName: { contains: search } },
        { batchNumber: { contains: search } },
        { brand: { contains: search } },
      ];
    }
    if (category) where.category = category;
    if (status) where.status = status;

    if (lowStock === "true") {
      where.status = "Low stock";
    }

    if (expiring === "true") {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      where.expiryDate = { lte: thirtyDaysFromNow };
    }

    const [materials, total] = await Promise.all([
      prisma.material.findMany({
        where,
        include: {
          _count: {
            select: { materialUsage: true, stockTransactions: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        ...(pageSize > 0 ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
      }),
      prisma.material.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: materials,
      pagination: pageSize > 0 ? {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      } : undefined,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch materials" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await validateBody(request, materialFormSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;

    // Auto-generate material ID if empty
    let materialId = body.materialId || null;
    if (!materialId) {
      const generated = await generateMaterialId(body as Record<string, unknown>);
      if (generated) materialId = generated;
    }

    const material = await prisma.material.create({
      data: {
        ...body,
        productCode: body.productCode || null,
        materialId,
        brand: body.brand || null,
        materialType: body.materialType || null,
        compatiblePrinter: body.compatiblePrinter || null,
        colour: body.colour || null,
        diameter: body.diameter || null,
        batchNumber: body.batchNumber || "",
        supplier: body.supplier || null,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        receivedDate: body.receivedDate ? new Date(body.receivedDate) : null,
        openDate: body.openDate ? new Date(body.openDate) : null,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        disposalDate: body.disposalDate ? new Date(body.disposalDate) : null,
        manufacturingDate: body.manufacturingDate ? new Date(body.manufacturingDate) : null,
        initialQuantity: body.initialQuantity ?? 0,
        unusedQuantity: body.unusedQuantity ?? 0,
        openedQuantity: body.openedQuantity ?? 0,
        expiredQuantity: body.expiredQuantity ?? 0,
        currentQuantity: (body.initialQuantity ?? 0) - (body.unusedQuantity ?? 0) - (body.openedQuantity ?? 0) - (body.expiredQuantity ?? 0),
        unit: body.unit || "unit",
        reorderThreshold: body.reorderThreshold ?? 0,
        storageLocation: body.storageLocation || null,
        status: body.status || "In stock",
        remarks: body.remarks || null,
      } as any,
    });

    // Create initial stock transaction
    await prisma.stockTransaction.create({
      data: {
        materialId: material.id,
        transactionType: "Refill",
        quantityChange: material.currentQuantity,
        quantityAfter: material.currentQuantity,
        transactionDate: new Date(),
        staffName: (body as any).staffName || "System",
        notes: "Initial stock added",
      },
    });

    await createAuditLog({
      entityType: "Material",
      entityId: material.id,
      action: "material_created",
      staffName: (body as any).staffName || "System",
      details: `Material ${body.materialName} (${body.batchNumber}) created`,
    });

    return NextResponse.json({ success: true, data: material }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to create material" },
      { status: 500 }
    );
  }
}
