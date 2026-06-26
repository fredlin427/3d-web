import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50", 10)));
    const entityType = searchParams.get("entityType") || "";
    const action = searchParams.get("action") || "";
    const search = searchParams.get("search") || "";
    const staffName = searchParams.get("staffName") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";

    const where: Record<string, unknown> = {};

    if (entityType) where.entityType = entityType;
    if (action) where.action = { contains: action };
    if (staffName) where.staffName = { contains: staffName };

    if (dateFrom || dateTo) {
      const createdAt: Record<string, Date> = {};
      if (dateFrom) createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        createdAt.lte = d;
      }
      where.createdAt = createdAt;
    }

    if (search) {
      where.OR = [
        { details: { contains: search } },
        { entityId: { contains: search } },
        { staffName: { contains: search } },
        { entityType: { contains: search } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Get distinct entity types and actions for filter dropdowns
    const [entityTypes, actions] = await Promise.all([
      prisma.auditLog.findMany({ select: { entityType: true }, distinct: ["entityType"], orderBy: { entityType: "asc" } }),
      prisma.auditLog.findMany({ select: { action: true }, distinct: ["action"], orderBy: { action: "asc" } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        entityTypes: entityTypes.map((e) => e.entityType),
        actions: actions.map((a) => a.action),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
