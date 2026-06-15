import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get("prefix") || "";
    const category = searchParams.get("category") || "";

    if (!prefix) {
      return NextResponse.json({ success: false, error: "prefix is required" }, { status: 400 });
    }

    // Find all materialIds that start with this prefix
    const materials = await prisma.material.findMany({
      where: {
        category,
        materialId: { startsWith: prefix },
      },
      select: { materialId: true },
      orderBy: { materialId: "desc" },
    });

    // Extract sequence numbers and find max
    let maxSeq = 0;
    for (const m of materials) {
      if (!m.materialId) continue;
      // Format: PREFIX-NNN (e.g., UM-PLA-2024-001)
      const parts = m.materialId.split("-");
      const lastPart = parts[parts.length - 1];
      const seq = parseInt(lastPart, 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }

    const nextSeq = maxSeq + 1;
    const materialId = `${prefix}-${String(nextSeq).padStart(3, "0")}`;

    return NextResponse.json({ success: true, data: { materialId, nextSeq } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Failed to generate ID" }, { status: 500 });
  }
}
