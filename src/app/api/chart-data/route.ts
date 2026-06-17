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
    joinFields: ["case.department", "case.category", "case.currentStatus", "case.purpose", "material.materialName", "material.category", "material.brand", "material.status"],
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
    const stackBy = searchParams.get("stackBy") || "";
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

    // Auto-resolve short field names to join fields (e.g. "department" → "case.department" for usage)
    let resolvedX = xField;
    if (!config.textFields.includes(xField) && !config.numFields.includes(xField) && !(config.joinFields || []).includes(xField) && xField !== "auto") {
      const match = (config.joinFields || []).find((jf) => jf.endsWith(`.${xField}`));
      if (match) resolvedX = match;
    }
    const finalIsJoin = (config.joinFields || []).includes(resolvedX);
    const finalIsText = config.textFields.includes(resolvedX);
    const finalIsNum = config.numFields.includes(resolvedX);
    const validX = finalIsText || finalIsNum || finalIsJoin;

    if (!validX && resolvedX !== "auto") {
      const available = [...config.textFields, ...config.numFields, ...(config.joinFields || []).map((jf) => jf.replace(/^(case|material)\./, ""))];
      return NextResponse.json({
        success: false,
        error: `Field "${xField}" not available for source "${source}"`,
        availableFields: [...new Set(available)].sort(),
      }, { status: 400 });
    }

    // Get data
    let result: { label: string; value: number }[] = [];

    // Handle join fields (usage/transactions joined to case/material)
    if (finalIsJoin) {
      const [relation, relField] = resolvedX.split(".");
      const includeMap: Record<string, any> = {
        case: { include: { case: { select: { department: true, category: true, currentStatus: true, purpose: true } } } },
        material: { include: { material: { select: { materialName: true, category: true, brand: true, status: true } } } },
      };

      // Determine stackBy field for two-level grouping
      let stackRelation = "", stackField = "";
      let resolvedStack = stackBy;
      if (stackBy && !(config.joinFields || []).includes(stackBy)) {
        const sm = (config.joinFields || []).find((jf) => jf.endsWith(`.${stackBy}`));
        if (sm) resolvedStack = sm;
      }
      if (resolvedStack && (config.joinFields || []).includes(resolvedStack)) {
        [stackRelation, stackField] = resolvedStack.split(".");
      }

      if (source === "usage") {
        const records = await (prisma.caseMaterialUsage as any).findMany({
          where,
          include: { case: { select: { department: true, category: true, currentStatus: true, purpose: true } }, material: { select: { materialName: true, category: true, brand: true, status: true } } },
          orderBy: { usageDate: "desc" },
          take: 5000,
        });

        if (stackField) {
          // Two-level grouping: primary → stack
          const map = new Map<string, Map<string, number>>();
          for (const r of records) {
            const primary = relation === "case" ? (r.case?.[relField] || "(empty)") : (r.material?.[relField] || "(empty)");
            const secondary = stackRelation === "case" ? (r.case?.[stackField] || "(empty)") : (r.material?.[stackField] || "(empty)");
            if (!map.has(primary)) map.set(primary, new Map());
            const inner = map.get(primary)!;
            inner.set(secondary, (inner.get(secondary) || 0) + 1);
          }
          const stacked: { label: string; value: number; children: { label: string; value: number }[] }[] = [];
          for (const [primary, innerMap] of map) {
            const total = Array.from(innerMap.values()).reduce((s, v) => s + v, 0);
            const children = Array.from(innerMap.entries()).map(([l, v]) => ({ label: l, value: v }));
            stacked.push({ label: primary, value: total, children });
          }
          stacked.sort((a, b) => b.value - a.value);
          return NextResponse.json({ success: true, data: { source, xField, stackBy, yMode, stacked, total: stacked.reduce((s, r) => s + r.value, 0) } });
        } else {
          const map = new Map<string, number>();
          for (const r of records) {
            const label = relation === "case" ? (r.case?.[relField] || "(empty)") : (r.material?.[relField] || "(empty)");
            map.set(label, (map.get(label) || 0) + 1);
          }
          result = Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, limit);
        }
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
    } else if (source === "cases" && finalIsText) {
      const groups = await (prisma.case as any).groupBy({
        by: [resolvedX],
        where,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: limit,
      });
      result = groups.map((g: any) => ({
        label: g[resolvedX] || "(empty)",
        value: g._count.id,
      }));
    } else if (source === "materials" && finalIsText) {
      const groups = await (prisma.material as any).groupBy({
        by: [resolvedX],
        where,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: limit,
      });
      result = groups.map((g: any) => ({
        label: g[resolvedX] || "(empty)",
        value: g._count.id,
      }));
    } else if (source === "usage") {
      const groups = await (prisma.caseMaterialUsage as any).groupBy({
        by: finalIsText ? [resolvedX] : ["unit"],
        where,
        _count: { id: true },
        _sum: yMode === "sum" && yField ? { [yField]: true } : undefined,
        orderBy: { _count: { id: "desc" } },
        take: limit,
      });
      result = groups.map((g: any) => ({
        label: finalIsText ? (g[resolvedX] || "(empty)") : g.unit || "(empty)",
        value: yMode === "sum" && yField ? (g._sum?.[yField] || 0) : g._count.id,
      }));
    } else if (source === "transactions") {
      const groups = await (prisma.stockTransaction as any).groupBy({
        by: finalIsText ? [resolvedX] : ["transactionType"],
        where,
        _count: { id: true },
        _sum: yMode === "sum" && yField ? { [yField]: true } : undefined,
        orderBy: { _count: { id: "desc" } },
        take: limit,
      });
      result = groups.map((g: any) => ({
        label: finalIsText ? (g[resolvedX] || "(empty)") : g.transactionType || "(empty)",
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
