"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChildItem {
  label: string;
  value: number;
}

interface Props {
  title: string;
  groupTotal: number;
  grandTotal: number;
  children: ChildItem[];
  onClose: () => void;
  colors?: string[];
}

const DEFAULT_COLORS = [
  "#4472C4","#ED7D31","#A5A5A5","#FFC000","#5B9BD5","#70AD47",
  "#F15C5C","#9B59B6","#1ABC9C","#E67E22","#2E75B6","#C55A11",
  "#7F7F7F","#A68A00","#3B6FB6","#D44C2B","#8C8C8C","#E5A800",
];

export function DrillDownPanel({ title, groupTotal, grandTotal, children, onClose, colors = DEFAULT_COLORS }: Props) {
  if (!children || children.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-slate-700">{title}</span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <p className="text-xs text-slate-400">No sub-items for this group.</p>
      </div>
    );
  }

  const groupPct = grandTotal > 0 ? ((groupTotal / grandTotal) * 100).toFixed(1) : "0";

  return (
    <div className="rounded-xl border border-indigo-200 bg-white shadow-xl animate-in" style={{ fontFamily: "Calibri, Arial, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-indigo-100 bg-indigo-50/50 rounded-t-xl">
        <div>
          <span className="text-sm font-bold text-indigo-700">{title}</span>
          <span className="text-xs text-indigo-400 ml-2">{groupTotal} items ({groupPct}% of total)</span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-indigo-100" onClick={onClose}><X className="h-4 w-4 text-indigo-500" /></Button>
      </div>
      {/* Sub-items */}
      <div className="px-4 py-2 max-h-[260px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sub-item</th>
              <th className="text-right py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-16">Count</th>
              <th className="text-right py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-16">%</th>
              <th className="py-2 w-20" />
            </tr>
          </thead>
          <tbody>
            {children.map((child, i) => {
              const pct = groupTotal > 0 ? ((child.value / groupTotal) * 100).toFixed(1) : "0";
              return (
                <tr key={child.label} className="border-b border-slate-50">
                  <td className="py-2 text-sm text-slate-700">
                    <span className="inline-block w-2 h-2 rounded-sm shrink-0 mr-2 align-middle" style={{ backgroundColor: colors[i % colors.length] }} />
                    {child.label}
                  </td>
                  <td className="py-2 text-right font-semibold text-slate-800 tabular-nums">{child.value}</td>
                  <td className="py-2 text-right text-slate-500 tabular-nums">{pct}%</td>
                  <td className="py-2">
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: colors[i % colors.length] }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
