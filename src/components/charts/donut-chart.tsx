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
  total?: number;
  height?: number;
  composite?: boolean;
  onSelect?: (slice: DonutSlice, index: number) => void;
}

function shadeColor(hex: string, step: number, totalKids: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) & 0xFF, g = (num >> 8) & 0xFF, b = num & 0xFF;
  const mix = Math.min(0.35, step / (totalKids + 2));
  r = Math.round(r + (255 - r) * mix);
  g = Math.round(g + (255 - g) * mix);
  b = Math.round(b + (255 - b) * mix);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

const TOOLTIP = {
  borderRadius: 14, border: "none",
  background: "rgba(255,255,255,0.95)", backdropFilter: "blur(16px)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.08)", fontSize: 13, padding: "10px 14px",
};

export function DonutChart({ data, colors, total: propTotal, height = 480, composite = false, onSelect }: Props) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const computedTotal = propTotal ?? data.reduce((s, d) => s + d.value, 0);

  const handleClick = useCallback((_: any, index: number) => {
    const next = activeIdx === index ? null : index;
    setActiveIdx(next);
    if (next !== null) onSelect?.(data[next], next);
  }, [activeIdx, data, onSelect]);

  const flatData = data.map(d => ({ name: d.name, value: d.value }));

  const outerData: { name: string; value: number; parentIdx: number }[] = [];
  if (composite) {
    data.forEach((g, gi) => {
      (g.children || []).forEach(c => {
        outerData.push({ name: c.label, value: c.value, parentIdx: gi });
      });
    });
  }

  return (
    <div style={{ height, position: "relative" }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 24, right: 24, bottom: 24, left: 24 }}>
          {/* Outer ring (composite) */}
          {composite && outerData.length > 0 && (
            <Pie
              key={`outer-${activeIdx}`}
              data={outerData} dataKey="value" nameKey="name" cx="50%" cy="50%"
              innerRadius="64%" outerRadius="85%" paddingAngle={1}
              animationDuration={400} animationEasing="ease-out" isAnimationActive
            >
              {outerData.map((d, i) => {
                const base = colors[d.parentIdx % colors.length];
                const kids = data[d.parentIdx]?.children?.length || 1;
                const idx = data[d.parentIdx]?.children?.findIndex(c => c.label === d.name) ?? 0;
                return <Cell key={i} fill={shadeColor(base, idx, kids)} stroke="#fff" strokeWidth={0.5}
                  opacity={activeIdx !== null && d.parentIdx !== activeIdx ? 0.15 : 1} />;
              })}
            </Pie>
          )}

          {/* Inner ring */}
          <Pie
            key={`main-${composite}-${activeIdx}`}
            data={flatData} dataKey="value" nameKey="name" cx="50%" cy="50%"
            innerRadius={composite ? "37%" : "52%"}
            outerRadius={composite ? "64%" : "85%"}
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

          {/* Center text — inside SVG, won't overlap */}
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: "none" }}>
            <tspan x="50%" dy="-8" style={{ fontSize: 28, fontWeight: 800, fill: "#0f172a" }}>
              {activeIdx !== null ? data[activeIdx].value : computedTotal}
            </tspan>
            <tspan x="50%" dy="22" style={{ fontSize: 11, fontWeight: 500, fill: "#94a3b8" }}>
              {activeIdx !== null ? data[activeIdx].name : "Total"}
            </tspan>
          </text>

          <Tooltip
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const d = payload[0];
              const pct = computedTotal > 0 ? ((d.value / computedTotal) * 100).toFixed(1) : "0";
              return (
                <div style={TOOLTIP}>
                  <strong style={{ color: "#1e293b" }}>{d.name}</strong>
                  <br />
                  <span style={{ color: "#64748b" }}>{d.value} cases · {pct}%</span>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-2 px-2">
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
