"use client";

import { toast } from "sonner";

const SVG_NS = "http://www.w3.org/2000/svg";

const STYLE_PROPS = [
  "display","visibility","opacity",
  "color","fill","fill-opacity","fill-rule",
  "stroke","stroke-opacity","stroke-width","stroke-dasharray","stroke-dashoffset",
  "stroke-linecap","stroke-linejoin","stroke-miterlimit",
  "stop-color","stop-opacity","flood-color","flood-opacity",
  "font-family","font-size","font-weight","font-style","letter-spacing",
  "text-anchor","dominant-baseline","alignment-baseline",
  "paint-order","shape-rendering","vector-effect",
] as const;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Copy computed CSS variables from source elements to clone root */
function copyCssVariables(sources: Element[], target: SVGElement) {
  const seen = new Set<string>();
  for (const src of sources) {
    const cs = window.getComputedStyle(src);
    for (let i = 0; i < cs.length; i++) {
      const name = cs.item(i);
      if (!name.startsWith("--")) continue;
      if (seen.has(name)) continue;
      seen.add(name);
      const val = cs.getPropertyValue(name).trim();
      if (val) target.style.setProperty(name, val);
    }
  }
}

/** Copy computed visual styles from LIVE DOM source to clone — key: uses style.setProperty not setAttribute */
function inlineStyles(source: Element, target: Element) {
  const cs = window.getComputedStyle(source);
  const ts = (target as SVGElement).style;
  for (const prop of STYLE_PROPS) {
    const val = cs.getPropertyValue(prop).trim();
    if (!val || val === "initial" || val === "inherit" || val === "unset") continue;
    // KEY: write to inline style (overrides CSS), not just attribute (which CSS overrides)
    ts.setProperty(prop, val);
    target.setAttribute(prop, val);
  }
}

function buildStandaloneSVG(containerId: string): string | null {
  const container = document.getElementById(containerId);
  const sourceSvg = container?.querySelector("svg") as SVGSVGElement | null;
  if (!sourceSvg) return null;

  const rect = sourceSvg.getBoundingClientRect();
  const w = Math.max(400, Math.ceil(rect.width || sourceSvg.clientWidth || 400));
  const h = Math.max(300, Math.ceil(rect.height || sourceSvg.clientHeight || 300));

  // Clone full SVG — keep the root, don't strip and re-wrap
  const clone = sourceSvg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  clone.setAttribute("viewBox", `0 0 ${w} ${h}`);

  // Copy CSS variables from document → clone root (so var() refs resolve)
  const sources: Element[] = [document.documentElement, document.body, sourceSvg];
  if (container) sources.unshift(container);
  copyCssVariables(sources, clone);

  // Walk both trees simultaneously: read computed style from LIVE source, write to clone
  const sourceNodes = [sourceSvg, ...Array.from(sourceSvg.querySelectorAll("*"))];
  const cloneNodes = [clone, ...Array.from(clone.querySelectorAll("*"))];
  for (let i = 0; i < sourceNodes.length; i++) {
    if (sourceNodes[i] && cloneNodes[i]) inlineStyles(sourceNodes[i], cloneNodes[i]);
  }

  // Remove page CSS <style> blocks from clone — styles now inlined
  clone.querySelectorAll("style").forEach((el) => el.remove());
  // Remove classes — no longer needed
  clone.removeAttribute("class");
  clone.querySelectorAll("*").forEach((el) => el.removeAttribute("class"));

  // White background
  const bg = document.createElementNS(SVG_NS, "rect");
  bg.setAttribute("x", "0"); bg.setAttribute("y", "0");
  bg.setAttribute("width", String(w)); bg.setAttribute("height", String(h));
  bg.setAttribute("fill", "#ffffff");
  clone.insertBefore(bg, clone.firstChild);

  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
}

export function exportSVG(containerId: string, filename: string): void {
  const svg = buildStandaloneSVG(containerId);
  if (!svg) { toast.error("No chart to export"); return; }

  // Debug: also log first 300 chars to check if inline styles are present
  console.log("EXPORT SVG preview:", svg.substring(0, 500));

  downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${filename}.svg`);
  toast.success(`Exported: ${filename}.svg`);
}

/** Debug: open SVG in a new browser tab to inspect */
export function debugOpenSVG(containerId: string): void {
  const svg = buildStandaloneSVG(containerId);
  if (!svg) { toast.error("No chart to export"); return; }
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  window.open(URL.createObjectURL(blob), "_blank");
}

export async function exportPNG(containerId: string, filename: string): Promise<void> {
  const svg = buildStandaloneSVG(containerId);
  if (!svg) { toast.error("No chart to export"); return; }

  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("SVG load failed"));
      img.src = svgUrl;
    });
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, `${filename}.png`);
      toast.success(`Exported: ${filename}.png`);
    }, "image/png");
  } catch {
    toast.error("PNG export failed — use Export SVG instead");
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
