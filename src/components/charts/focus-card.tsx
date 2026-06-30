"use client";

import { useEffect, useState, useCallback } from "react";
import { X, ExternalLink } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface SubItem { label: string; value: number }

interface FocusCardProps {
  open: boolean;
  label: string;
  value: number;
  total: number;
  chartType?: "pie" | "donut" | "bar";
  color?: string;
  children?: SubItem[];
  colors?: string[];
  viewAllHref?: string;
  breakdownHref?: (item: SubItem) => string;
  onClose: () => void;
}

export function FocusCard({ open, label, value, total, chartType = "donut", color = "#4f46e5", children, colors = [], viewAllHref, breakdownHref, onClose }: FocusCardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) requestAnimationFrame(() => setVisible(true));
    else setVisible(false);
  }, [open]);

  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const pct = total > 0 ? ((value / total) * 100) : 0;
  const hasChildren = children && children.length > 0;
  const isPie = chartType === "pie" || chartType === "donut";

  const pieData = isPie
    ? [{ id: label, label, value }, { id: "Rest", label: "Rest", value: Math.max(0, total - value) }]
    : [];

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div onClick={handleClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className={cn(
        "relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-md w-full overflow-hidden ring-1 ring-black/5",
        "transition-all duration-200 ease-out",
        visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2"
      )}>
        <button onClick={handleClose} className="absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors" aria-label="Close">
          <X className="h-4 w-4 text-slate-500" />
        </button>

        {/* Chart viz */}
        <div className="px-6 pt-6 pb-2" style={{ height: 220 }}>
          {isPie ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData} dataKey="value" nameKey="id" cx="50%" cy="50%"
                  innerRadius={chartType === "donut" ? "55%" : 0}
                  outerRadius="90%" paddingAngle={3}
                  animationDuration={500} animationEasing="ease-out" isAnimationActive
                >
                  <Cell fill={color} stroke="#fff" strokeWidth={2} />
                  <Cell fill="#e2e8f0" stroke="none" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            /* Bar: simple visual bar */
            <div className="flex items-end justify-center h-full pb-4">
              <div
                className="w-32 rounded-t-xl transition-all duration-500 ease-out"
                style={{
                  height: `${Math.min(95, (value / Math.max(total, 1)) * 100)}%`,
                  backgroundColor: color,
                  filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))",
                }}
              />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-6 pb-2 text-center">
          <h3 className="text-base font-bold text-slate-800">{label}</h3>
          <p className="text-xs text-slate-400">{pct.toFixed(1)}% of {total} total</p>
        </div>

        <div className="px-6 pb-4">
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }} />
          </div>
        </div>

        {hasChildren && (
          <div className="px-6 pb-5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Breakdown</p>
            <div className="space-y-1.5">
              {[...children].sort((a, b) => b.value - a.value).slice(0, 8).map((child, i) => {
                const childPct = value > 0 ? ((child.value / value) * 100).toFixed(1) : "0";
                const c = colors[i % colors.length] || "#94a3b8";
                const href = breakdownHref?.(child);
                const Item = href ? Link : "div";
                return (
                  <Item key={child.label} href={href as any} className={cn("flex items-center gap-2.5", href && "hover:bg-slate-50 rounded px-1 -mx-1 py-0.5 transition-colors")}>
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c }} />
                    <span className="text-xs text-slate-700 flex-1 truncate">{child.label}</span>
                    <span className="text-xs font-semibold text-slate-700 tabular-nums">{child.value}</span>
                    <span className="text-[10px] text-slate-400 w-9 text-right tabular-nums">{childPct}%</span>
                  </Item>
                );
              })}
            </div>
          </div>
        )}

        {viewAllHref && (
          <div className="px-6 pb-4">
            <Link href={viewAllHref}
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95"
              style={{ backgroundColor: `${color}15`, color }}>
              <ExternalLink className="h-3.5 w-3.5" />
              View all {value} cases
            </Link>
          </div>
        )}
        <div className="h-1 w-full" style={{ backgroundColor: color }} />
      </div>
    </div>
  );
}
