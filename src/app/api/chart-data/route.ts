import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Supported chart sources and their groupable fields
const SOURCE_CONFIG: Record<string, { model: string; dateField: string; textFields: string[]; numFields: string[]; joinFields?: string[] }> = {
  cases: {
    model: "case",
    dateField: "applicationDate",
    textFields: ["department", "category", "purpose", "currentStatus", "priority", "technician", "printingParty", "hospital", "rank", "modelType", "requiredService"],
    numFields: ["quantity", "totalComponents"],
  },
  materials: {
    model: "material",
    dateField: "purchaseDate",
    textFields: ["category", "brand", "materialType", "status", "colour", "supplier", "storageLocation", "unit"],
    numFields: ["initialQuantity", "currentQuantity", "unusedQuantity", "openedQuantity", "expiredQuantity", "reorderThreshold", "diameter"],
  },
  usage: {
    model: "caseMaterialUsage",
    dateField: "usageDate",
    textFields: ["unit", "staffName", "printerOrTank"],
    numFields: ["quantityUsed"],
    joinFields: ["case.department", "case.category", "case.currentStatus", "material.materialName", "material.category", "material.brand", "material.status"],
  },
  transactions: {
    model: "stockTransaction",
    dateField: "transactionDate",
    textFields: ["transactionType", "staffName"],
    numFields: ["quantityChange", "quantityAfter"],
    joinFields: ["material.materialName", "material.category", "material.brand", "material.status"],
  },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source") || "cases";
    const xField = searchParams.get("x") || "department";
    const yMode = searchParams.get("y") || "count"; // count | sum | avg
    const yField = searchParams.get("yField") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const filterField = searchParams.get("filterField") || "";
    const filterValue = searchParams.get("filterValue") || "";
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const config = SOURCE_CONFIG[source];
    if (!config) {
      return NextResponse.json({ success: false, error: "Invalid source" }, { status: 400 });
    }

    // Build where clause
    const where: Record<string, unknown> = {};

    if (dateFrom || dateTo) {
      const df: Record<string, Date> = {};
      if (dateFrom) df.gte = new Date(dateFrom);
      if (dateTo) df.lte = new Date(dateTo);
      where[config.dateField] = df;
    }

    if (filterField && filterValue) {
      where[filterField] = filterValue;
    }

    // Determine field type
    const isTextField = config.textFields.includes(xField);
    const isJoinField = (config.joinFields || []).includes(xField);
    const isNumField = config.numFields.includes(xField);
    const validX = isTextField || isNumField || isJoinField;

    if (!validX && xField !== "auto") {
      return NextResponse.json({ success: false, error: `Field "${xField}" not available for source "${source}"` }, { status: 400 });
    }

    // Get data
    let result: { label: string; value: number }[] = [];

    // Handle join fields (usage/transactions joined to case/material)
    if (isJoinField) {
      const [relation, relField] = xField.split(".");
      const includeMap: Record<string, any> = {
        case: { include: { case: { select: { department: true, category: true, currentStatus: true } } } },
        material: { include: { material: { select: { materialName: true, category: true, brand: true, status: true } } } },
      };

      if (source === "usage") {
        const records = await (prisma.caseMaterialUsage as any).findMany({
          where,
          ...(includeMap[relation] || {}),
          orderBy: { usageDate: "desc" },
          take: 5000,
        });
        const map = new Map<string, number>();
        for (const r of records) {
          const label = relation === "case" ? (r.case?.[relField] || "(empty)") : (r.material?.[relField] || "(empty)");
          const val = map.get(label) || 0;
          map.set(label, val + 1);
        }
        result = Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, limit);
      } else if (source === "transactions") {
        const records = await (prisma.stockTransaction as any).findMany({
          where,
          ...(includeMap[relation] || {}),
          orderBy: { transactionDate: "desc" },
          take: 5000,
        });
        const map = new Map<string, number>();
        for (const r of records) {
          const label = r.material?.[relField] || "(empty)";
          const val = map.get(label) || 0;
          map.set(label, val + 1);
        }
        result = Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, limit);
      }
    } else if (source === "cases" && isTextField) {
      const groups = await (prisma.case as any).groupBy({
        by: [xField],
        where,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: limit,
      });
      result = groups.map((g: any) => ({
        label: g[xField] || "(empty)",
        value: g._count.id,
      }));
    } else if (source === "materials" && isTextField) {
      const groups = await (prisma.material as any).groupBy({
        by: [xField],
        where,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: limit,
      });
      result = groups.map((g: any) => ({
        label: g[xField] || "(empty)",
        value: g._count.id,
      }));
    } else if (source === "usage") {
      const groups = await (prisma.caseMaterialUsage as any).groupBy({
        by: isTextField ? [xField] : ["unit"],
        where,
        _count: { id: true },
        _sum: yMode === "sum" && yField ? { [yField]: true } : undefined,
        orderBy: { _count: { id: "desc" } },
        take: limit,
      });
      result = groups.map((g: any) => ({
        label: isTextField ? (g[xField] || "(empty)") : g.unit || "(empty)",
        value: yMode === "sum" && yField ? (g._sum?.[yField] || 0) : g._count.id,
      }));
    } else if (source === "transactions") {
      const groups = await (prisma.stockTransaction as any).groupBy({
        by: isTextField ? [xField] : ["transactionType"],
        where,
        _count: { id: true },
        _sum: yMode === "sum" && yField ? { [yField]: true } : undefined,
        orderBy: { _count: { id: "desc" } },
        take: limit,
      });
      result = groups.map((g: any) => ({
        label: isTextField ? (g[xField] || "(empty)") : g.transactionType || "(empty)",
        value: yMode === "sum" && yField ? (g._sum?.[yField] || 0) : g._count.id,
      }));
    } else {
      return NextResponse.json({ success: false, error: "Unsupported field/source combination" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        source,
        xField,
        yMode,
        rows: result,
        total: result.reduce((s, r) => s + r.value, 0),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Failed to fetch chart data" }, { status: 500 });
  }
}
