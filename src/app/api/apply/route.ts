import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { validateBody } from "@/lib/api-utils";
import { caseFormSchema } from "@/lib/validators";
import { DEFAULT_PROGRESS_STEPS } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const parsed = await validateBody(request, caseFormSchema.partial());
    if (!parsed.success) return parsed.response;
    const body = parsed.data as Record<string, any>;

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
    const caseNumber = `${prefix}${String(nextNum).padStart(3, "0")}`;

    const newCase = await prisma.case.create({
      data: {
        caseNumber,
        applicationDate: new Date(),
        expectedCompletionDate: body.expectedCompletionDate ? new Date(body.expectedCompletionDate as string) : null,
        department: body.department || "Other",
        hospital: body.hospital || "QEH",
        applicantName: body.applicantName,
        contact: body.contact || null,
        rank: body.rank || null,
        category: body.category,
        purpose: body.purpose,
        specification: body.specification || null,
        projectTitle: body.projectTitle || `${body.category} - ${body.purpose}`,
        description: body.description || null,
        modelType: body.modelType || null,
        requiredService: body.requiredService || null,
        serviceRequirements: body.serviceRequirements || null,
        requiresSterilization: body.requiresSterilization || null,
        quantity: body.quantity || 1,
        totalComponents: body.totalComponents || 1,
        priority: "Routine",
        currentStatus: "Draft",
        remarks: body.remarks || null,
        // V5 new fields
        telephone: body.telephone || null,
        email: body.email || null,
        signature: body.signature || null,
        signatureDate: body.signatureDate ? new Date(body.signatureDate as string) : null,
        modelMaterial: body.modelMaterial || null,
        colourRequirement: body.colourRequirement || null,
        copyrightRisk: body.copyrightRisk === true,
        copyrightDetails: body.copyrightDetails || null,
        isReprint: body.isReprint === true,
        fundingSource: body.fundingSource || null,
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
        caseId: newCase.id, stepName: step.value, stepOrder: step.sortOrder ?? i + 1, status: "Not started",
      })),
    });
    await prisma.case.update({
      where: { id: newCase.id },
      data: { currentProgressStep: stepsToCreate[0]?.value || DEFAULT_PROGRESS_STEPS[0] },
    });

    await createAuditLog({
      entityType: "Case",
      entityId: newCase.id,
      action: "case_created",
      staffName: body.applicantName || "Applicant",
      details: `Apply form submission: ${caseNumber} | ${body.department} | ${body.category}`,
    });

    return NextResponse.json({
      success: true,
      data: { caseNumber: newCase.caseNumber, id: newCase.id },
      message: `Application submitted successfully. Your case number is ${newCase.caseNumber}.`,
    }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Failed to submit application" }, { status: 500 });
  }
}
