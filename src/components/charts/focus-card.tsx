"use client";

import { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis } from "recharts";
import { cn } from "@/lib/utils";

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
  onClose: () => void;
}

const OTHER_COLOR = "#e2e8f0";

export function FocusCard({ open, label, value, total, chartType = "donut", color = "#4f46e5", children, colors = [], onClose }: FocusCardProps) {
  const [visible, setVisible] = useState(false);

  // Single RAF for smooth enter
  useEffect(() => {
    if (open) requestAnimationFrame(() => setVisible(true));
    else setVisible(false);
  }, [open]);

  // Instant close
  const handleClose = useCallback(() => onClose(), [onClose]);

  // ESC
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

  const pieData = isPie ? [
    { name: label, value },
    { name: "Rest", value: Math.max(0, total - value) },
  ] : [];
  const barData = !isPie ? [{ name: label, value }] : [];

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop — instant close */}
      <div onClick={handleClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Card — glass morphism */}
      <div className={cn(
        "relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-md w-full overflow-hidden ring-1 ring-black/5",
        "transition-all duration-300 ease-out",
        visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-6"
      )}>
        <button onClick={handleClose} className="absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors" aria-label="Close">
          <X className="h-4 w-4 text-slate-500" />
        </button>

        {/* Chart viz */}
        <div className="px-6 pt-6 pb-2 flex items-center justify-center">
          {isPie ? (
            <div className="relative w-44 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    outerRadius={82} innerRadius={chartType === "donut" ? 44 : 0}
                    startAngle={90} endAngle={90 + 360}
                    animationDuration={500} animationEasing="ease-out" stroke="none" isAnimationActive
                  >
                    <Cell fill={color} stroke="#fff" strokeWidth={3}
                      style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))" }} />
                    <Cell fill={OTHER_COLOR} stroke="none" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {chartType === "donut" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-extrabold text-slate-800 tabular-nums">{value}</span>
                  <span className="text-xs font-semibold text-slate-400">{pct.toFixed(0)}%</span>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 60 }}>
                  <XAxis type="number" hide domain={[0, total]} />
                  <Bar dataKey="value" fill={color} radius={[0, 8, 8, 0]}
                    animationDuration={500} animationEasing="ease-out" barSize={48}
                    label={{ position: "right", fill: "#1e293b", fontSize: 28, fontWeight: 800, formatter: () => `${value}` }}
                    style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-6 pb-2 text-center">
          <h3 className="text-base font-bold text-slate-800">{label}</h3>
          <p className="text-xs text-slate-400">{pct.toFixed(1)}% of {total} total</p>
        </div>

        {/* Progress bar */}
        <div className="px-6 pb-4">
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }} />
          </div>
        </div>

        {/* Sub-items */}
        {hasChildren && (
          <div className="px-6 pb-5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Breakdown</p>
            <div className="space-y-1.5">
              {[...children].sort((a, b) => b.value - a.value).slice(0, 8).map((child, i) => {
                const childPct = value > 0 ? ((child.value / value) * 100).toFixed(1) : "0";
                const childColor = colors[i % colors.length] || "#94a3b8";
                return (
                  <div key={child.label} className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: childColor }} />
                    <span className="text-xs text-slate-700 flex-1 truncate">{child.label}</span>
                    <span className="text-xs font-semibold text-slate-700 tabular-nums">{child.value}</span>
                    <span className="text-[10px] text-slate-400 w-9 text-right tabular-nums">{childPct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom accent */}
        <div className="h-1 w-full" style={{ backgroundColor: color }} />
      </div>
    </div>
  );
}
