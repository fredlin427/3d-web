"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Camera, RefreshCw, Loader2, Table2, ListTree, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { COLOR_PALETTES, DEFAULT_PALETTE, SOURCES, CHART_TYPES, FIELD_LABELS, SOURCE_FIELDS, getDefaultStackBy } from "@/lib/chart-config";
import { DonutChart, type DonutSlice } from "@/components/charts/donut-chart";
import { BarChartView } from "@/components/charts/bar-chart";
import { HierarchicalTable, type StackedRow } from "@/components/charts/hierarchical-table";
import { PivotTable } from "@/components/charts/pivot-table";
import { FocusCard } from "@/components/charts/focus-card";
import { ChartFullscreen } from "@/components/charts/chart-fullscreen";
import { exportPNG } from "@/lib/export-utils";

export default function ChartBuilderPage() {
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
  const [groupTop, setGroupTop] = useState(0); // show all
  const [childTop, setChildTop] = useState(0); // show all
  const [pieSize, setPieSize] = useState(150);
  const [labelMin, setLabelMin] = useState(0); // show all
  const [showLabels, setShowLabels] = useState(true);
  const [paletteKey, setPaletteKey] = useState(DEFAULT_PALETTE);
  const colors = COLOR_PALETTES[paletteKey] || COLOR_PALETTES[DEFAULT_PALETTE];

  const [chartData, setChartData] = useState<{ label: string; value: number }[]>([]);
  const [stackedData, setStackedData] = useState<StackedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);

  const [focusOpen, setFocusOpen] = useState(false);
  const [focusItem, setFocusItem] = useState<StackedRow | null>(null);
  const [focusIdx, setFocusIdx] = useState<number | null>(null);
  const [focusParent, setFocusParent] = useState<string>(""); // parent group name for sub-item clicks

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fields = SOURCE_FIELDS[source] || [];
    const defX = source === "cases" ? "category" : source === "usage" ? "case.department" : source === "materials" ? "category" : "transactionType";
    setXField(defX);
    setStackBy(getDefaultStackBy(source, defX));
    setActiveFilters({});
  }, [source]);

  const fetchData = useCallback(async () => {
    // Skip fetch if xField doesn't match source (e.g., during source switch)
    const validFields = SOURCE_FIELDS[source] || [];
    if (!validFields.includes(xField) && !validFields.some(f => f.endsWith(`.${xField}`))) { setLoading(false); return; }
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.set("source", source); p.set("x", xField); p.set("y", "count"); p.set("limit", "50");
      p.set("groupTop", String(groupTop));
      p.set("childTop", String(childTop));
      if (fy) { const sy = 2000 + parseInt(fy.slice(0, 2)); p.set("dateFrom", `${sy}-04-01`); p.set("dateTo", `${sy + 1}-03-31`); }
      else { if (dateFrom) p.set("dateFrom", dateFrom); if (dateTo) p.set("dateTo", dateTo); }
      for (const [f, v] of Object.entries(activeFilters)) { if (v.length > 0) p.set(`filter_${f}`, v.join(",")); }
      if (stackBy) p.set("stackBy", stackBy);

      const res = await fetch(`/api/chart-data?${p}`);
      const json = await res.json();
      if (json.success) {
        if (json.data.stacked) { setStackedData(json.data.stacked); setChartData([]); }
        else { setChartData(json.data.rows); setStackedData([]); }
        setTotal(json.data.total);
      } else toast.error(json.error || "Failed");
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [source, xField, stackBy, dateFrom, dateTo, fy, activeFilters, groupTop, childTop]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const [filterOptions, setFilterOptions] = useState<Record<string, string[]>>({});
  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(j => {
      if (j.success) {
        const map: Record<string, string[]> = {};
        for (const item of j.data) {
          if (item.isActive && !item.type.endsWith("_form_field") && item.type !== "progress_step") {
            if (!map[item.type]) map[item.type] = [];
            if (!map[item.type].includes(item.value)) map[item.type].push(item.value);
          }
        }
        setFilterOptions(map);
      }
    }).catch(console.error);
  }, []);

  const handleExport = async () => { setExporting(true); await exportPNG("chart-builder-preview", `chart-${source}-${xField}`, !isPie && barLegends.length > 0 ? barLegends : undefined); setExporting(false); };

  const fields = SOURCE_FIELDS[source] || [];
  const title = `${FIELD_LABELS[xField] || xField} by ${SOURCES.find(s => s.key === source)?.label || source}`;
  const hasStacked = stackedData.length > 0;
  const isPie = chartType === "pie" || chartType === "donut";

  // Build data for bar/line/area
  const barData = useMemo(() => {
    if (!hasStacked) return chartData.map(d => ({ label: d.label, value: d.value }));
    return stackedData.map(g => { const r: Record<string, unknown> = { label: g.label }; g.children.forEach(c => { r[c.label] = c.value; }); return r; });
  }, [hasStacked, chartData, stackedData]);
  const barKeys = useMemo(() => [...new Set(stackedData.flatMap(d => d.children.map(c => c.label)))], [stackedData]);

  // Donut data
  const donutData: DonutSlice[] = useMemo(() => {
    const flat = chartData.length > 0 ? chartData : stackedData.map(d => ({ label: d.label, value: d.value }));
    return flat.map((d, i) => ({ name: d.label, value: d.value, children: stackedData[i]?.children?.map(c => ({ label: c.label, value: c.value })) || [] }));
  }, [chartData, stackedData]);

  // Pie legend: sub-items use shadeColor (matches outer ring)
  const pieLegends = useMemo(() => {
    const items: { label: string; color: string; bold?: boolean; onClick?: () => void }[] = [];
    if (hasStacked) {
      stackedData.forEach((g, gi) => {
        const base = colors[gi % colors.length];
        items.push({ label: `${g.label}  ${g.value}`, color: base, bold: true, onClick: () => { setFocusIdx(gi); setFocusItem(g); setFocusOpen(true); } });
        g.children.forEach((c, ci) => {
          const num = parseInt(base.replace("#", ""), 16);
          let r = (num >> 16) & 0xFF, g2 = (num >> 8) & 0xFF, b = num & 0xFF;
          const mix = Math.min(0.6, 0.15 + (ci / Math.max(1, (g.children.length || 1) - 1)) * 0.45);
          r = Math.round(r + (255 - r) * mix); g2 = Math.round(g2 + (255 - g2) * mix); b = Math.round(b + (255 - b) * mix);
          items.push({ label: c.label, color: `#${((r << 16) | (g2 << 8) | b).toString(16).padStart(6, "0")}`, onClick: () => { setFocusIdx(gi); setFocusItem({ label: c.label, value: c.value, children: [] }); setFocusOpen(true); } });
        });
      });
    } else if (chartData.length > 0) {
      chartData.forEach((d, i) => items.push({ label: `${d.label}  ${d.value}`, color: colors[i % colors.length], onClick: () => { setFocusIdx(i); setFocusItem({ label: d.label, value: d.value, children: [] }); setFocusOpen(true); } }));
    }
    return items;
  }, [hasStacked, stackedData, chartData, colors]);

  // Bar legend: sub-items use distinct palette colors (matches bar colors)
  const barLegends = useMemo(() => {
    const items: { label: string; color: string; bold?: boolean; onClick?: () => void }[] = [];
    if (hasStacked) {
      stackedData.forEach((g, gi) => {
        const base = colors[gi % colors.length];
        items.push({ label: `${g.label}  ${g.value}`, color: base, bold: true, onClick: () => { setFocusIdx(gi); setFocusItem(g); setFocusOpen(true); } });
        g.children.forEach((c, ci) => {
          items.push({ label: c.label, color: colors[(gi * 3 + ci) % colors.length], onClick: () => { setFocusIdx(gi); setFocusItem({ label: c.label, value: c.value, children: [] }); setFocusOpen(true); } });
        });
      });
    } else if (chartData.length > 0) {
      chartData.forEach((d, i) => items.push({ label: `${d.label}  ${d.value}`, color: colors[i % colors.length], onClick: () => { setFocusIdx(i); setFocusItem({ label: d.label, value: d.value, children: [] }); setFocusOpen(true); } }));
    }
    return items;
  }, [hasStacked, stackedData, chartData, colors]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-slate-900">Chart Builder</h2><p className="text-sm text-slate-500 mt-1">Build custom charts for meeting presentations</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-2" onClick={fetchData} disabled={loading}><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />Refresh</Button>
          <Button size="sm" className="h-9 gap-2 bg-primary hover:bg-primary/90" onClick={handleExport} disabled={exporting}>{exporting ? <><Loader2 className="h-4 w-4 animate-spin" />Rendering...</> : <><Camera className="h-4 w-4" />Export PNG</>}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        {/* Left: Config (unchanged from old code) */}
        <div className="space-y-3 lg:col-span-1">
          {/* Source */}<Card className="border-0 shadow-sm"><CardHeader className="pb-1.5 pt-4 px-4"><CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Data Source</CardTitle></CardHeader><CardContent className="space-y-1 px-3 pb-3">{SOURCES.map(s => <button key={s.key} onClick={() => setSource(s.key)} className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2.5", source === s.key ? "bg-accent text-primary ring-1 ring-primary/20 font-semibold" : "text-slate-600 hover:bg-slate-50 font-medium")}><s.icon className="h-3.5 w-3.5 shrink-0" />{s.label}</button>)}</CardContent></Card>
          {/* Chart Type */}<Card className="border-0 shadow-sm"><CardHeader className="pb-1.5 pt-4 px-4"><CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Chart Type</CardTitle></CardHeader><CardContent className="px-3 pb-3"><div className="grid grid-cols-3 gap-1">{CHART_TYPES.map(t => <button key={t.key} onClick={() => setChartType(t.key)} className={cn("flex flex-col items-center gap-0.5 p-2 rounded-lg text-[11px] font-medium transition-all", chartType === t.key ? "bg-accent text-primary ring-1 ring-primary/20" : "text-slate-500 hover:bg-slate-50")}><t.icon className="h-4 w-4" />{t.label}</button>)}</div></CardContent></Card>
          {/* Colors */}<Card className="border-0 shadow-sm"><CardHeader className="pb-1.5 pt-4 px-4"><CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Colors</CardTitle></CardHeader><CardContent className="px-3 pb-3"><Select value={paletteKey} onValueChange={v => { if (v) setPaletteKey(v); }}><SelectTrigger className="w-full h-8 bg-white text-xs"><SelectValue /></SelectTrigger><SelectContent>{Object.keys(COLOR_PALETTES).map(k => <SelectItem key={k} value={k}><div className="flex items-center gap-1.5"><span>{k}</span><span className="flex gap-0.5">{(COLOR_PALETTES[k] || []).slice(0, 5).map((c, i) => <span key={i} className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c }} />)}</span></div></SelectItem>)}</SelectContent></Select></CardContent></Card>
          {/* Group By */}<Card className="border-0 shadow-sm"><CardHeader className="pb-1.5 pt-4 px-4"><CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Group By</CardTitle></CardHeader><CardContent className="px-3 pb-3"><Select value={xField} onValueChange={v => { if (v) setXField(v); }}><SelectTrigger className="w-full h-9 bg-white text-sm"><SelectValue /></SelectTrigger><SelectContent>{fields.map(f => <SelectItem key={f} value={f}>{FIELD_LABELS[f] || f}</SelectItem>)}</SelectContent></Select></CardContent></Card>
          {/* Sub-group */}<Card className="border-0 shadow-sm"><CardHeader className="pb-1.5 pt-4 px-4"><CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Sub-group</CardTitle></CardHeader><CardContent className="px-3 pb-3"><Select value={stackBy} onValueChange={v => { setStackBy(v || ""); if (v) setShowTable(true); }}><SelectTrigger className="w-full h-9 bg-white text-sm"><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="">None (flat)</SelectItem>{fields.filter(f => f !== xField).map(f => <SelectItem key={f} value={f}>{FIELD_LABELS[f] || f}</SelectItem>)}</SelectContent></Select></CardContent></Card>
          {/* Display */}<Card className="border-0 shadow-sm"><CardHeader className="pb-1.5 pt-4 px-4"><CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Display</CardTitle></CardHeader><CardContent className="space-y-1.5 px-3 pb-3"><div className="flex gap-1"><div className="flex-1"><label className="text-[10px] font-semibold text-slate-400 uppercase">Top Groups</label><Select value={String(groupTop)} onValueChange={v => setGroupTop(Number(v))}><SelectTrigger className="w-full h-8 bg-white text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent>{[5, 8, 10, 12, 15, 20, 0].map(n => <SelectItem key={n} value={String(n)}>{n === 0 ? "All" : `Top ${n}`}</SelectItem>)}</SelectContent></Select></div><div className="flex-1"><label className="text-[10px] font-semibold text-slate-400 uppercase">Sub-items</label><Select value={String(childTop)} onValueChange={v => setChildTop(Number(v))}><SelectTrigger className="w-full h-8 bg-white text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent>{[5, 6, 8, 10, 12, 0].map(n => <SelectItem key={n} value={String(n)}>{n === 0 ? "All" : `≤${n}`}</SelectItem>)}</SelectContent></Select></div></div><div><label className="text-[10px] font-semibold text-slate-400 uppercase">Pie Size</label><div className="flex items-center gap-2 mt-0.5"><input type="range" min={40} max={150} value={pieSize} onChange={e => setPieSize(Number(e.target.value))} className="flex-1 h-4" /><span className="text-[10px] text-slate-500 w-8 text-right">{pieSize}%</span></div></div><div><label className="text-[10px] font-semibold text-slate-400 uppercase">Label Min %</label><div className="flex items-center gap-2 mt-0.5"><input type="range" min={0} max={10} value={labelMin} onChange={e => setLabelMin(Number(e.target.value))} className="flex-1 h-4" /><span className="text-[10px] text-slate-500 w-8 text-right">{labelMin}%</span></div></div></CardContent></Card>
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
                    {(() => { const now = new Date(); const cfy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1; const ys: string[] = []; for (let y = 2022; y <= cfy; y++) ys.push(`${String(y).slice(2)}${String(y + 1).slice(2)}`); return ys.map(y => <SelectItem key={y} value={y}>{y} (Apr-Mar)</SelectItem>); })()}
                  </SelectContent>
                </Select>
              </div>
              {!fy && (<div><label className="text-[10px] font-semibold text-slate-400 uppercase">Custom Date Range</label><div className="space-y-1 mt-0.5"><input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); if (fy) setFy(""); }} disabled={!!fy} className="w-full h-8 text-xs border rounded-md px-2 py-1 bg-white disabled:opacity-40 disabled:cursor-not-allowed" /><input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); if (fy) setFy(""); }} disabled={!!fy} className="w-full h-8 text-xs border rounded-md px-2 py-1 bg-white disabled:opacity-40 disabled:cursor-not-allowed" /></div></div>)}
              {["category","hospital","department","purpose","technician"].map(key => {
                const opts = filterOptions[key] || [];
                if (opts.length === 0) return null;
                const sel = activeFilters[key] || [];
                const isExp = expandedFilter === key;
                const label = key.charAt(0).toUpperCase() + key.slice(1);
                return (<div key={key} className="border-t border-slate-100 pt-1.5 mt-1">
                  <button type="button" onClick={() => setExpandedFilter(isExp ? null : key)} className="w-full flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-700 py-0.5">{label}<span className="text-slate-300">{isExp ? "▾" : "▸"}</span></button>
                  {isExp && (<div className="max-h-32 overflow-y-auto space-y-0.5 mt-1">{opts.map(opt => (<label key={opt} className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 rounded px-0.5 py-0.5"><input type="checkbox" checked={sel.includes(opt)} onChange={() => { const next = sel.includes(opt) ? sel.filter(v => v !== opt) : [...sel, opt]; setActiveFilters(prev => ({ ...prev, [key]: next })); }} className="rounded border-slate-300 text-primary focus:ring-primary h-3 w-3" /><span className="text-[11px] text-slate-600 truncate">{opt}</span></label>))}</div>)}
                  {!isExp && sel.length > 0 && (<span className="text-[10px] text-blue-500 font-medium ml-1">{sel.length} selected</span>)}
                </div>);
              })}
              {Object.values(activeFilters).some(v => v.length > 0) && (<button type="button" onClick={() => setActiveFilters({})} className="w-full text-[10px] text-red-400 hover:text-red-600 font-medium pt-1.5 border-t border-slate-100 mt-1.5">Clear all filters</button>)}
            </CardContent>
          </Card>
        </div>

        {/* Right: Chart + Table */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-0 shadow-sm overflow-visible">
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-5 px-5">
              <div><CardTitle className="text-base font-bold text-slate-800">{title}</CardTitle><p className="text-xs text-slate-400 mt-0.5">{hasStacked ? `${stackedData.length} groups, ${barKeys.length} sub` : `${chartData.length} groups`} · {total} total</p></div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className={cn("h-8 gap-1.5 text-xs", showLabels && "text-primary")} onClick={() => setShowLabels(!showLabels)}>{showLabels ? "Labels On" : "Labels Off"}</Button>
                <Button variant="ghost" size="sm" className={cn("h-8 gap-1.5 text-xs", showTable && "text-primary")} onClick={() => setShowTable(!showTable)}><Table2 className="h-3.5 w-3.5" />{showTable ? "Hide Table" : "Show Table"}</Button>
              </div>
            </CardHeader>
            <CardContent className="!p-2" id="chart-builder-preview" ref={containerRef}>
              <ChartFullscreen title={title}>
                {loading ? <div className="flex items-center justify-center" style={{ height: 500 }}><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>
                : isPie ? (
                  <DonutChart data={donutData} colors={colors} total={total} height={760} composite={hasStacked} size={pieSize} labelMin={labelMin} showLabels={showLabels}
                    legendItems={pieLegends.length > 0 ? pieLegends : undefined}
                    onSelect={(slice, idx) => { setFocusIdx(idx); setFocusItem({ label: slice.name, value: slice.value, children: slice.children?.map(c => ({ label: c.label, value: c.value })) || [] }); setFocusOpen(true); }}
                    onOuterClick={hasStacked ? (parentIdx: number) => { const g = donutData[parentIdx]; if (g) { setFocusIdx(parentIdx); setFocusItem({ label: g.name, value: g.value, children: (g.children || []).map(c => ({ label: c.label, value: c.value })) }); setFocusOpen(true); } } : undefined}
                    onSubClick={hasStacked ? (sub: { label: string; value: number }, parentIdx: number) => { setFocusIdx(parentIdx); setFocusParent(donutData[parentIdx]?.name || ""); setFocusItem({ label: sub.label, value: sub.value, children: [] }); setFocusOpen(true); } : undefined} />
                ) : (
                  <BarChartView type={chartType as "bar"|"barH"|"line"|"area"|"stacked"} data={barData} dataKeys={hasStacked ? barKeys : ["value"]} colors={colors} showLabels={showLabels}
                    onClick={(d: any) => {
                      if (hasStacked) { const g = stackedData.find(s => s.label === d.label); if (g) { setFocusIdx(stackedData.indexOf(g)); setFocusItem(g); setFocusOpen(true); } }
                      else { const idx = chartData.findIndex(c => c.label === d.label); if (idx >= 0) { setFocusIdx(idx); setFocusItem({ label: chartData[idx].label, value: chartData[idx].value, children: [] }); setFocusOpen(true); } }
                    }}
                    onSubClick={hasStacked ? (sub: { name: string; value: number; group: string }) => { const ki = barKeys.indexOf(sub.name); setFocusIdx(ki >= 0 ? ki : 0); setFocusParent(sub.group || ""); setFocusItem({ label: sub.name, value: sub.value, children: [] }); setFocusOpen(true); } : undefined} />
                )}
              </ChartFullscreen>
            </CardContent>
          </Card>


          {/* Bar chart legend */}
          {!isPie && barLegends.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs px-2">
              {barLegends.map((item, i) => (
                item.onClick ? (
                  <button key={i} onClick={item.onClick}
                    className={`flex items-center gap-1.5 hover:text-blue-600 transition-colors ${item.bold ? "font-bold text-slate-700 w-full mt-1" : "text-slate-500 ml-6"}`}>
                    <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color, opacity: item.bold ? 1 : 0.7 }} />
                    {item.label}
                  </button>
                ) : (
                  <span key={i} className={`flex items-center gap-1.5 ${item.bold ? "font-bold text-slate-700 w-full mt-1" : "text-slate-500 ml-6"}`}>
                    <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color, opacity: item.bold ? 1 : 0.7 }} />
                    {item.label}
                  </span>
                )
              ))}
            </div>
          )}

          {showTable && hasStacked && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">{tableMode === "pivot" ? <Table2 className="h-4 w-4 text-primary" /> : <ListTree className="h-4 w-4 text-primary" />}{tableMode === "pivot" ? `Pivot: ${FIELD_LABELS[xField] || xField} × ${FIELD_LABELS[stackBy] || stackBy}` : `Breakdown: ${FIELD_LABELS[xField] || xField} → ${FIELD_LABELS[stackBy] || stackBy}`}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Export XLSX" onClick={async () => {
                    const XLSX = await import("xlsx");
                    const rows = stackedData.flatMap(g => [
                      { Group: g.label, Sub: "", Count: g.value },
                      ...g.children.map(c => ({ Group: "", Sub: c.label, Count: c.value })),
                    ]);
                    const ws = XLSX.utils.json_to_sheet(rows);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Data");
                    XLSX.writeFile(wb, `chart-data.xlsx`);
                  }}><Download className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" /></Button>
                  <div className="flex bg-slate-100 rounded-lg p-0.5">
                    <button type="button" onClick={() => setTableMode("pivot")} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${tableMode === "pivot" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Pivot</button>
                    <button type="button" onClick={() => setTableMode("hierarchical")} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${tableMode === "hierarchical" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>List</button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                {tableMode === "pivot" ? <PivotTable data={stackedData} total={total} rowLabel={FIELD_LABELS[xField] || xField} colLabel={FIELD_LABELS[stackBy] || stackBy} />
                : <HierarchicalTable data={stackedData} total={total} primaryLabel={FIELD_LABELS[xField] || xField} secondaryLabel={FIELD_LABELS[stackBy] || stackBy} colors={colors} />}
              </CardContent>
            </Card>
          )}

          {showTable && !hasStacked && chartData.length > 0 && (
            <Card className="border-0 shadow-sm"><CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between"><CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2"><Table2 className="h-4 w-4 text-primary" />Data Table</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                <button type="button" onClick={() => setTableMode("pivot")} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${tableMode === "pivot" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Pivot</button>
                <button type="button" onClick={() => setTableMode("hierarchical")} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${tableMode === "hierarchical" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>List</button>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Export XLSX" onClick={async () => {
                const XLSX = await import("xlsx");
                const ws = XLSX.utils.json_to_sheet(chartData.map(d => ({ Label: d.label, Count: d.value })));
                const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Data"); XLSX.writeFile(wb, "chart-data.xlsx");
              }}><Download className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" /></Button>
            </div></CardHeader>
              <CardContent className="px-2 pb-4"><HierarchicalTable data={chartData.map(d => ({ label: d.label, value: d.value, children: [] }))} total={total} primaryLabel={FIELD_LABELS[xField] || xField} secondaryLabel="" colors={colors} /></CardContent></Card>)}
        </div>
      </div>

      <FocusCard key={focusOpen ? focusItem?.label || "f" : "c"} open={focusOpen}
        label={focusParent ? `${focusParent} → ${focusItem?.label || ""}` : (focusItem?.label || "")} value={focusItem?.value || 0} total={total}
        chartType={chartType === "donut" || chartType === "pie" ? chartType : "bar"}
        color={focusIdx != null ? colors[focusIdx % colors.length] : colors[0]}
        children={focusItem?.children} colors={colors}
        viewAllHref={focusItem?.label && !focusItem.label.startsWith("Others") ? (
          focusItem.children && focusItem.children.length > 0
            ? `/${source === "materials" ? "materials" : "cases"}?${xField}=${encodeURIComponent(focusItem.label)}`
            : stackBy && focusParent
            ? `/${source === "materials" ? "materials" : "cases"}?${xField}=${encodeURIComponent(focusParent)}&${stackBy}=${encodeURIComponent(focusItem.label)}`
            : stackBy ? `/${source === "materials" ? "materials" : "cases"}?${stackBy}=${encodeURIComponent(focusItem.label)}`
            : `/${source === "materials" ? "materials" : "cases"}?${xField}=${encodeURIComponent(focusItem.label)}`
        ) : undefined}
        breakdownHref={stackBy ? (item: { label: string }) => `/${source === "materials" ? "materials" : "cases"}?${xField}=${encodeURIComponent(focusItem?.label || "")}&${stackBy}=${encodeURIComponent(item.label)}` : undefined}
        onClose={() => { setFocusOpen(false); setFocusItem(null); setFocusIdx(null); setFocusParent(""); }} />
    </div>
  );
}
