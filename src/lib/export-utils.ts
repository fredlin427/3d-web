"use client";

import { toast } from "sonner";

/** Walk both trees and copy computed fill/stroke/font styles to inline attributes */
function inlineComputedStyles(orig: Element, cloned: Element): void {
  const cs = window.getComputedStyle(orig);
  const fill = cs.fill;
  const stroke = cs.stroke;
  if (fill && fill !== "none" && fill !== "rgba(0, 0, 0, 0)") {
    cloned.setAttribute("fill", fill);
  }
  if (stroke && stroke !== "none" && stroke !== "rgba(0, 0, 0, 0)") {
    cloned.setAttribute("stroke", stroke);
  }
  const sw = cs.strokeWidth;
  if (sw && sw !== "0px") cloned.setAttribute("stroke-width", sw);
  if (cs.opacity && cs.opacity !== "1") cloned.setAttribute("opacity", cs.opacity);
  if (cs.fontSize) cloned.setAttribute("font-size", cs.fontSize);
  if (cs.fontWeight && cs.fontWeight !== "400") cloned.setAttribute("font-weight", cs.fontWeight);
  if (cs.fontFamily) cloned.setAttribute("font-family", cs.fontFamily);
  if (cs.textAnchor) cloned.setAttribute("text-anchor", cs.textAnchor);

  for (let i = 0; i < orig.children.length; i++) {
    if (cloned.children[i]) inlineComputedStyles(orig.children[i], cloned.children[i]);
  }
}

/** Prepare a fully-inlined standalone SVG element ready for export */
function prepareSVG(containerId: string): { svgString: string; w: number; h: number } | null {
  const container = document.getElementById(containerId);
  const svg = container?.querySelector("svg");
  if (!svg) return null;

  const rect = svg.getBoundingClientRect();
  const w = Math.max(400, Math.ceil(rect.width));
  const h = Math.max(300, Math.ceil(rect.height));

  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  clone.setAttribute("viewBox", `0 0 ${w} ${h}`);

  // Add white background
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", "100%");
  bg.setAttribute("height", "100%");
  bg.setAttribute("fill", "#ffffff");
  clone.insertBefore(bg, clone.firstChild);

  // Inline all computed styles
  inlineComputedStyles(svg, clone);

  const svgString = new XMLSerializer().serializeToString(clone);
  return { svgString, w, h };
}

/** Download chart as SVG file — 100% reliable, no CSS dependency */
export function exportSVG(containerId: string, filename: string): void {
  const result = prepareSVG(containerId);
  if (!result) { toast.error("No chart to export"); return; }

  const blob = new Blob([result.svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.download = `${filename}.svg`;
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported: ${filename}.svg`);
}

/** Download chart as PNG via server-side resvg-js rendering */
export async function exportPNG(containerId: string, filename: string): Promise<void> {
  const result = prepareSVG(containerId);
  if (!result) { toast.error("No chart to export"); return; }

  try {
    const res = await fetch("/api/export/png", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ svg: result.svgString }),
    });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = `${filename}.png`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported: ${filename}.png`);
  } catch (e) {
    console.error("PNG export failed:", e);
    toast.error("PNG export failed — try Export SVG instead");
  }
}
