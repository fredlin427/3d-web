"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Eye, Pencil, Trash2, Download, Upload, Loader2, CheckCircle2, AlertTriangle, Clock, Package, Layers, TrendingDown, CalendarX } from "lucide-react";
import { CaseUsagePopover } from "@/components/materials/case-usage-popover";
import { cn, formatDate, getStockAlertStatus, getStockStatusColor } from "@/lib/utils";
import { useSWRConfig } from "swr";
import { useAPI, apiUrl } from "@/lib/swr-config";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CATEGORIES = [
  { key: "", label: "All" },
  { key: "FDM Filaments", label: "FDM" },
  { key: "SLA Resins", label: "SLA Resin" },
  { key: "Resin Tanks", label: "Tank" },
  { key: "IPA", label: "IPA" },
];

interface MaterialItem {
  id: string; category: string; materialName: string; brand: string | null;
  materialType: string | null; colour: string | null; batchNumber: string;
  materialId: string | null; productCode: string | null;
  initialQuantity: number; unusedQuantity: number; currentQuantity: number;
  unit: string; reorderThreshold: number;
  openDate: string | null; expiryDate: string | null; disposalDate: string | null;
  storageLocation: string | null; status: string;
  _count: { materialUsage: number; stockTransactions: number };
}

// ─── Stock bar: color-coded visual gauge ────────────────────────
function StockBar({ used, remain, total, unit }: { used: number; remain: number; total: number; unit: string }) {
  if (total <= 0) return <span className="text-xs text-slate-300">—</span>;
  const usedPct = Math.min(100, Math.round((used / total) * 100));
  const remainPct = 100 - usedPct;
  const barColor = remainPct <= 10 ? "bg-red-500" : remainPct <= 25 ? "bg-amber-500" : "bg-emerald-500";
  const usedColor = usedPct > 80 ? "bg-red-400" : usedPct > 50 ? "bg-amber-400" : "bg-blue-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 flex h-2 rounded-full bg-slate-100 overflow-hidden min-w-[60px]">
        <div className={cn("transition-all", usedColor)} style={{ width: `${usedPct}%` }} />
        <div className={cn("transition-all", barColor)} style={{ width: `${remainPct}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-700 tabular-nums whitespace-nowrap">{remain} {unit}</span>
    </div>
  );
}

function MaterialsPageInner() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const ALL_MAT_COLUMNS = ["Material", "Brand / Type", "Batch", "Capacity", "Remaining", "Location", "Expiry"];
  const [visibleMatCols, setVisibleMatCols] = useState([
    "Material", "Brand / Type", "Capacity", "Remaining", "Expiry",
  ]);
  const [expandedMatStat, setExpandedMatStat] = useState<string | null>(null);
  const { mutate: globalMutate } = useSWRConfig();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const sp = useSearchParams();
  // Unified filters — init from URL params
  const [matFilters, setMatFilters] = useState<{ field: string; value: string }[]>(() => {
    const init: { field: string; value: string }[] = [];
    const known = new Set(["category","search","dateFrom","dateTo","page","pageSize"]);
    sp.forEach((value, key) => { if (!known.has(key) && value) init.push({ field: key, value }); });
    return init;
  });
  const [matAddField, setMatAddField] = useState("");
  const [matAddValue, setMatAddValue] = useState("");
  const [matFilterOpts, setMatFilterOpts] = useState<Record<string, string[]>>({});
  useEffect(() => {
    // Load from settings — map settings types to API field names
    const typeMap: Record<string, string> = { material_category: "category", material_status: "status", material_unit: "unit" };
    fetch("/api/settings").then(r => r.json()).then(j => {
      if (j.success) {
        const map: Record<string, string[]> = {};
        for (const item of j.data) {
          const field = typeMap[item.type] || item.type;
          if (item.isActive && field !== item.type && !item.type.endsWith("_form_field")) {
            if (!map[field]) map[field] = [];
            if (!map[field].includes(item.value)) map[field].push(item.value);
          }
        }
        setMatFilterOpts(map);
      }
    }).catch(console.error);
    // Also load distinct values from actual materials data
    fetch("/api/materials").then(r => r.json()).then(j => {
      if (j.success) {
        const fields = ["brand","supplier","storageLocation","colour","materialType"];
        const map: Record<string, string[]> = {};
        for (const m of j.data) {
          for (const f of fields) {
            const v = m[f];
            if (v) {
              if (!map[f]) map[f] = [];
              if (!map[f].includes(v)) map[f].push(v);
            }
          }
        }
        setMatFilterOpts(prev => ({ ...prev, ...map }));
      }
    }).catch(console.error);
  }, []);

  // SWR: current category for table display
  const filterParams: Record<string, string> = { category: activeCat };
  if (search) filterParams.search = search;
  matFilters.forEach(f => { filterParams[f.field] = f.value; });
  // Pass date params from URL (from chart drill-down)
  const urlDateFrom = sp.get("dateFrom"); if (urlDateFrom) filterParams.dateFrom = urlDateFrom;
  const urlDateTo = sp.get("dateTo"); if (urlDateTo) filterParams.dateTo = urlDateTo;
  const swrKey = apiUrl("/api/materials", filterParams);
  const { data: swrData, isLoading, error, mutate } = useAPI<{ success: boolean; data: MaterialItem[] }>(swrKey);
  const materials = swrData?.success ? swrData.data : [];
  const loading = isLoading;
  if (error) console.error("Materials fetch error:", error);

  // Separate fetch for ALL materials counts (no category filter)
  const { data: allData } = useAPI<{ success: boolean; data: MaterialItem[] }>("/api/materials");
  const allMaterials = allData?.success ? allData.data : [];

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/materials/${deleteId}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || "Delete failed"); }
      toast.success("Deleted"); setDeleteId(null); mutate();
    } catch (e) { console.error(e); toast.error("Failed to delete"); }
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
        if (json.success) { setImportResult(json.data); toast.success(`${json.data.updatedItems} updated`); mutate(); }
        else toast.error(json.error || "Import failed");
      })
      .catch((e) => { console.error(e); toast.error("Failed to import file"); })
      .finally(() => setImporting(false));
  };

  // ─── Summary stats ─────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = Date.now();
    const thirtyDays = now + 30 * 24 * 60 * 60 * 1000;
    const data = allMaterials.length > 0 ? allMaterials : materials;
    return {
      total: data.length,
      lowStock: data.filter((m) => m.status === "Low stock").length,
      expired: data.filter((m) => m.status === "Expired").length,
      expiringSoon: data.filter((m) => m.expiryDate && new Date(m.expiryDate).getTime() <= thirtyDays && m.status !== "Expired").length,
      opened: data.filter((m) => m.status === "Opened").length,
      totalWeight: data.reduce((s, m) => s + (m.initialQuantity || 0), 0),
      totalRemain: data.reduce((s, m) => s + (m.currentQuantity || 0), 0),
    };
  }, [materials, allMaterials]);

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
      key: "status", header: "", className: "w-10",
      render: (m) => {
        const icon = m.status === "Expired" ? <CalendarX className="h-4 w-4 text-red-500" />
          : m.status === "Low stock" ? <AlertTriangle className="h-4 w-4 text-amber-500" />
          : m.status === "Opened" ? <Package className="h-4 w-4 text-blue-500" />
          : m.status === "Disposed" ? <Trash2 className="h-4 w-4 text-slate-400" />
          : <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
        return <div title={m.status}>{icon}</div>;
      },
    },
    { key: "materialName", header: "Material", sortable: true, className: "min-w-[180px]", render: (m) => (
      <div className="space-y-0.5">
        <Link href={`/materials/${m.id}`} className="text-primary hover:text-primary/80 font-semibold text-sm hover:underline">{m.materialName}</Link>
        <div className="flex items-center gap-2">
          {m.materialId && <span className="text-[10px] font-mono text-slate-400 bg-slate-100 rounded px-1">{m.materialId}</span>}
          <CaseUsagePopover materialId={m.id} count={m._count?.materialUsage || 0} />
        </div>
      </div>
    )},
    { key: "brand", header: "Brand / Type", sortable: true, render: (m) => (
      <div className="text-sm">
        {m.brand && <span className="font-medium text-slate-700">{m.brand}</span>}
        {m.materialType && <span className="text-slate-400 ml-1">{m.materialType}</span>}
        {!m.brand && !m.materialType && <span className="text-slate-300">—</span>}
      </div>
    )},
    { key: "batchNumber", header: "Batch", render: (m) => <span className="text-xs font-mono text-slate-500">{m.batchNumber || "—"}</span> },
    // Capacity = initial amount + unit (Tank has no weight — show count)
    { key: "initialQuantity", header: "Capacity", sortable: true, render: (m) => (
      m.category === "Resin Tanks"
        ? <span className="text-sm tabular-nums">{m.initialQuantity} <span className="text-xs text-slate-400">tank{m.initialQuantity !== 1 ? 's' : ''}</span></span>
        : <span className="text-sm font-medium tabular-nums">{m.initialQuantity} <span className="text-xs text-slate-400">{m.unit}</span></span>
    )},
    { key: "currentQuantity", header: "Remaining", sortable: true, className: "min-w-[140px]", render: (m) => (
      m.category === "Resin Tanks" ? (
        <span className="text-sm tabular-nums">{m.currentQuantity} <span className="text-xs text-slate-400">in stock</span></span>
      ) : (
        <StockBar
          used={m.initialQuantity - m.currentQuantity}
          remain={m.currentQuantity}
          total={m.initialQuantity}
          unit={m.unit}
        />
      )
    )},
    { key: "storageLocation", header: "Location", render: (m) => <span className="text-xs text-slate-500">{m.storageLocation || "—"}</span> },
    { key: "expiryDate", header: "Expiry", sortable: true, render: (m) => {
      if (!m.expiryDate) return <span className="text-xs text-slate-300">—</span>;
      const d = new Date(m.expiryDate);
      const isExpired = d.getTime() < Date.now();
      const isSoon = d.getTime() < Date.now() + 30 * 24 * 60 * 60 * 1000;
      return <span className={cn("text-xs font-medium", isExpired ? "text-red-600" : isSoon ? "text-amber-600" : "text-slate-500")}>{formatDate(m.expiryDate)}</span>;
    }},
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Materials & Stock</h2>
          <p className="text-sm text-slate-500 mt-1">{activeCat || "All Categories"} · {stats.total} items</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" />Export</Button>
          <label className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors", importing ? "bg-slate-100 text-slate-400" : "bg-primary text-white hover:bg-primary/90")}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importing ? "Importing..." : "Import"}
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
          <span className="flex-1" />{activeCat && <span className="text-xs text-slate-400">{activeCat}</span>}
          <Link href="/materials/new"><Button size="sm" className="gap-2 bg-primary hover:bg-primary/90"><Plus className="h-4 w-4" />New</Button></Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Total", value: stats.total, icon: Layers, color: "#4f46e5", bg: "#eef0ff" },
          { label: "In Stock", value: stats.total - stats.lowStock - stats.expired - stats.opened, icon: CheckCircle2, color: "#10b981", bg: "#ecfdf5" },
          { label: "Opened", value: stats.opened, icon: Package, color: "#3b82f6", bg: "#eff6ff" },
          { label: "Low Stock", value: stats.lowStock, icon: TrendingDown, color: "#f59e0b", bg: "#fffbeb" },
          { label: "Expired", value: stats.expired, icon: CalendarX, color: "#ef4444", bg: "#fef2f2" },
          { label: "Expiring Soon", value: stats.expiringSoon, icon: Clock, color: "#f97316", bg: "#fff7ed" },
          { label: "Total Remain", value: `${stats.totalRemain}`, icon: Package, color: "#8b5cf6", bg: "#f5f3ff", suffix: "" },
        ].map((s) => (
          <Card key={s.label} className="border-0 border overflow-hidden cursor-pointer hover:shadow-md transition-all"
            onClick={() => setExpandedMatStat(expandedMatStat === s.label ? null : s.label)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: s.bg }}>
                  <s.icon className="h-4 w-4" style={{ color: s.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[21px] font-bold tracking-tight text-slate-900 tabular-nums leading-none">{s.value}{s.suffix || ""}</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Import result */}
      {importResult && (
        <div className={cn("rounded-xl p-4 flex items-center gap-4", importResult.errors.length > 0 ? "bg-amber-50 border border-amber-200" : "bg-emerald-50 border border-emerald-200")}>
          <CheckCircle2 className={cn("h-5 w-5", importResult.errors.length > 0 ? "text-amber-500" : "text-emerald-500")} />
          <div className="flex-1"><p className="text-sm font-semibold text-slate-700">{importResult.updatedItems} of {importResult.totalRows} rows updated</p>{importResult.errors.length > 0 && <p className="text-xs text-amber-600">{importResult.errors.length} errors</p>}</div>
          <Button variant="ghost" size="sm" onClick={() => setImportResult(null)}>Dismiss</Button>
        </div>
      )}

      {/* Expanded stat panel */}
      {expandedMatStat && (
        <Card className="border-0 shadow-sm ring-1 ring-blue-100">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700">{expandedMatStat}</CardTitle>
            <div className="flex items-center gap-3">
              {expandedMatStat !== "Total" && expandedMatStat !== "Total Remain" && expandedMatStat !== "Expiring Soon" && (
                <Link href={`/materials?status=${encodeURIComponent(expandedMatStat)}`} className="text-xs text-blue-500 hover:text-blue-700 font-medium">View all →</Link>
              )}
              <button onClick={() => setExpandedMatStat(null)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const statusMap: Record<string, string> = { "Total": "", "In Stock": "In stock", "Opened": "Opened", "Low Stock": "Low stock", "Expired": "Expired" };
              const status = statusMap[expandedMatStat];
              const filtered = status ? (allMaterials || materials).filter((m: any) => m.status === status) : (allMaterials || materials);
              if (expandedMatStat === "Expiring Soon") {
                const expiring = (allMaterials || materials).filter((m: any) => m.expiryDate && new Date(m.expiryDate) <= new Date(Date.now() + 30*86400000) && m.status !== "Expired");
                if (expiring.length === 0) return <p className="text-sm text-slate-400 py-4 text-center">No expiring items</p>;
                return <div className="grid grid-cols-1 md:grid-cols-3 gap-2">{expiring.slice(0,12).map((m: any) => (
                  <Link key={m.id} href={`/materials/${m.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 ring-1 ring-slate-100">
                    <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{m.materialName}</p><p className="text-xs text-slate-500">{m.currentQuantity}{m.unit} · expires {m.expiryDate?.split('T')[0]}</p></div>
                  </Link>
                ))}</div>;
              }
              if (expandedMatStat === "Total Remain") {
                return <p className="text-sm text-slate-400 py-4 text-center">Total remaining: {stats.totalRemain}</p>;
              }
              if (filtered.length === 0) return <p className="text-sm text-slate-400 py-4 text-center">No materials</p>;
              return <div className="grid grid-cols-1 md:grid-cols-3 gap-2">{filtered.slice(0,12).map((m: any) => (
                <Link key={m.id} href={`/materials/${m.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 ring-1 ring-slate-100">
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{m.materialName}</p><p className="text-xs text-slate-500">{m.currentQuantity}{m.unit} · {m.brand || m.category}</p></div>
                </Link>
              ))}</div>;
            })()}
          </CardContent>
        </Card>
      )}

      {/* Category tabs with counts */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {CATEGORIES.map((c) => {
          const count = c.key === "" ? allMaterials.length : allMaterials.filter((m) => m.category === c.key).length || materials.filter((m) => m.category === c.key).length;
          return (
            <button key={c.key} onClick={() => { setActiveCat(c.key); setImportResult(null); }}
              className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2", activeCat === c.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              {c.label}
              <span className={cn("text-[10px] rounded-full px-1.5 py-0.5 font-bold", activeCat === c.key ? "bg-blue-100 text-primary" : "bg-slate-200 text-slate-400")}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
          <span className="text-sm font-semibold text-blue-700">{selectedIds.length} material{selectedIds.length > 1 ? 's' : ''} selected</span>
          <div className="flex-1" />
          <button type="button" onClick={() => setSelectedIds([])} className="text-xs text-slate-500 hover:text-slate-700 font-medium">Clear</button>
          <button type="button" disabled={bulkDeleting}
            onClick={async () => {
              if (!confirm(`Delete ${selectedIds.length} selected materials?`)) return;
              setBulkDeleting(true);
              let deleted = 0;
              const idsToDelete = new Set(selectedIds);
              for (const id of selectedIds) { try { await fetch(`/api/materials/${id}`, { method: 'DELETE' }); deleted++; } catch (e) { console.error(e); } }
              toast.success(`Deleted ${deleted} materials`);
              setSelectedIds([]); setBulkDeleting(false);
              // Invalidate all material cache keys
              globalMutate((key) => typeof key === 'string' && key.includes('/api/materials'));
            }}
            className="px-4 py-1.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50">
            {bulkDeleting ? 'Deleting...' : `Delete ${selectedIds.length}`}
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Filter</span>
        <Select value={matAddField} onValueChange={(v) => { setMatAddField(v || ""); setMatAddValue(""); }}>
          <SelectTrigger className="w-[120px] h-8 text-xs border-slate-200"><SelectValue placeholder="Field..." /></SelectTrigger>
          <SelectContent>
            {Object.keys(matFilterOpts).map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
          </SelectContent>
        </Select>
        {matAddField && (
          <Select value={matAddValue} onValueChange={(v) => { if (v) { setMatFilters(prev => [...prev, { field: matAddField, value: v }]); setMatAddField(""); setMatAddValue(""); } }}>
            <SelectTrigger className="w-[140px] h-8 text-xs border-slate-200"><SelectValue placeholder="Value..." /></SelectTrigger>
            <SelectContent>
              {(matFilterOpts[matAddField] || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {matFilters.map((f, i) => (
          <span key={`${f.field}-${f.value}`} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-blue-50 border border-blue-100">
            <span className="text-[10px] text-blue-400 uppercase">{f.field}:</span>
            <span className="text-slate-700">{f.value}</span>
            <button onClick={() => setMatFilters(prev => prev.filter((_, j) => j !== i))} className="ml-0.5 w-4 h-4 rounded-full hover:bg-red-100 hover:text-red-500 flex items-center justify-center text-slate-300 transition-colors">×</button>
          </span>
        ))}
        {matFilters.length > 0 && (
          <button onClick={() => setMatFilters([])} className="text-[11px] text-slate-400 hover:text-red-500 font-medium ml-1 transition-colors">Clear</button>
        )}
      </div>

      <DataTable
        data={materials} columns={columns} keyField="id"
        searchValue={search} onSearchChange={setSearch}
        searchPlaceholder="Search by name, batch, brand..."
        isLoading={loading && !error}
        emptyTitle={error ? "Failed to load materials" : `No ${activeCat || "material"} records`}
        pageSize={25}
        density="compact"
        selectable={{ selected: selectedIds, onChange: setSelectedIds }}
        columnPicker={{ columns: ALL_MAT_COLUMNS, selected: visibleMatCols, onChange: setVisibleMatCols }}
      />

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        title="Delete Material" description={`Delete "${deleteName}"?`}
        confirmLabel="Delete" variant="destructive" onConfirm={handleDelete} />
    </div>
  );
}

export default function MaterialsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-slate-400">Loading...</p></div>}>
      <MaterialsPageInner />
    </Suspense>
  );
}
