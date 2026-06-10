import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    return NextResponse.json(
      { success: false, error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const setting = await prisma.setting.create({
      data: {
        type: body.type,
        value: body.value,
        sortOrder: body.sortOrder ?? 0,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json({ success: true, data: setting }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to create setting" },
      { status: 500 }
    );
  }
}
