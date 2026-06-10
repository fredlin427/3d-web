import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { generateCaseNumber } from "@/lib/utils";
import { DEFAULT_PROGRESS_STEPS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const department = searchParams.get("department") || "";
    const useType = searchParams.get("useType") || "";
    const status = searchParams.get("status") || "";
    const priority = searchParams.get("priority") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { caseNumber: { contains: search } },
        { projectTitle: { contains: search } },
        { applicantName: { contains: search } },
      ];
    }
    if (department) where.department = department;
    if (useType) where.useType = useType;
    if (status) where.currentStatus = status;
    if (priority) where.priority = priority;
    if (dateFrom || dateTo) {
      where.applicationDate = {};
      if (dateFrom) (where.applicationDate as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.applicationDate as Record<string, unknown>).lte = new Date(dateTo);
    }

    const cases = await prisma.case.findMany({
      where,
      include: {
        _count: {
          select: { progressSteps: true, materialUsage: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: cases });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch cases" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Generate case number if not provided
    const caseNumber = body.caseNumber || generateCaseNumber();

    const newCase = await prisma.case.create({
      data: {
        caseNumber,
        applicationDate: new Date(body.applicationDate),
        department: body.department,
        applicantName: body.applicantName,
        contact: body.contact || null,
        useType: body.useType,
        projectTitle: body.projectTitle,
        description: body.description || null,
        clinicalPurpose: body.clinicalPurpose || null,
        priority: body.priority || "Routine",
        requiredDate: body.requiredDate ? new Date(body.requiredDate) : null,
        currentStatus: body.currentStatus || "Draft",
        modelImageUrl: body.modelImageUrl || null,
        photoFolderUrl: body.photoFolderUrl || null,
        remarks: body.remarks || null,
      },
    });

    // Create default progress steps
    const activeSteps = await prisma.setting.findMany({
      where: { type: "progress_step", isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    const stepsToCreate: { value: string; sortOrder: number }[] = activeSteps.length > 0
      ? activeSteps.map((s) => ({ value: s.value, sortOrder: s.sortOrder }))
      : DEFAULT_PROGRESS_STEPS.map((step, i) => ({ value: step, sortOrder: i + 1 }));

    await prisma.caseProgressStep.createMany({
      data: stepsToCreate.map((step, i) => ({
        caseId: newCase.id,
        stepName: step.value,
        stepOrder: step.sortOrder ?? i + 1,
        status: "Not started",
      })),
    });

    // Set first step as current progress
    const firstStep = stepsToCreate[0];
    await prisma.case.update({
      where: { id: newCase.id },
      data: { currentProgressStep: firstStep?.value || DEFAULT_PROGRESS_STEPS[0] },
    });

    await createAuditLog({
      entityType: "Case",
      entityId: newCase.id,
      action: "case_created",
      staffName: body.staffName || "System",
      details: `Case ${caseNumber} created`,
    });

    return NextResponse.json({ success: true, data: newCase }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to create case" },
      { status: 500 }
    );
  }
}
