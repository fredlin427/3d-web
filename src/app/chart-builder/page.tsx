"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  BarChart3, PieChartIcon, TrendingUp, AreaChartIcon, Camera, RefreshCw,
  Database, SlidersHorizontal, LayoutGrid, Loader2, Layers,
  Table2, ChevronDown, ChevronRight, ListTree,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── 24-color Excel-style palette ─────────────────────────────────
const CHART_COLORS = [
  "#4472C4","#ED7D31","#A5A5A5","#FFC000","#5B9BD5","#70AD47",
  "#F15C5C","#9B59B6","#1ABC9C","#E67E22","#2E75B6","#C55A11",
  "#7F7F7F","#A68A00","#3B6FB6","#D44C2B","#8C8C8C","#E5A800",
  "#4A90D9","#F07020","#B0B0B0","#FFB300","#6BA5DA","#85C056",
];

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

// ─── Source-specific field lists ────────────────────────────────
const SOURCE_FIELDS: Record<string, string[]> = {
  cases: ["department","category","purpose","currentStatus","priority","technician","printingParty","hospital","rank","modelType","requiredService"],
  materials: ["category","brand","materialType","status","colour","supplier","storageLocation","unit"],
  usage: ["unit","staffName","printerOrTank","case.department","case.category","case.currentStatus","case.purpose","material.materialName","material.category","material.brand","material.status"],
  transactions: ["transactionType","staffName","material.materialName","material.category","material.brand","material.status"],
};

