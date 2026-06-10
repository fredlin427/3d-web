import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rows: Array<{
      materialId?: string;
      batchNumber?: string;
      countedQuantity: number;
      staffName?: string;
      notes?: string;
    }> = body.rows;

    const errors: { row: number; message: string }[] = [];
    let updatedItems = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      // Validate
      if (!row.materialId && !row.batchNumber) {
        errors.push({ row: rowNum, message: "Material ID or Batch number is required" });
        continue;
      }

      if (row.countedQuantity == null || isNaN(row.countedQuantity) || row.countedQuantity < 0) {
        errors.push({ row: rowNum, message: "Counted quantity must be a number >= 0" });
        continue;
      }

      // Find material
      let material;
      if (row.materialId) {
        material = await prisma.material.findUnique({ where: { id: row.materialId } });
      } else if (row.batchNumber) {
        material = await prisma.material.findUnique({
          where: { batchNumber: row.batchNumber },
        });
      }

      if (!material) {
        errors.push({
          row: rowNum,
          message: `Material not found: ${row.materialId || row.batchNumber}`,
        });
        continue;
      }

      const diff = row.countedQuantity - material.currentQuantity;

      // Update material quantity
      await prisma.material.update({
        where: { id: material.id },
        data: {
          currentQuantity: row.countedQuantity,
          status:
            row.countedQuantity <= material.reorderThreshold && material.reorderThreshold > 0
              ? "Low stock"
              : material.status === "Low stock"
              ? "In stock"
              : material.status,
        },
      });

      // Create stock transaction
      await prisma.stockTransaction.create({
        data: {
          materialId: material.id,
          transactionType: "Stock take adjustment",
          quantityChange: diff,
          quantityAfter: row.countedQuantity,
          transactionDate: new Date(),
          staffName: row.staffName || "System",
          notes: row.notes || `Stock take adjustment`,
        },
      });

      updatedItems++;
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRows: rows.length,
        updatedItems,
        errors,
        importedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to import stock take" },
      { status: 500 }
    );
  }
}
