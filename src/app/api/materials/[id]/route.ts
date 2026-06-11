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

    const updated = await prisma.material.update({
      where: { id },
      data: {
        category: body.category,
        materialName: body.materialName,
        productCode: body.productCode || null,
        brand: body.brand || null,
        materialType: body.materialType || null,
        compatiblePrinter: body.compatiblePrinter || null,
        colour: body.colour || null,
        diameter: body.diameter || null,
        batchNumber: body.batchNumber || null,
        supplier: body.supplier || null,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        receivedDate: body.receivedDate ? new Date(body.receivedDate) : null,
        openDate: body.openDate ? new Date(body.openDate) : null,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        disposalDate: body.disposalDate ? new Date(body.disposalDate) : null,
        manufacturingDate: body.manufacturingDate ? new Date(body.manufacturingDate) : null,
        initialQuantity: body.initialQuantity,
        currentQuantity: body.currentQuantity,
        unusedQuantity: body.unusedQuantity ?? 0,
        openedQuantity: body.openedQuantity ?? 0,
        expiredQuantity: body.expiredQuantity ?? 0,
        unit: body.unit,
        reorderThreshold: body.reorderThreshold ?? 0,
        storageLocation: body.storageLocation || null,
        status: body.status,
        remarks: body.remarks || null,
      },
    });

    // Create stock transaction if quantity changed
    if (existing && existing.currentQuantity !== body.currentQuantity) {
      const diff = body.currentQuantity - existing.currentQuantity;
      await prisma.stockTransaction.create({
        data: {
          materialId: id,
          transactionType: "Adjustment",
          quantityChange: diff,
          quantityAfter: body.currentQuantity,
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