function truncateLabel(s: string, max: number = 18): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

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
  const [showTable, setShowTable] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

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

  // Measure container width for adaptive chart sizing
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

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
    setStackBy("");
    setExpandedGroups(new Set());
  }, [source]);

  // Fetch data
  const fetchData = useCallback(async () => {
    const validFields = SOURCE_FIELDS[source] || [];
    if (!validFields.includes(xField) && !validFields.some((f) => f.endsWith(`.${xField}`))) return;
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
          // auto-expand first 5 groups
          const first5 = new Set<string>(json.data.stacked.slice(0, 5).map((d: any) => d.label as string));
          setExpandedGroups(first5);
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
  }, [source, xField, stackBy, dateFrom, dateTo, filterField, filterValue]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Export PNG
  const exportPNG = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const container = document.getElementById("chart-builder-preview");
        const svg = container?.querySelector("svg");
        if (!svg) { toast.error("No chart to export — try again"); return; }
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
      });
    });
  };

  const toggleGroup = (label: string) => {
    const next = new Set(expandedGroups);
    if (next.has(label)) next.delete(label); else next.add(label);
    setExpandedGroups(next);
  };

  // ─── Render chart ──────────────────────────────────────────────
  // Pre-computed grouped data for non-stacked charts with sub-groups
  const groupedFlatData = useMemo(() => {
    if (stackedData.length === 0) return [];
    return stackedData.map((d) => {
      const row: Record<string, unknown> = { label: d.label };
      d.children.forEach((c) => { row[c.label] = c.value; });
      return row;
    });
  }, [stackedData]);

  const renderChart = () => {
    const hasStack = stackedData.length > 0;
    // Simple data (flat, no sub-group)
    const flatData = chartData.length > 0 ? chartData : stackedData.map((d) => ({ label: d.label, value: d.value }));
    const hasData = chartData.length > 0 || hasStack;
    const manyItems = flatData.length > 15;
    const pieRadius = Math.min(containerWidth * 0.35, 240);

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
      // ── BAR ──────────────────────────────────────────────────
      case "bar": {
        const barData = hasStack ? groupedFlatData : flatData;
        const barKeys = hasStack ? stackKeys : ["value"];
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} barSize={Math.max(14, Math.min(40, 800 / Math.max(barData.length * (barKeys.length + 1), 1)))}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f2f6" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false}
                angle={barData.length > 8 ? -35 : 0} textAnchor={barData.length > 8 ? "end" : "middle"} height={barData.length > 8 ? 80 : 40}
                tickFormatter={(v) => truncateLabel(v)} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: "#f8f9fc" }} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 13 }} />
              {hasStack && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />}
              {barKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} name={key} radius={[6, 6, 0, 0]}>
                  {!hasStack && !manyItems && <LabelList dataKey="value" position="top" style={{ fontSize: 12, fontWeight: 700, fill: "#475569" }} />}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      }

      // ── BAR HORIZONTAL ───────────────────────────────────────
      case "barH": {
        const barData = hasStack ? groupedFlatData : flatData;
        const barKeys = hasStack ? stackKeys : ["value"];
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" barSize={Math.max(14, Math.min(32, 450 / Math.max(barData.length, 1)))} margin={{ left: 20, right: 60 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f2f6" />
              <XAxis type="number" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 12, fontWeight: 500, fill: "#334155" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => truncateLabel(v)} />
              <Tooltip cursor={{ fill: "#f8f9fc" }} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 13 }} />
              {hasStack && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />}
              {barKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} name={key} radius={[0, 6, 6, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      }

      // ── PIE ──────────────────────────────────────────────────
      case "pie": {
        const pieData = flatData.map((d) => ({ ...d, pctLabel: `${((d.value / Math.max(total, 1)) * 100).toFixed(0)}%` }));
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="label" cx="50%" cy="45%" outerRadius={pieRadius}
                label={({ label, value, percent }: any) => {
                  if (percent < 0.04) return "";
                  return `${truncateLabel(label, 12)} (${value}, ${(percent * 100).toFixed(0)}%)`;
                }}
                labelLine={{ stroke: "#cbd5e1" }}>
                {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#fff" strokeWidth={1.5} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
            </PieChart>
          </ResponsiveContainer>
        );
      }

      // ── DONUT ────────────────────────────────────────────────
      case "donut": {
        const donutData = flatData.map((d) => ({ ...d, pctLabel: `${((d.value / Math.max(total, 1)) * 100).toFixed(0)}%` }));
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={donutData} dataKey="value" nameKey="label" cx="50%" cy="45%"
                innerRadius={pieRadius * 0.42} outerRadius={pieRadius}
                label={({ label, value, percent }: any) => {
                  if (percent < 0.04) return "";
                  return `${truncateLabel(label, 12)} (${value}, ${(percent * 100).toFixed(0)}%)`;
                }}
                labelLine={{ stroke: "#cbd5e1" }}>
                {donutData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#fff" strokeWidth={1.5} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
            </PieChart>
          </ResponsiveContainer>
        );
      }

      // ── LINE ─────────────────────────────────────────────────
      case "line": {
        const lineData = hasStack ? groupedFlatData : flatData;
        const lineKeys = hasStack ? stackKeys : ["value"];
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f2f6" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false}
                angle={lineData.length > 8 ? -35 : 0} textAnchor={lineData.length > 8 ? "end" : "middle"} height={lineData.length > 8 ? 80 : 40}
                tickFormatter={(v) => truncateLabel(v)} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 13 }} />
              {hasStack && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />}
              {lineKeys.map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2.5}
                  dot={{ fill: CHART_COLORS[i % CHART_COLORS.length], r: 4 }} activeDot={{ r: 6 }} name={key} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      }

      // ── AREA ─────────────────────────────────────────────────
      case "area": {
        const areaData = hasStack ? groupedFlatData : flatData;
        const areaKeys = hasStack ? stackKeys : ["value"];
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f2f6" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false}
                angle={areaData.length > 8 ? -35 : 0} textAnchor={areaData.length > 8 ? "end" : "middle"} height={areaData.length > 8 ? 80 : 40}
                tickFormatter={(v) => truncateLabel(v)} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 13 }} />
              {hasStack && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />}
              {areaKeys.map((key, i) => (
                <Area key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2}
                  fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.08} name={key} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
      }

      // ── STACKED ──────────────────────────────────────────────
      case "stacked": {
        const stackColors = CHART_COLORS;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={groupedFlatData} barSize={Math.max(24, Math.min(56, 600 / Math.max(stackedData.length, 1)))}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f2f6" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false}
                angle={stackedData.length > 6 ? -35 : 0} textAnchor={stackedData.length > 6 ? "end" : "middle"} height={stackedData.length > 6 ? 80 : 40}
                tickFormatter={(v) => truncateLabel(v)} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 14 }} />
              {stackKeys.map((key, i) => (
                <Bar key={key} dataKey={key} stackId="a" fill={stackColors[i % stackColors.length]} name={key}
                  radius={i === stackKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
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
  const hasStacked = stackedData.length > 0;
  const flatTotal = total;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Chart Builder</h2>
          <p className="text-sm text-slate-500 mt-1">Build custom charts for meeting presentations</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ─── Left: Configuration Panel (1/5) ────────────────── */}
        <div className="space-y-3 lg:col-span-1">
          {/* Source */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1.5 pt-4 px-4"><CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Data Source</CardTitle></CardHeader>
            <CardContent className="space-y-1 px-3 pb-3">
              {SOURCES.map((s) => (
                <button key={s.key} onClick={() => setSource(s.key)}
                  className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2.5",
                    source === s.key ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 font-semibold" : "text-slate-600 hover:bg-slate-50 font-medium")}>
                  <s.icon className="h-3.5 w-3.5 shrink-0" />
                  {s.label}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Chart Type */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1.5 pt-4 px-4"><CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Chart Type</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="grid grid-cols-3 gap-1">
                {CHART_TYPES.map((t) => (
                  <button key={t.key} onClick={() => setChartType(t.key)}
                    className={cn("flex flex-col items-center gap-0.5 p-2 rounded-lg text-[11px] font-medium transition-all",
                      chartType === t.key ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200" : "text-slate-500 hover:bg-slate-50")}>
                    <t.icon className="h-4 w-4" />{t.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* X Axis */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1.5 pt-4 px-4"><CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Group By</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3">
              <Select value={xField} onValueChange={(v) => { if (v) setXField(v); }}>
                <SelectTrigger className="w-full h-9 bg-white text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {fields.map((f) => (
                    <SelectItem key={f} value={f}>{FIELD_LABELS[f] || f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Stack By */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1.5 pt-4 px-4"><CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Sub-group</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3">
              <Select value={stackBy} onValueChange={(v) => { setStackBy(v || ""); if (v) setShowTable(true); }}>
                <SelectTrigger className="w-full h-9 bg-white text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (flat)</SelectItem>
                  {fields.filter((f) => f !== xField).map((f) => (
                    <SelectItem key={f} value={f}>{FIELD_LABELS[f] || f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1.5 pt-4 px-4"><CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Filters</CardTitle></CardHeader>
            <CardContent className="space-y-2.5 px-3 pb-3">
              <div><label className="text-[11px] font-medium text-slate-400">From</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full h-8 text-xs border rounded-md px-2 py-1 bg-white mt-0.5" /></div>
              <div><label className="text-[11px] font-medium text-slate-400">To</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full h-8 text-xs border rounded-md px-2 py-1 bg-white mt-0.5" /></div>
              <div>
                <Select value={filterField} onValueChange={(v) => { setFilterField(v || ""); setFilterValue(""); }}>
                  <SelectTrigger className="w-full h-8 bg-white text-xs"><SelectValue placeholder="Filter field..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {fields.map((f) => <SelectItem key={f} value={f}>{FIELD_LABELS[f] || f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {filterField && (
                <Select value={filterValue} onValueChange={(v) => { if (v) setFilterValue(v); }}>
                  <SelectTrigger className="w-full h-8 bg-white text-xs"><SelectValue placeholder="Value..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {(filterOptions[filterField] || []).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── Right: Chart + Table (4/5) ─────────────────────── */}
        <div className="lg:col-span-4 space-y-4">
          {/* Chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-5 px-5">
              <div>
                <CardTitle className="text-base font-bold text-slate-800">{title}</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">{hasStacked ? `${stackedData.length} groups, ${stackKeys.length} sub-groups` : `${chartData.length} groups`} · {flatTotal} total records</p>
              </div>
              <Button variant="ghost" size="sm" className={cn("h-8 gap-1.5 text-xs", showTable && "text-indigo-600")}
                onClick={() => setShowTable(!showTable)}>
                <Table2 className="h-3.5 w-3.5" />{showTable ? "Hide Table" : "Show Table"}
              </Button>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <div id="chart-builder-preview" ref={containerRef} className="w-full" style={{ height: showTable ? 400 : 500 }}>
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                  </div>
                ) : renderChart()}
              </div>
            </CardContent>
          </Card>

          {/* ─── Breakdown Table ────────────────────────────── */}
          {showTable && hasStacked && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <ListTree className="h-4 w-4 text-indigo-500" />
                  Breakdown: {FIELD_LABELS[xField] || xField} → {FIELD_LABELS[stackBy] || stackBy}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-slate-100 bg-slate-50/50">
                        <th className="text-left py-2.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Group</th>
                        <th className="text-right py-2.5 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-20">Total</th>
                        <th className="text-left py-2.5 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sub-items</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stackedData.flatMap((group, gi) => {
                        const rows = [
                          <tr key={`g-${group.label}`}
                            className={cn("border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors",
                              expandedGroups.has(group.label) && "bg-indigo-50/30")}
                            onClick={() => toggleGroup(group.label)}>
                            <td className="py-2.5 px-5 font-semibold text-slate-800">
                              <div className="flex items-center gap-2">
                                {expandedGroups.has(group.label)
                                  ? <ChevronDown className="h-3.5 w-3.5 text-slate-300" />
                                  : <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
                                <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: CHART_COLORS[gi % CHART_COLORS.length] }} />
                                {group.label}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">{group.value}</td>
                            <td className="py-2.5 px-3 text-xs text-slate-400">{group.children.length} sub-items</td>
                          </tr>,
                        ];
                        if (expandedGroups.has(group.label)) {
                          group.children.forEach((child, ci) => {
                            rows.push(
                              <tr key={`${group.label}-${child.label}`} className="border-b border-slate-50 bg-slate-50/30">
                                <td className="py-2 pl-12 pr-5 text-sm text-slate-600">
                                  <span className="inline-block w-2 h-2 rounded-sm shrink-0 mr-2 align-middle" style={{ backgroundColor: CHART_COLORS[ci % CHART_COLORS.length], opacity: 0.7 }} />
                                  {child.label}
                                </td>
                                <td className="py-2 px-3 text-right font-semibold text-slate-700 tabular-nums">{child.value}</td>
                                <td className="py-2 px-3 text-xs text-slate-400">
                                  {group.value > 0 ? ((child.value / group.value) * 100).toFixed(1) : 0}% of group
                                </td>
                              </tr>
                            );
                          });
                        }
                        return rows;
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Flat data table (non-stacked) */}
          {showTable && !hasStacked && chartData.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Table2 className="h-4 w-4 text-indigo-500" />
                  Data Table
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-2">
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-slate-100 bg-slate-50/50 sticky top-0">
                        <th className="text-left py-2.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">#</th>
                        <th className="text-left py-2.5 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          {FIELD_LABELS[xField] || xField}
                        </th>
                        <th className="text-right py-2.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Count</th>
                        <th className="text-right py-2.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">%</th>
                        <th className="py-2.5 px-3" /> {/* bar */}
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map((d, i) => {
                        const pct = flatTotal > 0 ? ((d.value / flatTotal) * 100).toFixed(1) : "0";
                        return (
                          <tr key={d.label} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-5 text-xs text-slate-400 tabular-nums">{i + 1}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-700">{d.label}</td>
                            <td className="py-2.5 px-5 text-right font-bold text-slate-900 tabular-nums">{d.value}</td>
                            <td className="py-2.5 px-5 text-right text-slate-500 tabular-nums">{pct}%</td>
                            <td className="py-2.5 px-3">
                              <div className="w-full bg-slate-100 rounded-full h-1.5 max-w-[120px]">
                                <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
