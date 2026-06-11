"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { MaterialForm } from "@/components/materials/material-form";
import { LoadingState } from "@/components/shared/loading-state";

export default function EditMaterialPage() {
  const params = useParams();
  const materialId = params.id as string;
  const [defaultValues, setDefaultValues] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/materials/${materialId}`);
        const json = await res.json();
        if (json.success) {
        const m = json.data;
        setDefaultValues({
          category: m.category,
          materialName: m.materialName,
          productCode: m.productCode || "",
          brand: m.brand || "",
          materialType: m.materialType || "",
          compatiblePrinter: m.compatiblePrinter || "",
          colour: m.colour || "",
          diameter: m.diameter ?? "",
          batchNumber: m.batchNumber || "",
          supplier: m.supplier || "",
          purchaseDate: m.purchaseDate ? new Date(m.purchaseDate).toISOString().split("T")[0] : "",
          receivedDate: m.receivedDate ? new Date(m.receivedDate).toISOString().split("T")[0] : "",
          openDate: m.openDate ? new Date(m.openDate).toISOString().split("T")[0] : "",
          expiryDate: m.expiryDate ? new Date(m.expiryDate).toISOString().split("T")[0] : "",
          disposalDate: m.disposalDate ? new Date(m.disposalDate).toISOString().split("T")[0] : "",
          manufacturingDate: m.manufacturingDate ? new Date(m.manufacturingDate).toISOString().split("T")[0] : "",
          initialQuantity: m.initialQuantity,
          currentQuantity: m.currentQuantity,
          unusedQuantity: m.unusedQuantity ?? 0,
          openedQuantity: m.openedQuantity ?? 0,
          expiredQuantity: m.expiredQuantity ?? 0,
          unit: m.unit,
          reorderThreshold: m.reorderThreshold,
          storageLocation: m.storageLocation || "",
          status: m.status,
          remarks: m.remarks || "",
        });
        }
      } catch {
        // keep defaultValues null
      }
    }
    load();
  }, [materialId]);

  if (!defaultValues) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Edit Material</h2>
        <p className="text-sm text-slate-500 mt-1">Edit material stock record</p>
      </div>
      <MaterialForm defaultValues={defaultValues} isEditing materialId={materialId} />
    </div>
  );
}
