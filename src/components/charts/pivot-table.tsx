"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface PivotTableProps {
  data: { label: string; value: number; children: { label: string; value: number }[] }[];
  rowLabel: string;
  colLabel: string;
  total: number;
}

/** Cross-tabulation / pivot table: rows = primary groups, columns = sub-groups */
export function PivotTable({ data, rowLabel, colLabel, total }: PivotTableProps) {
  // Collect all column headers (unique sub-group labels)
  const columns = useMemo(() => {
    const set = new Set<string>();
    data.forEach((d) => d.children.forEach((c) => set.add(c.label)));
    return Array.from(set).sort();
  }, [data]);

  // Build row data
  const rows = useMemo(() => {
    return data.map((d) => {
      const cells: Record<string, number> = {};
      d.children.forEach((c) => { cells[c.label] = c.value; });
      return { label: d.label, total: d.value, cells };
    });
  }, [data, columns]);

  if (data.length === 0) return <p className="text-sm text-slate-400 py-8 text-center">No data to display</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-200">
            <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap sticky left-0 bg-white z-10">
              {rowLabel}
            </th>
            {columns.map((col) => (
              <th key={col} className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                {col}
              </th>
            ))}
            <th className="text-center py-2 px-3 text-xs font-semibold text-slate-700 uppercase tracking-wide whitespace-nowrap bg-slate-50">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.label} className={cn(
              "border-b border-slate-100 hover:bg-blue-50/30 transition-colors",
              ri % 2 === 0 && "bg-white"
            )}>
              <td className="py-2 px-3 font-medium text-slate-800 whitespace-nowrap sticky left-0 bg-inherit">
                {row.label}
              </td>
              {columns.map((col) => (
                <td key={col} className="text-center py-2 px-3 tabular-nums text-slate-600">
                  {row.cells[col] || 0}
                </td>
              ))}
              <td className="text-center py-2 px-3 tabular-nums font-bold text-slate-700 bg-slate-50">
                {row.total}
              </td>
            </tr>
          ))}
          {/* Grand total row */}
          <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
            <td className="py-2 px-3 text-slate-700 whitespace-nowrap sticky left-0 bg-slate-50">Total</td>
            {columns.map((col) => {
              const colTotal = rows.reduce((s, r) => s + (r.cells[col] || 0), 0);
              return (
                <td key={col} className="text-center py-2 px-3 tabular-nums text-slate-700">
                  {colTotal}
                </td>
              );
            })}
            <td className="text-center py-2 px-3 tabular-nums text-slate-900">
              {total}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
