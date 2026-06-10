import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify material exists and has enough quantity
    const material = await prisma.material.findUnique({
      where: { id: body.materialId },
    });

    if (!material) {
      return NextResponse.json(
        { success: false, error: "Material not found" },
        { status: 404 }
      );
    }

    if (material.currentQuantity < body.quantityUsed) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient quantity. Available: ${material.currentQuantity} ${material.unit}`,
        },
        { status: 400 }
      );
    }

    // Create material usage record
    const usage = await prisma.caseMaterialUsage.create({
      data: {
        caseId: body.caseId,
        materialId: body.materialId,
        usageDate: new Date(body.usageDate),
        quantityUsed: body.quantityUsed,
        unit: body.unit || material.unit,
        staffName: body.staffName || null,
        printerOrTank: body.printerOrTank || null,
        notes: body.notes || null,
      },
    });

    // Reduce material quantity
    const newQuantity = material.currentQuantity - body.quantityUsed;
    await prisma.material.update({
      where: { id: material.id },
      data: {
        currentQuantity: newQuantity,
        status: newQuantity <= material.reorderThreshold && material.reorderThreshold > 0
          ? "Low stock"
          : material.status,
      },
    });

    // Create stock transaction
    await prisma.stockTransaction.create({
      data: {
        materialId: material.id,
        transactionType: "Usage",
        quantityChange: -body.quantityUsed,
        quantityAfter: newQuantity,
        relatedCaseId: body.caseId,
        transactionDate: new Date(body.usageDate),
        staffName: body.staffName || null,
        notes: `Used for case: ${body.caseId}`,
      },
    });

    // Update case's materialUsage relation
    await prisma.case.update({
      where: { id: body.caseId },
      data: { updatedAt: new Date() },
    });

    await createAuditLog({
      entityType: "CaseMaterialUsage",
      entityId: body.caseId,
      action: "material_usage_added",
      staffName: body.staffName || "System",
      details: `${body.quantityUsed} ${body.unit} of ${material.materialName} used`,
    });

    return NextResponse.json({ success: true, data: usage }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to record material usage" },
      { status: 500 }
    );
  }
}
