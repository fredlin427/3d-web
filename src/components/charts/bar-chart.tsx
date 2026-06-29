"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, LabelList,
} from "recharts";
import { BarChart3 } from "lucide-react";

interface Props {
  type: "bar" | "barH" | "line" | "area" | "stacked";
  data: Record<string, unknown>[];
  dataKeys: string[];
  colors: string[];
  labelKey?: string;
  height?: number;
  onClick?: (item: any) => void;
}

const tooltipStyle = {
  borderRadius: 14, border: "none",
  background: "rgba(255,255,255,0.95)", backdropFilter: "blur(16px)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.08)", fontSize: 13, padding: "10px 14px",
};

export function BarChartView({ type, data, dataKeys, colors, labelKey = "label", height = 440, onClick }: Props) {
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

  return (
    <ResponsiveContainer width="100%" height={height}>
      {isLine ? (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeWidth={0.5} vertical={false} />
          <XAxis dataKey={labelKey} tick={{ fontSize: 12, fill: "#475569" }} axisLine={false} tickLine={false}
            angle={many ? -35 : 0} textAnchor={many ? "end" : "middle"} height={many ? 70 : 40} />
          <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          {dataKeys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={colors[i % colors.length]} strokeWidth={2.5} dot={false} />)}
        </LineChart>
      ) : isArea ? (
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeWidth={0.5} vertical={false} />
          <XAxis dataKey={labelKey} tick={{ fontSize: 12, fill: "#475569" }} axisLine={false} tickLine={false}
            angle={many ? -35 : 0} textAnchor={many ? "end" : "middle"} height={many ? 70 : 40} />
          <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          {dataKeys.map((k, i) => <Area key={k} type="monotone" dataKey={k} stroke={colors[i % colors.length]} strokeWidth={2} fill={colors[i % colors.length]} fillOpacity={0.08} />)}
        </AreaChart>
      ) : (
        <BarChart data={data} layout={isH ? "vertical" : "horizontal"} barSize={isH ? Math.max(16, Math.min(32, 400 / Math.max(data.length, 1))) : Math.max(12, Math.min(48, 700 / Math.max(data.length * (dataKeys.length + 1), 1)))}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeWidth={0.5} vertical={!isH} horizontal={!!isH} />
          {isH ? (
            <>
              <XAxis type="number" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey={labelKey} width={140} tick={{ fontSize: 12, fontWeight: 500, fill: "#334155" }} axisLine={false} tickLine={false} />
            </>
          ) : (
            <>
              <XAxis dataKey={labelKey} tick={{ fontSize: 12, fill: "#475569" }} axisLine={false} tickLine={false}
                angle={many ? -35 : 0} textAnchor={many ? "end" : "middle"} height={many ? 90 : 60} tick={{ fontSize: 13, fontWeight: 500, fill: "#334155" }} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
            </>
          )}
          <Tooltip contentStyle={tooltipStyle} />
          {dataKeys.map((k, i) => {
            const isLast = isStacked && i === dataKeys.length - 1;
            return (
              <Bar key={k} dataKey={k} stackId={isStacked ? "a" : undefined} fill={colors[i % colors.length]}
                radius={isStacked ? (isLast ? [4, 4, 0, 0] : [0, 0, 0, 0]) : isH ? [0, 6, 6, 0] : [6, 6, 0, 0]}
                isAnimationActive animationDuration={400} animationEasing="ease-in-out"
                onClick={onClick ? (d: any) => onClick(d) : undefined}
                cursor={onClick ? "pointer" : "default"}
              >
                {!isStacked && dataKeys.length === 1 && data.length <= 12 && (
                  <LabelList dataKey={dataKeys[0]} position={isH ? "right" : "top"} style={{ fontSize: 12, fontWeight: 700, fill: "#475569" }} />
                )}
              </Bar>
            );
          })}
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}
