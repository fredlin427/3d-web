"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, getStatusBadgeVariant, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/shared/loading-state";
import { HierarchicalTable } from "@/components/charts/hierarchical-table";
import { toast } from "sonner";
import { FolderOpen, Clock, CheckCircle2, AlertTriangle, Package, TrendingDown, Download, ImageIcon, ArrowRight, Camera, Presentation, X, Database, Loader2 } from "lucide-react";
import Link from "next/link";
import { DEPARTMENT_LABELS } from "@/lib/constants";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from "recharts";
import { DEPARTMENTS, CATEGORIES } from "@/lib/constants";
import * as XLSX from "xlsx";

const CHART_COLORS = ["#4f46e5","#06b6d4","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#f97316","#84cc16"];

// Dynamic table config (same as chart-builder field registry)
const TABLE_SOURCE_FIELDS: Record<string, string[]> = {
  cases: ["department","category","purpose","currentStatus","priority","technician","printingParty","hospital","rank","modelType","requiredService"],
  usage: ["unit","staffName","printerOrTank","case.department","case.category","case.currentStatus","case.purpose","material.materialName","material.category","material.brand","material.status"],
};
const TABLE_FIELD_LABELS: Record<string, string> = {
  department: "Department", category: "Category", purpose: "Purpose",
  currentStatus: "Status", priority: "Priority", technician: "Technician",
  printingParty: "Printing Party", hospital: "Hospital",
  modelType: "Model Type", requiredService: "Required Service",
  unit: "Unit", staffName: "Staff", printerOrTank: "Printer/Tank",
  "case.department": "→ Case Dept", "case.category": "→ Case Category",
  "case.currentStatus": "→ Case Status", "case.purpose": "→ Case Purpose",
  "material.materialName": "→ Material", "material.category": "→ Mat Category",
  "material.brand": "→ Brand", "material.status": "→ Mat Status",
};
const TABLE_COLORS_24 = [
  "#4472C4","#ED7D31","#A5A5A5","#FFC000","#5B9BD5","#70AD47",
  "#F15C5C","#9B59B6","#1ABC9C","#E67E22","#2E75B6","#C55A11",
  "#7F7F7F","#A68A00","#3B6FB6","#D44C2B","#8C8C8C","#E5A800",
  "#4A90D9","#F07020","#B0B0B0","#FFB300","#6BA5DA","#85C056",
];

interface DashboardData {
  stats: { totalCases: number; casesThisMonth: number; casesInProgress: number; completedCases: number; lowStockItems: number; expiringMaterials: number; materialsOpened: number };
  caseVolumeByMonth: { month: string; count: number }[];
  caseByDepartment: { department: string; count: number }[];
  caseBycategory: { category: string; count: number }[];
  caseByPurpose: { category: string; purpose: string; count: number }[];
  materialUsageTrend: { month: string; usageCount: number }[];
  materialUsageByCategory: { category: string; totalUsed: number }[];
}

// Module-level export helpers (no state dependency — no need to recreate)
function exportDataFile(rows: Record<string, unknown>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
  toast.success(`Exported: ${filename}.xlsx`);
}

