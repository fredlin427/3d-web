import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

// Column definitions with widths for each report type
const COLUMN_WIDTHS: Record<string, number[]> = {
  cases: [18, 14, 16, 20, 16, 28, 12, 16, 18, 14],
  "material-usage": [14, 18, 16, 24, 16, 18, 16, 10, 16],
  "stock-transactions": [14, 24, 16, 18, 18, 16, 16, 16, 24],
  departments: [24, 12],
  categories: [24, 12],
  "stock-level": [22, 14, 18, 16, 16, 12, 12, 12, 12, 16, 16, 18],
  expiry: [22, 14, 14, 18, 14, 14, 14, 16, 12, 16],
  "monthly-summary": [14, 10, 10, 10, 14, 14, 18],
  audit: [14, 16, 10, 18, 40, 16],
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "cases";
    const format = searchParams.get("format") || "xlsx"; // "json" for preview, "xlsx" for download
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const department = searchParams.get("department") || "";
    const category = searchParams.get("category") || "";
    const materialCategory = searchParams.get("materialCategory") || "";
    const status = searchParams.get("status") || "";
    const columnsParam = searchParams.get("columns") || ""; // comma-separated column filter

    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);

    let data: Record<string, unknown>[] = [];
    let columns: string[] = [];

    switch (reportType) {
      // ─── EXISTING REPORTS ────────────────────────────────────
      case "cases": {
        const where: Record<string, unknown> = {};
        if (dateFrom || dateTo) where.applicationDate = dateFilter;
        if (department) where.department = department;
        if (category) where.category = category;
        if (status) where.currentStatus = status;

        const cases = await prisma.case.findMany({
          where,
          orderBy: { applicationDate: "desc" },
        });

        columns = [
          "Case Number", "Application Date", "Department", "Applicant Name",
          "Category", "Project Title", "Priority", "Current Status",
          "Current Progress", "Created At",
        ];

        data = cases.map((c) => ({
          "Case Number": c.caseNumber,
          "Application Date": c.applicationDate.toISOString().split("T")[0],
          Department: c.department,
          "Applicant Name": c.applicantName,
          Category: c.category,
          "Project Title": c.projectTitle,
          Priority: c.priority,
          "Current Status": c.currentStatus,
          "Current Progress": c.currentProgressStep || "",
          "Created At": c.createdAt.toISOString().split("T")[0],
        }));
        break;
      }

      case "material-usage": {
        const usageWhere: Record<string, unknown> = {};
        if (dateFrom || dateTo) usageWhere.usageDate = dateFilter;
        if (materialCategory) {
          usageWhere.material = { category: materialCategory };
        }

        const usage = await prisma.caseMaterialUsage.findMany({
          where: usageWhere,
          include: {
            case: { select: { caseNumber: true, department: true } },
            material: { select: { materialName: true, category: true, batchNumber: true } },
          },
          orderBy: { usageDate: "desc" },
        });

        columns = [
          "Date", "Case Number", "Department", "Material", "Category",
          "Batch Number", "Quantity Used", "Unit", "Staff",
        ];

        data = usage.map((u) => ({
          Date: u.usageDate.toISOString().split("T")[0],
          "Case Number": u.case?.caseNumber || "",
          Department: u.case?.department || "",
          Material: u.material?.materialName || "",
          Category: u.material?.category || "",
          "Batch Number": u.material?.batchNumber || "",
          "Quantity Used": u.quantityUsed,
          Unit: u.unit,
          Staff: u.staffName || "",
        }));
        break;
      }

      case "stock-transactions": {
        const stWhere: Record<string, unknown> = {};
        if (dateFrom || dateTo) stWhere.transactionDate = dateFilter;

        const transactions = await prisma.stockTransaction.findMany({
          where: stWhere,
          include: {
            material: { select: { materialName: true, category: true, batchNumber: true } },
          },
          orderBy: { transactionDate: "desc" },
        });

        columns = [
          "Date", "Material", "Category", "Batch Number",
          "Transaction Type", "Quantity Change", "Quantity After", "Staff", "Notes",
        ];

        data = transactions.map((t) => ({
          Date: t.transactionDate.toISOString().split("T")[0],
          Material: t.material?.materialName || "",
          Category: t.material?.category || "",
          "Batch Number": t.material?.batchNumber || "",
          "Transaction Type": t.transactionType,
          "Quantity Change": t.quantityChange,
          "Quantity After": t.quantityAfter,
          Staff: t.staffName || "",
          Notes: t.notes || "",
        }));
        break;
      }

      case "departments": {
        const groupField = "department";
        const caseWhere2: Record<string, unknown> = {};
        if (dateFrom || dateTo) caseWhere2.applicationDate = dateFilter;

        const groups = await prisma.case.groupBy({
          by: [groupField],
          where: caseWhere2,
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
        });

        columns = ["Department", "Count"];
        data = groups.map((g: any) => ({
          Department: g.department,
          Count: g._count.id,
        }));
        break;
      }

      case "categories": {
        const groupField = "category";
        const caseWhere3: Record<string, unknown> = {};
        if (dateFrom || dateTo) caseWhere3.applicationDate = dateFilter;

        const groups = await prisma.case.groupBy({
          by: [groupField],
          where: caseWhere3,
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
        });

        columns = ["Category", "Count"];
        data = groups.map((g: any) => ({
          Category: g.category,
          Count: g._count.id,
        }));
        break;
      }

      // ─── NEW REPORTS ─────────────────────────────────────────
      case "stock-level": {
        const matWhere: Record<string, unknown> = {};
        if (materialCategory) matWhere.category = materialCategory;
        if (status) matWhere.status = status;

        const materials = await prisma.material.findMany({
          where: matWhere,
          orderBy: [{ category: "asc" }, { status: "asc" }, { currentQuantity: "asc" }],
        });

        columns = [
          "Material Name", "Category", "Brand", "Material Type",
          "Batch Number", "Weight", "Used", "Remain",
          "Unit", "Status", "Storage Location", "Supplier",
        ];

        data = materials.map((m) => ({
          "Material Name": m.materialName,
          Category: m.category,
          Brand: m.brand || "",
          "Material Type": m.materialType || "",
          "Batch Number": m.batchNumber || "",
          Weight: m.initialQuantity,
          Used: m.unusedQuantity,
          Remain: m.currentQuantity,
          Unit: m.unit || "",
          Status: m.status,
          "Storage Location": m.storageLocation || "",
          Supplier: m.supplier || "",
        }));
        break;
      }

      case "expiry": {
        const now = new Date();
        const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

        // All materials with expiry dates or already expired/disposed
        const expMaterials = await prisma.material.findMany({
          where: {
            OR: [
              { status: "Expired" },
              { status: "Disposed" },
              { expiryDate: { lte: ninetyDays, gte: now } },
              { disposalDate: { lte: ninetyDays, gte: now } },
            ],
          },
          orderBy: [{ expiryDate: "asc" }, { status: "asc" }],
        });

        columns = [
          "Material Name", "Category", "Batch Number",
          "Expiry Date", "Disposal Date", "Open Date",
          "Remain", "Unit", "Status", "Remarks",
        ];

        data = expMaterials.map((m) => {
          // Determine urgency
          let urgency = "OK";
          if (m.status === "Expired") urgency = "EXPIRED";
          else if (m.status === "Disposed") urgency = "DISPOSED";
          else if (m.expiryDate && m.expiryDate <= thirtyDays) urgency = "URGENT";
          else if (m.expiryDate && m.expiryDate <= ninetyDays) urgency = "SOON";

          return {
            "Material Name": m.materialName,
            Category: m.category,
            "Batch Number": m.batchNumber || "",
            "Expiry Date": m.expiryDate ? m.expiryDate.toISOString().split("T")[0] : "",
            "Disposal Date": m.disposalDate ? m.disposalDate.toISOString().split("T")[0] : "",
            "Open Date": m.openDate ? m.openDate.toISOString().split("T")[0] : "",
            Remain: m.currentQuantity,
            Unit: m.unit || "",
            Status: urgency,
            Remarks: m.remarks || "",
          };
        });
        break;
      }

      case "monthly-summary": {
        // Aggregate: cases opened, cases completed, material usage, top materials
        const monthStart = dateFrom
          ? new Date(dateFrom)
          : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        const monthEnd = dateTo
          ? new Date(dateTo)
          : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

        const [newCases, completedCases, usageRecords] = await Promise.all([
          prisma.case.findMany({
            where: {
              applicationDate: { gte: monthStart, lte: monthEnd },
              ...(department ? { department } : {}),
            },
            select: { id: true, caseNumber: true, department: true, category: true, currentStatus: true, applicationDate: true },
          }),
          prisma.case.findMany({
            where: {
              completionDate: { gte: monthStart, lte: monthEnd },
              currentStatus: "Completed",
              ...(department ? { department } : {}),
            },
            select: { id: true, caseNumber: true, department: true, category: true, completionDate: true },
          }),
          prisma.caseMaterialUsage.findMany({
            where: { usageDate: { gte: monthStart, lte: monthEnd } },
            include: { material: { select: { materialName: true, category: true } } },
          }),
        ]);

        // Material usage summary
        const matMap: Record<string, { name: string; category: string; totalUsed: number }> = {};
        for (const u of usageRecords) {
          const key = u.material?.materialName || "Unknown";
          if (!matMap[key]) {
            matMap[key] = { name: key, category: u.material?.category || "", totalUsed: 0 };
          }
          matMap[key].totalUsed += u.quantityUsed;
        }
        const topMaterials = Object.values(matMap)
          .sort((a, b) => b.totalUsed - a.totalUsed)
          .slice(0, 10);

        columns = [
          "Metric", "Value", "Detail 1", "Detail 2", "Detail 3", "Detail 4", "Detail 5",
        ];

        data = [
          { Metric: "Period", Value: `${monthStart.toISOString().split("T")[0]} to ${monthEnd.toISOString().split("T")[0]}`, "Detail 1": "", "Detail 2": "", "Detail 3": "", "Detail 4": "", "Detail 5": "" },
          { Metric: "", Value: "", "Detail 1": "", "Detail 2": "", "Detail 3": "", "Detail 4": "", "Detail 5": "" },
          { Metric: "CASES", Value: "", "Detail 1": "", "Detail 2": "", "Detail 3": "", "Detail 4": "", "Detail 5": "" },
          { Metric: "New Cases", Value: newCases.length, "Detail 1": "", "Detail 2": "", "Detail 3": "", "Detail 4": "", "Detail 5": "" },
          { Metric: "Completed Cases", Value: completedCases.length, "Detail 1": "", "Detail 2": "", "Detail 3": "", "Detail 4": "", "Detail 5": "" },
          ...newCases.map((c) => ({
            Metric: `  ├ ${c.caseNumber}`,
            Value: c.currentStatus,
            "Detail 1": c.department,
            "Detail 2": c.category,
            "Detail 3": c.applicationDate.toISOString().split("T")[0],
            "Detail 4": "",
            "Detail 5": "",
          })),
          { Metric: "", Value: "", "Detail 1": "", "Detail 2": "", "Detail 3": "", "Detail 4": "", "Detail 5": "" },
          { Metric: "MATERIAL USAGE", Value: "", "Detail 1": "", "Detail 2": "", "Detail 3": "", "Detail 4": "", "Detail 5": "" },
          { Metric: "Total Usage Records", Value: usageRecords.length, "Detail 1": "", "Detail 2": "", "Detail 3": "", "Detail 4": "", "Detail 5": "" },
          { Metric: "Total Quantity Used", Value: usageRecords.reduce((s, u) => s + u.quantityUsed, 0), "Detail 1": "", "Detail 2": "", "Detail 3": "", "Detail 4": "", "Detail 5": "" },
          ...topMaterials.map((m) => ({
            Metric: `  ├ ${m.name}`,
            Value: m.totalUsed,
            "Detail 1": m.category,
            "Detail 2": "",
            "Detail 3": "",
            "Detail 4": "",
            "Detail 5": "",
          })),
        ];
        break;
      }

      case "audit": {
        const auditWhere: Record<string, unknown> = {};
        if (dateFrom || dateTo) auditWhere.createdAt = dateFilter;

        const logs = await prisma.auditLog.findMany({
          where: auditWhere,
          orderBy: { createdAt: "desc" },
          take: 5000,
        });

        columns = [
          "Date", "Entity Type", "Entity ID", "Action",
          "Details", "Staff",
        ];

        data = logs.map((l) => ({
          Date: l.createdAt.toISOString().split("T")[0] + " " + l.createdAt.toISOString().split("T")[1].substring(0, 8),
          "Entity Type": l.entityType,
          "Entity ID": l.entityId,
          Action: l.action,
          Details: l.details || "",
          Staff: l.staffName,
        }));
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown report type: ${reportType}` },
          { status: 400 }
        );
    }

    // Apply column filter if requested
    if (columnsParam) {
      const requestedCols = columnsParam.split(",").map((c) => c.trim());
      const validCols = requestedCols.filter((c) => columns.includes(c));
      if (validCols.length > 0) {
        columns = validCols;
        // Filter data to only include selected columns
        data = data.map((row) => {
          const filtered: Record<string, unknown> = {};
          for (const col of columns) {
            filtered[col] = row[col] ?? "";
          }
          return filtered;
        });
      }
    }

    // Return JSON for preview
    if (format === "json") {
      return NextResponse.json({
        success: true,
        data: {
          type: reportType,
          columns,
          rows: data,
          total: data.length,
        },
      });
    }

    // Generate formatted XLSX
    const sheetData = [columns, ...data.map((row) => columns.map((col) => row[col] ?? ""))];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Set column widths
    const widths = COLUMN_WIDTHS[reportType] || columns.map(() => 20);
    ws["!cols"] = columns.map((_, i) => ({ wch: widths[i] || 20 }));

    // Bold header row using cell styles (via s property)
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_col(C) + "1";
      if (!ws[addr]) continue;
      ws[addr].s = {
        font: { bold: true, sz: 12, color: { rgb: "1F2937" } },
        fill: { fgColor: { rgb: "F3F4F6" } },
        alignment: { horizontal: "left", vertical: "center" },
        border: {
          bottom: { style: "medium", color: { rgb: "D1D5DB" } },
        },
      };
    }

    // Format date-like values as text to prevent Excel auto-formatting
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        if (ws[addr] && ws[addr].v !== undefined) {
          ws[addr].s = {
            alignment: { horizontal: "left", vertical: "center" },
            font: { sz: 11 },
          };
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, reportType);
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${reportType}-report-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
