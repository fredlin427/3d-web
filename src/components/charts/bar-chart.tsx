"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, LabelList, Cell,
} from "recharts";
import { BarChart3 } from "lucide-react";

interface Props {
  type: "bar" | "barH" | "line" | "area" | "stacked";
  data: Record<string, unknown>[];
  dataKeys: string[];
  colors: string[];
  labelKey?: string;
  height?: number;
  showLabels?: boolean;
  onClick?: (item: any) => void;
  onSubClick?: (item: { name: string; value: number }) => void;
}

const S = {
  tooltip: {
    borderRadius: 14, border: "none",
    background: "rgba(255,255,255,0.95)", backdropFilter: "blur(16px)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.08)", fontSize: 13, padding: "10px 14px",
  },
  tickX: { fontSize: 13, fontWeight: 500 as const, fill: "#334155" },
  tickY: { fontSize: 12, fill: "#64748b" },
};

export function BarChartView({ type, data, dataKeys, colors, labelKey = "label", height = 440, showLabels = true, onClick, onSubClick }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!data || data.length === 0) return (
    <div className="flex items-center justify-center" style={{ height }}>
      <div className="text-center"><BarChart3 className="h-12 w-12 text-slate-200 mx-auto mb-3" /><p className="text-sm text-slate-400">No data</p></div>
    </div>
  );

  const isH = type === "barH";
  const isLine = type === "line";
  const isArea = type === "area";
  const isStacked = type === "stacked";
  const many = data.length > 12;

  const handleBarClick = (barData: any, barIndex: number, keyIndex: number) => {
    if (onSubClick) {
      onSubClick({ name: dataKeys[keyIndex], value: Number(barData[dataKeys[keyIndex]]) || 0 });
    } else if (onClick) {
      onClick(barData);
    }
  };

  const tooltipContent = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={S.tooltip}>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, backgroundColor: p.color }} />
            <strong style={{ color: "#1e293b" }}>{p.name}</strong>
            <span style={{ color: "#64748b" }}>{p.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const tip = <Tooltip contentStyle={S.tooltip} cursor={{ fill: "#f8f9fc" }} content={tooltipContent} />;
  const xEl = <XAxis dataKey={labelKey} tick={S.tickX} axisLine={false} tickLine={false}
    angle={many ? -35 : 0} textAnchor={many ? "end" : "middle"} height={many ? 90 : 60} />;
  const yEl = <YAxis tick={S.tickY} axisLine={false} tickLine={false} />;
  const grid = <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeWidth={0.5} vertical={false} />;

  if (isLine) return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} onMouseLeave={() => setHoverIdx(null)}>
        {grid} {xEl} {yEl} {tip}
        {dataKeys.map((k, i) => (
          <Line key={k} type="monotone" dataKey={k} stroke={colors[i % colors.length]} strokeWidth={2.5} dot={false}
            activeDot={{ r: 6, onClick: (e: any, d: any) => handleBarClick(d, 0, i) }}
            onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );

  if (isArea) return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} onMouseLeave={() => setHoverIdx(null)}>
        {grid} {xEl} {yEl} {tip}
        {dataKeys.map((k, i) => (
          <Area key={k} type="monotone" dataKey={k} stroke={colors[i % colors.length]} strokeWidth={2}
            fill={colors[i % colors.length]} fillOpacity={hoverIdx !== null && hoverIdx !== i ? 0.03 : 0.08}
            onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );

  const barSize = isH
    ? Math.max(16, Math.min(32, 400 / Math.max(data.length, 1)))
    : Math.max(12, Math.min(48, 700 / Math.max(data.length * (dataKeys.length + 1), 1)));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={isH ? "vertical" : "horizontal"} barSize={barSize} onMouseLeave={() => setHoverIdx(null)}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeWidth={0.5} vertical={!isH} horizontal={!!isH} />
        {isH ? (<>
          <XAxis type="number" tick={S.tickY} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey={labelKey} width={140} tick={{ fontSize: 12, fontWeight: 500, fill: "#334155" }} axisLine={false} tickLine={false} />
        </>) : (<>{xEl}{yEl}</>)}
        {tip}
        {dataKeys.map((key, ki) => {
          const isLast = isStacked && ki === dataKeys.length - 1;
          return (
            <Bar key={key} dataKey={key} stackId={isStacked ? "a" : undefined}
              fill={colors[ki % colors.length]}
              radius={isStacked ? (isLast ? [4, 4, 0, 0] : [0, 0, 0, 0]) : isH ? [0, 6, 6, 0] : [6, 6, 0, 0]}
              isAnimationActive animationDuration={400} animationEasing="ease-in-out"
              onClick={(d: any) => handleBarClick(d, 0, ki)}
              onMouseEnter={() => setHoverIdx(ki)}
              onMouseLeave={() => setHoverIdx(null)}
              cursor="pointer"
              opacity={isStacked && hoverIdx !== null && hoverIdx !== ki ? 0.3 : 1}
            >
              {!isStacked && dataKeys.length === 1 && data.length <= 12 && (
                <LabelList dataKey={dataKeys[0]} position={isH ? "right" : "top"} style={{ fontSize: 12, fontWeight: 700, fill: "#475569" }} />
              )}
            </Bar>
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}
