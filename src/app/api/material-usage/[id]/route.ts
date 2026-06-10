import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.caseMaterialUsage.findUnique({
      where: { id },
      include: { material: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Material usage record not found" },
        { status: 404 }
      );
    }

    // Calculate quantity difference
    const quantityDiff = body.quantityUsed - existing.quantityUsed;

    // Update material quantity if changed
    if (quantityDiff !== 0) {
      const newMaterialQty = existing.material.currentQuantity - quantityDiff;

      if (newMaterialQty < 0) {
        return NextResponse.json(
          { success: false, error: "Insufficient quantity for this adjustment" },
          { status: 400 }
        );
      }

      await prisma.material.update({
        where: { id: existing.materialId },
        data: { currentQuantity: newMaterialQty },
      });

      // Create adjustment transaction
      await prisma.stockTransaction.create({
        data: {
          materialId: existing.materialId,
          transactionType: "Adjustment",
          quantityChange: -quantityDiff,
          quantityAfter: newMaterialQty,
          relatedCaseId: existing.caseId,
          transactionDate: new Date(),
          staffName: body.staffName || "System",
          notes: `Material usage record adjusted`,
        },
      });
    }

    const updated = await prisma.caseMaterialUsage.update({
      where: { id },
      data: {
        usageDate: new Date(body.usageDate),
        quantityUsed: body.quantityUsed,
        unit: body.unit || existing.unit,
        staffName: body.staffName || null,
        printerOrTank: body.printerOrTank || null,
        notes: body.notes || null,
      },
    });

    await createAuditLog({
      entityType: "CaseMaterialUsage",
      entityId: existing.caseId,
      action: "material_usage_edited",
      staffName: body.staffName || "System",
      details: `Material usage record updated`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to update material usage" },
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

    const existing = await prisma.caseMaterialUsage.findUnique({
      where: { id },
      include: { material: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Material usage record not found" },
        { status: 404 }
      );
    }

    // Return quantity to material
    const newQuantity = existing.material.currentQuantity + existing.quantityUsed;
    await prisma.material.update({
      where: { id: existing.materialId },
      data: { currentQuantity: newQuantity },
    });

    // Create adjustment transaction
    await prisma.stockTransaction.create({
      data: {
        materialId: existing.materialId,
        transactionType: "Adjustment",
        quantityChange: existing.quantityUsed,
        quantityAfter: newQuantity,
        relatedCaseId: existing.caseId,
        transactionDate: new Date(),
        staffName: "System",
        notes: "Material usage record deleted — quantity returned",
      },
    });

    await prisma.caseMaterialUsage.delete({ where: { id } });

    await createAuditLog({
      entityType: "CaseMaterialUsage",
      entityId: existing.caseId,
      action: "material_usage_deleted",
      staffName: "System",
      details: `Material usage record deleted, quantity returned to stock`,
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete material usage" },
      { status: 500 }
    );
  }
}
