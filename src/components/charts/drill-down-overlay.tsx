"use client";

import { useEffect, useState, useCallback } from "react";
import { X, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChildItem {
  label: string;
  value: number;
}

interface Breadcrumb {
  label: string;
  onClick: () => void;
}

interface DrillDownOverlayProps {
  open: boolean;
  title: string;
  groupTotal: number;
  grandTotal: number;
  children: ChildItem[];
  breadcrumbs: Breadcrumb[];
  onClose: () => void;
  onDrillChild?: (child: ChildItem) => void;
  loading?: boolean;
  colors?: string[];
}

export function DrillDownOverlay({
  open,
  title,
  groupTotal,
  grandTotal,
  children,
  breadcrumbs,
  onClose,
  onDrillChild,
  loading = false,
  colors = [],
}: DrillDownOverlayProps) {
  const [phase, setPhase] = useState<"entering" | "open" | "exiting">("entering");

  useEffect(() => {
    if (!open) return;
    setPhase("entering");
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase("open"));
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const handleClose = useCallback(() => {
    setPhase("exiting");
    setTimeout(onClose, 300);
  }, [onClose]);

  // ESC key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, handleClose]);

  if (!open) return null;

  const groupPct = grandTotal > 0 ? ((groupTotal / grandTotal) * 100).toFixed(1) : "0";

  return (
    <div className="fixed inset-0 z-[9998]" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className={cn(
          "absolute inset-0 transition-all duration-300 ease-out",
          phase === "entering" && "bg-black/0 backdrop-blur-0",
          phase === "open" && "bg-black/30 backdrop-blur-sm",
          phase === "exiting" && "bg-black/0 backdrop-blur-0",
        )}
      />

      {/* Slide-in panel — right on desktop, bottom on mobile */}
      <div
        className={cn(
          "absolute bg-white shadow-2xl flex flex-col transition-all duration-350 ease-out",
          // Desktop: right panel
          "right-0 top-0 bottom-0 w-[420px] max-w-[92vw]",
          // Mobile: bottom sheet
          "max-sm:left-0 max-sm:right-0 max-sm:top-auto max-sm:bottom-0 max-sm:w-full max-sm:max-h-[70vh] max-sm:rounded-t-2xl",
          "rounded-l-2xl max-sm:rounded-l-none",
          phase === "entering" && "translate-x-4 opacity-0 max-sm:translate-y-4",
          phase === "open" && "translate-x-0 opacity-100 max-sm:translate-y-0",
          phase === "exiting" && "translate-x-4 opacity-0 max-sm:translate-y-4",
        )}
      >
        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-base font-bold text-slate-800">{title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {groupTotal} items · {groupPct}% of total ({grandTotal})
              </p>
            </div>
            <button
              onClick={handleClose}
              className="shrink-0 h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close drill-down"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Breadcrumbs */}
          {breadcrumbs.length > 1 && (
            <div className="flex items-center gap-1 flex-wrap text-xs">
              {breadcrumbs.map((bc, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />}
                  {i === breadcrumbs.length - 1 ? (
                    <span className="font-semibold text-slate-700 truncate max-w-[140px]">{bc.label}</span>
                  ) : (
                    <button
                      onClick={bc.onClick}
                      className="text-blue-500 hover:text-blue-700 hover:underline truncate max-w-[100px]"
                    >
                      {bc.label}
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain relative">
          {loading && (
            <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
            </div>
          )}
          {children.length === 0 ? (
            <div className="flex items-center justify-center h-full py-16 text-slate-400 text-sm">
              No sub-items for this group
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {children
                .sort((a, b) => b.value - a.value)
                .map((child, i) => {
                  const pct = groupTotal > 0 ? ((child.value / groupTotal) * 100).toFixed(1) : "0";
                  const color = colors[i % colors.length] || "#94a3b8";
                  return (
                    <div
                      key={child.label}
                      onClick={() => onDrillChild?.(child)}
                      className={cn(
                        "flex items-center gap-3 px-5 py-3 transition-colors",
                        onDrillChild && "cursor-pointer hover:bg-blue-50/50",
                      )}
                    >
                      {/* Color dot */}
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      {/* Label + bar */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700 truncate">{child.label}</span>
                          <span className="text-xs font-semibold text-slate-500 ml-2 shrink-0">
                            {child.value} <span className="text-slate-400 font-normal">({pct}%)</span>
                          </span>
                        </div>
                        {/* Mini progress bar */}
                        <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Number(pct))}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                      {onDrillChild && (
                        <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
