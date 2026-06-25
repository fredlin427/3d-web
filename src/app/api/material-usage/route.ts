import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { materialUsageFormSchema } from "@/lib/validators";
import { validateBody } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const parsed = await validateBody(request, materialUsageFormSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;

    // Wrap in transaction to prevent race condition on quantity
    const usage = await prisma.$transaction(async (tx) => {
      const material = await tx.material.findUnique({
        where: { id: body.materialId },
      });

      if (!material) throw new Error("Material not found");
      if (material.currentQuantity < body.quantityUsed) {
        throw new Error(`Insufficient quantity. Available: ${material.currentQuantity} ${material.unit}`);
      }

      const record = await tx.caseMaterialUsage.create({
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

      const newQuantity = material.currentQuantity - body.quantityUsed;
      const newUsed = (material.unusedQuantity || 0) + body.quantityUsed;
      await tx.material.update({
        where: { id: material.id },
        data: {
          currentQuantity: newQuantity,
          unusedQuantity: newUsed,
          status: newQuantity <= material.reorderThreshold && material.reorderThreshold > 0
            ? "Low stock"
            : material.status,
        },
      });

      await tx.stockTransaction.create({
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

      await tx.case.update({
        where: { id: body.caseId },
        data: { updatedAt: new Date() },
      });

      return { record, material };
    });

    await createAuditLog({
      entityType: "CaseMaterialUsage",
      entityId: body.caseId,
      action: "material_usage_added",
      staffName: body.staffName || "System",
      details: `${body.quantityUsed} ${body.unit} of ${usage.material.materialName} used`,
    });

    return NextResponse.json({ success: true, data: usage.record }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to record material usage";
    if (msg.startsWith("Insufficient") || msg === "Material not found") {
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
