"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/shared/data-table";
import { toast } from "sonner";
import { Download, Upload, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn, formatDate, getStockStatusColor } from "@/lib/utils";

const CATEGORIES = [
  { key: "FDM Filaments", label: "FDM Filaments" },
  { key: "SLA Resins", label: "SLA Resins" },
  { key: "Resin Tanks", label: "Resin Tanks" },
  { key: "IPA", label: "IPA" },
];

export default function StockTakePage() {
  const [activeCat, setActiveCat] = useState("FDM Filaments");
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const fetchMaterials = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("category", activeCat);
    if (search) params.set("search", search);
    fetch(`/api/materials?${params}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setMaterials(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMaterials(); }, [activeCat, search]);

  const handleExport = () => {
    window.open(`/api/stock-take/export?category=${encodeURIComponent(activeCat)}`, "_blank");
    toast.success(`${activeCat} exported`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setResult(null);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.trim().split("\n");
        const headers = lines[0].split(",").map((h: string) => h.trim().replace(/"/g, ""));
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(",").map((v: string) => v.trim().replace(/"/g, ""));
          const row: Record<string, string> = {};
          headers.forEach((h: string, idx: number) => { row[h] = vals[idx] || ""; });
          rows.push({
            materialId: row["Material ID"] || undefined,
            batchNumber: row["Batch Number"] || row["Batch"] || row["batchNumber"] || undefined,
            countedQuantity: parseFloat(row["Remain"] || row["Counted QTY"] || row["Counted Quantity"] || row["QTY"] || "0"),
            staffName: row["Staff Name"] || undefined,
            notes: row["Notes"] || row["Remarks"] || undefined,
          });
        }
        const res = await fetch("/api/stock-take/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
        const json = await res.json();
        if (json.success) { setResult(json.data); toast.success(`${json.data.updatedItems} items updated`); fetchMaterials(); }
        else toast.error(json.error || "Import failed");
      } catch { toast.error("Failed to parse CSV"); }
      finally { setImporting(false); }
    };
    reader.readAsText(file);
  };

  const columns: Column<any>[] = [
    { key: "materialName", header: "Material", sortable: true, render: (m) => <span className="font-medium text-sm">{m.materialName}</span> },
    { key: "brand", header: "Brand", render: (m) => <span className="text-xs">{m.brand || "—"}</span> },
    { key: "batchNumber", header: "Batch #", render: (m) => <span className="text-xs font-mono">{m.batchNumber}</span> },
    { key: "currentQuantity", header: "Counted QTY", render: (m) => <span className="text-sm font-bold tabular-nums">{m.currentQuantity} <span className="text-slate-400 font-normal text-xs">{m.unit}</span></span> },
    { key: "storageLocation", header: "Location", render: (m) => <span className="text-xs">{m.storageLocation || "—"}</span> },
    { key: "status", header: "Status", render: (m) => <Badge className={cn(getStockStatusColor(m.status), "border")} variant="outline">{m.status}</Badge> },
    { key: "expiryDate", header: "Expiry", render: (m) => <span className="text-xs">{formatDate(m.expiryDate)}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Stock Take</h2>
          <p className="text-sm text-slate-500 mt-1">Physical inventory count — export, count, import</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" className="gap-2"><Download className="h-4 w-4" />Export {activeCat}</Button>
          <label className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors", importing ? "bg-slate-100 text-slate-400" : "bg-indigo-600 text-white hover:bg-indigo-700")}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importing ? "Importing..." : "Import CSV"}
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => { setActiveCat(c.key); setResult(null); }}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150",
              activeCat === c.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Result banner */}
      {result && (
        <div className={cn("rounded-xl p-4 flex items-center gap-4", result.errors.length > 0 ? "bg-amber-50 border border-amber-200" : "bg-emerald-50 border border-emerald-200")}>
          <CheckCircle2 className={cn("h-6 w-6", result.errors.length > 0 ? "text-amber-500" : "text-emerald-500")} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-700">Import complete — {result.updatedItems} of {result.totalRows} rows updated</p>
            {result.errors.length > 0 && <p className="text-xs text-amber-600 mt-0.5">{result.errors.length} errors found</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setResult(null)}>Dismiss</Button>
        </div>
      )}

      {/* Main table — this IS the stock take */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <DataTable
            data={materials}
            columns={columns}
            keyField="id"
            isLoading={loading}
            emptyTitle={`No ${activeCat} materials`}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search materials..."
            pageSize={25}
          />
        </CardContent>
      </Card>
    </div>
  );
}
