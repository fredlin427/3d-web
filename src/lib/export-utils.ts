"use client";

import { toast } from "sonner";

/** Collect page CSS rules relevant to SVG/chart rendering */
function collectRelevantCSS(): string {
  const keywords = ["recharts", "svg", ".recharts", "fill:", "stroke:", "opacity",
    "text {", "path {", "rect {", "circle {", "line {", "font-", "text-anchor",
    "dominant-baseline", "transform", "shape-rendering"];
  let cssText = "";
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules || [])) {
          const text = rule.cssText;
          if (keywords.some((kw) => text.includes(kw))) {
            cssText += text + "\n";
          }
        }
      } catch (_) { /* cross-origin */ }
    }
  } catch (_) { /* ignore */ }
  return cssText;
}

/** Get the SVG element and return a self-contained SVG string */
function getSVGString(containerId: string): string | null {
  const container = document.getElementById(containerId);
  const svg = container?.querySelector("svg");
  if (!svg) return null;

  const rect = svg.getBoundingClientRect();
  const w = Math.max(400, Math.ceil(rect.width));
  const h = Math.max(300, Math.ceil(rect.height));

  // Clone the SVG
  const clone = svg.cloneNode(true) as SVGElement;

  // Embed page CSS as a <style> block inside the SVG
  const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
  styleEl.textContent = collectRelevantCSS();
  clone.insertBefore(styleEl, clone.firstChild);

  // Add white background
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", "100%");
  bg.setAttribute("height", "100%");
  bg.setAttribute("fill", "#ffffff");
  clone.insertBefore(bg, clone.firstChild);

  // Build a complete standalone SVG with proper namespace
  const innerHTML = new XMLSerializer().serializeToString(clone)
    .replace(/<svg[^>]*>/, "")  // remove inner <svg> tag
    .replace(/<\/svg>$/, "");   // remove closing </svg>

  const standalone = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
    innerHTML,
    `</svg>`,
  ].join("\n");

  return standalone;
}

/** Download chart as SVG file */
export function exportSVG(containerId: string, filename: string): void {
  const svgString = getSVGString(containerId);
  if (!svgString) { toast.error("No chart to export"); return; }

  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
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
  const svgString = getSVGString(containerId);
  if (!svgString) { toast.error("No chart to export"); return; }

  try {
    const res = await fetch("/api/export/png", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ svg: svgString }),
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
