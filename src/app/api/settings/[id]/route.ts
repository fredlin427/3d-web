import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { settingFormSchema } from "@/lib/validators";
import { validateBody } from "@/lib/api-utils";
import { createAuditLog } from "@/lib/audit";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = await validateBody(request, settingFormSchema.partial());
    if (!parsed.success) return parsed.response;
    const body = parsed.data;
    const existing = await prisma.setting.findUnique({ where: { id } });
    const setting = await prisma.setting.update({
      where: { id },
      data: {
        type: body.type,
        value: body.value,
        sortOrder: body.sortOrder,
        isActive: body.isActive,
      },
    });

    const changes: string[] = [];
    if (existing) {
      if (body.value !== undefined && body.value !== existing.value) changes.push(`value: "${existing.value}" → "${body.value}"`);
      if (body.isActive !== undefined && body.isActive !== existing.isActive) changes.push(`active: ${existing.isActive} → ${body.isActive}`);
      if (body.sortOrder !== undefined && body.sortOrder !== existing.sortOrder) changes.push(`order: ${existing.sortOrder} → ${body.sortOrder}`);
    }
    await createAuditLog({
      entityType: "Setting",
      entityId: id,
      action: "setting_updated",
      staffName: (body as any).staffName || "System",
      details: changes.length > 0 ? `Setting "${setting.type}" updated: ${changes.join(", ")}` : `Setting "${setting.type}" updated`,
    });

    return NextResponse.json({ success: true, data: setting });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to update setting" },
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
    const existing = await prisma.setting.findUnique({ where: { id } });
    await prisma.setting.delete({ where: { id } });

    await createAuditLog({
      entityType: "Setting",
      entityId: id,
      action: "setting_deleted",
      staffName: "System",
      details: existing ? `Setting "${existing.type}" = "${existing.value}" deleted` : `Setting ${id} deleted`,
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete setting" },
      { status: 500 }
    );
  }
}