function exportChartImageFile(chartId: string, filename: string) {
  const container = document.getElementById(chartId);
  const svg = container?.querySelector("svg");
  if (!svg) { toast.error("Chart not found"); return; }
  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const rect = svg.getBoundingClientRect();
  const w = rect.width || 600;
  const h = rect.height || 300;
  const svgData = new XMLSerializer().serializeToString(clone);
  const canvas = document.createElement("canvas");
  canvas.width = w * 2;
  canvas.height = h * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, w, h);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${filename}.png`;
      a.click(); URL.revokeObjectURL(url);
      toast.success(`Exported: ${filename}.png`);
    }, "image/png");
  };
  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
}

const statDefs = [
  { key: "totalCases", title: "Total Cases", icon: FolderOpen, color: "#003d7c", bg: "#e6edf5" },
  { key: "casesThisMonth", title: "This Month", icon: Clock, color: "#06b6d4", bg: "#ecfeff" },
  { key: "casesInProgress", title: "In Progress", icon: Clock, color: "#f59e0b", bg: "#fffbeb" },
  { key: "completedCases", title: "Completed", icon: CheckCircle2, color: "#10b981", bg: "#ecfdf5" },
  { key: "lowStockItems", title: "Low Stock", icon: TrendingDown, color: "#ef4444", bg: "#fef2f2" },
  { key: "expiringMaterials", title: "Expiring", icon: AlertTriangle, color: "#f97316", bg: "#fff7ed" },
  { key: "materialsOpened", title: "Opened", icon: Package, color: "#8b5cf6", bg: "#f5f3ff" },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [recentCases, setRecentCases] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [presMode, setPresMode] = useState(false);
  const [presChart, setPresChart] = useState<"treemap" | "bars" | "table">("treemap");

  // Dynamic table config
  const [presTableSource, setPresTableSource] = useState("cases");
  const [presTableGroupBy, setPresTableGroupBy] = useState("category");
  const [presTableSubGroup, setPresTableSubGroup] = useState("purpose");
  const [presTableData, setPresTableData] = useState<{ label: string; value: number; children: { label: string; value: number }[] }[]>([]);
  const [presTableTotal, setPresTableTotal] = useState(0);
  const [presTableLoading, setPresTableLoading] = useState(false);

  // Auto-reset group-by when source changes
  useEffect(() => {
    if (presTableSource === "cases") { setPresTableGroupBy("category"); setPresTableSubGroup("purpose"); }
    else if (presTableSource === "usage") { setPresTableGroupBy("case.department"); setPresTableSubGroup("material.materialName"); }
    else { setPresTableGroupBy(""); setPresTableSubGroup(""); }
  }, [presTableSource]);

  // Fetch dynamic table data
  useEffect(() => {
    if (!presMode || presChart !== "table") return;
    const fetchTable = async () => {
      setPresTableLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("source", presTableSource);
        params.set("x", presTableGroupBy);
        params.set("y", "count");
        params.set("limit", "30");
        if (presTableSubGroup) params.set("stackBy", presTableSubGroup);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
        if (deptFilter !== "all") params.set("filterField", "department");
        if (deptFilter !== "all") params.set("filterValue", deptFilter);
        const res = await fetch(`/api/chart-data?${params}`);
        const json = await res.json();
        if (json.success) {
          if (json.data.stacked) {
            setPresTableData(json.data.stacked);
            setPresTableTotal(json.data.total);
          } else {
            setPresTableData(json.data.rows.map((r: any) => ({ label: r.label, value: r.value, children: [] })));
            setPresTableTotal(json.data.total);
          }
        }
      } catch (e) { console.error(e); }
      finally { setPresTableLoading(false); }
    };
    fetchTable();
  }, [presMode, presChart, presTableSource, presTableGroupBy, presTableSubGroup, dateFrom, dateTo, deptFilter]);

  // Check if alerts were dismissed today
  useEffect(() => {
    const d = localStorage.getItem("stock-alerts-dismissed");
    if (d === new Date().toDateString()) setDismissed(true);
  }, []);

  const dismissToday = () => {
    localStorage.setItem("stock-alerts-dismissed", new Date().toDateString());
    setDismissed(true);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (deptFilter !== "all") params.set("department", deptFilter);
      if (catFilter !== "all") params.set("category", catFilter);
      const res = await fetch(`/api/dashboard?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [dateFrom, dateTo, deptFilter, catFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch recent cases + critical stock alerts
  useEffect(() => {
    fetch("/api/cases")
      .then((r) => r.json())
      .then((j) => { if (j.success) setRecentCases(j.data.slice(0, 6)); })
      .catch((e) => { console.error(e); });
    // Fetch materials with alerts
    fetch("/api/materials")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          const critical = j.data.filter((m: any) =>
            m.status === "Expired" ||
            m.status === "Low stock" ||
            (m.expiryDate && new Date(m.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && m.status !== "Expired")
          ).slice(0, 8);
          setAlerts(critical);
        }
      })
      .catch(() => {});
  }, []);

  if (!data && loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      {/* Stock Alert Banner — always at the very top */}
      {alerts.length > 0 && !dismissed && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-white px-4 py-2.5 shadow-sm">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-sm font-semibold text-red-600 shrink-0">{alerts.length} material{alerts.length > 1 ? "s" : ""} need attention</span>
          <div className="flex-1 flex items-center gap-2 overflow-x-auto text-sm min-w-0">
            {alerts.slice(0, 6).map((m: any) => (
              <Link key={m.id} href={`/materials/${m.id}`} className="flex items-center gap-1 whitespace-nowrap hover:bg-red-50 rounded-md px-1.5 py-0.5 transition-colors shrink-0">
                <span className={`text-[10px] font-bold uppercase ${m.status === "Expired" ? "text-red-500" : m.status === "Low stock" ? "text-amber-500" : "text-orange-500"}`}>
                  {m.status === "Expired" ? "EXP" : m.status === "Low stock" ? "LOW" : "SOON"}
                </span>
                <span className="text-slate-700 text-xs font-medium">{m.materialName}</span>
                <span className="text-slate-400 text-xs">{m.currentQuantity}{m.unit}</span>
              </Link>
            ))}
            {alerts.length > 6 && <span className="text-xs text-slate-400 shrink-0">+{alerts.length - 6} more</span>}
          </div>
          <Button variant="ghost" size="sm" className="text-xs text-slate-400 h-7 shrink-0" onClick={() => setDismissed(true)}>✕</Button>
          <Button variant="ghost" size="sm" className="text-xs text-slate-500 h-7 shrink-0" onClick={dismissToday}>Dismiss today</Button>
        </div>
      )}

      {/* Header */}
      <div className="!flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">{presMode ? "Meeting Presentation View" : "3D printing office activity overview"}</p>
        </div>
        <div className="flex gap-2">
          {!presMode && (
            <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => {
              window.open("/api/reports?type=cases", "_blank");
              toast.success("Report exported");
            }}><Download className="h-4 w-4" />Export</Button>
          )}
          <Button
            size="sm"
            className="h-9 gap-2"
            variant={presMode ? "default" : "outline"}
            onClick={() => setPresMode(!presMode)}
          >
            {presMode ? <><X className="h-4 w-4" />Exit Meeting View</> : <><Presentation className="h-4 w-4" />Meeting View</>}
          </Button>
        </div>
      </div>

      {!presMode && (<>
        <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2"><span className="text-xs font-medium text-slate-500">From</span><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-sm border rounded-lg px-3 py-1.5 bg-white" /></div>
        <div className="flex items-center gap-2"><span className="text-xs font-medium text-slate-500">To</span><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-sm border rounded-lg px-3 py-1.5 bg-white" /></div>
        <Select value={deptFilter} onValueChange={(v) => { if (v) setDeptFilter(v); }}>
          <SelectTrigger className="w-[150px] h-9 bg-white"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Departments</SelectItem>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={catFilter} onValueChange={(v) => { if (v) setCatFilter(v); }}>
          <SelectTrigger className="w-[170px] h-9 bg-white"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Categories</SelectItem>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {statDefs.map((s) => (
          <Card key={s.key} className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: s.bg }}>
                  <s.icon className="h-5 w-5" style={{ color: s.color }} />
                </div>
              </div>
              <p className="text-[28px] font-bold tracking-tight text-slate-900 tabular-nums leading-none">{(data?.stats as any)?.[s.key] || 0}</p>
              <p className="text-[13px] text-slate-500 mt-1 font-medium">{s.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Cases Gallery */}
      {recentCases.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold text-slate-800">Recent Cases</h3>
            <Link href="/cases" className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {recentCases.map((c: any) => (
              <Link key={c.id} href={`/cases/${c.id}`}>
                <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer overflow-hidden h-full">
                  {/* Mini image */}
                  <div className="h-24 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                    {c.modelImageUrl ? (
                      <img src={c.modelImageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-slate-300" />
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="text-xs font-semibold text-slate-800 truncate">{c.caseNumber}</p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{c.projectTitle}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={getStatusBadgeVariant(c.currentStatus)} className="text-[10px] px-1.5 py-0 h-4">{c.currentStatus}</Badge>
                      <span className="text-[10px] text-slate-400">{c.department}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border-0 shadow-sm">
          <CardHeader className="!flex items-center justify-between">
            <CardTitle className="text-[15px] font-semibold">Case Volume</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Export PNG" onClick={() => exportChartImageFile("chart-case-volume", "case-volume")}><Camera className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" /></Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Export XLSX" onClick={() => exportDataFile(data?.caseVolumeByMonth || [], "case-volume")}><Download className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" /></Button>
            </div>
          </CardHeader>
          <CardContent id="chart-case-volume"><ResponsiveContainer width="100%" height={260}><BarChart data={data?.caseVolumeByMonth || []} barSize={28}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f2f6" /><XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8b8fa8" }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#8b8fa8" }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "#f8f9fc" }} /><Bar dataKey="count" fill="#4f46e5" radius={[6,6,0,0]} /></BarChart></ResponsiveContainer></CardContent></Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="!flex items-center justify-between">
            <CardTitle className="text-[15px] font-semibold">By Department</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Export PNG" onClick={() => exportChartImageFile("chart-by-dept", "cases-by-department")}><Camera className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" /></Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Export XLSX" onClick={() => exportDataFile(data?.caseByDepartment || [], "cases-by-department")}><Download className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" /></Button>
            </div>
          </CardHeader>
          <CardContent id="chart-by-dept"><ResponsiveContainer width="100%" height={280}><PieChart><Pie data={data?.caseByDepartment || []} dataKey="count" nameKey="department" cx="50%" cy="50%" outerRadius={100} innerRadius={55} paddingAngle={3} label={({ name, value }) => `${name}: ${value}`} labelLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}>{(data?.caseByDepartment || []).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></CardContent></Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="!flex items-center justify-between">
            <CardTitle className="text-[15px] font-semibold">Material Usage Trend</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Export PNG" onClick={() => exportChartImageFile("chart-usage-trend", "material-usage-trend")}><Camera className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" /></Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Export XLSX" onClick={() => exportDataFile(data?.materialUsageTrend || [], "material-usage-trend")}><Download className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" /></Button>
            </div>
          </CardHeader>
          <CardContent id="chart-usage-trend"><ResponsiveContainer width="100%" height={280}><BarChart data={data?.materialUsageTrend || []} barSize={32}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f2f6" /><XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8b8fa8" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 12, fill: "#8b8fa8" }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "#f8f9fc" }} /><Bar dataKey="usageCount" fill="#f59e0b" radius={[6,6,0,0]} /></BarChart></ResponsiveContainer></CardContent></Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="!flex items-center justify-between">
            <CardTitle className="text-[15px] font-semibold">Usage by Material</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Export PNG" onClick={() => exportChartImageFile("chart-usage-by-mat", "usage-by-material")}><Camera className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" /></Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Export XLSX" onClick={() => exportDataFile(data?.materialUsageByCategory || [], "usage-by-material")}><Download className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" /></Button>
            </div>
          </CardHeader>
          <CardContent id="chart-usage-by-mat"><ResponsiveContainer width="100%" height={280}><BarChart data={data?.materialUsageByCategory || []} layout="vertical" barSize={24}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f2f6" /><XAxis type="number" tick={{ fontSize: 12, fill: "#8b8fa8" }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="category" width={120} tick={{ fontSize: 12, fill: "#8b8fa8" }} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="totalUsed" fill="#8b5cf6" radius={[0,6,6,0]} /></BarChart></ResponsiveContainer></CardContent></Card>
      </div>
      </> )}

      {/* ─── PRESENTATION MODE ─────────────────────────────────── */}
      {presMode && data && (
        <div className="space-y-6">
          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2"><span className="text-xs font-medium text-slate-500">From</span><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-sm border rounded-lg px-3 py-1.5 bg-white" /></div>
              <div className="flex items-center gap-2"><span className="text-xs font-medium text-slate-500">To</span><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-sm border rounded-lg px-3 py-1.5 bg-white" /></div>
              <Select value={deptFilter} onValueChange={(v) => { if (v) setDeptFilter(v); }}>
                <SelectTrigger className="w-[140px] h-9 bg-white"><SelectValue placeholder="Dept" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              {/* Chart type tabs */}
              <div className="flex bg-slate-100 rounded-lg p-1 mr-2">
                {([
                  { key: "treemap" as const, label: "Treemap" },
                  { key: "bars" as const, label: "Grouped Bars" },
                  { key: "table" as const, label: "Table" },
                ]).map((t) => (
                  <button key={t.key} onClick={() => setPresChart(t.key)}
                    className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", presChart === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                    {t.label}
                  </button>
                ))}
              </div>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => exportChartImageFile("pres-main-chart", "qeh-cases")}>
                <Camera className="h-3.5 w-3.5" />Export PNG
              </Button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Cases", value: data.stats.totalCases, color: "#4f46e5" },
              { label: "This Month", value: data.stats.casesThisMonth, color: "#06b6d4" },
              { label: "In Progress", value: data.stats.casesInProgress, color: "#f59e0b" },
              { label: "Completed", value: data.stats.completedCases, color: "#10b981" },
            ].map((s) => (
              <Card key={s.label} className="border-0 shadow-sm text-center">
                <CardContent className="p-4">
                  <p className="text-2xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ─── MAIN CHART AREA ──────────────────────────────────── */}
          <div id="pres-main-chart">
            {presChart === "treemap" && (
              <div className="space-y-6">
                {/* Treemap — custom layout, no fragile JSX-in-labels */}
                <div className="rounded-xl bg-white border shadow-sm" style={{ fontFamily: "Calibri, Arial, sans-serif" }}>
                  <div className="p-6">
                    <p className="text-center text-lg font-bold text-slate-500 uppercase tracking-wide mb-6">Cases by Category & Purpose</p>
                    <div className="flex gap-4" style={{ minHeight: 420 }}>
                      {(["Clinical Use","Rehabilitation","Training/ Education"] as const).map((cat) => {
                        const catColor = { "Clinical Use": "#70AD47", "Rehabilitation": "#5B9BD5", "Training/ Education": "#FFC000" }[cat];
                        const purposes = (data?.caseByPurpose || []).filter((p: any) => p.category === cat);
                        const catTotal = purposes.reduce((s: number, x: any) => s + x.count, 0);
                        const grandTotal = (data?.caseByPurpose || []).reduce((s: number, x: any) => s + x.count, 0);
                        const catWidth = grandTotal > 0 ? Math.max(20, (catTotal / grandTotal) * 100) : 33;
                        return (
                          <div key={cat} style={{ flex: `0 0 ${catWidth}%` }} className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 pb-2 border-b-2" style={{ borderColor: catColor }}>
                              <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: catColor }} />
                              <span className="text-sm font-bold text-slate-700">{cat}</span>
                              <span className="text-xs text-slate-400">{catTotal}</span>
                            </div>
                            <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
                              {purposes.map((p: any, j: number) => {
                                const shades = {
                                  "Clinical Use": ["#A9D18E","#8CC168","#70AD47"],
                                  "Rehabilitation": ["#BDD7EE","#9DC3E6","#7FB3E0","#5B9BD5","#D2E4F4","#E1EDF9"],
                                  "Training/ Education": ["#FFE699","#FFD34D","#FFC000"],
                                }[cat] || ["#D9D9D9"];
                                const shadeIdx = j % shades.length;
                                return (
                                  <div key={p.purpose} style={{ flex: `${p.count} 0 auto`, backgroundColor: shades[shadeIdx], borderRadius: 8, minHeight: 56 }}
                                    className="flex flex-col items-center justify-center text-center px-2 transition-shadow hover:shadow-lg cursor-default">
                                    <span className="text-[13px] font-bold text-white leading-tight">{p.purpose}</span>
                                    <span className="text-[20px] font-extrabold text-white leading-tight mt-0.5">{p.count}</span>
                                    <span className="text-[10px] text-white/70">
                                      {catTotal > 0 ? ((p.count / catTotal) * 100).toFixed(1) : 0}% of {cat}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {presChart === "bars" && (
              <div className="space-y-6">
                {/* Dept — horizontal bars */}
                <Card className="border-0 shadow-sm" style={{ fontFamily: "Calibri, Arial, sans-serif" }}>
                  <CardHeader><CardTitle className="text-base font-bold text-slate-700">Cases by Department</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={Math.max(200, (data?.caseByDepartment || []).length * 48)}>
                      <BarChart data={data?.caseByDepartment || []} layout="vertical" barSize={28} margin={{ left: 60, right: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f2f6" />
                        <XAxis type="number" tick={{ fontSize: 13, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="department" width={100} tick={{ fontSize: 13, fontWeight: 600, fill: "#334155" }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: "#f8f9fc" }} />
                        <Bar dataKey="count" fill="#4472C4" radius={[0,6,6,0]}>
                          <LabelList dataKey="count" position="right" style={{ fontSize: 14, fontWeight: 700, fill: "#4472C4" }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Categories + Sub-items — grouped nested bars */}
                <Card className="border-0 shadow-sm" style={{ fontFamily: "Calibri, Arial, sans-serif" }}>
                  <CardHeader><CardTitle className="text-base font-bold text-slate-700">Cases by Application Category & Purpose</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {(["Clinical Use","Rehabilitation","Training/ Education"] as const).map((cat) => {
                        const catColor = { "Clinical Use": "#70AD47", "Rehabilitation": "#5B9BD5", "Training/ Education": "#FFC000" }[cat];
                        const subItems = (data?.caseByPurpose || []).filter((p: any) => p.category === cat);
                        const chartData = subItems.map((p: any) => ({ name: p.purpose, count: p.count }));
                        return (
                          <div key={cat}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, paddingLeft: 4 }}>
                              <div style={{ width: 12, height: 12, backgroundColor: catColor, borderRadius: 3 }} />
                              <span style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>{cat}</span>
                              <span style={{ fontSize: 12, color: "#94a3b8" }}>({subItems.reduce((s: number, x: any) => s + x.count, 0)} cases)</span>
                            </div>
                            <ResponsiveContainer width="100%" height={Math.max(120, chartData.length * 42)}>
                              <BarChart data={chartData} layout="vertical" barSize={24} margin={{ left: 180, right: 50 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f2f6" />
                                <XAxis type="number" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <YAxis type="category" dataKey="name" width={175} tick={{ fontSize: 12, fill: "#475569" }} axisLine={false} tickLine={false} />
                                <Bar dataKey="count" fill={catColor} radius={[0,5,5,0]}>
                                  <LabelList dataKey="count" position="right" style={{ fontSize: 13, fontWeight: 700, fill: catColor }} />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {presChart === "table" && (
              <div className="space-y-4">
                {/* Config bar */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                    <button onClick={() => setPresTableSource("cases")}
                      className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
                        presTableSource === "cases" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                      <Database className="h-3 w-3" />Cases
                    </button>
                    <button onClick={() => setPresTableSource("usage")}
                      className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
                        presTableSource === "usage" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                      <Database className="h-3 w-3" />Usage
                    </button>
                  </div>
                  <Select value={presTableGroupBy} onValueChange={(v) => { if (v) setPresTableGroupBy(v); }}>
                    <SelectTrigger className="w-[150px] h-8 bg-white text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(TABLE_SOURCE_FIELDS[presTableSource] || []).map((f) => (
                        <SelectItem key={f} value={f}>{TABLE_FIELD_LABELS[f] || f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-slate-400">×</span>
                  <Select value={presTableSubGroup} onValueChange={(v) => { if (v) setPresTableSubGroup(v); }}>
                    <SelectTrigger className="w-[150px] h-8 bg-white text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None (flat)</SelectItem>
                      {(TABLE_SOURCE_FIELDS[presTableSource] || []).filter((f) => f !== presTableGroupBy).map((f) => (
                        <SelectItem key={f} value={f}>{TABLE_FIELD_LABELS[f] || f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-[11px] text-slate-400">{presTableTotal} records</span>
                </div>

                {/* Table */}
                <Card className="border-0 shadow-sm" style={{ fontFamily: "Calibri, Arial, sans-serif" }}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-slate-700">
                      {TABLE_FIELD_LABELS[presTableGroupBy] || presTableGroupBy}
                      {presTableSubGroup && <> → {TABLE_FIELD_LABELS[presTableSubGroup] || presTableSubGroup}</>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-0 pb-2">
                    <div className="px-2">
                      {presTableLoading ? (
                        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>
                      ) : (
                        <HierarchicalTable
                          data={presTableData}
                          total={presTableTotal}
                          primaryLabel={TABLE_FIELD_LABELS[presTableGroupBy] || presTableGroupBy}
                          secondaryLabel={presTableSubGroup ? TABLE_FIELD_LABELS[presTableSubGroup] || presTableSubGroup : ""}
                          colors={TABLE_COLORS_24} />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
