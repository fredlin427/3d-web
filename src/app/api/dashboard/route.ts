import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const department = searchParams.get("department") || "";
    const category = searchParams.get("category") || "";
    const caseStatus = searchParams.get("caseStatus") || "";

    // Build date filter
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);

    const caseWhere: Record<string, unknown> = {};
    if (dateFrom || dateTo) caseWhere.applicationDate = dateFilter;
    if (department) caseWhere.department = department;
    if (category) caseWhere.category = category;
    if (caseStatus) caseWhere.currentStatus = caseStatus;

    // Stat cards
    const [totalCases, casesThisMonth, casesInProgress, completedCases] = await Promise.all([
      prisma.case.count({ where: caseWhere }),
      prisma.case.count({
        where: {
          ...caseWhere,
          applicationDate: {
            ...(dateFilter as Record<string, Date>),
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      prisma.case.count({ where: { ...caseWhere, currentStatus: "In progress" } }),
      prisma.case.count({ where: { ...caseWhere, currentStatus: "Completed" } }),
    ]);

    // Material stats (no case filter applied)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [lowStockItems, expiringMaterials, materialsOpened] = await Promise.all([
      prisma.material.count({ where: { status: "Low stock" } }),
      prisma.material.count({
        where: {
          expiryDate: {
            lte: thirtyDaysFromNow,
            gte: new Date(),
          },
          status: { not: "Expired" },
        },
      }),
      prisma.material.count({ where: { status: "Opened" } }),
    ]);

    // Case volume by month
    const cases = await prisma.case.findMany({
      where: caseWhere,
      select: { applicationDate: true },
      orderBy: { applicationDate: "asc" },
    });

    const monthlyVolume = cases.reduce(
      (acc, c) => {
        const month = new Date(c.applicationDate).toLocaleString("en-GB", {
          month: "short",
          year: "2-digit",
        });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const caseVolumeByMonth = Object.entries(monthlyVolume).map(([month, count]) => ({
      month,
      count,
    }));

    // Case by department
    const deptGroups = await prisma.case.groupBy({
      by: ["department"],
      where: caseWhere,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const caseByDepartment = deptGroups.map((d) => ({
      department: d.department,
      count: d._count.id,
    }));

    // Case by use type
    const categoryGroups = await prisma.case.groupBy({
      by: ["category"],
      where: caseWhere,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const caseByUseType = categoryGroups.map((u) => ({
      category: u.category,
      count: u._count.id,
    }));

    // Case by purpose (sub-categories) for sunburst outer ring
    const purposeGroups = await prisma.case.groupBy({
      by: ["category", "purpose"],
      where: caseWhere,
      _count: { id: true },
      orderBy: [{ category: "asc" }, { _count: { id: "desc" } }],
    });

    const caseByPurpose = purposeGroups.map((g) => ({
      category: g.category,
      purpose: g.purpose,
      count: g._count.id,
    }));

    // Material usage trend
    const materialUsage = await prisma.caseMaterialUsage.findMany({
      select: { usageDate: true, quantityUsed: true },
      orderBy: { usageDate: "asc" },
    });

    const usageMonthly = materialUsage.reduce(
      (acc, u) => {
        const month = new Date(u.usageDate).toLocaleString("en-GB", {
          month: "short",
          year: "2-digit",
        });
        acc[month] = (acc[month] || 0) + u.quantityUsed;
        return acc;
      },
      {} as Record<string, number>
    );

    const materialUsageTrend = Object.entries(usageMonthly).map(([month, totalUsed]) => ({
      month,
      usageCount: totalUsed,
    }));

    // Material usage by category
    const usageByCategory = await prisma.caseMaterialUsage.findMany({
      include: { material: { select: { category: true } } },
    });

    const categoryMap = usageByCategory.reduce(
      (acc, u) => {
        const cat = u.material?.category || "Unknown";
        acc[cat] = (acc[cat] || 0) + u.quantityUsed;
        return acc;
      },
      {} as Record<string, number>
    );

    const materialUsageByCategory = Object.entries(categoryMap).map(
      ([category, totalUsed]) => ({
        category,
        totalUsed,
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalCases,
          casesThisMonth,
          casesInProgress,
          completedCases,
          lowStockItems,
          expiringMaterials,
          materialsOpened,
        },
        caseVolumeByMonth,
        caseByDepartment,
        caseBycategory: caseByUseType,
        caseByPurpose,
        materialUsageTrend,
        materialUsageByCategory,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
