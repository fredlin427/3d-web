import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

function fmt(d: Date | string | null): string {
  if (!d) return "";
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cat = searchParams.get("category") || "";

    const where: any = cat ? { category: cat } : {};
    const materials = await prisma.material.findMany({
      where,
      orderBy: [{ category: "asc" }, { materialName: "asc" }],
    });

    const t: Record<string, { columns: string[]; mapRow: (m: any) => any[] }> = {
      "FDM Filaments": {
        columns: ["#", "Material Name", "Brand", "Type", "Colour", "Batch", "Order Date", "Supplier", "QTY", "Unit", "Status", "Open Date", "Expiry Date", "Storage", "Remarks"],
        mapRow: (m) => ["", m.materialName, m.brand || "", m.materialType || "", m.colour || "", m.batchNumber, fmt(m.purchaseDate), m.supplier || "", m.currentQuantity, m.unit, m.status, fmt(m.openDate), fmt(m.expiryDate), m.storageLocation || "", m.remarks || ""],
      },
      "SLA Resins": {
        columns: ["#", "Material Name", "Brand", "Type", "Colour", "Batch", "Order Date", "Arrival Date", "Product Code", "Supplier", "QTY", "Unit", "Status", "Open Date", "Expiry Date", "Storage", "Remarks"],
        mapRow: (m) => ["", m.materialName, m.brand || "", m.materialType || "", m.colour || "", m.batchNumber, fmt(m.purchaseDate), fmt(m.receivedDate), "", m.supplier || "", m.currentQuantity, m.unit, m.status, fmt(m.openDate), fmt(m.expiryDate), m.storageLocation || "", m.remarks || ""],
      },
      "Resin Tanks": {
        columns: ["#", "Tank ID", "Batch", "Order Date", "Arrival Date", "Product Code", "Product Name", "Supplier", "Status", "Open Date", "Resin Type", "Disposal Date", "Remarks"],
        mapRow: (m) => ["", m.batchNumber, m.batchNumber, fmt(m.purchaseDate), fmt(m.receivedDate), "", m.materialName, m.supplier || "", m.status, fmt(m.openDate), m.materialType || "", fmt(m.disposalDate), m.remarks || ""],
      },
      IPA: {
        columns: ["#", "Batch", "Order Date", "Arrival Date", "Product Name", "Supplier", "Volume/Bottle (L)", "Expiry Date", "QTY", "Used", "Remain", "Remarks"],
        mapRow: (m) => ["", m.batchNumber, fmt(m.purchaseDate), fmt(m.receivedDate), m.materialName, m.supplier || "", "", fmt(m.expiryDate), m.initialQuantity, Math.max(0, m.initialQuantity - m.currentQuantity), m.currentQuantity, m.remarks || ""],
      },
    };

    const tmpl = t[cat] || {
      columns: ["Material ID", "Category", "Material Name", "Brand", "Type", "Colour", "Batch", "QTY", "Unit", "Storage", "Status", "Expiry", "Remarks"],
      mapRow: (m: any) => [m.id, m.category, m.materialName, m.brand || "", m.materialType || "", m.colour || "", m.batchNumber, m.currentQuantity, m.unit, m.storageLocation || "", m.status, fmt(m.expiryDate), m.remarks || ""],
    };

    const SIGNATURE_ROWS = [
      [""],
      ["Checked by:", "", "", "Date:", ""],
      ["Verified by:", "", "", "Date:", ""],
    ];
    const bodyData = materials.map(tmpl.mapRow);
    const data = [tmpl.columns, ...bodyData, ...SIGNATURE_ROWS];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = tmpl.columns.map(() => ({ wch: 16 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, cat || "Stock Take");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const filename = `stock-take-${(cat || "all").toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.xlsx`;

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Export failed" }, { status: 500 });
  }
}
