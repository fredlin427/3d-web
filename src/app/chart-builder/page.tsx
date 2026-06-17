"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
  LabelList,
} from "recharts";
import {
  BarChart3, PieChartIcon, TrendingUp, AreaChartIcon, Download, Camera, RefreshCw,
  Database, SlidersHorizontal, LayoutGrid, Loader2, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Config ────────────────────────────────────────────────────
const SOURCES = [
  { key: "cases", label: "Cases", icon: Database, desc: "Case records" },
  { key: "materials", label: "Materials", icon: Database, desc: "Material stock" },
  { key: "usage", label: "Material Usage", icon: Database, desc: "Usage history" },
  { key: "transactions", label: "Stock Transactions", icon: Database, desc: "Stock changes" },
];

const CHART_TYPES = [
  { key: "bar", label: "Bar", icon: BarChart3 },
  { key: "barH", label: "Bar H", icon: BarChart3 },
  { key: "pie", label: "Pie", icon: PieChartIcon },
  { key: "donut", label: "Donut", icon: PieChartIcon },
  { key: "line", label: "Line", icon: TrendingUp },
  { key: "area", label: "Area", icon: AreaChartIcon },
  { key: "stacked", label: "Stacked", icon: Layers },
];

const FIELD_LABELS: Record<string, string> = {
  department: "Department", category: "Category", purpose: "Purpose",
  currentStatus: "Status", priority: "Priority", technician: "Technician",
  printingParty: "Printing Party", hospital: "Hospital", rank: "Rank",
  modelType: "Model Type", requiredService: "Required Service",
  brand: "Brand", materialType: "Material Type", status: "Stock Status",
  colour: "Colour", supplier: "Supplier", storageLocation: "Location",
  unit: "Unit", staffName: "Staff", printerOrTank: "Printer/Tank",
  transactionType: "Transaction Type",
  "case.department": "→ Case Dept", "case.category": "→ Case Category",
  "case.currentStatus": "→ Case Status", "case.purpose": "→ Case Purpose",
  "material.materialName": "→ Material Name", "material.category": "→ Material Category",
  "material.brand": "→ Material Brand", "material.status": "→ Material Status",
};

const CHART_COLORS = ["#4f46e5","#06b6d4","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#f97316","#84cc16","#6366f1","#14b8a6","#d946ef"];

// ─── Source-specific field lists ────────────────────────────────
const SOURCE_FIELDS: Record<string, string[]> = {
  cases: ["department","category","purpose","currentStatus","priority","technician","printingParty","hospital","rank","modelType","requiredService"],
  materials: ["category","brand","materialType","status","colour","supplier","storageLocation","unit"],
  usage: ["unit","staffName","printerOrTank","case.department","case.category","case.currentStatus","case.purpose","material.materialName","material.category","material.brand","material.status"],
  transactions: ["transactionType","staffName","material.materialName","material.category","material.brand","material.status"],
};

export default function ChartBuilderPage() {
  // Config state
  const [source, setSource] = useState("cases");
  const [xField, setXField] = useState("department");
  const [stackBy, setStackBy] = useState("");
  const [chartType, setChartType] = useState("bar");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterField, setFilterField] = useState("");
  const [filterValue, setFilterValue] = useState("");

  // Data state
  const [chartData, setChartData] = useState<{ label: string; value: number }[]>([]);
  const [stackedData, setStackedData] = useState<{ label: string; value: number; children: { label: string; value: number }[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const stackKeys = useMemo(() => {
    const s = new Set<string>();
    stackedData.forEach((d) => d.children.forEach((c) => s.add(c.label)));
    return Array.from(s);
  }, [stackedData]);

  // Filter options (loaded from settings)
  const [filterOptions, setFilterOptions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          const map: Record<string, string[]> = {};
          for (const item of j.data) {
            if (item.isActive && item.type !== "progress_step" && !item.type.endsWith("_form_field")) {
              if (!map[item.type]) map[item.type] = [];
              if (!map[item.type].includes(item.value)) map[item.type].push(item.value);
            }
          }
          setFilterOptions(map);
        }
      })
      .catch((e) => console.error(e));
  }, []);

  // Auto-switch xField when source changes
  useEffect(() => {
    const fields = SOURCE_FIELDS[source] || [];
    setXField(fields[0] || "");
    setFilterField("");
    setFilterValue("");
  }, [source]);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("source", source);
      params.set("x", xField);
      params.set("y", "count");
      params.set("limit", "30");
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (filterField && filterValue) {
        params.set("filterField", filterField);
        params.set("filterValue", filterValue);
      }
      if (stackBy) params.set("stackBy", stackBy);
      const res = await fetch(`/api/chart-data?${params}`);
      const json = await res.json();
      if (json.success) {
        if (json.data.stacked) {
          setStackedData(json.data.stacked);
          setChartData([]);
        } else {
          setChartData(json.data.rows);
          setStackedData([]);
        }
        setTotal(json.data.total);
      } else {
        toast.error(json.error || "Failed");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to fetch chart data");
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on config change
  useEffect(() => { fetchData(); }, [source, xField, stackBy, dateFrom, dateTo, filterField, filterValue]);

  // Export PNG
  const exportPNG = () => {
    const container = document.getElementById("chart-builder-preview");
    const svg = container?.querySelector("svg");
    if (!svg) { toast.error("No chart to export"); return; }
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const rect = svg.getBoundingClientRect();
    const w = rect.width || 800;
    const h = rect.height || 500;
    const svgData = new XMLSerializer().serializeToString(clone);
    const canvas = document.createElement("canvas");
    canvas.width = w * 2; canvas.height = h * 2;
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
        a.href = url; a.download = `chart-${source}-${xField}.png`;
        a.click(); URL.revokeObjectURL(url);
        toast.success("Chart exported");
      }, "image/png");
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  // ─── Render chart ──────────────────────────────────────────────
  const renderChart = () => {
    const data = chartData.length > 0 ? chartData : stackedData.map((d) => ({ label: d.label, value: d.value }));
    const hasData = chartData.length > 0 || stackedData.length > 0;
    if (!hasData) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No data to display</p>
            <p className="text-xs text-slate-300 mt-1">Adjust your filters and try again</p>
          </div>
        </div>
      );
    }

    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barSize={Math.max(16, Math.min(48, 600 / data.length))}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f2f6" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} angle={data.length > 8 ? -35 : 0} textAnchor={data.length > 8 ? "end" : "middle"} height={data.length > 8 ? 80 : 40} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: "#f8f9fc" }} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 13 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="value" position="top" style={{ fontSize: 12, fontWeight: 600, fill: "#4f46e5" }} />
                {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case "barH":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" barSize={Math.max(16, Math.min(36, 500 / data.length))} margin={{ left: 20, right: 50 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f2f6" />
              <XAxis type="number" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 12, fontWeight: 500, fill: "#334155" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#f8f9fc" }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                <LabelList dataKey="value" position="right" style={{ fontSize: 12, fontWeight: 700 }} />
                {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={200} label={({ label, value, percent }: any) => `${label} (${(percent * 100).toFixed(0)}%)`} labelLine={{ stroke: "#cbd5e1" }}>
                {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case "donut":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={85} outerRadius={200} label={({ label, value, percent }: any) => `${label}: ${value} (${(percent * 100).toFixed(0)}%)`} labelLine={{ stroke: "#cbd5e1" }}>
                {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f2f6" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} angle={data.length > 8 ? -35 : 0} textAnchor={data.length > 8 ? "end" : "middle"} height={data.length > 8 ? 80 : 40} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} dot={{ fill: "#4f46e5", r: 5 }} activeDot={{ r: 7 }}>
                <LabelList dataKey="value" position="top" style={{ fontSize: 11, fontWeight: 600 }} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f2f6" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} angle={data.length > 8 ? -35 : 0} textAnchor={data.length > 8 ? "end" : "middle"} height={data.length > 8 ? 80 : 40} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} fill="#4f46e5" fillOpacity={0.12} />
            </AreaChart>
          </ResponsiveContainer>
        );

      case "stacked": {
        const colors = ["#4f46e5","#06b6d4","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#f97316","#84cc16","#6366f1"];
        const flatData = stackedData.map((d) => {
          const row: Record<string, unknown> = { label: d.label };
          d.children.forEach((c) => { row[c.label] = c.value; });
          return row;
        });
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={flatData} barSize={Math.max(20, Math.min(60, 600 / Math.max(stackedData.length, 1)))}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f2f6" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} angle={stackedData.length > 6 ? -35 : 0} textAnchor={stackedData.length > 6 ? "end" : "middle"} height={stackedData.length > 6 ? 80 : 40} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              {stackKeys.map((key, i) => (
                <Bar key={key} dataKey={key} stackId="a" fill={colors[i % colors.length]} name={key} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      }

      default:
        return null;
    }
  };

  const fields = SOURCE_FIELDS[source] || [];
  const title = `${FIELD_LABELS[xField] || xField} by ${source === "cases" ? "Cases" : source === "materials" ? "Materials" : source === "usage" ? "Material Usage" : "Transactions"}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Chart Builder</h2>
          <p className="text-sm text-slate-500 mt-1">Select data source, fields, and chart type to generate custom charts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-2" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />Refresh
          </Button>
          <Button size="sm" className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={exportPNG}>
            <Camera className="h-4 w-4" />Export PNG
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ─── Left: Configuration Panel ─────────────────────────── */}
        <div className="space-y-4">
          {/* Source */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Database className="h-4 w-4 text-indigo-500" />Data Source</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {SOURCES.map((s) => (
                <button key={s.key} onClick={() => setSource(s.key)}
                  className={cn("w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3",
                    source === s.key ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200" : "text-slate-600 hover:bg-slate-50")}>
                  <s.icon className="h-4 w-4 shrink-0" />
                  <div><span>{s.label}</span><p className="text-[11px] text-slate-400 font-normal">{s.desc}</p></div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Chart Type */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-indigo-500" />Chart Type</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-1.5">
                {CHART_TYPES.map((t) => (
                  <button key={t.key} onClick={() => setChartType(t.key)}
                    className={cn("flex flex-col items-center gap-1 p-2.5 rounded-lg text-xs font-medium transition-all",
                      chartType === t.key ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200" : "text-slate-500 hover:bg-slate-50")}>
                    <t.icon className="h-5 w-5" />
                    {t.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* X Axis Field */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-indigo-500" />Group By (X Axis)</CardTitle></CardHeader>
            <CardContent>
              <Select value={xField} onValueChange={(v) => { if (v) setXField(v); }}>
                <SelectTrigger className="w-full h-9 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {fields.map((f) => (
                    <SelectItem key={f} value={f}>{FIELD_LABELS[f] || f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Stack By (second level) */}
          {["usage","transactions"].includes(source) && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Layers className="h-4 w-4 text-indigo-500" />Stack By (sub-group)</CardTitle></CardHeader>
              <CardContent>
                <Select value={stackBy} onValueChange={(v) => { setStackBy(v || ""); if (v) setChartType("stacked"); }}>
                  <SelectTrigger className="w-full h-9 bg-white"><SelectValue placeholder="None (flat)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (flat)</SelectItem>
                    {fields.filter((f) => f !== xField).map((f) => (
                      <SelectItem key={f} value={f}>{FIELD_LABELS[f] || f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Filters</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Date From</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full h-9 text-sm border rounded-lg px-3 py-1.5 bg-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Date To</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full h-9 text-sm border rounded-lg px-3 py-1.5 bg-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Filter Field</label>
                <Select value={filterField} onValueChange={(v) => { setFilterField(v || ""); setFilterValue(""); }}>
                  <SelectTrigger className="w-full h-9 bg-white"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {fields.map((f) => <SelectItem key={f} value={f}>{FIELD_LABELS[f] || f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {filterField && (
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">Filter Value</label>
                  <Select value={filterValue} onValueChange={(v) => { if (v) setFilterValue(v); }}>
                    <SelectTrigger className="w-full h-9 bg-white"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All</SelectItem>
                      {(filterOptions[filterField] || []).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── Right: Chart Preview ──────────────────────────────── */}
        <div className="lg:col-span-3">
          <Card className="border-0 shadow-sm h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">{title}</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">{chartData.length} groups · {total} total</p>
              </div>
            </CardHeader>
            <CardContent>
              <div id="chart-builder-preview" className="w-full" style={{ height: 520 }}>
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                  </div>
                ) : renderChart()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
