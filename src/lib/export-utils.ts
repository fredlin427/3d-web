"use client";

import { toast } from "sonner";

/** Build a clean standalone SVG: clone, remove classes, keep only inline attributes */
function getSVGString(containerId: string): string | null {
  const container = document.getElementById(containerId);
  const svg = container?.querySelector("svg");
  if (!svg) return null;

  const rect = svg.getBoundingClientRect();
  const w = Math.max(400, Math.ceil(rect.width));
  const h = Math.max(300, Math.ceil(rect.height));

  // Deep clone
  const clone = svg.cloneNode(true) as SVGElement;

  // Remove ALL class attributes — inline fill/stroke from Recharts <Cell> will take over
  clone.querySelectorAll("*").forEach((el) => el.removeAttribute("class"));

  // Build a complete standalone SVG
  const inner = new XMLSerializer().serializeToString(clone);
  // Extract inner content (strip outer <svg> wrapper from serialized clone)
  const innerMatch = inner.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  const innerContent = innerMatch ? innerMatch[1] : inner;

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
    innerContent,
    `</svg>`,
  ].join("\n");
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

/** Download chart as PNG */
export async function exportPNG(containerId: string, filename: string): Promise<void> {
  const svgString = getSVGString(containerId);
  if (!svgString) { toast.error("No chart to export"); return; }

  try {
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const img = new Image();

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("SVG load failed"));
      img.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth * 2;
    canvas.height = img.naturalHeight * 2;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(2, 2);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(svgUrl);

    canvas.toBlob((blob) => {
      if (!blob) { toast.error("PNG export failed"); return; }
      const a = document.createElement("a");
      a.download = `${filename}.png`;
      a.href = URL.createObjectURL(blob);
      a.click();
      toast.success(`Exported: ${filename}.png`);
    }, "image/png");
  } catch (e) {
    console.error("PNG export failed:", e);
    toast.error("PNG export failed — use Export SVG instead");
  }
}
