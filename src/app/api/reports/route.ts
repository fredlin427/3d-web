import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "cases";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const department = searchParams.get("department") || "";
    const useType = searchParams.get("useType") || "";
    const materialCategory = searchParams.get("materialCategory") || "";
    const status = searchParams.get("status") || "";

    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);

    let data: Record<string, unknown>[] = [];
    let columns: string[] = [];

    switch (reportType) {
      case "cases": {
        const where: Record<string, unknown> = {};
        if (dateFrom || dateTo) where.applicationDate = dateFilter;
        if (department) where.department = department;
        if (useType) where.useType = useType;
        if (status) where.currentStatus = status;

        const cases = await prisma.case.findMany({
          where,
          orderBy: { applicationDate: "desc" },
        });

        columns = [
          "Case Number",
          "Application Date",
          "Department",
          "Applicant Name",
          "Use Type",
          "Project Title",
          "Priority",
          "Current Status",
          "Current Progress",
          "Created At",
        ];

        data = cases.map((c) => ({
          "Case Number": c.caseNumber,
          "Application Date": c.applicationDate.toISOString().split("T")[0],
          Department: c.department,
          "Applicant Name": c.applicantName,
          "Use Type": c.useType,
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
          "Date",
          "Case Number",
          "Department",
          "Material",
          "Category",
          "Batch Number",
          "Quantity Used",
          "Unit",
          "Staff",
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
          "Date",
          "Material",
          "Category",
          "Batch Number",
          "Transaction Type",
          "Quantity Change",
          "Quantity After",
          "Staff",
          "Notes",
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

      case "departments":
      case "use-types": {
        const groupField = reportType === "departments" ? "department" : "useType";
        const caseWhere2: Record<string, unknown> = {};
        if (dateFrom || dateTo) caseWhere2.applicationDate = dateFilter;

        const groups = await prisma.case.groupBy({
          by: [groupField as "department" | "useType"],
          where: caseWhere2,
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
        });

        const label = reportType === "departments" ? "Department" : "Use Type";
        columns = [label, "Count"];

        data = groups.map((g) => ({
          [label]: g[groupField as keyof typeof g],
          Count: g._count.id,
        }));
        break;
      }
    }

    // Generate CSV
    const header = columns.join(",");
    const rows = data.map((row) =>
      columns
        .map((col) => {
          const val = String(row[col] ?? "");
          if (val.includes(",") || val.includes('"') || val.includes("\n")) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(",")
    );
    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${reportType}-report-${new Date().toISOString().split("T")[0]}.csv"`,
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
