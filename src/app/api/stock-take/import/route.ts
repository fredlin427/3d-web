import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      // Fallback: try JSON body
      const body = await request.json().catch(() => null);
      if (body?.rows) {
        const { rows } = body;
        const result = await processRows(rows);
        return NextResponse.json({ success: true, data: result });
      }
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    // Parse XLSX
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

    if (jsonData.length < 2) {
      return NextResponse.json({ success: false, error: "File is empty" }, { status: 400 });
    }

    const headers = jsonData[0] as string[];
    const rows = jsonData.slice(1).map((row: any[]) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = String(row[i] ?? ""); });
      return {
        materialId: obj["Material ID"] || obj["materialId"] || undefined,
        batchNumber: obj["Batch Number"] || obj["Batch"] || obj["batchNumber"] || undefined,
        countedQuantity: parseFloat(obj["Remain"] || obj["Counted QTY"] || obj["Counted Quantity"] || obj["QTY"] || "0"),
        staffName: obj["Staff Name"] || obj["staffName"] || undefined,
        notes: obj["Notes"] || obj["Remarks"] || undefined,
      };
    });

    const result = await processRows(rows);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Import failed" }, { status: 500 });
  }
}

async function processRows(rows: Array<{ materialId?: string; batchNumber?: string; countedQuantity: number; staffName?: string; notes?: string }>) {
  const errors: { row: number; message: string }[] = [];
  let updatedItems = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // Excel row (1-indexed + header)

    if (!row.materialId && !row.batchNumber) {
      errors.push({ row: rowNum, message: "Material ID or Batch number required" });
      continue;
    }
    if (isNaN(row.countedQuantity) || row.countedQuantity < 0) {
      errors.push({ row: rowNum, message: "Counted quantity must be >= 0" });
      continue;
    }

    let material;
    if (row.materialId) {
      material = await prisma.material.findUnique({ where: { id: row.materialId } });
    } else if (row.batchNumber) {
      material = await prisma.material.findFirst({ where: { batchNumber: row.batchNumber } });
    }

    if (!material) {
      errors.push({ row: rowNum, message: `Material not found: ${row.materialId || row.batchNumber}` });
      continue;
    }

    const diff = row.countedQuantity - material.currentQuantity;
    await prisma.material.update({
      where: { id: material.id },
      data: {
        currentQuantity: row.countedQuantity,
        status: row.countedQuantity <= material.reorderThreshold && material.reorderThreshold > 0 ? "Low stock" : material.status === "Low stock" ? "In stock" : material.status,
      },
    });

    await prisma.stockTransaction.create({
      data: {
        materialId: material.id,
        transactionType: "Stock take adjustment",
        quantityChange: diff,
        quantityAfter: row.countedQuantity,
        transactionDate: new Date(),
        staffName: row.staffName || "System",
        notes: row.notes || "Stock take adjustment",
      },
    });

    updatedItems++;
  }

  return { totalRows: rows.length, updatedItems, errors, importedAt: new Date().toISOString() };
}
