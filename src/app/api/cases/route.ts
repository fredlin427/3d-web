import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { DEFAULT_PROGRESS_STEPS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const department = searchParams.get("department") || "";
    const category = searchParams.get("category") || "";
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
    if (category) where.category = category;
    if (status) where.currentStatus = status;
    if (priority) where.priority = priority;
    if (dateFrom || dateTo) {
      where.applicationDate = {};
      if (dateFrom) (where.applicationDate as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.applicationDate as Record<string, unknown>).lte = new Date(dateTo);
    }

    const cases = await prisma.case.findMany({
      where,
      include: { _count: { select: { progressSteps: true, materialUsage: true } } },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: cases });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Failed to fetch cases" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Generate sequential case number if not provided
    let caseNumber = body.caseNumber;
    if (!caseNumber) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const fyEnd = month >= 4 ? (year + 1) % 100 : year % 100;
      const fyStart = fyEnd - 1;
      const fy = `${String(fyStart).padStart(2, "0")}${String(fyEnd).padStart(2, "0")}`;
      const prefix = `QEH3D-${fy}-`;
      const lastCase = await prisma.case.findFirst({
        where: { caseNumber: { startsWith: prefix } },
        orderBy: { caseNumber: "desc" },
        select: { caseNumber: true },
      });
      let nextNum = 1;
      if (lastCase) {
        const lastNum = parseInt(lastCase.caseNumber.split("-").pop() || "0", 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
      }
      caseNumber = `${prefix}${String(nextNum).padStart(3, "0")}`;
    }

    const newCase = await prisma.case.create({
      data: {
        caseNumber,
        applicationDate: new Date(body.applicationDate),
        expectedCompletionDate: body.expectedCompletionDate ? new Date(body.expectedCompletionDate) : null,
        approvalDate: body.approvalDate ? new Date(body.approvalDate) : null,
        completionDate: body.completionDate ? new Date(body.completionDate) : null,
        ownership: body.ownership || null,
        department: body.department,
        hospital: body.hospital || "QEH",
        applicantName: body.applicantName,
        contact: body.contact || null,
        rank: body.rank || null,
        category: body.category,
        purpose: body.purpose,
        specification: body.specification || null,
        projectTitle: body.projectTitle,
        description: body.description || null,
        modelType: body.modelType || null,
        requiredService: body.requiredService || null,
        serviceRequirements: body.serviceRequirements || null,
        requiresSterilization: body.requiresSterilization || null,
        quantity: body.quantity || 1,
        totalComponents: body.totalComponents || 1,
        priority: body.priority || "Routine",
        currentStatus: body.currentStatus || "Draft",
        technician: body.technician || null,
        printingParty: body.printingParty || null,
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
    return NextResponse.json({ success: false, error: "Failed to create case" }, { status: 500 });
  }
}
