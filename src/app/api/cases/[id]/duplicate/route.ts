import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { DEFAULT_PROGRESS_STEPS } from "@/lib/constants";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const original = await prisma.case.findUnique({ where: { id } });
    if (!original) {
      return NextResponse.json({ success: false, error: "Original case not found" }, { status: 404 });
    }

    // Generate sequential case number
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
    const newCaseNumber = `${prefix}${String(nextNum).padStart(3, "0")}`;
    const duplicated = await prisma.case.create({
      data: {
        caseNumber: newCaseNumber,
        applicationDate: new Date(),
        expectedCompletionDate: null,
        approvalDate: null,
        completionDate: null,
        ownership: original.ownership,
        department: original.department,
        hospital: original.hospital,
        applicantName: original.applicantName,
        contact: original.contact,
        rank: original.rank,
        category: original.category,
        purpose: original.purpose,
        specification: original.specification,
        projectTitle: `${original.projectTitle} (Copy)`,
        description: original.description,
        modelType: original.modelType,
        requiredService: original.requiredService,
        serviceRequirements: original.serviceRequirements,
        requiresSterilization: original.requiresSterilization,
        quantity: original.quantity,
        totalComponents: original.totalComponents,
        priority: original.priority,
        currentStatus: "Draft",
        technician: null,
        printingParty: null,
        modelImageUrl: null,
        photoFolderUrl: null,
        remarks: original.remarks,
      },
    });

    const activeSteps = await prisma.setting.findMany({
      where: { type: "progress_step", isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    const stepsToCreate: { value: string; sortOrder: number }[] = activeSteps.length > 0
      ? activeSteps.map((s) => ({ value: s.value, sortOrder: s.sortOrder }))
      : DEFAULT_PROGRESS_STEPS.map((step, i) => ({ value: step, sortOrder: i + 1 }));

    await prisma.caseProgressStep.createMany({
      data: stepsToCreate.map((step, i) => ({
        caseId: duplicated.id, stepName: step.value, stepOrder: step.sortOrder ?? i + 1, status: "Not started",
      })),
    });

    await createAuditLog({
      entityType: "Case", entityId: duplicated.id, action: "case_duplicated",
      staffName: body.staffName || "System",
      details: `Case duplicated from ${original.caseNumber} to ${newCaseNumber}`,
    });

    return NextResponse.json({ success: true, data: duplicated }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Failed to duplicate case" }, { status: 500 });
  }
}
