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
  legendItems?: { label: string; color: string; bold?: boolean; onClick?: () => void }[];
  onSelect?: (slice: DonutSlice, index: number) => void;
  onOuterClick?: (parentIdx: number) => void;
  onSubClick?: (subItem: { label: string; value: number }, parentIdx: number) => void;
}

function shadeColor(hex: string, step: number, totalKids: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) & 0xFF, g = (num >> 8) & 0xFF, b = num & 0xFF;
  const mix = Math.min(0.4, step / (totalKids + 2));
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

const MIN_GAP = 32;

export function DonutChart({ data, colors, total: propTotal, height = 520, composite = false, size = 100, labelMin = 0, showLabels = true, legendItems, onSelect, onOuterClick, onSubClick }: Props) {
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

  const scale = size / 100;
  const pieRadius = Math.round(180 * scale);
  const twoR = Math.round(Math.min(pieRadius * 0.75, 140 * scale));
  const hole = Math.round(twoR * 0.2);
  const innerOuter = Math.round(twoR * 0.58);
  const outerInner = Math.round(twoR * 0.64);
  const outerOuter = twoR;

  // ── Label collision: closest free slot, bounded ──
  const occupied = new Set<number>();
  const shiftCache = useMemo(() => new Map<string, number>(), [flatData, outerData]);
  const MAX_DIST = 4; // max shifts (4 * 22 = 88px max offset)
  const STEP = 22;
  const getOffset = (key: string, baseY: number): number => {
    if (shiftCache.has(key)) return shiftCache.get(key)!;
    const base = Math.round(baseY / STEP) * STEP;
    // Try 0, +1, -1, +2, -2... up to MAX_DIST
    for (let d = 0; d <= MAX_DIST; d++) {
      for (const sign of [1, -1]) {
        if (d === 0 && sign === -1) continue; // skip duplicate 0
        const testY = base + sign * d * STEP;
        if (!occupied.has(testY)) {
          occupied.add(testY);
          shiftCache.set(key, sign * d);
          return sign * d;
        }
      }
    }
    // All slots taken within bounds — place at base anyway (acceptable overlap)
    shiftCache.set(key, 0);
    return 0;
  };

  if (!showLabels) {
    // Clear occupied for no-label case
    occupied.clear();
  }

  const outerLabel = !showLabels ? false : (props: any) => {
    const { name, value, cx, cy, midAngle, outerRadius, index } = props;
    const color = colors[outerData[index]?.parentIdx % colors.length] || colors[0];
    const text = `${trunc(name || "", 10)} ${value}`;
    const RAD = Math.PI / 180;
    const sin = Math.sin(-midAngle * RAD);
    const cos = Math.cos(-midAngle * RAD);
    const sx = cx + outerRadius * cos;
    const sy = cy + outerRadius * sin;
    const lx = cx + (outerRadius + 28) * cos;
    const ly = cy + (outerRadius + 28) * sin;
    const off = getOffset(`outer-${index}`, ly) * MIN_GAP;
    const ex = lx + off * 0.3;
    const ey = ly + off * (sin > 0 ? 1 : -1);
    return (
      <g>
        <polyline points={`${sx},${sy} ${sx+(ex-sx)*0.6},${sy+(ey-sy)*0.6} ${ex},${ey}`}
          stroke={color} strokeWidth={1} fill="none" opacity={0.6} />
        <text x={ex} y={ey} textAnchor={cos >= 0 ? "start" : "end"} dominantBaseline="central"
          style={{ fontSize: 11, fontWeight: 600, fill: color }}>{text}</text>
      </g>
    );
  };

  const innerLabel = !showLabels ? false : (props: any) => {
    const { name, value, percent, cx, cy, midAngle, outerRadius, index } = props;
    const color = colors[index % colors.length];
    const text = composite ? name : `${trunc(name, 14)} ${value} (${((percent || 0) * 100).toFixed(0)}%)`;
    const RAD = Math.PI / 180;
    const sin = Math.sin(-midAngle * RAD);
    const cos = Math.cos(-midAngle * RAD);
    const sx = cx + outerRadius * cos;
    const sy = cy + outerRadius * sin;
    const lx = cx + (outerRadius + 28) * cos;
    const ly = cy + (outerRadius + 28) * sin;
    const off = getOffset(`inner-${index}`, ly) * MIN_GAP;
    const ex = lx + off * 0.3;
    const ey = ly + off * (sin > 0 ? 1 : -1);
    return (
      <g>
        <polyline points={`${sx},${sy} ${sx+(ex-sx)*0.6},${sy+(ey-sy)*0.6} ${ex},${ey}`}
          stroke={color} strokeWidth={1} fill="none" opacity={0.6} />
        <text x={ex} y={ey} textAnchor={cos >= 0 ? "start" : "end"} dominantBaseline="central"
          style={{ fontSize: 11, fontWeight: 600, fill: color }}>{text}</text>
      </g>
    );
  };

  return (
    <>
    <ResponsiveContainer width="100%" height={height + (composite ? 40 : 0)}>
      <PieChart>
        {composite && outerData.length > 0 && (
          <Pie
            data={outerData} dataKey="value" nameKey="name" cx="50%" cy="48%"
            innerRadius={outerInner} outerRadius={outerOuter} stroke="#fff" strokeWidth={1} paddingAngle={1}
            isAnimationActive={false}
            label={outerLabel} labelLine={false}
            onClick={(d: any) => {
              if (onSubClick) onSubClick({ label: d.name, value: d.value }, d.parentIdx);
              else if (onOuterClick) onOuterClick(d.parentIdx);
            }}
            onMouseEnter={(_: any, index: number) => setHoverIdx(index + 1000)}
            onMouseLeave={() => { if (!activeIdx) setHoverIdx(null); }}
            style={{ cursor: "pointer", outline: "none" } as any}
          >
            {outerData.map((d, i) => {
              const base = colors[d.parentIdx % colors.length];
              const kids = data[d.parentIdx]?.children?.length || 1;
              const idx = data[d.parentIdx]?.children?.findIndex(c => c.label === d.name) ?? 0;
              const isOuterHover = displayIdx !== null && displayIdx >= 1000;
              const subIdx = isOuterHover ? displayIdx - 1000 : -1;
              const dimmed = displayIdx !== null && (isOuterHover ? i !== subIdx : d.parentIdx !== displayIdx);
              return <Cell key={i} fill={shadeColor(base, idx, kids)} opacity={dimmed ? 0.15 : 1} />;
            })}
          </Pie>
        )}

        <Pie
          data={flatData} dataKey="value" nameKey="name" cx="50%" cy="48%"
          innerRadius={composite ? hole : Math.round(pieRadius * 0.45)}
          outerRadius={composite ? innerOuter : pieRadius}
          stroke="#fff" strokeWidth={composite ? 2 : 1} paddingAngle={composite ? 2 : 0}
          isAnimationActive={false}
          label={innerLabel} labelLine={false}
          onClick={handleClick}
          onMouseEnter={(_: any, i: number) => setHoverIdx(i)}
          onMouseLeave={() => { if (!activeIdx) setHoverIdx(null); }}
          style={{ cursor: "pointer", outline: "none" } as any}
        >
          {flatData.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} opacity={displayIdx === null ? 1 : displayIdx >= 1000 ? (outerData.length > 0 && outerData[displayIdx - 1000]?.parentIdx === i ? 1 : 0.18) : displayIdx === i ? 1 : 0.18} />
          ))}
        </Pie>

        <Tooltip contentStyle={TOOLTIP} />
      </PieChart>
    </ResponsiveContainer>

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
