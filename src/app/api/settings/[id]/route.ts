import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { settingFormSchema } from "@/lib/validators";
import { validateBody } from "@/lib/api-utils";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = await validateBody(request, settingFormSchema.partial());
    if (!parsed.success) return parsed.response;
    const body = parsed.data;
    const setting = await prisma.setting.update({
      where: { id },
      data: {
        type: body.type,
        value: body.value,
        sortOrder: body.sortOrder,
        isActive: body.isActive,
      },
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
    await prisma.setting.delete({ where: { id } });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete setting" },
      { status: 500 }
    );
  }
}
