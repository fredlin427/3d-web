"use client";

import { useState, useCallback } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Sector, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

// ── Types ──
export interface DonutSlice {
  name: string;
  value: number;
  children?: { label: string; value: number }[];
}

interface Props {
  data: DonutSlice[];
  colors: string[];
  total: number;
  onSelect?: (slice: DonutSlice, index: number) => void;
  className?: string;
}

// ── Exploded active slice ──
function ActiveSector(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  const mid = (startAngle + endAngle) / 2;
  const rad = (Math.PI / 180);
  const dx = Math.cos(-mid * rad) * 16;
  const dy = Math.sin(-mid * rad) * 16;
  return (
    <g transform={`translate(${dx},${dy})`}>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 4} startAngle={startAngle} endAngle={endAngle} fill={fill} stroke="#fff" strokeWidth={2} style={{ filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.2))" }} />
    </g>
  );
}

// ── Legend ──
function Legend({ data, colors, activeIndex, onSelect }: { data: DonutSlice[]; colors: string[]; activeIndex: number | null; onSelect?: (slice: DonutSlice, index: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 justify-center px-2 pt-2">
      {data.map((d, i) => (
        <button
          key={d.name}
          onClick={() => onSelect?.(d, i)}
          className={cn(
            "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
            "border hover:shadow-sm active:scale-95",
            activeIndex === i
              ? "bg-slate-100 border-slate-300 shadow-sm"
              : "border-transparent hover:bg-slate-50 hover:border-slate-200"
          )}
        >
          <span
            className="w-3 h-3 rounded-sm shrink-0 ring-1 ring-black/10 transition-all duration-300"
            style={{
              backgroundColor: colors[i % colors.length],
              opacity: activeIndex === null || activeIndex === i ? 1 : 0.25,
            }}
          />
          <span className="text-slate-700">{d.name}</span>
          <span className="text-slate-400 font-semibold tabular-nums">{d.value}</span>
        </button>
      ))}
    </div>
  );
}

// ── Tooltip ──
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white/95 backdrop-blur-md rounded-xl px-3 py-2 shadow-xl ring-1 ring-black/5 text-sm">
      <p className="font-semibold text-slate-800">{d.name}</p>
      <p className="text-slate-500 text-xs">{d.value} cases</p>
    </div>
  );
}

// ── Main Component ──
export function InteractiveDonut({ data, colors, total, onSelect, className }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const handleClick = useCallback((_: any, index: number) => {
    const next = activeIndex === index ? null : index;
    setActiveIndex(next);
    if (next !== null) onSelect?.(data[next], next);
    else onSelect?.(data[index], index); // for the first click case
  }, [activeIndex, data, onSelect]);

  return (
    <div className={cn("space-y-1", className)}>
      {/* Donut */}
      <div className="w-full" style={{ maxWidth: 500, margin: "0 auto" }}>
        <ResponsiveContainer width="100%" height={360}>
          <PieChart>
            {/* Center text */}
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: "none" }}>
              <tspan x="50%" dy="-6" style={{ fontSize: 32, fontWeight: 800, fill: "#0f172a" }}>
                {activeIndex !== null ? data[activeIndex].value : total}
              </tspan>
              <tspan x="50%" dy="22" style={{ fontSize: 11, fontWeight: 500, fill: "#94a3b8" }}>
                {activeIndex !== null ? data[activeIndex].name : "Total"}
              </tspan>
            </text>
            <Pie
              data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
              outerRadius={155} innerRadius={85} paddingAngle={4}
              isAnimationActive animationDuration={500} animationEasing="ease-out"
              onClick={handleClick as any}
              onMouseEnter={((_: any, i: number) => { if (activeIndex === null) setActiveIndex(i); }) as any}
              onMouseLeave={(() => { if (activeIndex === null) setActiveIndex(null); }) as any}
              style={{ cursor: "pointer", outline: "none" } as any}
              label={({ name, value, percent }: any) => {
                if ((percent || 0) < 0.03) return "";
                return `${name} ${value}`;
              }}
              labelLine={{ stroke: "#cbd5e1", strokeWidth: 0.5 }}
            >
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={colors[i % colors.length]}
                  stroke="#fff"
                  strokeWidth={2}
                  style={{
                    opacity: activeIndex === null ? 1 : activeIndex === i ? 1 : 0.18,
                    transition: "opacity 0.35s ease",
                  } as any}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <Legend data={data} colors={colors} activeIndex={activeIndex} onSelect={(d, i) => {
        setActiveIndex(i);
        onSelect?.(d, i);
      }} />
    </div>
  );
}
