"use client";

import { useState, useCallback } from "react";
import { ResponsivePie } from "@nivo/pie";
import { cn } from "@/lib/utils";

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

export function InteractiveDonut({ data, colors, total, onSelect, className }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const nivoData = data.map(d => ({ id: d.name, label: d.name, value: d.value }));

  const handleClick = useCallback((slice: { id: string | number }, _event: React.MouseEvent) => {
    const id = String(slice.id);
    const nextId = activeId === id ? null : id;
    setActiveId(nextId);
    if (nextId) {
      const idx = data.findIndex(d => d.name === nextId);
      onSelect?.(data[idx], idx);
    }
  }, [activeId, data, onSelect]);

  const colorMap = Object.fromEntries(data.map((d, i) => [d.name, colors[i % colors.length]]));

  return (
    <div className={cn("space-y-2", className)} style={{ height: 480 }}>
      <ResponsivePie
        data={nivoData}
        value="value"
        id="id"
        innerRadius={0.55}
        padAngle={4}
        cornerRadius={2}
        activeOuterRadiusOffset={activeId ? 10 : 0}
        activeInnerRadiusOffset={activeId ? 4 : 0}
        // Colors: active slice full, inactive dimmed
        colors={({ id }) => {
          const base = colorMap[String(id)] || "#94a3b8";
          if (!activeId) return base;
          return String(id) === activeId ? base : `${base}2E`; // hex + 18% opacity
        }}
        onClick={handleClick}
        enableArcLabels
        enableArcLinkLabels
        arcLabel={d => `${d.id} ${d.value}`}
        arcLabelsSkipAngle={8}
        arcLinkLabelsSkipAngle={8}
        arcLinkLabelsThickness={1}
        arcLinkLabelsColor={{ from: "color" }}
        arcLinkLabelsDiagonalLength={12}
        arcLinkLabelsStraightLength={24}
        arcLabelsTextColor="#334155"
        // Animation
        animate
        motionConfig="gentle"
        // Tooltip
        tooltip={({ datum }) => {
          const pct = total > 0 ? ((datum.value / total) * 100).toFixed(1) : "0";
          return (
            <div className="bg-white/95 backdrop-blur-md rounded-xl px-3 py-2 shadow-xl ring-1 ring-black/5 text-sm">
              <p className="font-semibold text-slate-800">{datum.label}</p>
              <p className="text-slate-500 text-xs">{datum.value} cases · {pct}%</p>
            </div>
          );
        }}
        // Legends
        legends={[
          {
            anchor: "bottom",
            direction: "row",
            justify: false,
            translateY: 56,
            itemsSpacing: 8,
            itemWidth: 100,
            itemHeight: 16,
            itemTextColor: "#475569",
            symbolSize: 12,
            symbolShape: "square",
            onClick: (d) => {
              const idx = data.findIndex(item => item.name === d.id);
              setActiveId(String(d.id));
              onSelect?.(data[idx], idx);
            },
            effects: [{
              on: "hover",
              style: { itemTextColor: "#0f172a", symbolSize: 14 },
            }],
          },
        ]}
        theme={{
          labels: { text: { fontSize: 13, fontWeight: 600 } },
          legends: { text: { fontSize: 12, fontWeight: 500 } },
        }}
      />
      {/* Center overlay */}
      <div className="relative -mt-[320px] pointer-events-none flex items-center justify-center" style={{ height: 320 }}>
        <div className="text-center">
          <p className="text-4xl font-extrabold text-slate-900 tabular-nums tracking-tight">
            {activeId !== null ? data.find(d => d.name === activeId)?.value ?? total : total}
          </p>
          <p className="text-xs font-medium text-slate-400 mt-1">
            {activeId !== null ? data.find(d => d.name === activeId)?.name : "Total Cases"}
          </p>
        </div>
      </div>
    </div>
  );
}
