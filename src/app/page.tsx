"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, getStatusBadgeVariant } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/shared/loading-state";
import { toast } from "sonner";
import { FolderOpen, Clock, CheckCircle2, AlertTriangle, Package, TrendingDown, Download, ImageIcon, ArrowRight, Camera } from "lucide-react";
import Link from "next/link";
import { DEPARTMENT_LABELS } from "@/lib/constants";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DEPARTMENTS, CATEGORIES } from "@/lib/constants";
import * as XLSX from "xlsx";

const CHART_COLORS = ["#4f46e5","#06b6d4","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#f97316","#84cc16"];

interface DashboardData {
  stats: { totalCases: number; casesThisMonth: number; casesInProgress: number; completedCases: number; lowStockItems: number; expiringMaterials: number; materialsOpened: number };
  caseVolumeByMonth: { month: string; count: number }[];
  caseByDepartment: { department: string; count: number }[];
  caseBycategory: { category: string; count: number }[];
  materialUsageTrend: { month: string; usageCount: number }[];
  materialUsageByCategory: { category: string; totalUsed: number }[];
}

const statDefs = [
  { key: "totalCases", title: "Total Cases", icon: FolderOpen, color: "#4f46e5", bg: "#eef0ff" },
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
    } catch { /* */ }
    finally { setLoading(false); }
  }, [dateFrom, dateTo, deptFilter, catFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch recent cases + critical stock alerts
  useEffect(() => {
    fetch("/api/cases")
      .then((r) => r.json())
      .then((j) => { if (j.success) setRecentCases(j.data.slice(0, 6)); })
      .catch(() => {});
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

  const exportData = (rows: Record<string, unknown>[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${filename}.xlsx`);
    toast.success(`Exported: ${filename}.xlsx`);
  };

  const exportChartImage = (chartId: string, filename: string) => {
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
  };

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
          <p className="text-sm text-slate-500 mt-1">3D printing office activity overview</p>
        </div>
        <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => {
          window.open("/api/reports?type=cases", "_blank");
          toast.success("Report exported");
        }}><Download className="h-4 w-4" />Export</Button>
      </div>

      {/* Filters */}
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
            <Link href="/cases" className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
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
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Export PNG" onClick={() => exportChartImage("chart-case-volume", "case-volume")}><Camera className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" /></Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Export XLSX" onClick={() => exportData(data?.caseVolumeByMonth || [], "case-volume")}><Download className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" /></Button>
            </div>
          </CardHeader>
          <CardContent id="chart-case-volume"><ResponsiveContainer width="100%" height={260}><BarChart data={data?.caseVolumeByMonth || []} barSize={28}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f2f6" /><XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8b8fa8" }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#8b8fa8" }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "#f8f9fc" }} /><Bar dataKey="count" fill="#4f46e5" radius={[6,6,0,0]} /></BarChart></ResponsiveContainer></CardContent></Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="!flex items-center justify-between">
            <CardTitle className="text-[15px] font-semibold">By Department</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Export PNG" onClick={() => exportChartImage("chart-by-dept", "cases-by-department")}><Camera className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" /></Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Export XLSX" onClick={() => exportData(data?.caseByDepartment || [], "cases-by-department")}><Download className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" /></Button>
            </div>
          </CardHeader>
          <CardContent id="chart-by-dept"><ResponsiveContainer width="100%" height={280}><PieChart><Pie data={data?.caseByDepartment || []} dataKey="count" nameKey="department" cx="50%" cy="50%" outerRadius={100} innerRadius={55} paddingAngle={3} label={({ name, value }) => `${name}: ${value}`} labelLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}>{(data?.caseByDepartment || []).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></CardContent></Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="!flex items-center justify-between">
            <CardTitle className="text-[15px] font-semibold">Material Usage Trend</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Export PNG" onClick={() => exportChartImage("chart-usage-trend", "material-usage-trend")}><Camera className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" /></Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Export XLSX" onClick={() => exportData(data?.materialUsageTrend || [], "material-usage-trend")}><Download className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" /></Button>
            </div>
          </CardHeader>
          <CardContent id="chart-usage-trend"><ResponsiveContainer width="100%" height={280}><BarChart data={data?.materialUsageTrend || []} barSize={32}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f2f6" /><XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8b8fa8" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 12, fill: "#8b8fa8" }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "#f8f9fc" }} /><Bar dataKey="usageCount" fill="#f59e0b" radius={[6,6,0,0]} /></BarChart></ResponsiveContainer></CardContent></Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="!flex items-center justify-between">
            <CardTitle className="text-[15px] font-semibold">Usage by Material</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Export PNG" onClick={() => exportChartImage("chart-usage-by-mat", "usage-by-material")}><Camera className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" /></Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Export XLSX" onClick={() => exportData(data?.materialUsageByCategory || [], "usage-by-material")}><Download className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" /></Button>
            </div>
          </CardHeader>
          <CardContent id="chart-usage-by-mat"><ResponsiveContainer width="100%" height={280}><BarChart data={data?.materialUsageByCategory || []} layout="vertical" barSize={24}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f2f6" /><XAxis type="number" tick={{ fontSize: 12, fill: "#8b8fa8" }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="category" width={120} tick={{ fontSize: 12, fill: "#8b8fa8" }} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="totalUsed" fill="#8b5cf6" radius={[0,6,6,0]} /></BarChart></ResponsiveContainer></CardContent></Card>
      </div>
    </div>
  );
}
