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
  Table2, ListTree,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HierarchicalTable } from "@/components/charts/hierarchical-table";
import type { StackedRow } from "@/components/charts/hierarchical-table";
import { PivotTable } from "@/components/charts/pivot-table";
import { DrillDownPanel } from "@/components/charts/drill-down-panel";
import { exportPNG } from "@/lib/export-utils";

// ─── Color palettes ─────────────────────────────────────────────
const COLOR_PALETTES: Record<string, string[]> = {
  "Excel": [
    "#4472C4","#ED7D31","#A5A5A5","#FFC000","#5B9BD5","#70AD47",
    "#F15C5C","#9B59B6","#1ABC9C","#E67E22","#2E75B6","#C55A11",
    "#7F7F7F","#A68A00","#3B6FB6","#D44C2B","#8C8C8C","#E5A800",
    "#4A90D9","#F07020","#B0B0B0","#FFB300","#6BA5DA","#85C056",
  ],
  "Vivid": [
    "#E6194B","#3CB44B","#FFE119","#4363D8","#F58231","#911EB4",
    "#46F0F0","#F032E6","#BCF60C","#FABEBE","#008080","#E6BEFF",
    "#9A6324","#FFFAC8","#800000","#AAFFC3","#808000","#FFD8B1",
    "#000075","#808080","#A9A9A9","#DCBEFF","#FF6F61","#92A8D1",
  ],
  "Dark": [
    "#1B2A4A","#8B1E1E","#2D5A27","#7A5C00","#1E3A6E","#3D6B35",
    "#9B2335","#5B2C8E","#0E6B5E","#8B4513","#2C3E8C","#7C3A00",
    "#4A4A4A","#6B5B00","#2E5090","#A04020","#5C5C5C","#C68600",
    "#3A6FC0","#D05030","#7A7A7A","#D09020","#5080CC","#60A040",
  ],
  "Pastel": [
    "#A8C8F0","#F4B183","#C8C8C8","#FFE080","#A8C8E8","#B0D888",
    "#F0A0A0","#C0A0E0","#90D8C8","#F0C080","#A0C0F0","#E8A870",
    "#B8B8B8","#D8C860","#A8C8F8","#E0A878","#C0C0C0","#F0C860",
    "#B8D4F4","#ECB088","#D0D0D0","#F8D0A0","#B8D8F8","#C0E0A0",
  ],
};
const DEFAULT_PALETTE = "Excel";

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

function formatYAxis(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return String(value);
}

