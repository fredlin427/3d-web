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

    // Preserve existing values for fields not rendered in the current category form
    const initQty = body.initialQuantity !== undefined ? body.initialQuantity : (existing?.initialQuantity ?? 0);
    const unusedQty = body.unusedQuantity !== undefined ? body.unusedQuantity : (existing?.unusedQuantity ?? 0);
    const openedQty = body.openedQuantity !== undefined ? body.openedQuantity : (existing?.openedQuantity ?? 0);
    const expiredQty = body.expiredQuantity !== undefined ? body.expiredQuantity : (existing?.expiredQuantity ?? 0);

    const updated = await prisma.material.update({
      where: { id },
      data: {
        category: body.category !== undefined ? body.category : existing?.category,
        materialName: body.materialName !== undefined ? body.materialName : existing?.materialName,
        productCode: body.productCode !== undefined ? (body.productCode || null) : existing?.productCode,
        materialId: body.materialId !== undefined ? (body.materialId || null) : existing?.materialId,
        brand: body.brand !== undefined ? (body.brand || null) : existing?.brand,
        materialType: body.materialType !== undefined ? (body.materialType || null) : existing?.materialType,
        compatiblePrinter: body.compatiblePrinter !== undefined ? (body.compatiblePrinter || null) : existing?.compatiblePrinter,
        colour: body.colour !== undefined ? (body.colour || null) : existing?.colour,
        diameter: body.diameter !== undefined ? (body.diameter || null) : existing?.diameter,
        batchNumber: body.batchNumber !== undefined ? (body.batchNumber || null) : existing?.batchNumber,
        supplier: body.supplier !== undefined ? (body.supplier || null) : existing?.supplier,
        purchaseDate: body.purchaseDate !== undefined ? (body.purchaseDate ? new Date(body.purchaseDate) : null) : existing?.purchaseDate,
        receivedDate: body.receivedDate !== undefined ? (body.receivedDate ? new Date(body.receivedDate) : null) : existing?.receivedDate,
        openDate: body.openDate !== undefined ? (body.openDate ? new Date(body.openDate) : null) : existing?.openDate,
        expiryDate: body.expiryDate !== undefined ? (body.expiryDate ? new Date(body.expiryDate) : null) : existing?.expiryDate,
        disposalDate: body.disposalDate !== undefined ? (body.disposalDate ? new Date(body.disposalDate) : null) : existing?.disposalDate,
        manufacturingDate: body.manufacturingDate !== undefined ? (body.manufacturingDate ? new Date(body.manufacturingDate) : null) : existing?.manufacturingDate,
        initialQuantity: initQty,
        unusedQuantity: unusedQty,
        openedQuantity: openedQty,
        expiredQuantity: expiredQty,
        // Auto-calculate: remain = weight - used - opened - expired
        currentQuantity: initQty - unusedQty - openedQty - expiredQty,
        unit: body.unit !== undefined ? body.unit : existing?.unit,
        reorderThreshold: body.reorderThreshold !== undefined ? (body.reorderThreshold ?? 0) : existing?.reorderThreshold,
        storageLocation: body.storageLocation !== undefined ? (body.storageLocation || null) : existing?.storageLocation,
        status: body.status !== undefined ? body.status : existing?.status,
        remarks: body.remarks !== undefined ? (body.remarks || null) : existing?.remarks,
      },
    });

    // Create stock transaction if quantity changed
    const newCurrentQty = initQty - unusedQty - openedQty - expiredQty;
    if (existing && existing.currentQuantity !== newCurrentQty) {
      const diff = newCurrentQty - existing.currentQuantity;
      await prisma.stockTransaction.create({
        data: {
          materialId: id,
          transactionType: "Adjustment",
          quantityChange: diff,
          quantityAfter: newCurrentQty,
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
