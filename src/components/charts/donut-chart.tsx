"use client";

import { useState, useCallback } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export interface DonutSlice {
  name: string;
  value: number;
  children?: { label: string; value: number }[];
}

interface Props {
  data: DonutSlice[];
  colors: string[];
  total: number;
  height?: number;
  /** If true, render two-level donut (inner groups + outer sub-items) */
  composite?: boolean;
  onSelect?: (slice: DonutSlice, index: number) => void;
}

function shadeColor(hex: string, step: number, total: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) & 0xFF, g = (num >> 8) & 0xFF, b = num & 0xFF;
  const mix = Math.min(0.35, step / (total + 2));
  r = Math.round(r + (255 - r) * mix);
  g = Math.round(g + (255 - g) * mix);
  b = Math.round(b + (255 - b) * mix);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

const tooltipStyle = {
  borderRadius: 14, border: "none",
  background: "rgba(255,255,255,0.95)", backdropFilter: "blur(16px)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.08)", fontSize: 13, padding: "10px 14px",
};

export function DonutChart({ data, colors, total, height = 480, composite = false, onSelect }: Props) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const handleClick = useCallback((_: any, index: number) => {
    const next = activeIdx === index ? null : index;
    setActiveIdx(next);
    if (next !== null) onSelect?.(data[next], next);
  }, [activeIdx, data, onSelect]);

  const flatData = data.map(d => ({ name: d.name, value: d.value }));

  // Build outer ring data for composite mode
  const outerData: { name: string; value: number; parentIdx: number }[] = [];
  if (composite) {
    data.forEach((g, gi) => {
      (g.children || []).forEach(c => {
        outerData.push({ name: c.label, value: c.value, parentIdx: gi });
      });
    });
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          {/* Outer ring (composite mode) */}
          {composite && outerData.length > 0 && (
            <Pie
              key={`outer-${activeIdx}`}
              data={outerData} dataKey="value" nameKey="name" cx="50%" cy="50%"
              innerRadius="62%" outerRadius="85%" paddingAngle={1}
              animationDuration={400} animationEasing="ease-out" isAnimationActive
            >
              {outerData.map((d, i) => {
                const base = colors[d.parentIdx % colors.length];
                const kids = data[d.parentIdx]?.children?.length || 1;
                const idx = data[d.parentIdx]?.children?.findIndex(c => c.label === d.name) ?? 0;
                const fill = shadeColor(base, idx, kids);
                return <Cell key={i} fill={fill} stroke="#fff" strokeWidth={0.5}
                  opacity={activeIdx !== null && d.parentIdx !== activeIdx ? 0.15 : 1} />;
              })}
            </Pie>
          )}

          {/* Inner ring / main ring */}
          <Pie
            key={`inner-${composite}-${activeIdx}`}
            data={flatData} dataKey="value" nameKey="name" cx="50%" cy="50%"
            innerRadius={composite ? "35%" : "50%"}
            outerRadius={composite ? "62%" : "85%"}
            paddingAngle={4}
            animationDuration={400} animationEasing="ease-out" isAnimationActive
            label={({ name, value, percent }: any) => {
              if ((percent || 0) < 0.03) return "";
              return `${name} ${value}`;
            }}
            labelLine={{ stroke: "#cbd5e1", strokeWidth: 0.5 }}
            onClick={handleClick}
            style={{ cursor: "pointer", outline: "none" } as any}
          >
            {flatData.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} stroke="#fff" strokeWidth={2}
                opacity={activeIdx === null ? 1 : activeIdx === i ? 1 : 0.18} />
            ))}
          </Pie>

          <Tooltip
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const d = payload[0];
              const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0";
              return (
                <div style={tooltipStyle}>
                  <strong style={{ color: "#1e293b" }}>{d.name}</strong>
                  <br />
                  <span style={{ color: "#64748b" }}>{d.value} cases · {pct}%</span>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center text overlay */}
      <div className="relative pointer-events-none flex items-center justify-center"
        style={{ marginTop: `-${height * 0.55}px`, height: height * 0.55 }}>
        <div className="text-center">
          <p className="text-4xl font-extrabold text-slate-900 tabular-nums">
            {activeIdx !== null ? data[activeIdx].value : total}
          </p>
          <p className="text-xs font-medium text-slate-400 mt-1">
            {activeIdx !== null ? data[activeIdx].name : "Total"}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-2 pt-2">
        {data.map((d, i) => {
          const c = colors[i % colors.length];
          const dimmed = activeIdx !== null && activeIdx !== i;
          return (
            <button
              key={d.name}
              onClick={() => { setActiveIdx(i); onSelect?.(d, i); }}
              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border hover:shadow-sm active:scale-95"
              style={{
                borderColor: dimmed ? "transparent" : `${c}40`,
                backgroundColor: dimmed ? "transparent" : `${c}10`,
              }}
            >
              <span className="w-3 h-3 rounded-sm shrink-0 ring-1 ring-black/10"
                style={{ backgroundColor: c, opacity: dimmed ? 0.3 : 1 }} />
              <span className="text-slate-700">{d.name}</span>
              <span className="text-slate-400 font-semibold tabular-nums">{d.value}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
