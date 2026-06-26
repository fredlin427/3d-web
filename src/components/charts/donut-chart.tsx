"use client";

import { useState, useCallback } from "react";
import { ResponsivePie } from "@nivo/pie";

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
  onSelect?: (slice: DonutSlice, index: number) => void;
}

export function DonutChart({ data, colors, total, height = 480, onSelect }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const nivoData = data.map(d => ({ id: d.name, label: d.name, value: d.value }));
  const colorMap: Record<string, string> = {};
  data.forEach((d, i) => { colorMap[d.name] = colors[i % colors.length]; });

  const handleClick = useCallback((slice: { id: string | number }) => {
    const id = String(slice.id);
    const next = activeId === id ? null : id;
    setActiveId(next);
    if (next) {
      const idx = data.findIndex(d => d.name === next);
      onSelect?.(data[idx], idx);
    }
  }, [activeId, data, onSelect]);

  return (
    <div style={{ height }}>
      <ResponsivePie
        data={nivoData} value="value" id="id"
        innerRadius={0.55} padAngle={3} cornerRadius={2}
        activeOuterRadiusOffset={activeId ? 10 : 0}
        colors={({ id }) => {
          const base = colorMap[String(id)] || "#94a3b8";
          if (!activeId) return base;
          return String(id) === activeId ? base : `${base}33`;
        }}
        onClick={handleClick}
        enableArcLabels enableArcLinkLabels
        arcLabel={d => `${d.id} ${d.value}`}
        arcLabelsSkipAngle={6} arcLinkLabelsSkipAngle={6}
        arcLabelsTextColor="#334155" arcLinkLabelsColor={{ from: "color" }}
        arcLinkLabelsThickness={1}
        arcLinkLabelsDiagonalLength={12} arcLinkLabelsStraightLength={24}
        animate motionConfig="gentle"
        tooltip={({ datum }) => (
          <div style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(16px)", borderRadius: 14, padding: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.08)", fontSize: 13 }}>
            <strong>{datum.label}</strong><br />
            <span style={{ color: "#64748b" }}>{datum.value} cases</span>
          </div>
        )}
        legends={[{
          anchor: "bottom", direction: "row", justify: false,
          translateY: 50, itemsSpacing: 10, itemWidth: 100, itemHeight: 18,
          itemTextColor: "#475569", symbolSize: 12, symbolShape: "square",
          onClick: (d) => {
            const idx = data.findIndex(item => item.name === d.id);
            setActiveId(String(d.id));
            onSelect?.(data[idx], idx);
          },
          effects: [{ on: "hover", style: { itemTextColor: "#0f172a", symbolSize: 14 } }],
        }]}
        theme={{ labels: { text: { fontSize: 13, fontWeight: 600 } }, legends: { text: { fontSize: 12 } } }}
      />
    </div>
  );
}
