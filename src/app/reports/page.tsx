"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColumnPicker } from "@/components/reports/column-picker";
import { PreviewTable } from "@/components/reports/preview-table";
import { toast } from "sonner";
import {
  Download, FileText, Package, ArrowDownUp, Building2, Tag,
  Layers, AlertTriangle, CalendarCheck, ShieldCheck,
  Printer, Bookmark, BookmarkCheck, RotateCcw, Loader2, Eye, EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Report Type Definitions ──────────────────────────────────
const REPORT_TYPES = [
  { key: "cases", title: "Case Records", desc: "All case data with filters", icon: FileText, group: "Cases" },
  { key: "departments", title: "By Department", desc: "Case counts grouped by department", icon: Building2, group: "Cases" },
  { key: "categories", title: "By Category", desc: "Case counts grouped by category", icon: Tag, group: "Cases" },
  { key: "material-usage", title: "Material Usage", desc: "Usage records linked to cases", icon: Package, group: "Materials" },
  { key: "stock-transactions", title: "Stock Transactions", desc: "All quantity change history", icon: ArrowDownUp, group: "Materials" },
  { key: "stock-level", title: "Stock Levels", desc: "Current inventory snapshot", icon: Layers, group: "Materials" },
  { key: "expiry", title: "Expiry & Disposal", desc: "Expiring or expired materials", icon: AlertTriangle, group: "Materials" },
  { key: "monthly-summary", title: "Monthly Summary", desc: "Aggregated monthly statistics", icon: CalendarCheck, group: "Summary" },
  { key: "audit", title: "Audit Trail", desc: "Full operation log export", icon: ShieldCheck, group: "Summary" },
];

const GROUPS = [
  { label: "Cases", icon: FileText },
  { label: "Materials", icon: Package },
  { label: "Summary", icon: CalendarCheck },
];

// ─── Filter Preset Type ───────────────────────────────────────
interface FilterPreset {
  name: string;
  reportType: string;
  dateFrom: string;
  dateTo: string;
  department: string;
  category: string;
  materialCategory: string;
  status: string;
  selectedColumns: string[];
}

const PRESETS_KEY = "report-filter-presets";

// ─── Main Page ────────────────────────────────────────────────
export default function ReportsPage() {
  // Report type
  const [reportType, setReportType] = useState("cases");

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState("");
  const [materialCategory, setMaterialCategory] = useState("");
  const [status, setStatus] = useState("");

  // Data
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Column selection
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  // View mode: "preview" | "print"
  const [viewMode, setViewMode] = useState<"preview" | "print">("preview");

  // Presets
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [showSavePreset, setShowSavePreset] = useState(false);

  // Settings data for filter dropdowns
  const [departments, setDepartments] = useState<string[]>([]);
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [matCats, setMatCats] = useState<string[]>([]);

  const printRef = useRef<HTMLDivElement>(null);

  // ─── Load settings for filter dropdowns ─────────────────────
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          const s = j.data as any[];
          setDepartments(s.filter((x: any) => x.type === "department" && x.isActive).map((x: any) => x.value));
          setCategoriesList(s.filter((x: any) => x.type === "case_category" && x.isActive).map((x: any) => x.value));
          // Material categories from all 4 types
          setMatCats(
            s.filter((x: any) =>
              ["fdm_material_type", "sla_product", "tank_product", "ipa_unit"].includes(x.type) ||
              x.type === "material_category"
            ).map((x: any) => x.value)
          );
        }
      })
      .catch((e) => { console.error(e); });
  }, []);

  // ─── Load presets from localStorage ─────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PRESETS_KEY);
      if (saved) setPresets(JSON.parse(saved));
    } catch (e) { console.error(e); }
  }, []);

  const savePresets = (p: FilterPreset[]) => {
    setPresets(p);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(p));
  };

  // ─── Fetch report data ──────────────────────────────────────
  const fetchReport = useCallback(async (type: string) => {
    setLoading(true);
    setHasLoaded(false);
    try {
      const params = new URLSearchParams();
      params.set("type", type);
      params.set("format", "json");
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (department) params.set("department", department);
      if (category) params.set("category", category);
      if (materialCategory) params.set("materialCategory", materialCategory);
      if (status) params.set("status", status);

      const res = await fetch(`/api/reports?${params}`);
      const json = await res.json();
      if (json.success) {
        setColumns(json.data.columns);
        setRows(json.data.rows);
        setSelectedColumns(json.data.columns); // Default: all selected
        setHasLoaded(true);
      } else {
        toast.error(json.error || "Failed to load report");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to fetch report data");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, department, category, materialCategory, status]);

  // Auto-fetch when report type changes
  useEffect(() => {
    fetchReport(reportType);
  }, [reportType]); // Only on type change — user clicks "Generate" for filter changes

  // ─── Export XLSX ────────────────────────────────────────────
  const exportXlsx = () => {
    const params = new URLSearchParams();
    params.set("type", reportType);
    params.set("format", "xlsx");
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (department) params.set("department", department);
    if (category) params.set("category", category);
    if (materialCategory) params.set("materialCategory", materialCategory);
    if (status) params.set("status", status);
    if (selectedColumns.length < columns.length) {
      params.set("columns", selectedColumns.join(","));
    }
    window.open(`/api/reports?${params}`, "_blank");
    toast.success("Report exported (XLSX)");
  };

  // ─── Print ──────────────────────────────────────────────────
  const handlePrint = () => {
    setViewMode("print");
    setTimeout(() => {
      window.print();
      setViewMode("preview");
    }, 200);
  };

  // ─── Presets ────────────────────────────────────────────────
  const saveCurrentPreset = () => {
    if (!presetName.trim()) return;
    const preset: FilterPreset = {
      name: presetName.trim(),
      reportType,
      dateFrom, dateTo, department, category, materialCategory, status,
      selectedColumns,
    };
    savePresets([...presets, preset]);
    setPresetName("");
    setShowSavePreset(false);
    toast.success(`Saved: "${preset.name}"`);
  };

  const loadPreset = (preset: FilterPreset) => {
    setReportType(preset.reportType);
    setDateFrom(preset.dateFrom);
    setDateTo(preset.dateTo);
    setDepartment(preset.department);
    setCategory(preset.category);
    setMaterialCategory(preset.materialCategory);
    setStatus(preset.status);
    // Fetch will trigger via reportType change, then set columns after load
    setTimeout(() => setSelectedColumns(preset.selectedColumns), 500);
    toast.success(`Loaded: "${preset.name}"`);
  };

  const deletePreset = (idx: number) => {
    const next = presets.filter((_, i) => i !== idx);
    savePresets(next);
  };

  const selected = REPORT_TYPES.find((r) => r.key === reportType);

  // ─── Determine which filters to show ────────────────────────
  const showDeptFilter = ["cases", "departments", "monthly-summary"].includes(reportType);
  const showCatFilter = ["cases", "categories"].includes(reportType);
  const showStatusFilter = ["cases", "stock-level"].includes(reportType);
  const showMatCatFilter = ["material-usage", "stock-level"].includes(reportType);

  // ─── Status options ─────────────────────────────────────────
  const statusOptions = reportType === "stock-level"
    ? ["In stock", "Low stock", "Opened", "Expired", "Disposed"]
    : ["Draft", "In progress", "On hold", "Completed", "Cancelled"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Reports</h2>
          <p className="text-sm text-slate-500 mt-1">Generate, preview, and export reports</p>
        </div>
        <div className="flex items-center gap-2">
          {presets.length > 0 && (
            <Select onValueChange={(v) => { if (v) { const p = presets.find((x) => x.name === v); if (p) loadPreset(p); } }}>
              <SelectTrigger className="h-9 w-[160px] bg-white text-xs">
                <SelectValue placeholder="Load preset..." />
              </SelectTrigger>
              <SelectContent>
                {presets.map((p, i) => (
                  <SelectItem key={i} value={p.name}>
                    <span className="flex items-center justify-between w-full">
                      {p.name}
                      <button
                        className="ml-2 text-[10px] text-red-400 hover:text-red-600"
                        onClick={(e) => { e.stopPropagation(); deletePreset(i); }}
                      >✕</button>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {showSavePreset ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Preset name..."
                className="h-9 w-[140px] text-sm border rounded-lg px-3 py-1.5 bg-white"
                onKeyDown={(e) => { if (e.key === "Enter") saveCurrentPreset(); if (e.key === "Escape") setShowSavePreset(false); }}
                autoFocus
              />
              <Button size="sm" className="h-9 gap-1 bg-indigo-600 hover:bg-indigo-700" onClick={saveCurrentPreset}>
                <BookmarkCheck className="h-3.5 w-3.5" />Save
              </Button>
              <Button size="sm" variant="ghost" className="h-9" onClick={() => setShowSavePreset(false)}>✕</Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="h-9 gap-2 bg-white" onClick={() => setShowSavePreset(true)}>
              <Bookmark className="h-4 w-4" />Save filters
            </Button>
          )}
        </div>
      </div>

      {/* Report type cards — grouped */}
      {GROUPS.map((group) => {
        const groupTypes = REPORT_TYPES.filter((r) => r.group === group.label);
        if (groupTypes.length === 0) return null;
        return (
          <div key={group.label} className="space-y-2">
            <div className="flex items-center gap-2">
              <group.icon className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{group.label} Reports</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {groupTypes.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setReportType(r.key)}
                  className={cn(
                    "text-left p-4 rounded-xl border-2 transition-all duration-150",
                    reportType === r.key
                      ? "border-indigo-500 bg-indigo-50 shadow-sm"
                      : "border-transparent bg-white shadow-sm hover:border-slate-200 hover:shadow"
                  )}
                >
                  <r.icon className={cn("h-6 w-6 mb-2", reportType === r.key ? "text-indigo-600" : "text-slate-400")} />
                  <p className="text-sm font-semibold text-slate-700">{r.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {selected && <selected.icon className="h-5 w-5 text-indigo-500" />}
            {selected?.title} — Filters & Export
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 uppercase">From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="w-[150px] h-9 text-sm border rounded-lg px-3 py-1.5 bg-white" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 uppercase">To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="w-[150px] h-9 text-sm border rounded-lg px-3 py-1.5 bg-white" />
            </div>
            {showDeptFilter && (
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 uppercase">Dept</label>
                <Select value={department} onValueChange={(v) => { if (v) setDepartment(v); }}>
                  <SelectTrigger className="h-9 w-[160px] bg-white"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {showCatFilter && (
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 uppercase">Category</label>
                <Select value={category} onValueChange={(v) => { if (v) setCategory(v); }}>
                  <SelectTrigger className="h-9 w-[160px] bg-white"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {categoriesList.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {showStatusFilter && (
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 uppercase">Status</label>
                <Select value={status} onValueChange={(v) => { if (v) setStatus(v); }}>
                  <SelectTrigger className="h-9 w-[160px] bg-white"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {showMatCatFilter && (
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 uppercase">Mat. Cat</label>
                <Select value={materialCategory} onValueChange={(v) => { if (v) setMaterialCategory(v); }}>
                  <SelectTrigger className="h-9 w-[160px] bg-white"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {matCats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={() => fetchReport(reportType)} disabled={loading} className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Generate
            </Button>
          </div>

          {/* Action bar */}
          {hasLoaded && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <ColumnPicker columns={columns} selected={selectedColumns} onChange={setSelectedColumns} />
              <Button variant="outline" size="sm" className="h-9 gap-2 bg-white" onClick={exportXlsx}>
                <Download className="h-4 w-4" />Export XLSX
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-2 bg-white" onClick={handlePrint}>
                <Printer className="h-4 w-4" />Print
              </Button>
              <div className="flex-1" />
              <span className="text-xs text-slate-400 tabular-nums">
                {rows.length.toLocaleString()} total rows
                {selectedColumns.length < columns.length && ` · ${selectedColumns.length}/${columns.length} columns`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview / Print view */}
      {viewMode === "print" ? (
        <div ref={printRef} className="print-view">
          <div className="hidden print:block print:mb-4">
            <h1 className="text-xl font-bold">{selected?.title} Report</h1>
            <p className="text-sm text-slate-500">
              Generated: {new Date().toLocaleDateString("en-GB")}
              {dateFrom && ` · From: ${dateFrom}`}
              {dateTo && ` · To: ${dateTo}`}
              {department && ` · Dept: ${department}`}
            </p>
          </div>
          <PreviewTable columns={selectedColumns} rows={rows} loading={loading} />
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
              {hasLoaded ? (
                <>Preview <span className="text-xs text-slate-400 font-normal">({rows.length} rows)</span></>
              ) : (
                <span className="text-sm text-slate-400 font-normal">Select report type and click Generate to preview data</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasLoaded ? (
              <PreviewTable columns={selectedColumns} rows={rows} loading={loading} />
            ) : (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <FileText className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">Choose a report type above and click <strong>Generate</strong></p>
                  <p className="text-xs text-slate-300 mt-1">Data will appear here before export</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-view, .print-view * { visibility: visible; }
          .print-view { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .print-view table { font-size: 11px; }
          .print-view th { background: #f8f9fa !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
