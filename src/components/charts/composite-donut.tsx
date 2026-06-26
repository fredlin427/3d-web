"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface DonutSlice {
  name: string;
  value: number;
  children?: { label: string; value: number }[];
}

interface Props {
  groups: DonutSlice[];
  colors: string[];
  total: number;
  height?: number;
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

export function CompositeDonut({ groups, colors, total, height = 500, onSelect }: Props) {
  // Inner ring: group totals
  const innerData = groups.map(g => ({ name: g.name, value: g.value }));

  // Outer ring: all sub-items
  const outerData: { name: string; value: number; parent: string; parentIdx: number }[] = [];
  groups.forEach((g, gi) => {
    (g.children || []).forEach(c => {
      outerData.push({ name: c.label, value: c.value, parent: g.name, parentIdx: gi });
    });
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        {/* Outer ring — rendered first (behind) */}
        <Pie
          data={outerData} dataKey="value" nameKey="name" cx="50%" cy="50%"
          innerRadius="62%" outerRadius="85%" paddingAngle={1}
          animationDuration={400} animationEasing="ease-out" isAnimationActive
        >
          {outerData.map((d, i) => {
            const base = colors[d.parentIdx % colors.length];
            const kids = groups[d.parentIdx]?.children?.length || 1;
            const idx = groups[d.parentIdx]?.children?.findIndex(c => c.label === d.name) ?? 0;
            return <Cell key={i} fill={shadeColor(base, idx, kids)} stroke="#fff" strokeWidth={0.5} />;
          })}
        </Pie>

        {/* Inner ring — rendered second (on top) */}
        <Pie
          data={innerData} dataKey="value" nameKey="name" cx="50%" cy="50%"
          innerRadius="35%" outerRadius="62%" paddingAngle={4}
          animationDuration={400} animationEasing="ease-out" isAnimationActive
          label={({ name, value }: any) => `${name} ${value}`}
          labelLine={{ stroke: "#cbd5e1", strokeWidth: 0.5 }}
          onClick={onSelect ? (_: any, index: number) => onSelect(groups[index], index) : undefined}
          style={onSelect ? { cursor: "pointer", outline: "none" } as any : undefined}
        >
          {innerData.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} stroke="#fff" strokeWidth={2} />
          ))}
        </Pie>

        <Tooltip
          contentStyle={{
            borderRadius: 14, border: "none",
            background: "rgba(255,255,255,0.95)", backdropFilter: "blur(16px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.08)", fontSize: 13, padding: "10px 14px",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
