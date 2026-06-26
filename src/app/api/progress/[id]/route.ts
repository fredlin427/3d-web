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

    const step = await prisma.caseProgressStep.update({
      where: { id },
      data: {
        stepName: body.stepName,
        stepOrder: body.stepOrder,
        status: body.status,
        completedDate: body.completedDate ? new Date(body.completedDate) : null,
        staffName: body.staffName || null,
        notes: body.notes || null,
      },
    });

    // Update case's current progress step
    if (body.status === "Completed" || body.status === "In progress") {
      await prisma.case.update({
        where: { id: step.caseId },
        data: { currentProgressStep: body.stepName },
      });
    }

    await createAuditLog({
      entityType: "CaseProgressStep",
      entityId: step.caseId,
      action: "progress_updated",
      staffName: body.staffName || "System",
      details: `Progress step "${body.stepName}" updated to ${body.status}`,
    });

    return NextResponse.json({ success: true, data: step });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to update progress step" },
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
    const step = await prisma.caseProgressStep.findUnique({ where: { id } });

    await prisma.caseProgressStep.delete({ where: { id } });

    if (step) {
      await createAuditLog({
        entityType: "CaseProgressStep",
        entityId: step.caseId,
        action: "progress_updated",
        staffName: "System",
        details: `Progress step "${step.stepName}" deleted`,
      });
    }

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to delete progress step" },
      { status: 500 }
    );
  }
}
