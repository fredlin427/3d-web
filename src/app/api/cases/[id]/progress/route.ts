import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

// GET: List progress steps for a case
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;
    const steps = await prisma.caseProgressStep.findMany({
      where: { caseId },
      orderBy: { stepOrder: "asc" },
    });

    return NextResponse.json({ success: true, data: steps });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch progress steps" },
      { status: 500 }
    );
  }
}

// POST: Add a progress step to a case
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;
    const body = await request.json();

    const step = await prisma.caseProgressStep.create({
      data: {
        caseId,
        stepName: body.stepName,
        stepOrder: body.stepOrder ?? 0,
        status: body.status || "Not started",
        completedDate: body.completedDate ? new Date(body.completedDate) : null,
        staffName: body.staffName || null,
        notes: body.notes || null,
      },
    });

    if (body.status === "Completed" || body.status === "In progress") {
      await prisma.case.update({
        where: { id: caseId },
        data: { currentProgressStep: body.stepName },
      });
    }

    await createAuditLog({
      entityType: "CaseProgressStep",
      entityId: caseId,
      action: "progress_updated",
      staffName: body.staffName || "System",
      details: `Progress step "${body.stepName}" added`,
    });

    return NextResponse.json({ success: true, data: step }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to create progress step" },
      { status: 500 }
    );
  }
}
