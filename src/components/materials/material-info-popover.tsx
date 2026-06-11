"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatDate, getStockStatusColor } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface MaterialInfo {
  id: string;
  materialName: string;
  category: string;
  batchNumber: string;
  brand: string | null;
  currentQuantity: number;
  unit: string;
  status: string;
  storageLocation: string | null;
  expiryDate: string | null;
}

export function MaterialInfoPopover({ materialId, name }: { materialId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<MaterialInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<any>(null);

  const fetchInfo = async () => {
    if (info) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/materials/${materialId}`);
      const json = await res.json();
      if (json.success) {
        const m = json.data;
        setInfo({
          id: m.id, materialName: m.materialName, category: m.category,
          batchNumber: m.batchNumber, brand: m.brand,
          currentQuantity: m.currentQuantity, unit: m.unit,
          status: m.status, storageLocation: m.storageLocation,
          expiryDate: m.expiryDate,
        });
      }
    } catch { /* */ }
    finally { setLoading(false); }
  };

  return (
    <span className="relative inline-flex" onMouseEnter={() => { timerRef.current = setTimeout(() => { setOpen(true); fetchInfo(); }, 300); }} onMouseLeave={() => { clearTimeout(timerRef.current); setTimeout(() => setOpen(false), 200); }}>
      <span className="text-indigo-600 font-medium text-sm cursor-default hover:underline">{name}</span>

      {open && (
        <div className="absolute z-50 left-0 top-full mt-2 w-72 rounded-xl border bg-white shadow-xl animate-in fade-in-0 zoom-in-95 duration-150"
          onMouseEnter={() => clearTimeout(timerRef.current)}
          onMouseLeave={() => setOpen(false)}
        >
          <div className="p-3 border-b"><p className="text-xs font-semibold text-slate-700">Material Details</p></div>
          <div className="p-3">
            {loading ? (
              <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
            ) : info ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <Link href={`/materials/${info.id}`} className="text-sm font-semibold text-indigo-600 hover:underline">{info.materialName} →</Link>
                  <Badge className={cn(getStockStatusColor(info.status), "border text-[10px]")} variant="outline">{info.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-slate-500">
                  <span>Category:</span><span className="font-medium text-slate-700">{info.category}</span>
                  <span>Batch:</span><span className="font-medium text-slate-700 font-mono">{info.batchNumber}</span>
                  {info.brand && <><span>Brand:</span><span className="font-medium text-slate-700">{info.brand}</span></>}
                  <span>QTY:</span><span className="font-medium text-slate-700">{info.currentQuantity} {info.unit}</span>
                  <span>Location:</span><span className="font-medium text-slate-700">{info.storageLocation || "—"}</span>
                  <span>Expiry:</span><span className="font-medium text-slate-700">{formatDate(info.expiryDate)}</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </span>
  );
}
