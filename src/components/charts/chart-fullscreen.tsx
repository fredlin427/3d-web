"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { X, Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartFullscreenProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;
const ZOOM_STEP = 0.3;

export function ChartFullscreen({ title, subtitle, children, className }: ChartFullscreenProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false); // for enter/exit animation
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const frameRef = useRef<number>(0);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });

  const reset = useCallback(() => {
    zoomRef.current = 1; panRef.current = { x: 0, y: 0 };
    setZoom(1); setPan({ x: 0, y: 0 });
  }, []);

  // Open with smooth enter
  const handleOpen = useCallback(() => {
    reset();
    setOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }, [reset]);

  // Close with exit
  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => setOpen(false), 250);
  }, []);

  // ESC
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (zoomRef.current !== 1) reset();
        else handleClose();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, handleClose, reset]);

  // Lock scroll
  useEffect(() => {
    if (open) { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }
  }, [open]);

  // ── Wheel zoom (RAF throttled, cursor-centered) ──
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mx = e.clientX - rect.left - rect.width / 2;
    const my = e.clientY - rect.top - rect.height / 2;
    const dir = e.deltaY > 0 ? -1 : 1;
    const cur = zoomRef.current;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cur + dir * ZOOM_STEP));
    const scale = next / cur;
    zoomRef.current = next;
    panRef.current = {
      x: panRef.current.x * scale - mx * (scale - 1),
      y: panRef.current.y * scale - my * (scale - 1),
    };
    if (!frameRef.current) {
      frameRef.current = requestAnimationFrame(() => {
        setZoom(zoomRef.current);
        setPan({ ...panRef.current });
        frameRef.current = 0;
      });
    }
  }, []);

  // ── Drag pan (RAF throttled) ──
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setDragging(true);
    dragRef.current = { x: e.clientX, y: e.clientY, px: panRef.current.x, py: panRef.current.y };
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const move = (e: MouseEvent) => {
      panRef.current = {
        x: dragRef.current.px + (e.clientX - dragRef.current.x),
        y: dragRef.current.py + (e.clientY - dragRef.current.y),
      };
      if (!frameRef.current) {
        frameRef.current = requestAnimationFrame(() => {
          setPan({ ...panRef.current });
          frameRef.current = 0;
        });
      }
    };
    const up = () => setDragging(false);
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [dragging]);

  // Touch pinch
  const touchDist = useRef<number | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      touchDist.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
  }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2 || touchDist.current === null) return;
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    zoomRef.current = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current + (d - touchDist.current) * 0.005));
    touchDist.current = d;
    setZoom(zoomRef.current);
  }, []);
  const handleTouchEnd = useCallback(() => { touchDist.current = null; }, []);

  const zoomPct = Math.round(zoom * 100);
  const isZoomed = zoom !== 1 || pan.x !== 0 || pan.y !== 0;

  return (
    <>
      {/* ── Inline: chart + expand button overlay ── */}
      <div className={cn("relative group/chart", className)}>
        {/* Expand button — only this triggers fullscreen */}
        <button
          onClick={handleOpen}
          className={cn(
            "absolute top-2 right-2 z-10 transition-all duration-300",
            "opacity-0 group-hover/chart:opacity-100",
            "flex items-center gap-1.5 bg-white/90 hover:bg-white backdrop-blur-sm rounded-full px-3 py-1.5",
            "text-slate-600 hover:text-slate-900 text-[11px] font-semibold shadow-md border border-slate-200/50",
            "hover:shadow-lg hover:scale-105 active:scale-95"
          )}
          aria-label={`Expand ${title || "chart"}`}
        >
          <Maximize2 className="h-3.5 w-3.5" />
          <span>Zoom</span>
        </button>
        {/* Chart content — clicks pass through to chart elements (pie slices, bars, etc.) */}
        {children}
      </div>

      {/* ── Fullscreen overlay ── */}
      {open && (
        <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            onClick={handleClose}
            className={cn(
              "absolute inset-0 transition-all duration-500",
              visible ? "bg-black/95 backdrop-blur-2xl" : "bg-black/0 backdrop-blur-0"
            )}
          />

          {/* Top bar */}
          <div className={cn(
            "absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3 transition-all duration-300",
            visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
          )}>
            <div>
              {title && <h3 className="text-base font-bold text-white">{title}</h3>}
              {subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">
              {/* Zoom controls */}
              <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/15">
                <button onClick={() => { zoomRef.current = Math.max(MIN_ZOOM, zoomRef.current - ZOOM_STEP); setZoom(zoomRef.current); panRef.current = {x:0,y:0}; setPan({x:0,y:0}); }}
                  disabled={zoom <= MIN_ZOOM} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/20 text-white/80 hover:text-white disabled:opacity-25 transition-all active:scale-90"
                  aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></button>
                <span className="text-xs font-mono font-semibold text-white/80 min-w-[44px] text-center tabular-nums select-none">{zoomPct}%</span>
                <button onClick={() => { zoomRef.current = Math.min(MAX_ZOOM, zoomRef.current + ZOOM_STEP); setZoom(zoomRef.current); }}
                  disabled={zoom >= MAX_ZOOM} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/20 text-white/80 hover:text-white disabled:opacity-25 transition-all active:scale-90"
                  aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></button>
                {isZoomed && (
                  <button onClick={reset} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/20 text-white/50 hover:text-white transition-all active:scale-90"
                    aria-label="Reset zoom"><RotateCcw className="h-3.5 w-3.5" /></button>
                )}
              </div>
              <button onClick={handleClose}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors border border-white/10 text-sm"
                aria-label="Close"><X className="h-4 w-4" /><span className="hidden sm:inline">Close</span></button>
            </div>
          </div>

          {/* Zoomable canvas */}
          <div
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={reset}
            className={cn(
              "absolute inset-0 flex items-center justify-center overflow-hidden transition-all duration-300",
              visible ? "opacity-100 scale-100" : "opacity-0 scale-95",
              dragging ? "cursor-grabbing" : zoom > 1 ? "cursor-grab" : "cursor-default"
            )}
            style={{ top: 56, bottom: 0 }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                willChange: dragging || zoom !== 1 ? "transform" : "auto",
                transition: dragging ? "none" : "transform 0.12s cubic-bezier(0.2,0,0,1)",
              }}
            >
              <div className="[&>div]:!h-[80vh] [&>div]:!w-[90vw]" style={{ width: "90vw", height: "80vh" }}>
                {children}
              </div>
            </div>
          </div>

          {/* Hint */}
          {!isZoomed && (
            <div className={cn(
              "absolute bottom-8 left-1/2 -translate-x-1/2 transition-all duration-300 pointer-events-none",
              visible ? "opacity-25" : "opacity-0"
            )}>
              <p className="text-[11px] text-white/50 text-center">Scroll to zoom · Drag to pan · Double-click to reset</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
