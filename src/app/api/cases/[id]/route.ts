import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseRecord = await prisma.case.findUnique({
      where: { id },
      include: {
        progressSteps: { orderBy: { stepOrder: "asc" } },
        materialUsage: {
          include: { material: true },
          orderBy: { usageDate: "desc" },
        },
      },
    });

    if (!caseRecord) {
      return NextResponse.json(
        { success: false, error: "Case not found" },
        { status: 404 }
      );
    }

    // Get audit logs for this case
    const auditLogs = await prisma.auditLog.findMany({
      where: { entityId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: { ...caseRecord, auditLogs },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch case" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updated = await prisma.case.update({
      where: { id },
      data: {
        caseNumber: body.caseNumber,
        applicationDate: new Date(body.applicationDate),
        department: body.department,
        applicantName: body.applicantName,
        contact: body.contact || null,
        useType: body.useType,
        projectTitle: body.projectTitle,
        description: body.description || null,
        clinicalPurpose: body.clinicalPurpose || null,
        priority: body.priority,
        requiredDate: body.requiredDate ? new Date(body.requiredDate) : null,
        currentStatus: body.currentStatus,
        currentProgressStep: body.currentProgressStep || null,
        modelImageUrl: body.modelImageUrl || null,
        photoFolderUrl: body.photoFolderUrl || null,
        remarks: body.remarks || null,
      },
    });

    await createAuditLog({
      entityType: "Case",
      entityId: id,
      action: "case_updated",
      staffName: body.staffName || "System",
      details: `Case ${body.caseNumber} updated`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to update case" },
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
    return NextResponse.json(
      { success: false, error: "Failed to delete case" },
      { status: 500 }
    );
  }
}
