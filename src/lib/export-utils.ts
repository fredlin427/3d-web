"use client";

import { toast } from "sonner";
import html2canvas from "html2canvas";

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

/** Export chart as PNG — uses html2canvas to render DOM directly to pixels */
export async function exportPNG(containerId: string, filename: string): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) { toast.error("No chart to export"); return; }

  try {
    const canvas = await html2canvas(container, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
    });
    canvas.toBlob((blob) => {
      if (!blob) { toast.error("PNG export failed"); return; }
      downloadBlob(blob, `${filename}.png`);
      toast.success(`Exported: ${filename}.png`);
    }, "image/png");
  } catch (e) {
    console.error("Export failed:", e);
    toast.error("Export failed");
  }
}

/** Export chart as SVG — fallback: serializes the already-styled DOM */
export function exportSVG(containerId: string, filename: string): void {
  const container = document.getElementById(containerId);
  const svg = container?.querySelector("svg");
  if (!svg) { toast.error("No chart to export"); return; }

  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  // Copy computed fill/stroke to inline style on every element
  const sourceNodes = [svg, ...Array.from(svg.querySelectorAll("*"))];
  const cloneNodes = [clone, ...Array.from(clone.querySelectorAll("*"))];
  for (let i = 0; i < sourceNodes.length; i++) {
    const src = sourceNodes[i];
    const dst = cloneNodes[i] as SVGElement;
    if (!src || !dst) continue;
    const cs = window.getComputedStyle(src);
    const fill = cs.fill;
    const stroke = cs.stroke;
    if (fill && fill !== "none" && fill !== "rgba(0, 0, 0, 0)") {
      dst.style.setProperty("fill", fill);
      dst.setAttribute("fill", fill);
    }
    if (stroke && stroke !== "none" && stroke !== "rgba(0, 0, 0, 0)") {
      dst.style.setProperty("stroke", stroke);
      dst.setAttribute("stroke", stroke);
    }
  }

  const svgString = new XMLSerializer().serializeToString(clone);
  downloadBlob(new Blob([svgString], { type: "image/svg+xml;charset=utf-8" }), `${filename}.svg`);
  toast.success(`Exported: ${filename}.svg`);
}
