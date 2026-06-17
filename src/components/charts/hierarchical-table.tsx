"use client";

import { cn } from "@/lib/utils";

export interface StackedRow {
  label: string;
  value: number;
  children: { label: string; value: number }[];
}

interface Props {
  data: StackedRow[];
  total: number;
  primaryLabel?: string;
  secondaryLabel?: string;
  colors?: string[];
}

const DEFAULT_COLORS = [
  "#4472C4","#ED7D31","#A5A5A5","#FFC000","#5B9BD5","#70AD47",
  "#F15C5C","#9B59B6","#1ABC9C","#E67E22","#2E75B6","#C55A11",
  "#7F7F7F","#A68A00","#3B6FB6","#D44C2B","#8C8C8C","#E5A800",
  "#4A90D9","#F07020","#B0B0B0","#FFB300","#6BA5DA","#85C056",
];

export function HierarchicalTable({ data, total, primaryLabel = "Group", secondaryLabel = "Sub-item", colors = DEFAULT_COLORS }: Props) {
  if (!data || data.length === 0) {
    return <p className="text-xs text-slate-400 text-center py-6">No data available</p>;
  }

  return (
    <div className="overflow-x-auto" style={{ fontFamily: "Calibri, Arial, sans-serif" }}>
      <table className="w-full text-sm">
        <colgroup>
          <col style={{ width: "auto" }} />
          <col style={{ width: 80 }} />
          <col style={{ width: 70 }} />
          <col style={{ width: 120 }} />
        </colgroup>
        <thead>
          <tr className="border-y border-slate-200">
            <th className="text-left py-2.5 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{primaryLabel}</th>
            <th className="text-right py-2.5 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Count</th>
            <th className="text-right py-2.5 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">%</th>
            <th className="py-2.5 px-3" />
          </tr>
        </thead>
        <tbody>
          {data.map((group, gi) => {
            const groupPct = total > 0 ? ((group.value / total) * 100).toFixed(1) : "0";
            const groupRows = [
              // Group header row
              <tr key={`g-${group.label}`} className="border-b border-slate-100 bg-slate-50/40">
                <td className="py-2.5 px-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: colors[gi % colors.length] }} />
                    <span className="text-sm font-bold text-slate-800">{group.label}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className="text-sm font-bold text-slate-900 tabular-nums">{group.value}</span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className="text-sm font-semibold text-slate-600 tabular-nums">{groupPct}%</span>
                </td>
                <td className="py-2.5 px-3">
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${groupPct}%`, backgroundColor: colors[gi % colors.length] }} />
                  </div>
                </td>
              </tr>,
            ];
            // Sub-item rows — always visible, no collapse
            group.children.forEach((child, ci) => {
              const childPct = group.value > 0 ? ((child.value / group.value) * 100).toFixed(1) : "0";
              groupRows.push(
                <tr key={`${group.label}-${child.label}`} className="border-b border-slate-50">
                  <td className="py-2 pl-10 pr-4 text-sm text-slate-600">
                    <span className="inline-block w-2 h-2 rounded-sm shrink-0 mr-2 align-middle" style={{ backgroundColor: colors[ci % colors.length], opacity: 0.65 }} />
                    {child.label}
                  </td>
                  <td className="py-2 px-3 text-right font-semibold text-slate-700 tabular-nums">{child.value}</td>
                  <td className="py-2 px-3 text-right text-slate-500 tabular-nums">{childPct}%</td>
                  <td className="py-2 px-3">
                    <div className="w-full bg-slate-50 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${childPct}%`, backgroundColor: colors[ci % colors.length], opacity: 0.6 }} />
                    </div>
                  </td>
                </tr>
              );
            });
            return groupRows;
          }).flat()}
          {/* Total row */}
          <tr className="border-t-2 border-slate-200 bg-slate-50/60">
            <td className="py-2.5 px-4 text-sm font-bold text-slate-700">Total</td>
            <td className="py-2.5 px-3 text-right text-sm font-extrabold text-slate-900 tabular-nums">{total}</td>
            <td className="py-2.5 px-3 text-right text-sm font-bold text-slate-600 tabular-nums">100%</td>
            <td className="py-2.5 px-3" />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
