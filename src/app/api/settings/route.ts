import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { settingFormSchema } from "@/lib/validators";
import { validateBody } from "@/lib/api-utils";
import { createAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const where = type ? { type } : {};
    const settings = await prisma.setting.findMany({
      where,
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
    });

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await validateBody(request, settingFormSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;
    const setting = await prisma.setting.create({
      data: {
        type: body.type,
        value: body.value,
        sortOrder: body.sortOrder,
        isActive: body.isActive,
      },
    });

    await createAuditLog({
      entityType: "Setting",
      entityId: setting.id,
      action: "setting_created",
      staffName: (body as any).staffName || "System",
      details: `Setting "${body.type}" = "${body.value}" created`,
    });

    return NextResponse.json({ success: true, data: setting }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to create setting" },
      { status: 500 }
    );
  }
}
