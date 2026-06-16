import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { caseFormSchema } from "@/lib/validators";
import { validateBody } from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch case and audit logs in parallel (fix N+1)
    const [caseRecord, auditLogs] = await Promise.all([
      prisma.case.findUnique({
        where: { id },
        include: {
          progressSteps: { orderBy: { stepOrder: "asc" } },
          materialUsage: { include: { material: true }, orderBy: { usageDate: "desc" } },
        },
      }),
      prisma.auditLog.findMany({
        where: { entityId: id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!caseRecord) {
      return NextResponse.json({ success: false, error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { ...caseRecord, auditLogs } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Failed to fetch case" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = await validateBody(request, caseFormSchema.partial());
    if (!parsed.success) return parsed.response;
    const body = parsed.data as Record<string, unknown>;

    // Build data object conditionally for partial update
    const data: Record<string, unknown> = {};
    const textFields = [
      "caseNumber","department","hospital","applicantName","contact","rank",
      "category","purpose","specification","projectTitle","description","modelType",
      "requiredService","serviceRequirements","requiresSterilization",
      "priority","currentStatus","currentProgressStep","technician","printingParty",
      "modelImageUrl","photoFolderUrl","remarks","telephone","email","signature",
      "modelMaterial","colourRequirement","copyrightDetails","fundingSource","ownership",
    ];
    const dateFields = [
      "applicationDate","expectedCompletionDate","approvalDate","completionDate",
      "signatureDate",
    ];
    const boolFields = ["copyrightRisk","isReprint"];
    const numFields = ["quantity","totalComponents"];

    for (const f of textFields) {
      if (body[f] !== undefined) data[f] = body[f] === "" ? null : body[f];
    }
    for (const f of dateFields) {
      if (body[f] !== undefined) data[f] = body[f] ? new Date(body[f] as string) : null;
    }
    for (const f of boolFields) {
      if (body[f] !== undefined) data[f] = body[f] === true || body[f] === "true";
    }
    for (const f of numFields) {
      if (body[f] !== undefined) data[f] = body[f] ?? 1;
    }

    const updated = await prisma.case.update({ where: { id }, data });

    await createAuditLog({
      entityType: "Case",
      entityId: id,
      action: "case_updated",
      staffName: (body.staffName as string) || "System",
      details: `Case ${body.caseNumber} updated`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update case" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseRecord = await prisma.case.findUnique({ where: { id } });
    await prisma.case.delete({ where: { id } });

    await createAuditLog({
      entityType: "Case",
      entityId: id,
      action: "case_deleted",
      staffName: "System",
      details: `Case ${caseRecord?.caseNumber || id} deleted`,
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to delete case" }, { status: 500 });
  }
}
