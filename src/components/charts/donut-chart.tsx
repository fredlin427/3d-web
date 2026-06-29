"use client";

import { useState, useCallback, useMemo } from "react";
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
  size?: number;
  labelMin?: number;
  showLabels?: boolean;
  onToggleLabels?: () => void;
  legendItems?: { label: string; color: string; bold?: boolean; onClick?: () => void }[];
  onSelect?: (slice: DonutSlice, index: number) => void;
  onOuterClick?: (parentIdx: number) => void;
}

function shadeColor(hex: string, step: number, totalKids: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) & 0xFF, g = (num >> 8) & 0xFF, b = num & 0xFF;
  // Wider spread: 20% base offset + up to 50% more
  const mix = Math.min(0.6, 0.15 + (step / Math.max(1, totalKids - 1)) * 0.45);
  r = Math.round(r + (255 - r) * mix);
  g = Math.round(g + (255 - g) * mix);
  b = Math.round(b + (255 - b) * mix);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function trunc(s: string, max = 10): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

const TOOLTIP = {
  borderRadius: 12, border: "none",
  boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 13,
};

export function DonutChart({ data, colors, total: propTotal, height = 480, composite = false, size = 100, labelMin = 0, showLabels = true, legendItems, onSelect, onOuterClick }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const displayIdx = activeIdx ?? hoverIdx;
  const computedTotal = propTotal ?? data.reduce((s, d) => s + d.value, 0);

  const handleClick = useCallback((_: any, index: number) => {
    const next = activeIdx === index ? null : index;
    setActiveIdx(next);
    if (next !== null) onSelect?.(data[next], next);
  }, [activeIdx, data, onSelect]);

  const flatData = data.map(d => ({ name: d.name, value: d.value }));

  const outerData: { name: string; value: number; parent: string; parentIdx: number }[] = [];
  if (composite) {
    data.forEach((g, gi) => {
      (g.children || []).forEach(c => {
        outerData.push({ name: c.label, value: c.value, parent: g.name, parentIdx: gi });
      });
    });
  }

  // Size scale: 100 = 180px base radius, scaled by size/100
  const scale = size / 100;
  const pieRadius = Math.round(180 * scale);
  const twoR = Math.round(Math.min(pieRadius * 0.75, 140 * scale));
  const hole = Math.round(twoR * 0.2);
  const innerOuter = Math.round(twoR * 0.58);
  const outerInner = Math.round(twoR * 0.64);
  const outerOuter = twoR;

  // Label overlap detection: skip if too close to existing label
  const labelGrid = new Set<number>();
  const labelOverlaps = (y: number): boolean => {
    const k = Math.round(y / 24);
    if (labelGrid.has(k)) return true;
    labelGrid.add(k);
    return false;
  };

  return (
    <>
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        {/* Outer ring (composite) — rendered first so it's behind */}
        {composite && outerData.length > 0 && (
          <Pie
              data={outerData} dataKey="value" nameKey="name" cx="50%" cy="48%"
            innerRadius={outerInner} outerRadius={outerOuter} stroke="#fff" strokeWidth={1} paddingAngle={1}
            isAnimationActive={false}
            label={!showLabels ? false : (props: any) => {
              const { name, value, percent, cx, cy, midAngle, outerRadius, index } = props;
              const color = colors[index % colors.length];
              const text = `${trunc(name || "", 10)} ${value} (${((percent || 0) * 100).toFixed(0)}%)`;
              const RAD = Math.PI / 180;
              const sin = Math.sin(-midAngle * RAD);
              const cos = Math.cos(-midAngle * RAD);
              const startX = cx + outerRadius * cos;
              const startY = cy + outerRadius * sin;
              const baseLx = cx + (outerRadius + 10) * cos;
              const baseLy = cy + (outerRadius + 10) * sin;
              if (labelOverlaps(baseLy)) return "";
              const endX = baseLx;
              const endY = baseLy;
              return (
                <g>
                  <polyline points={`${startX},${startY} ${startX + (endX-startX)*0.5},${startY + (endY-startY)*0.5} ${endX},${endY}`}
                    stroke={color} strokeWidth={1} fill="none" opacity={0.7} />
                  <text x={endX} y={endY} textAnchor={cos >= 0 ? "start" : "end"} dominantBaseline="central"
                    style={{ fontSize: 13, fontWeight: 600, fill: color }}>
                    {text}
                  </text>
                </g>
              );
            }}
            labelLine={false}
            onClick={onOuterClick ? (d: any) => onOuterClick(d.parentIdx) : undefined}
            onMouseEnter={(_: any, index: number) => { const d = outerData[index]; if (d) setHoverIdx(d.parentIdx); }}
            onMouseLeave={() => { if (!activeIdx) setHoverIdx(null); }}
            style={{ cursor: "pointer", outline: "none" } as any}
          >
            {outerData.map((d, i) => {
              const base = colors[d.parentIdx % colors.length];
              const kids = data[d.parentIdx]?.children?.length || 1;
              const idx = data[d.parentIdx]?.children?.findIndex(c => c.label === d.name) ?? 0;
              const dimmed = displayIdx !== null && d.parentIdx !== displayIdx;
              return <Cell key={i} fill={shadeColor(base, idx, kids)}
                opacity={dimmed ? 0.15 : 1} />;
            })}
          </Pie>
        )}

        {/* Inner ring — rendered on top */}
        <Pie
          key={`inner-${activeIdx}`}
          data={flatData} dataKey="value" nameKey="name" cx="50%" cy="48%"
          innerRadius={composite ? hole : Math.round(pieRadius * 0.45)}
          outerRadius={composite ? innerOuter : pieRadius}
          stroke="#fff" strokeWidth={composite ? 2 : 1} paddingAngle={composite ? 2 : 0}
          isAnimationActive={false}
          label={!showLabels ? false : (props: any) => {
            const { name, value, percent, cx, cy, midAngle, outerRadius, index } = props;
            const color = colors[index % colors.length];
            const text = `${trunc(name, 14)} ${value} (${((percent || 0) * 100).toFixed(0)}%)`;
            const RAD = Math.PI / 180;
            const sin = Math.sin(-midAngle * RAD);
            const cos = Math.cos(-midAngle * RAD);
            const startX = cx + outerRadius * cos;
            const startY = cy + outerRadius * sin;
            const baseLx = cx + (outerRadius + 10) * cos;
            const baseLy = cy + (outerRadius + 10) * sin;
            const offset = getLabelOffset(`inner-${index}`, baseLy) * 22;
            const endX = baseLx + offset * 0.3;
            const endY = baseLy + offset * (sin > 0 ? 1 : -1);
            return (
              <g>
                <polyline points={`${startX},${startY} ${startX + (endX-startX)*0.5},${startY + (endY-startY)*0.5} ${endX},${endY}`}
                  stroke={color} strokeWidth={1} fill="none" opacity={0.7} />
                <text x={endX} y={endY} textAnchor={cos >= 0 ? "start" : "end"} dominantBaseline="central"
                  style={{ fontSize: 11, fontWeight: 600, fill: color }}>
                  {text}
                </text>
              </g>
            );
          }}
          labelLine={false}
          onClick={handleClick}
          onMouseEnter={(_: any, i: number) => setHoverIdx(i)}
          onMouseLeave={() => { if (!activeIdx) setHoverIdx(null); }}
          style={{ cursor: "pointer", outline: "none" } as any}
        >
          {flatData.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]}
              opacity={displayIdx === null ? 1 : displayIdx === i ? 1 : 0.18} />
          ))}
        </Pie>

        <Tooltip contentStyle={TOOLTIP} />
      </PieChart>
    </ResponsiveContainer>

    {/* Legend — outside chart, uniform with bar charts */}
    {legendItems && legendItems.length > 0 && (
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] px-4 pt-2">
        {legendItems.map((item, i) => (
          item.onClick ? (
            <button key={i} onClick={item.onClick}
              className={`flex items-center gap-1 hover:text-blue-600 transition-colors ${item.bold ? "font-bold text-slate-700 w-full mt-1" : "text-slate-500 ml-5"}`}>
              <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: item.color, opacity: item.bold ? 1 : 0.7 }} />
              {item.label}
            </button>
          ) : (
            <span key={i} className={`flex items-center gap-1 ${item.bold ? "font-bold text-slate-700 w-full mt-1" : "text-slate-500 ml-5"}`}>
              <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: item.color, opacity: item.bold ? 1 : 0.7 }} />
              {item.label}
            </span>
          )
        ))}
      </div>
    )}
    </>
  );
}
