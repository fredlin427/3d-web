import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const materials = await prisma.material.findMany({
      orderBy: [{ category: "asc" }, { materialName: "asc" }],
    });

    const columns = [
      "Material ID",
      "Category",
      "Material Name",
      "Brand",
      "Material Type",
      "Colour",
      "Batch Number",
      "Current Quantity",
      "Unit",
      "Storage Location",
      "Status",
      "Expiry Date",
      "Remarks",
    ];

    const header = columns.join(",");
    const rows = materials.map((m) => {
      const vals = [
        m.id,
        m.category,
        m.materialName,
        m.brand || "",
        m.materialType || "",
        m.colour || "",
        m.batchNumber,
        m.currentQuantity,
        m.unit,
        m.storageLocation || "",
        m.status,
        m.expiryDate ? new Date(m.expiryDate).toLocaleDateString("en-GB") : "",
        m.remarks || "",
      ];
      return vals
        .map((v) => {
          const str = String(v);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",");
    });

    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="stock-take-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to export stock take" },
      { status: 500 }
    );
  }
}
