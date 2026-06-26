import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildStacked, groupTopN } from "@/lib/chart-utils";

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

// Helper: resolve short field name to fully-qualified join field
function resolveField(field: string, config: typeof SOURCE_CONFIG[string]): string {
  if (config.textFields.includes(field) || config.numFields.includes(field) || (config.joinFields || []).includes(field)) return field;
  const match = (config.joinFields || []).find((jf) => jf.endsWith(`.${field}`));
  return match || field;
}


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source") || "cases";
    const xField = searchParams.get("x") || "department";
    const yMode = searchParams.get("y") || "count";
    const yField = searchParams.get("yField") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    // Multi-value filters: filter_<field>=val1,val2,val3
    const multiFilters: Record<string, string[]> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith("filter_") && value) {
        multiFilters[key.replace("filter_", "")] = value.split(",").filter(Boolean);
      }
    }
    const stackBy = searchParams.get("stackBy") || "";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const groupTop = parseInt(searchParams.get("groupTop") || "0", 10); // 0 = disabled, N = top N + Other
    const childTop = parseInt(searchParams.get("childTop") || "8", 10); // max sub-items per group, 0 = all

    const config = SOURCE_CONFIG[source];
    if (!config) {
      return NextResponse.json({ success: false, error: "Invalid source" }, { status: 400 });
    }

    // Build where clause
    const where: Record<string, unknown> = {};
    if (dateFrom || dateTo) {
      const df: Record<string, Date> = {};
      if (dateFrom) df.gte = new Date(dateFrom);
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999); // end of day
        df.lte = d;
      }
      where[config.dateField] = df;
    }
    // Multi-value filters
    for (const [field, values] of Object.entries(multiFilters)) {
      if (values.length === 1) {
        where[field] = values[0];
      } else if (values.length > 1) {
        where[field] = { in: values };
      }
    }

    // Resolve xField and stackBy
    const resolvedX = resolveField(xField, config);
    const resolvedStack = stackBy ? resolveField(stackBy, config) : "";
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

    let result: { label: string; value: number }[] = [];

    // ─── JOIN FIELDS (usage / transactions linked to case / material) ───
    if (finalIsJoin) {
      const [relation, relField] = resolvedX.split(".");

      if (source === "usage") {
        const records = await (prisma.caseMaterialUsage as any).findMany({
          where,
          include: { case: { select: { department: true, category: true, currentStatus: true, purpose: true } }, material: { select: { materialName: true, category: true, brand: true, status: true } } },
          orderBy: { usageDate: "desc" },
          take: 5000,
        });

        if (resolvedStack) {
          const [stackRelation, stackField] = resolvedStack.split(".");
          const stacked = buildStacked(
            records.map((r: any) => ({
              primary: relation === "case" ? (r.case?.[relField] || "(empty)") : (r.material?.[relField] || "(empty)"),
              secondary: stackRelation === "case" ? (r.case?.[stackField] || "(empty)") : (r.material?.[stackField] || "(empty)"),
              count: 1,
            })),
            groupTop,
            childTop,
          );
          return NextResponse.json({ success: true, data: { source, xField, stackBy, yMode, stacked, total: stacked.reduce((s, r) => s + r.value, 0) } });
        }

        const map = new Map<string, number>();
        for (const r of records as any[]) {
          const label = relation === "case" ? (r.case?.[relField] || "(empty)") : (r.material?.[relField] || "(empty)");
          map.set(label, (map.get(label) || 0) + 1);
        }
        result = Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, limit);

      } else if (source === "transactions") {
        const records = await (prisma.stockTransaction as any).findMany({
          where,
          include: { material: { select: { materialName: true, category: true, brand: true, status: true } } },
          orderBy: { transactionDate: "desc" },
          take: 5000,
        });

        if (resolvedStack) {
          const [stackRelation, stackField] = resolvedStack.split(".");
          const stacked = buildStacked(
            records.map((r: any) => ({
              primary: r.material?.[relField] || "(empty)",
              secondary: stackRelation === "material" ? (r.material?.[stackField] || "(empty)") : (r[stackRelation]?.[stackField] || "(empty)"),
              count: 1,
            })),
            groupTop,
            childTop,
          );
          return NextResponse.json({ success: true, data: { source, xField, stackBy, yMode, stacked, total: stacked.reduce((s, r) => s + r.value, 0) } });
        }

        const map = new Map<string, number>();
        for (const r of records as any[]) {
          const label = r.material?.[relField] || "(empty)";
          map.set(label, (map.get(label) || 0) + 1);
        }
        result = Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, limit);
      }

    // ─── CASES ───
    } else if (source === "cases" && finalIsText) {
      if (resolvedStack) {
        // Stacked: groupBy two fields
        const groups = await (prisma.case as any).groupBy({
          by: [resolvedX, resolvedStack],
          where,
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: limit * 10,
        });
        const stacked = buildStacked(
          groups.map((g: any) => ({
            primary: g[resolvedX] || "(empty)",
            secondary: g[resolvedStack] || "(empty)",
            count: g._count.id,
          })),
          groupTop,
          childTop,
        );
        return NextResponse.json({ success: true, data: { source, xField, stackBy, yMode, stacked, total: stacked.reduce((s, r) => s + r.value, 0) } });
      }
      const groups = await (prisma.case as any).groupBy({
        by: [resolvedX],
        where,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: limit,
      });
      result = groups.map((g: any) => ({ label: g[resolvedX] || "(empty)", value: g._count.id }));

    // ─── MATERIALS ───
    } else if (source === "materials" && finalIsText) {
      if (resolvedStack) {
        const groups = await (prisma.material as any).groupBy({
          by: [resolvedX, resolvedStack],
          where,
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: limit * 10,
        });
        const stacked = buildStacked(
          groups.map((g: any) => ({
            primary: g[resolvedX] || "(empty)",
            secondary: g[resolvedStack] || "(empty)",
            count: g._count.id,
          })),
          groupTop,
          childTop,
        );
        return NextResponse.json({ success: true, data: { source, xField, stackBy, yMode, stacked, total: stacked.reduce((s, r) => s + r.value, 0) } });
      }
      const groups = await (prisma.material as any).groupBy({
        by: [resolvedX],
        where,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: limit,
      });
      result = groups.map((g: any) => ({ label: g[resolvedX] || "(empty)", value: g._count.id }));

    // ─── USAGE (flat, non-join fields) ───
    } else if (source === "usage") {
      const groups = await (prisma.caseMaterialUsage as any).groupBy({
        by: finalIsText ? [resolvedX] : ["unit"],
        where,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: limit,
      });
      result = groups.map((g: any) => ({
        label: finalIsText ? (g[resolvedX] || "(empty)") : g.unit || "(empty)",
        value: g._count.id,
      }));

    // ─── TRANSACTIONS (flat, non-join fields) ───
    } else if (source === "transactions") {
      const groups = await (prisma.stockTransaction as any).groupBy({
        by: finalIsText ? [resolvedX] : ["transactionType"],
        where,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: limit,
      });
      result = groups.map((g: any) => ({
        label: finalIsText ? (g[resolvedX] || "(empty)") : g.transactionType || "(empty)",
        value: g._count.id,
      }));

    } else {
      return NextResponse.json({ success: false, error: "Unsupported field/source combination" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: { source, xField, yMode, rows: groupTop > 0 ? groupTopN(result, groupTop) : result, total: result.reduce((s, r) => s + r.value, 0) },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Failed to fetch chart data" }, { status: 500 });
  }
}
