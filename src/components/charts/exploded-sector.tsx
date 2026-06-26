"use client";

import { Sector } from "recharts";

/**
 * Recharts custom activeShape for pie/donut slices.
 * Pushes the active slice 15px outward along its radial direction.
 */
export function ExplodedSector(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  const midAngle = (startAngle + endAngle) / 2;
  const RADIAN = Math.PI / 180;
  const dx = Math.cos(-midAngle * RADIAN) * 15;
  const dy = Math.sin(-midAngle * RADIAN) * 15;

  return (
    <g transform={`translate(${dx}, ${dy})`}>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#fff"
        strokeWidth={1.5}
        style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.15))" }}
      />
    </g>
  );
}
