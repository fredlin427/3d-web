"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Camera, RefreshCw, Loader2, Table2, ListTree } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COLOR_PALETTES, DEFAULT_PALETTE, SOURCES, CHART_TYPES,
  FIELD_LABELS, SOURCE_FIELDS, FIELD_PARENTS, getDefaultStackBy,
} from "@/lib/chart-config";
import { ChartRenderer, type StackedRow } from "@/components/charts/chart-renderer";
import { HierarchicalTable } from "@/components/charts/hierarchical-table";
import { PivotTable } from "@/components/charts/pivot-table";
import { FocusCard } from "@/components/charts/focus-card";
import { ChartFullscreen } from "@/components/charts/chart-fullscreen";
import { ChartLegend } from "@/components/charts/chart-legend";
import { exportPNG } from "@/lib/export-utils";

export default function ChartBuilderPage() {
  // ── Config ──
  const [source, setSource] = useState("cases");
  const [xField, setXField] = useState("category");
  const [stackBy, setStackBy] = useState("purpose");
  const [chartType, setChartType] = useState("bar");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [fy, setFy] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(true);
  const [tableMode, setTableMode] = useState<"hierarchical" | "pivot">("pivot");
  const [groupTop, setGroupTop] = useState(10);
  const [childTop, setChildTop] = useState(8);
  const [paletteKey, setPaletteKey] = useState(DEFAULT_PALETTE);
  const CHART_COLORS = COLOR_PALETTES[paletteKey] || COLOR_PALETTES[DEFAULT_PALETTE];

  // ── Data ──
  const [chartData, setChartData] = useState<{ label: string; value: number }[]>([]);
  const [stackedData, setStackedData] = useState<StackedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);

  // ── Focus state ──
  const [focusOpen, setFocusOpen] = useState(false);
  const [focusItem, setFocusItem] = useState<StackedRow | null>(null);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  // Measure container
  useEffect(() => {
    const m = () => { if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth); };
    m();
    window.addEventListener("resize", m);
    return () => window.removeEventListener("resize", m);
  }, []);

  // Auto-switch xField / stackBy on source change
  useEffect(() => {
    const fields = SOURCE_FIELDS[source] || [];
    const defX = source === "cases" ? "category" : source === "usage" ? "case.department" : source === "materials" ? "category" : "transactionType";
    setXField(defX);
    setStackBy(getDefaultStackBy(source, defX));
    setActiveFilters({});
  }, [source]);

  // Auto-stackBy when xField has a parent
  useEffect(() => {
    if (xField && FIELD_PARENTS[xField] && SOURCE_FIELDS[source]?.includes(FIELD_PARENTS[xField])) {
      setStackBy(FIELD_PARENTS[xField]);
      setShowTable(true);
    }
  }, [xField]);

  // Fetch
  const fetchData = useCallback(async () => {
    const validFields = SOURCE_FIELDS[source] || [];
    if (!validFields.includes(xField) && !validFields.some(f => f.endsWith(`.${xField}`))) return;
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.set("source", source);
      p.set("x", xField);
      p.set("y", "count");
      p.set("limit", "50");
      if (groupTop > 0) p.set("groupTop", String(groupTop));
      if (childTop > 0) p.set("childTop", String(childTop));
      if (fy) {
        const sy = 2000 + parseInt(fy.slice(0, 2));
        p.set("dateFrom", `${sy}-04-01`);
        p.set("dateTo", `${sy + 1}-03-31`);
      } else {
        if (dateFrom) p.set("dateFrom", dateFrom);
        if (dateTo) p.set("dateTo", dateTo);
      }
      for (const [field, values] of Object.entries(activeFilters)) {
        if (values.length > 0) p.set(`filter_${field}`, values.join(","));
      }
      if (stackBy) p.set("stackBy", stackBy);

      const res = await fetch(`/api/chart-data?${p}`);
      const json = await res.json();
      if (json.success) {
        if (json.data.stacked) { setStackedData(json.data.stacked); setChartData([]); }
        else { setChartData(json.data.rows); setStackedData([]); }
        setTotal(json.data.total);
      } else { toast.error(json.error || "Failed"); }
    } catch (e) { console.error(e); toast.error("Failed to fetch chart data"); }
    finally { setLoading(false); }
  }, [source, xField, stackBy, dateFrom, dateTo, fy, activeFilters, groupTop, childTop]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filter options ──
  const [filterOptions, setFilterOptions] = useState<Record<string, string[]>>({});
  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(j => {
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
    }).catch(console.error);
  }, []);

  // ── Export ──
  const handleExportPNG = async () => {
    setExporting(true);
    await exportPNG("chart-builder-preview", `chart-${source}-${xField}`);
    setExporting(false);
  };

  const stackKeys = useMemo(() => {
    const s = new Set<string>();
    stackedData.forEach(d => d.children.forEach(c => s.add(c.label)));
    return Array.from(s);
  }, [stackedData]);

  // ── Computed ──
  const fields = SOURCE_FIELDS[source] || [];
  const title = `${FIELD_LABELS[xField] || xField} by ${SOURCES.find(s => s.key === source)?.label || source}`;
  const hasStacked = stackedData.length > 0;
  const flatTotal = total;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
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
            {exporting ? <><Loader2 className="h-4 w-4 animate-spin" />Rendering...</> : <><Camera className="h-4 w-4" />Export PNG</>}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        {/* ── Left: Config ── */}
        <div className="space-y-3 lg:col-span-1">
          {/* Source */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1.5 pt-4 px-4"><CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Data Source</CardTitle></CardHeader>
            <CardContent className="space-y-1 px-3 pb-3">
              {SOURCES.map(s => (
                <button key={s.key} onClick={() => setSource(s.key)}
                  className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2.5",
                    source === s.key ? "bg-accent text-primary ring-1 ring-primary/20 font-semibold" : "text-slate-600 hover:bg-slate-50 font-medium")}>
                  <s.icon className="h-3.5 w-3.5 shrink-0" />{s.label}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Chart Type */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1.5 pt-4 px-4"><CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Chart Type</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="grid grid-cols-3 gap-1">
                {CHART_TYPES.map(t => (
                  <button key={t.key} onClick={() => setChartType(t.key)}
                    className={cn("flex flex-col items-center gap-0.5 p-2 rounded-lg text-[11px] font-medium transition-all",
                      chartType === t.key ? "bg-accent text-primary ring-1 ring-primary/20" : "text-slate-500 hover:bg-slate-50")}>
                    <t.icon className="h-4 w-4" />{t.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1.5 pt-4 px-4"><CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Colors</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3">
              <Select value={paletteKey} onValueChange={v => { if (v) setPaletteKey(v); }}>
                <SelectTrigger className="w-full h-8 bg-white text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(COLOR_PALETTES).map(k => (
                    <SelectItem key={k} value={k}>
                      <div className="flex items-center gap-1.5">
                        <span>{k}</span>
                        <span className="flex gap-0.5">{(COLOR_PALETTES[k] || []).slice(0, 5).map((c, i) => (
                          <span key={i} className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c }} />
                        ))}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Group By */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1.5 pt-4 px-4"><CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Group By</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3">
              <Select value={xField} onValueChange={v => { if (v) setXField(v); }}>
                <SelectTrigger className="w-full h-9 bg-white text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {fields.map(f => <SelectItem key={f} value={f}>{FIELD_LABELS[f] || f}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Sub-group */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1.5 pt-4 px-4"><CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Sub-group</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3">
              <Select value={stackBy} onValueChange={v => { setStackBy(v || ""); if (v) setShowTable(true); }}>
                <SelectTrigger className="w-full h-9 bg-white text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (flat)</SelectItem>
                  {fields.filter(f => f !== xField).map(f => <SelectItem key={f} value={f}>{FIELD_LABELS[f] || f}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Display */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1.5 pt-4 px-4"><CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Display</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 px-3 pb-3">
              <div className="flex gap-1">
                <div className="flex-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase">Top Groups</label>
                  <Select value={String(groupTop)} onValueChange={v => setGroupTop(Number(v))}>
                    <SelectTrigger className="w-full h-8 bg-white text-xs mt-0.5 cursor-pointer"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[5, 8, 10, 12, 15, 20, 0].map(n => <SelectItem key={n} value={String(n)}>{n === 0 ? "All" : `Top ${n}`}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase">Sub-items</label>
                  <Select value={String(childTop)} onValueChange={v => setChildTop(Number(v))}>
                    <SelectTrigger className="w-full h-8 bg-white text-xs mt-0.5 cursor-pointer"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[5, 6, 8, 10, 12, 0].map(n => <SelectItem key={n} value={String(n)}>{n === 0 ? "All" : `≤${n}`}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card className="border-0 shadow-sm overflow-visible">
            <CardHeader className="pb-1.5 pt-4 px-4"><CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Filters</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 px-3 pb-3">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase">Financial Year</label>
                  {fy && <button type="button" onClick={() => setFy("")} className="text-[10px] text-blue-500 hover:text-blue-700 font-medium">Clear</button>}
                </div>
                <Select value={fy} onValueChange={v => { setFy(v || ""); setDateFrom(""); setDateTo(""); }}>
                  <SelectTrigger className="w-full h-8 bg-white text-xs mt-0.5 cursor-pointer"><SelectValue placeholder="All years" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All years</SelectItem>
                    {(() => {
                      const now = new Date();
                      const currentFY = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
                      const years: string[] = [];
                      for (let y = 2022; y <= currentFY; y++) years.push(`${String(y).slice(2)}${String(y + 1).slice(2)}`);
                      return years.map(y => <SelectItem key={y} value={y}>{y} (Apr-Mar)</SelectItem>);
                    })()}
                  </SelectContent>
                </Select>
              </div>
              {!fy && (
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase">Custom Date Range</label>
                  <div className="space-y-1 mt-0.5">
                    <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); if (fy) setFy(""); }}
                      disabled={!!fy} className="w-full h-8 text-xs border rounded-md px-2 py-1 bg-white disabled:opacity-40 disabled:cursor-not-allowed" />
                    <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); if (fy) setFy(""); }}
                      disabled={!!fy} className="w-full h-8 text-xs border rounded-md px-2 py-1 bg-white disabled:opacity-40 disabled:cursor-not-allowed" />
                  </div>
                </div>
              )}
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
                    <button type="button" onClick={() => setExpandedFilter(isExpanded ? null : key)}
                      className="w-full flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-700 py-0.5">
                      {label}<span className="text-slate-300">{isExpanded ? "▾" : "▸"}</span>
                    </button>
                    {isExpanded && (
                      <div className="max-h-32 overflow-y-auto space-y-0.5 mt-1">
                        {options.map(opt => (
                          <label key={opt} className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 rounded px-0.5 py-0.5">
                            <input type="checkbox" checked={selected.includes(opt)}
                              onChange={() => {
                                const next = selected.includes(opt) ? selected.filter(v => v !== opt) : [...selected, opt];
                                setActiveFilters(prev => ({ ...prev, [key]: next }));
                              }}
                              className="rounded border-slate-300 text-primary focus:ring-primary h-3 w-3" />
                            <span className="text-[11px] text-slate-600 truncate">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {!isExpanded && selected.length > 0 && (
                      <span className="text-[10px] text-blue-500 font-medium ml-1">{selected.length} selected</span>
                    )}
                  </div>
                );
              })}
              {Object.values(activeFilters).some(v => v.length > 0) && (
                <button type="button" onClick={() => setActiveFilters({})}
                  className="w-full text-[10px] text-red-400 hover:text-red-600 font-medium pt-1.5 border-t border-slate-100 mt-1.5">
                  Clear all filters
                </button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Chart + Table ── */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-5 px-5">
              <div>
                <CardTitle className="text-base font-bold text-slate-800">{title}</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  {hasStacked ? `${stackedData.length} groups, ${stackKeys.length} sub-groups` : `${chartData.length} groups`} · {flatTotal} total
                </p>
              </div>
              <Button variant="ghost" size="sm" className={cn("h-8 gap-1.5 text-xs", showTable && "text-primary")}
                onClick={() => setShowTable(!showTable)}>
                <Table2 className="h-3.5 w-3.5" />{showTable ? "Hide Table" : "Show Table"}
              </Button>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <ChartFullscreen title={title} subtitle={`${hasStacked ? `${stackedData.length} groups` : `${chartData.length} groups`} · ${flatTotal} total`}>
                <div id="chart-builder-preview" ref={containerRef} className="w-full" style={{ height: showTable ? 620 : 750 }}>
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    </div>
                  ) : (
                    <ChartRenderer
                      chartType={chartType}
                      chartData={chartData}
                      stackedData={stackedData}
                      colors={CHART_COLORS}
                      containerWidth={containerWidth}
                      activeSliceIndex={focusOpen ? focusIndex : null}
                      onSliceClick={(group, idx) => {
                        setFocusIndex(idx);
                        setFocusItem(group);
                        setFocusOpen(true);
                      }}
                    />
                  )}
                </div>
              </ChartFullscreen>
            </CardContent>
          </Card>

          {/* Detailed stacked legend */}
          {hasStacked && stackedData.length > 0 && (
            <ChartLegend items={[
              ...stackedData.flatMap((g, gi) => [
                {
                  label: `${g.label}  ${g.value}`,
                  color: CHART_COLORS[gi % CHART_COLORS.length],
                  bold: true as const,
                  onClick: () => { setFocusIndex(gi); setFocusItem(g); setFocusOpen(true); },
                },
                ...g.children.map((c, ci) => {
                  const isPie = chartType === "pie" || chartType === "donut";
                  return {
                    label: c.label,
                    color: isPie ? CHART_COLORS[gi % CHART_COLORS.length] : CHART_COLORS[ci % CHART_COLORS.length],
                    onClick: () => { setFocusIndex(gi); setFocusItem(g); setFocusOpen(true); },
                  };
                }),
              ]),
            ]} />
          )}

          {/* Table */}
          {showTable && hasStacked && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  {tableMode === "pivot" ? <Table2 className="h-4 w-4 text-primary" /> : <ListTree className="h-4 w-4 text-primary" />}
                  {tableMode === "pivot" ? `Pivot: ${FIELD_LABELS[xField] || xField} × ${FIELD_LABELS[stackBy] || stackBy}` : `Breakdown: ${FIELD_LABELS[xField] || xField} → ${FIELD_LABELS[stackBy] || stackBy}`}
                </CardTitle>
                <div className="flex bg-slate-100 rounded-lg p-0.5">
                  <button type="button" onClick={() => setTableMode("pivot")}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${tableMode === "pivot" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Pivot</button>
                  <button type="button" onClick={() => setTableMode("hierarchical")}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${tableMode === "hierarchical" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>List</button>
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                {tableMode === "pivot" ? (
                  <PivotTable data={stackedData} total={total} rowLabel={FIELD_LABELS[xField] || xField} colLabel={FIELD_LABELS[stackBy] || stackBy} />
                ) : (
                  <HierarchicalTable data={stackedData} total={total} primaryLabel={FIELD_LABELS[xField] || xField} secondaryLabel={FIELD_LABELS[stackBy] || stackBy} colors={CHART_COLORS} />
                )}
              </CardContent>
            </Card>
          )}

          {showTable && !hasStacked && chartData.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2"><Table2 className="h-4 w-4 text-primary" />Data Table</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <HierarchicalTable data={chartData.map(d => ({ label: d.label, value: d.value, children: [] }))} total={flatTotal}
                  primaryLabel={FIELD_LABELS[xField] || xField} secondaryLabel="" colors={CHART_COLORS} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Focus Card */}
      <FocusCard
        key={focusOpen ? focusItem?.label || "focus" : "closed"}
        open={focusOpen}
        label={focusItem?.label || ""}
        value={focusItem?.value || 0}
        total={total}
        chartType={chartType === "donut" || chartType === "pie" ? chartType : "bar"}
        color={focusIndex != null ? CHART_COLORS[focusIndex % CHART_COLORS.length] : CHART_COLORS[0]}
        children={focusItem?.children}
        colors={CHART_COLORS}
        onClose={() => { setFocusOpen(false); setFocusItem(null); setFocusIndex(null); }}
      />
    </div>
  );
}
