import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { generateCaseNumber } from "@/lib/utils";
import { DEFAULT_PROGRESS_STEPS } from "@/lib/constants";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const original = await prisma.case.findUnique({
      where: { id },
      include: { progressSteps: false, materialUsage: false },
    });

    if (!original) {
      return NextResponse.json(
        { success: false, error: "Original case not found" },
        { status: 404 }
      );
    }

    const newCaseNumber = generateCaseNumber();

    const duplicated = await prisma.case.create({
      data: {
        caseNumber: newCaseNumber,
        applicationDate: new Date(),
        department: original.department,
        applicantName: original.applicantName,
        contact: original.contact,
        useType: original.useType,
        projectTitle: `${original.projectTitle} (Copy)`,
        description: original.description,
        clinicalPurpose: original.clinicalPurpose,
        priority: original.priority,
        requiredDate: null,
        currentStatus: "Draft",
        modelImageUrl: null,
        photoFolderUrl: null,
        remarks: original.remarks,
      },
    });

    // Create default progress steps for duplicated case
    const activeSteps = await prisma.setting.findMany({
      where: { type: "progress_step", isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    const stepsToCreate: { value: string; sortOrder: number }[] = activeSteps.length > 0
      ? activeSteps.map((s) => ({ value: s.value, sortOrder: s.sortOrder }))
      : DEFAULT_PROGRESS_STEPS.map((step, i) => ({ value: step, sortOrder: i + 1 }));

    await prisma.caseProgressStep.createMany({
      data: stepsToCreate.map((step, i) => ({
        caseId: duplicated.id,
        stepName: step.value,
        stepOrder: step.sortOrder ?? i + 1,
        status: "Not started",
      })),
    });

    await createAuditLog({
      entityType: "Case",
      entityId: duplicated.id,
      action: "case_duplicated",
      staffName: body.staffName || "System",
      details: `Case duplicated from ${original.caseNumber} to ${newCaseNumber}`,
    });

    return NextResponse.json({ success: true, data: duplicated }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to duplicate case" },
      { status: 500 }
    );
  }
}
