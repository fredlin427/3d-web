"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, LabelList,
} from "recharts";
import { ResponsivePie } from "@nivo/pie";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { truncateLabel, formatYAxis, shadeColor } from "@/lib/chart-config";

export interface ChartData {
  label: string;
  value: number;
}

export interface StackedRow {
  label: string;
  value: number;
  children: { label: string; value: number }[];
}

interface Props {
  chartType: string;
  chartData: ChartData[];
  stackedData: StackedRow[];
  colors: string[];
  // Interactions
  onSliceClick?: (group: StackedRow, index: number) => void;
  activeSliceIndex?: number | null;
  // Display
  containerWidth?: number;
}

const EmptyState = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <BarChart3 className="h-12 w-12 text-slate-200 mx-auto mb-3" />
      <p className="text-sm text-slate-400">No data to display</p>
      <p className="text-xs text-slate-300 mt-1">Adjust your filters and try again</p>
    </div>
  </div>
);

export function ChartRenderer({
  chartType, chartData, stackedData, colors,
  onSliceClick, activeSliceIndex,
  containerWidth = 800,
}: Props) {
  const hasStack = stackedData.length > 0;
  const flatData = chartData.length > 0 ? chartData : stackedData.map(d => ({ label: d.label, value: d.value }));
  const hasData = chartData.length > 0 || hasStack;
  const manyItems = flatData.length > 15;
  const pieRadius = Math.min(containerWidth * 0.28, 180);

  if (!hasData) return <EmptyState />;

  // Stacked data as flat records for grouped bar/line/area
  const groupedFlatData = stackedData.map(d => {
    const row: Record<string, unknown> = { label: d.label };
    d.children.forEach(c => { row[c.label] = c.value; });
    return row;
  });
  const stackKeys = [...new Set(stackedData.flatMap(d => d.children.map(c => c.label)))];

  const tooltipStyle = {
    borderRadius: 14, border: "none",
    background: "rgba(255,255,255,0.95)", backdropFilter: "blur(16px)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
    fontSize: 13, padding: "10px 14px",
  };
  const tickStyle = { fontSize: 13, fill: "#475569", fontWeight: 500 };
  const yTickStyle = { fontSize: 12, fill: "#64748b" };

  // ── Pie / Donut ──
  if (chartType === "pie" || chartType === "donut") {
    if (hasStack) {
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

      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={flatData} dataKey="value" nameKey="label" cx="50%" cy="48%"
              innerRadius={hole} outerRadius={innerOuter} stroke="#fff" strokeWidth={2} paddingAngle={5}
              animationDuration={400} animationEasing="ease-in-out" isAnimationActive
              label={({ index }) => { const d = flatData[index ?? -1]; return d ? d.label : ""; }}
              labelLine={false}
              onClick={onSliceClick ? (d: any) => {
                const g = stackedData.find(s => s.label === d.label);
                if (g) onSliceClick(g, flatData.findIndex(f => f.label === d.label));
              } : undefined}
              style={{ cursor: onSliceClick ? "pointer" : "default", outline: "none" } as any}
            >
              {flatData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Pie data={outerData} dataKey="value" nameKey="name" cx="50%" cy="48%"
              innerRadius={outerInner} outerRadius={outerOuter} stroke="#fff" strokeWidth={0.5} paddingAngle={3}
              animationDuration={400} animationEasing="ease-in-out" isAnimationActive
              label={({ name, value, percent }: any) => percent < 0.05 ? "" : `${name} ${value}`}
              labelLine={{ stroke: "#cbd5e1", strokeWidth: 0.5 }}
              onClick={onSliceClick ? (d: any) => {
                const g = stackedData.find(s => s.label === d.parent);
                if (g) onSliceClick(g, d.parentIdx);
              } : undefined}
              style={{ cursor: onSliceClick ? "pointer" : "default" }}
            >
              {outerData.map((d: any, i: number) => {
                const base = colors[d.parentIdx % colors.length];
                return <Cell key={i} fill={shadeColor(base, d.childIdx, stackedData[d.parentIdx]?.children.length || 1)} />;
              })}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      );
    }
    // Single-level: use Nivo for reliable rendering
    const nivoData = flatData.map(d => ({ id: d.label, label: d.label, value: d.value }));
    return (
      <div style={{ width: "100%", height: "100%" }}>
        <ResponsivePie
          data={nivoData} value="value" id="id"
          innerRadius={chartType === "donut" ? 0.55 : 0} padAngle={4} cornerRadius={1}
          activeOuterRadiusOffset={activeSliceIndex != null ? 8 : 0}
          colors={({ id }) => {
            const idx = flatData.findIndex(d => d.label === String(id));
            const base = colors[idx >= 0 ? idx % colors.length : 0];
            if (activeSliceIndex == null) return base;
            return idx === activeSliceIndex ? base : `${base}2E`;
          }}
          onClick={onSliceClick ? (d: { id: string | number }) => {
            const idx = flatData.findIndex(f => f.label === String(d.id));
            const g = stackedData.find(s => s.label === String(d.id));
            if (g && g.children.length > 0) onSliceClick(g, idx);
          } : undefined}
          enableArcLabels enableArcLinkLabels
          arcLabel={d => `${d.id} ${d.value}`} arcLabelsSkipAngle={6}
          arcLinkLabelsSkipAngle={8} arcLabelsTextColor="#334155"
          animate motionConfig="gentle"
          tooltip={({ datum }) => (
            <div style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(16px)", borderRadius: 14, padding: "10px 14px", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
              <strong style={{ color: "#1e293b", fontSize: 13 }}>{datum.label}</strong>
              <br /><span style={{ color: "#64748b", fontSize: 12 }}>{datum.value} items</span>
            </div>
          )}
        />
      </div>
    );
  }

  // ── Bar / BarH / Line / Area / Stacked ──
  const isHorizontal = chartType === "barH";
  const useStacked = chartType === "stacked";
  const isLine = chartType === "line";
  const isArea = chartType === "area";

  const displayData: any[] = hasStack ? groupedFlatData : flatData;
  const dataKeys = hasStack ? stackKeys : ["value"];

  const barSize = isHorizontal
    ? Math.max(14, Math.min(32, 450 / Math.max(displayData.length, 1)))
    : Math.max(10, Math.min(44, 750 / Math.max(displayData.length * (dataKeys.length + 1), 1)));

  if (isLine) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={displayData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeWidth={0.5} vertical={false} />
          <XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false}
            angle={displayData.length > 8 ? -35 : 0} textAnchor={displayData.length > 8 ? "end" : "middle"}
            height={displayData.length > 8 ? 80 : 40} tickFormatter={truncateLabel} />
          <YAxis tick={yTickStyle} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
          <Tooltip contentStyle={tooltipStyle} />
          
          {dataKeys.map((key, i) => (
            <Line key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]}
              strokeWidth={2.5} dot={{ fill: colors[i % colors.length], r: 4 }} activeDot={{ r: 6 }} name={key} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (isArea) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={displayData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeWidth={0.5} vertical={false} />
          <XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false}
            angle={displayData.length > 8 ? -35 : 0} textAnchor={displayData.length > 8 ? "end" : "middle"}
            height={displayData.length > 8 ? 80 : 40} tickFormatter={truncateLabel} />
          <YAxis tick={yTickStyle} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
          <Tooltip contentStyle={tooltipStyle} />
          
          {dataKeys.map((key, i) => (
            <Area key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]}
              strokeWidth={2} fill={colors[i % colors.length]} fillOpacity={0.08} name={key} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // Bar / BarH / Stacked
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={displayData} layout={isHorizontal ? "vertical" : "horizontal"}
        barSize={barSize} barCategoryGap="20%"
        margin={isHorizontal ? { left: 20, right: 60 } : undefined}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeWidth={0.5}
          vertical={!isHorizontal} horizontal={!!isHorizontal} />
        {isHorizontal ? (
          <>
            <XAxis type="number" tick={yTickStyle} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
            <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 12, fontWeight: 500, fill: "#334155" }}
              axisLine={false} tickLine={false} tickFormatter={truncateLabel} />
          </>
        ) : (
          <>
            <XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false}
              angle={displayData.length > 8 ? -35 : 0} textAnchor={displayData.length > 8 ? "end" : "middle"}
              height={displayData.length > 8 ? 80 : 40} tickFormatter={truncateLabel} />
            <YAxis tick={yTickStyle} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
          </>
        )}
        <Tooltip contentStyle={tooltipStyle} />
        
        {dataKeys.map((key, i) => {
          const fill = colors[i % colors.length];
          const isLastStack = useStacked && i === dataKeys.length - 1;
          return (
            <Bar key={key} dataKey={key}
              stackId={useStacked ? "a" : undefined}
              fill={fill} name={key}
              isAnimationActive={true} animationDuration={400} animationEasing="ease-in-out"
              radius={useStacked ? (isLastStack ? [4, 4, 0, 0] : [0, 0, 0, 0])
                : isHorizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]}
              onClick={!useStacked && hasStack && onSliceClick ? (d: any) => {
                const g = stackedData.find(s => s.label === d.label);
                if (g && g.children.length > 0) onSliceClick(g, stackedData.indexOf(g));
              } : undefined}
              cursor={!useStacked && hasStack ? "pointer" : "default"}
            >
              {!hasStack && !manyItems && <LabelList dataKey="value" position="top"
                style={{ fontSize: 12, fontWeight: 700, fill: "#475569" }} />}
            </Bar>
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}
