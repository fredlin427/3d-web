"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Eye, Pencil, Trash2, Download, Upload, Loader2, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { CaseUsagePopover } from "@/components/materials/case-usage-popover";
import { cn, formatDate, getStockAlertStatus, getStockStatusColor } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CATEGORIES = [
  { key: "FDM Filaments", label: "FDM" },
  { key: "SLA Resins", label: "SLA Resin" },
  { key: "Resin Tanks", label: "Tank" },
  { key: "IPA", label: "IPA" },
];

interface MaterialItem {
  id: string; category: string; materialName: string; brand: string | null;
  materialType: string | null; colour: string | null; batchNumber: string;
  currentQuantity: number; unit: string; reorderThreshold: number;
  openDate: string | null; expiryDate: string | null; disposalDate: string | null;
  storageLocation: string | null; status: string;
  _count: { materialUsage: number; stockTransactions: number };
}

export default function MaterialsPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("FDM Filaments");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("category", activeCat);
      if (search) params.set("search", search);
      const res = await fetch(`/api/materials?${params}`);
      const json = await res.json();
      if (json.success) setMaterials(json.data);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [search, activeCat]);

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await fetch(`/api/materials/${deleteId}`, { method: "DELETE" });
      toast.success("Deleted"); setDeleteId(null); fetchMaterials();
    } catch { toast.error("Failed"); }
  };

  const handleExport = () => {
    window.open(`/api/stock-take/export?category=${encodeURIComponent(activeCat)}`, "_blank");
    toast.success(`${activeCat} exported`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImporting(true); setImportResult(null);
    const formData = new FormData();
    formData.append("file", file);
    fetch("/api/stock-take/import", { method: "POST", body: formData })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) { setImportResult(json.data); toast.success(`${json.data.updatedItems} updated`); fetchMaterials(); }
        else toast.error(json.error || "Import failed");
      })
      .catch(() => toast.error("Failed to import file"))
      .finally(() => setImporting(false));
  };

  const columns: Column<MaterialItem>[] = [
    {
      key: "actions", header: "", className: "w-10",
      render: (m) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-lg p-1.5 hover:bg-slate-100"><MoreHorizontal className="h-4 w-4 text-slate-400" /></DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => router.push(`/materials/${m.id}`)}><Eye className="mr-2 h-4 w-4" />View</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/materials/${m.id}/edit`)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={() => { setDeleteId(m.id); setDeleteName(m.materialName); }}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
    {
      key: "alerts", header: "", className: "w-8",
      render: (m) => { const a = getStockAlertStatus(m); if (!a || a.type === "ok") return null; return <div title={a.message}>{a.type === "danger" ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <Clock className="h-4 w-4 text-amber-500" />}</div>; },
    },
    { key: "materialName", header: "Material", sortable: true, render: (m) => (
      <div>
        <Link href={`/materials/${m.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium text-sm hover:underline">{m.materialName}</Link>
        <CaseUsagePopover materialId={m.id} count={m._count?.materialUsage || 0} />
      </div>
    )},
    { key: "brand", header: "Brand", render: (m) => <span className="text-sm">{m.brand || "—"}</span> },
    { key: "batchNumber", header: "Batch #", render: (m) => <span className="text-xs font-mono">{m.batchNumber}</span> },
    { key: "currentQuantity", header: "QTY", sortable: true, render: (m) => <span className="text-sm font-bold tabular-nums">{m.currentQuantity} <span className="text-slate-400 font-normal text-xs">{m.unit}</span></span> },
    { key: "status", header: "Status", sortable: true, render: (m) => <Badge className={cn(getStockStatusColor(m.status), "border")} variant="outline">{m.status}</Badge> },
    { key: "storageLocation", header: "Location", render: (m) => <span className="text-xs">{m.storageLocation || "—"}</span> },
    { key: "expiryDate", header: "Expiry", render: (m) => <span className="text-xs">{formatDate(m.expiryDate)}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Materials & Stock</h2>
          <p className="text-sm text-slate-500 mt-1">Manage inventory, export for stock-take, import counted quantities</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" />Export</Button>
          <label className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors", importing ? "bg-slate-100 text-slate-400" : "bg-indigo-600 text-white hover:bg-indigo-700")}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importing ? "Importing..." : "Import CSV"}
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
          <Link href="/materials/new"><Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700"><Plus className="h-4 w-4" />New</Button></Link>
        </div>
      </div>

      {/* Import result */}
      {importResult && (
        <div className={cn("rounded-xl p-4 flex items-center gap-4", importResult.errors.length > 0 ? "bg-amber-50 border border-amber-200" : "bg-emerald-50 border border-emerald-200")}>
          <CheckCircle2 className={cn("h-5 w-5", importResult.errors.length > 0 ? "text-amber-500" : "text-emerald-500")} />
          <div className="flex-1"><p className="text-sm font-semibold text-slate-700">{importResult.updatedItems} of {importResult.totalRows} rows updated</p>{importResult.errors.length > 0 && <p className="text-xs text-amber-600">{importResult.errors.length} errors</p>}</div>
          <Button variant="ghost" size="sm" onClick={() => setImportResult(null)}>Dismiss</Button>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {CATEGORIES.map((c) => (
          <button key={c.key} onClick={() => { setActiveCat(c.key); setImportResult(null); }}
            className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all", activeCat === c.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            {c.label}
          </button>
        ))}
      </div>

      <DataTable
        data={materials} columns={columns} keyField="id"
        searchValue={search} onSearchChange={setSearch}
        searchPlaceholder="Search by name, batch, brand..."
        isLoading={loading}
        emptyTitle={`No ${activeCat} materials`}
        pageSize={25}
      />

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        title="Delete Material" description={`Delete "${deleteName}"?`}
        confirmLabel="Delete" variant="destructive" onConfirm={handleDelete} />
    </div>
  );
}