// Generate a distinct shade by shifting hue slightly and adjusting saturation
// Keeps colors visible (avoids white-out from naive lighten)
function shadeColor(hex: string, step: number, total: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) & 0xFF;
  let g = (num >> 8) & 0xFF;
  let b = num & 0xFF;
  // Mix with white for lighter variants, but cap at 40% white max
  const mix = Math.min(0.4, step / (total + 2));
  r = Math.round(r + (255 - r) * mix);
  g = Math.round(g + (255 - g) * mix);
  b = Math.round(b + (255 - b) * mix);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export default function ChartBuilderPage() {
  // Config state
  const [source, setSource] = useState("cases");
  const [xField, setXField] = useState("category");
  const [stackBy, setStackBy] = useState("purpose");
  const [chartType, setChartType] = useState("bar");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [fy, setFy] = useState(""); // Financial Year e.g. "2627"
  // Multi-select checkbox filters
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(true);
  const [tableMode, setTableMode] = useState<"hierarchical" | "pivot">("pivot");
  const [groupTop, setGroupTop] = useState(12); // 0=all, N=top N + Other
  const [paletteKey, setPaletteKey] = useState(DEFAULT_PALETTE);
  const CHART_COLORS = COLOR_PALETTES[paletteKey] || COLOR_PALETTES[DEFAULT_PALETTE];
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  // Data state
  const [chartData, setChartData] = useState<{ label: string; value: number }[]>([]);
  const [stackedData, setStackedData] = useState<{ label: string; value: number; children: { label: string; value: number }[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [drillGroup, setDrillGroup] = useState<StackedRow | null>(null);
  const [exporting, setExporting] = useState(false);

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

  // Parent-child field relationships for auto-grouping
  const FIELD_PARENTS: Record<string, string> = {
    purpose: "category",
    modelType: "category",
    requiredService: "category",
    currentStatus: "category",
    "case.purpose": "case.category",
    "material.materialName": "material.category",
  };

  // Auto-switch xField when source changes
  useEffect(() => {
    const fields = SOURCE_FIELDS[source] || [];
    if (source === "cases") { setXField("category"); setStackBy("purpose"); setShowTable(true); }
    else if (source === "usage") { setXField("case.department"); setStackBy("material.materialName"); setShowTable(true); }
    else if (source === "materials") { setXField("category"); setStackBy("status"); setShowTable(true); }
    else if (source === "transactions") { setXField("transactionType"); setStackBy("material.materialName"); setShowTable(true); }
    else { setXField(fields[0] || ""); setStackBy(""); }
    setActiveFilters({});
  }, [source]);

  // Auto-set stackBy when xField changes (parent-child grouping)
  useEffect(() => {
    if (xField && FIELD_PARENTS[xField] && SOURCE_FIELDS[source]?.includes(FIELD_PARENTS[xField])) {
      setStackBy(FIELD_PARENTS[xField]);
      setShowTable(true);
    }
  }, [xField]);

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
      if (groupTop > 0) params.set("groupTop", String(groupTop));
      // Financial Year: "2627" → 1 Apr 2026 to 31 Mar 2027
      if (fy) {
        const startYear = 2000 + parseInt(fy.slice(0, 2));
        params.set("dateFrom", `${startYear}-04-01`);
        params.set("dateTo", `${startYear + 1}-03-31`);
      } else {
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
      }
      // Multi-select filters
      for (const [field, values] of Object.entries(activeFilters)) {
        if (values.length > 0) {
          params.set(`filter_${field}`, values.join(","));
        }
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
  }, [source, xField, stackBy, dateFrom, dateTo, fy, activeFilters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Export handlers
  const handleExportPNG = async () => {
    setExporting(true);
    await exportPNG("chart-builder-preview", `chart-${source}-${xField}`, legendItems || undefined);
    setExporting(false);
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
    const pieRadius = Math.min(containerWidth * 0.28, 180);

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
        return (<>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} barSize={Math.max(10, Math.min(44, 750 / Math.max(barData.length * (barKeys.length + 1), 1)))} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf1" strokeWidth={1} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false}
                angle={barData.length > 8 ? -35 : 0} textAnchor={barData.length > 8 ? "end" : "middle"} height={barData.length > 8 ? 80 : 40}
                tickFormatter={(v) => truncateLabel(v)} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
              <Tooltip cursor={{ fill: "#f8f9fc" }} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 13 }} />
              {legendItems && <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 8 }} content={() => (<div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] px-4">{legendItems.map((item, i) => (<span key={i} className={`flex items-center gap-1 ${item.bold ? "font-bold text-slate-700 w-full mt-1" : "text-slate-500 ml-5"}`}><span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{backgroundColor: item.color, opacity: item.bold ? 1 : 0.7}} />{item.label}</span>))}</div>)} />}
              {barKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} name={key} radius={[6, 6, 0, 0]}
                  onClick={(d: any) => {
                    if (!hasStack || !d?.label) return;
                    const group = stackedData.find((s) => s.label === d.label);
                    if (group && group.children.length > 0) setDrillGroup(group);
                  }}
                  cursor={hasStack ? "pointer" : "default"}>
                  {!hasStack && !manyItems && <LabelList dataKey="value" position="top" style={{ fontSize: 12, fontWeight: 700, fill: "#475569" }} />}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
          
        </>);
      }

      // ── BAR HORIZONTAL ───────────────────────────────────────
      case "barH": {
        const barData = hasStack ? groupedFlatData : flatData;
        const barKeys = hasStack ? stackKeys : ["value"];
        return (<>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" barSize={Math.max(14, Math.min(32, 450 / Math.max(barData.length, 1)))} margin={{ left: 20, right: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf1" strokeWidth={1} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
              <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 12, fontWeight: 500, fill: "#334155" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => truncateLabel(v)} />
              <Tooltip cursor={{ fill: "#f8f9fc" }} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 13 }} />
              {legendItems && <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 8 }} content={() => (<div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] px-4">{legendItems.map((item, i) => (<span key={i} className={`flex items-center gap-1 ${item.bold ? "font-bold text-slate-700 w-full mt-1" : "text-slate-500 ml-5"}`}><span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{backgroundColor: item.color, opacity: item.bold ? 1 : 0.7}} />{item.label}</span>))}</div>)} />}
              {barKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} name={key} radius={[0, 6, 6, 0]}
                  onClick={(d: any) => {
                    if (!hasStack || !d?.label) return;
                    const group = stackedData.find((s) => s.label === d.label);
                    if (group && group.children.length > 0) setDrillGroup(group);
                  }}
                  cursor={hasStack ? "pointer" : "default"} />
              ))}
            </BarChart>
          </ResponsiveContainer>
          
        </>);
      }

      // ── PIE (single-level or two-level donut) ────────────────
      case "pie": {
        if (hasStack) {
          // ── Two-level composite donut ──
          const outerData: any[] = [];
          stackedData.forEach((group, gi) => {
            group.children.forEach((child, ci) => {
              outerData.push({ name: child.label, value: child.value, parent: group.label, parentIdx: gi, childIdx: ci });
            });
          });
          // Smaller radius to leave room for outer labels
          const twoR = Math.min(pieRadius * 0.75, 140);
          const hole = twoR * 0.2;
          const innerOuter = twoR * 0.58;
          const outerInner = twoR * 0.64;
          const outerOuter = twoR;
          return (<>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                {/* Inner ring: primary groups */}
                <Pie data={flatData} dataKey="value" nameKey="label" cx="50%" cy="48%"
                  innerRadius={hole} outerRadius={innerOuter} stroke="#fff" strokeWidth={2}
                  label={({ index }: any) => {
                    const d = flatData[index ?? -1];
                    return d ? d.label : "";
                  }} labelLine={false}>
                  {flatData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                {/* Outer ring: sub-items */}
                <Pie data={outerData} dataKey="value" nameKey="name" cx="50%" cy="48%"
                  innerRadius={outerInner} outerRadius={outerOuter} stroke="#fff" strokeWidth={0.5}
                  label={({ name, value, percent }: any) => {
                    if (percent < 0.05) return "";
                    return `${truncateLabel(name || "", 10)} ${value}`;
                  }}
                  labelLine={{ stroke: "#cbd5e1", strokeWidth: 0.5 }}
                  onClick={(d: any) => {
                    const group = stackedData.find((s) => s.label === d.parent);
                    if (group) setDrillGroup(group);
                  }}
                  style={{ cursor: "pointer" }}>
                  {outerData.map((d, i) => {
                    const base = CHART_COLORS[d.parentIdx % CHART_COLORS.length];
                    const totalKids = stackedData[d.parentIdx]?.children.length || 1;
                    return <Cell key={i} fill={shadeColor(base, d.childIdx, totalKids)} />;
                  })}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 13 }} />
                {legendItems && <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 8 }} content={() => (<div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] px-4">{legendItems.map((item, i) => (<span key={i} className={`flex items-center gap-1 ${item.bold ? "font-bold text-slate-700 w-full mt-1" : "text-slate-500 ml-5"}`}><span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{backgroundColor: item.color, opacity: item.bold ? 1 : 0.7}} />{item.label}</span>))}</div>)} />}
              </PieChart>
            </ResponsiveContainer>
          </>
          );
        }
        // ── Single-level pie (no sub-group) ──
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
              {legendItems && <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 8 }} content={() => (<div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] px-4">{legendItems.map((item, i) => (<span key={i} className={`flex items-center gap-1 ${item.bold ? "font-bold text-slate-700 w-full mt-1" : "text-slate-500 ml-5"}`}><span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{backgroundColor: item.color, opacity: item.bold ? 1 : 0.7}} />{item.label}</span>))}</div>)} />}
            </PieChart>
          </ResponsiveContainer>
        );
      }

      // ── DONUT (single-level or two-level) ────────────────────
      case "donut": {
        if (hasStack) {
          // Two-level composite donut
          const outerData: any[] = [];
          stackedData.forEach((group, gi) => {
            group.children.forEach((child, ci) => {
              outerData.push({ name: child.label, value: child.value, parent: group.label, parentIdx: gi, childIdx: ci });
            });
          });
          const twoR = Math.min(pieRadius * 0.75, 140);
          const hole = twoR * 0.2;
          const innerOuter = twoR * 0.58;
          const outerInner = twoR * 0.64;
          const outerOuter = twoR;
          return (<>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={flatData} dataKey="value" nameKey="label" cx="50%" cy="48%"
                  innerRadius={hole} outerRadius={innerOuter} stroke="#fff" strokeWidth={2}
                  label={({ index }: any) => {
                    const d = flatData[index ?? -1];
                    return d ? d.label : "";
                  }} labelLine={false}>
                  {flatData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Pie data={outerData} dataKey="value" nameKey="name" cx="50%" cy="48%"
                  innerRadius={outerInner} outerRadius={outerOuter} stroke="#fff" strokeWidth={0.5}
                  label={({ name, value, percent }: any) => {
                    if (percent < 0.05) return "";
                    return `${truncateLabel(name || "", 10)} ${value}`;
                  }}
                  labelLine={{ stroke: "#cbd5e1", strokeWidth: 0.5 }}
                  onClick={(d: any) => {
                    const group = stackedData.find((s) => s.label === d.parent);
                    if (group) setDrillGroup(group);
                  }}
                  style={{ cursor: "pointer" }}>
                  {outerData.map((d, i) => {
                    const base = CHART_COLORS[d.parentIdx % CHART_COLORS.length];
                    const totalKids = stackedData[d.parentIdx]?.children.length || 1;
                    return <Cell key={i} fill={shadeColor(base, d.childIdx, totalKids)} />;
                  })}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 13 }} />
                {legendItems && <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 8 }} content={() => (<div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] px-4">{legendItems.map((item, i) => (<span key={i} className={`flex items-center gap-1 ${item.bold ? "font-bold text-slate-700 w-full mt-1" : "text-slate-500 ml-5"}`}><span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{backgroundColor: item.color, opacity: item.bold ? 1 : 0.7}} />{item.label}</span>))}</div>)} />}
              </PieChart>
            </ResponsiveContainer>
          </>
          );
        }
        // Single-level donut
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
              {legendItems && <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 8 }} content={() => (<div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] px-4">{legendItems.map((item, i) => (<span key={i} className={`flex items-center gap-1 ${item.bold ? "font-bold text-slate-700 w-full mt-1" : "text-slate-500 ml-5"}`}><span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{backgroundColor: item.color, opacity: item.bold ? 1 : 0.7}} />{item.label}</span>))}</div>)} />}
            </PieChart>
          </ResponsiveContainer>
        );
      }

      // ── LINE ─────────────────────────────────────────────────
      case "line": {
        const lineData = hasStack ? groupedFlatData : flatData;
        const lineKeys = hasStack ? stackKeys : ["value"];
        return (<>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf1" strokeWidth={1} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false}
                angle={lineData.length > 8 ? -35 : 0} textAnchor={lineData.length > 8 ? "end" : "middle"} height={lineData.length > 8 ? 80 : 40}
                tickFormatter={(v) => truncateLabel(v)} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 13 }} />
              {legendItems && <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 8 }} content={() => (<div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] px-4">{legendItems.map((item, i) => (<span key={i} className={`flex items-center gap-1 ${item.bold ? "font-bold text-slate-700 w-full mt-1" : "text-slate-500 ml-5"}`}><span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{backgroundColor: item.color, opacity: item.bold ? 1 : 0.7}} />{item.label}</span>))}</div>)} />}
              {lineKeys.map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2.5}
                  dot={{ fill: CHART_COLORS[i % CHART_COLORS.length], r: 4 }} activeDot={{ r: 6 }} name={key} />
              ))}
            </LineChart>
          </ResponsiveContainer>
          
        </>);
      }

      // ── AREA ─────────────────────────────────────────────────
      case "area": {
        const areaData = hasStack ? groupedFlatData : flatData;
        const areaKeys = hasStack ? stackKeys : ["value"];
        return (<>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf1" strokeWidth={1} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false}
                angle={areaData.length > 8 ? -35 : 0} textAnchor={areaData.length > 8 ? "end" : "middle"} height={areaData.length > 8 ? 80 : 40}
                tickFormatter={(v) => truncateLabel(v)} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 13 }} />
              {legendItems && <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 8 }} content={() => (<div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] px-4">{legendItems.map((item, i) => (<span key={i} className={`flex items-center gap-1 ${item.bold ? "font-bold text-slate-700 w-full mt-1" : "text-slate-500 ml-5"}`}><span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{backgroundColor: item.color, opacity: item.bold ? 1 : 0.7}} />{item.label}</span>))}</div>)} />}
              {areaKeys.map((key, i) => (
                <Area key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2}
                  fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.08} name={key} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          
        </>);
      }

      // ── STACKED ──────────────────────────────────────────────
      case "stacked": {
        const stackColors = CHART_COLORS;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={groupedFlatData} barSize={Math.max(20, Math.min(56, 700 / Math.max(stackedData.length, 1)))} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf1" strokeWidth={1} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false}
                angle={stackedData.length > 6 ? -35 : 0} textAnchor={stackedData.length > 6 ? "end" : "middle"} height={stackedData.length > 6 ? 80 : 40}
                tickFormatter={(v) => truncateLabel(v)} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 13 }} />
              {legendItems && <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 8 }} content={() => (<div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] px-4">{legendItems.map((item, i) => (<span key={i} className={`flex items-center gap-1 ${item.bold ? "font-bold text-slate-700 w-full mt-1" : "text-slate-500 ml-5"}`}><span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{backgroundColor: item.color, opacity: item.bold ? 1 : 0.7}} />{item.label}</span>))}</div>)} />}
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

  // Build legend items from stacked data, matching chart colors exactly
  const legendItems = useMemo(() => {
    if (!hasStacked) return null;
    const items: { label: string; color: string; bold?: boolean }[] = [];
    stackedData.forEach((group, gi) => {
      const base = CHART_COLORS[gi % CHART_COLORS.length];
      items.push({ label: `${group.label}  ${group.value}`, color: base, bold: true });
      group.children.forEach((child, ci) => {
        const isPie = chartType === "pie" || chartType === "donut";
        if (isPie) {
          items.push({ label: child.label, color: shadeColor(base, ci, group.children.length) });
        } else {
          const ki = stackKeys.indexOf(child.label);
          items.push({ label: child.label, color: CHART_COLORS[ki >= 0 ? ki % CHART_COLORS.length : ci % CHART_COLORS.length] });
        }
      });
    });
    return items;
  }, [stackedData, hasStacked, CHART_COLORS, chartType, stackKeys]);


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
          <Button size="sm" className="h-9 gap-2 bg-primary hover:bg-primary/90" onClick={handleExportPNG} disabled={exporting}>
            {exporting ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Rendering...</>
            ) : (
              <><Camera className="h-4 w-4" />Export PNG</>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        {/* ─── Left: Configuration Panel (1/6) ────────────────── */}
        <div className="space-y-3 lg:col-span-1">
          {/* Source */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1.5 pt-4 px-4"><CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Data Source</CardTitle></CardHeader>
            <CardContent className="space-y-1 px-3 pb-3">
              {SOURCES.map((s) => (
                <button key={s.key} onClick={() => setSource(s.key)}
                  className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2.5",
                    source === s.key ? "bg-accent text-primary ring-1 ring-primary/20 font-semibold" : "text-slate-600 hover:bg-slate-50 font-medium")}>
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
                      chartType === t.key ? "bg-accent text-primary ring-1 ring-primary/20" : "text-slate-500 hover:bg-slate-50")}>
                    <t.icon className="h-4 w-4" />{t.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Color Palette */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1.5 pt-4 px-4"><CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Colors</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3">
              <Select value={paletteKey} onValueChange={(v) => { if (v) setPaletteKey(v); }}>
                <SelectTrigger className="w-full h-8 bg-white text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(COLOR_PALETTES).map((k) => (
                    <SelectItem key={k} value={k}>
                      <div className="flex items-center gap-1.5">
                        <span>{k}</span>
                        <span className="flex gap-0.5">
                          {(COLOR_PALETTES[k] || []).slice(0, 5).map((c, i) => (
                            <span key={i} className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c }} />
                          ))}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <CardContent className="space-y-1.5 px-3 pb-3">
              {/* Financial Year */}
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Financial Year</label>
                <Select value={fy} onValueChange={(v) => { setFy(v || ""); setDateFrom(""); setDateTo(""); }}>
                  <SelectTrigger className="w-full h-7 bg-white text-xs mt-0.5"><SelectValue placeholder="All years" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All years</SelectItem>
                    {["2223","2324","2425","2526","2627"].map((y) => <SelectItem key={y} value={y}>{y} (Apr-Mar)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Date range (only when no FY selected) */}
              {!fy && (
                <div className="flex gap-1">
                  <div className="flex-1"><label className="text-[10px] font-semibold text-slate-400 uppercase">From</label>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full h-7 text-[11px] border rounded-md px-1.5 py-0.5 bg-white mt-0.5" /></div>
                  <div className="flex-1"><label className="text-[10px] font-semibold text-slate-400 uppercase">To</label>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full h-7 text-[11px] border rounded-md px-1.5 py-0.5 bg-white mt-0.5" /></div>
                </div>
              )}

              {/* Checkbox filters for key fields */}
              {[
                { key: "category", label: "Category" },
                { key: "hospital", label: "Hospital" },
                { key: "department", label: "Department" },
                { key: "purpose", label: "Purpose" },
                { key: "technician", label: "Technician" },
              ].map(({ key, label }) => {
                const options = filterOptions[key] || [];
                if (options.length === 0) return null;
                const selected = activeFilters[key] || [];
                const isExpanded = expandedFilter === key;
                return (
                  <div key={key} className="border-t border-slate-100 pt-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => setExpandedFilter(isExpanded ? null : key)}
                      className="w-full flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-700 py-0.5"
                    >
                      {label}
                      <span className="text-slate-300">{isExpanded ? "▾" : "▸"}</span>
                    </button>
                    {isExpanded && (
                      <div className="max-h-32 overflow-y-auto space-y-0.5 mt-1">
                        {options.map((opt) => (
                          <label key={opt} className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 rounded px-0.5 py-0.5">
                            <input
                              type="checkbox"
                              checked={selected.includes(opt)}
                              onChange={() => {
                                const next = selected.includes(opt)
                                  ? selected.filter((v) => v !== opt)
                                  : [...selected, opt];
                                setActiveFilters((prev) => ({ ...prev, [key]: next }));
                              }}
                              className="rounded border-slate-300 text-primary focus:ring-primary h-3 w-3"
                            />
                            <span className="text-[11px] text-slate-600 truncate">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {/* Show selected count badge if collapsed with selections */}
                    {!isExpanded && selected.length > 0 && (
                      <span className="text-[10px] text-blue-500 font-medium ml-1">{selected.length} selected</span>
                    )}
                  </div>
                );
              })}

              {/* Clear all filters */}
              {Object.values(activeFilters).some((v) => v.length > 0) && (
                <button
                  type="button"
                  onClick={() => setActiveFilters({})}
                  className="w-full text-[10px] text-red-400 hover:text-red-600 font-medium pt-1.5 border-t border-slate-100 mt-1.5"
                >
                  Clear all filters
                </button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── Right: Chart + Table (4/5) ─────────────────────── */}
        <div className="lg:col-span-5 space-y-4">
          {/* Chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-5 px-5">
              <div>
                <CardTitle className="text-base font-bold text-slate-800">{title}</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">{hasStacked ? `${stackedData.length} groups, ${stackKeys.length} sub-groups` : `${chartData.length} groups`} · {flatTotal} total records</p>
              </div>
              <Button variant="ghost" size="sm" className={cn("h-8 gap-1.5 text-xs", showTable && "text-primary")}
                onClick={() => setShowTable(!showTable)}>
                <Table2 className="h-3.5 w-3.5" />{showTable ? "Hide Table" : "Show Table"}
              </Button>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <div id="chart-builder-preview" ref={containerRef} className="w-full" style={{ height: showTable ? 620 : 750 }}>
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                ) : renderChart()}
              </div>
            </CardContent>
          </Card>

          {/* ─── Table View (Pivot or Hierarchical) ─── */}
          {showTable && hasStacked && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  {tableMode === "pivot" ? <Table2 className="h-4 w-4 text-primary" /> : <ListTree className="h-4 w-4 text-primary" />}
                  {tableMode === "pivot"
                    ? `Pivot: ${FIELD_LABELS[xField] || xField} × ${FIELD_LABELS[stackBy] || stackBy}`
                    : `Breakdown: ${FIELD_LABELS[xField] || xField} → ${FIELD_LABELS[stackBy] || stackBy}`}
                </CardTitle>
                <div className="flex bg-slate-100 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setTableMode("pivot")}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${tableMode === "pivot" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Pivot
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableMode("hierarchical")}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${tableMode === "hierarchical" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    List
                  </button>
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                {tableMode === "pivot" ? (
                  <PivotTable data={stackedData} total={total}
                    rowLabel={FIELD_LABELS[xField] || xField}
                    colLabel={FIELD_LABELS[stackBy] || stackBy} />
                ) : (
                  <HierarchicalTable data={stackedData} total={total}
                    primaryLabel={FIELD_LABELS[xField] || xField}
                    secondaryLabel={FIELD_LABELS[stackBy] || stackBy}
                    colors={CHART_COLORS} />
                )}
              </CardContent>
            </Card>
          )}

          {/* Flat data table (non-stacked) */}
          {showTable && !hasStacked && chartData.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Table2 className="h-4 w-4 text-primary" />Data Table
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <HierarchicalTable
                  data={chartData.map((d) => ({ label: d.label, value: d.value, children: [] }))}
                  total={flatTotal}
                  primaryLabel={FIELD_LABELS[xField] || xField}
                  secondaryLabel=""
                  colors={CHART_COLORS} />
              </CardContent>
            </Card>
          )}

          {/* ─── Drill-Down Panel ───────────────────────────── */}
          {drillGroup && (
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/20 backdrop-blur-sm" onClick={() => setDrillGroup(null)}>
              <div className="w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
                <DrillDownPanel
                  title={drillGroup.label}
                  groupTotal={drillGroup.value}
                  grandTotal={total}
                  children={drillGroup.children}
                  onClose={() => setDrillGroup(null)}
                  colors={CHART_COLORS} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
