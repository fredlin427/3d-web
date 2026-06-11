import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    // Financial year: April to March (e.g., April 2026 = FY 2627)
    const fyEnd = month >= 4 ? (year + 1) % 100 : year % 100;
    const fyStart = fyEnd - 1;
    const fy = `${String(fyStart).padStart(2, "0")}${String(fyEnd).padStart(2, "0")}`;

    // Find highest case number for current FY
    const prefix = `QEH3D-${fy}-`;
    const cases = await prisma.case.findMany({
      where: { caseNumber: { startsWith: prefix } },
      select: { caseNumber: true },
      orderBy: { caseNumber: "desc" },
      take: 1,
    });

    let nextNum = 1;
    if (cases.length > 0) {
      const lastNum = parseInt(cases[0].caseNumber.split("-").pop() || "0", 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }

    const nextCaseNumber = `${prefix}${String(nextNum).padStart(3, "0")}`;

    return NextResponse.json({ success: true, data: { caseNumber: nextCaseNumber } });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to generate case number" }, { status: 500 });
  }
}
