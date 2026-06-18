"use client";

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

export interface ExportResult {
  success: boolean;
  error?: string;
}

/** Export chart as PNG via html2canvas — direct DOM→pixel rendering */
export async function exportPNG(
  containerId: string,
  filename: string,
  legendItems?: { label: string; color: string; bold?: boolean }[],
  onState?: (state: "rendering" | "done") => void,
): Promise<ExportResult> {
  const container = document.getElementById(containerId);
  if (!container) return { success: false, error: "No chart to export" };

  try {
    onState?.("rendering");
    let canvas = await html2canvas(container, {
      backgroundColor: "#ffffff",
      scale: 3,
      useCORS: true,
      logging: false,
      onclone: (clonedDoc) => {
        try {
          for (const sheet of Array.from(clonedDoc.styleSheets)) {
            try {
              const rules = Array.from(sheet.cssRules || []);
              for (let i = rules.length - 1; i >= 0; i--) {
                const text = rules[i].cssText;
                if (text.includes("oklch(") || text.includes("lab(") || text.includes("lch(")) {
                  sheet.deleteRule(i);
                }
              }
            } catch (_) { /* cross-origin */ }
          }
        } catch (_) { /* ignore */ }
        clonedDoc.querySelectorAll("*").forEach((el) => {
          const s = (el as HTMLElement).style;
          for (let i = s.length - 1; i >= 0; i--) {
            const v = s.getPropertyValue(s[i]);
            if (v.includes("oklch(") || v.includes("lab(")) s.removeProperty(s[i]);
          }
        });
      },
    });

    // Draw legend directly on canvas (html2canvas can't capture Recharts Legend)
    if (legendItems && legendItems.length > 0) {
      const scale = 3;
      const legendH = Math.ceil(legendItems.length * 18 * scale / scale) + 20;
      const newCanvas = document.createElement("canvas");
      newCanvas.width = canvas.width;
      newCanvas.height = canvas.height + legendH * scale;
      const ctx = newCanvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
      ctx.drawImage(canvas, 0, 0);
      // Draw legend
      const lx = 20 * scale;
      let ly = canvas.height + 10 * scale;
      ctx.font = `${11 * scale}px -apple-system, "Segoe UI", Arial, sans-serif`;
      for (const item of legendItems) {
        if (item.bold) {
          ly += 10 * scale;
          ctx.font = `bold ${11 * scale}px -apple-system, "Segoe UI", Arial, sans-serif`;
          ctx.fillStyle = "#334155";
        } else {
          ctx.font = `${11 * scale}px -apple-system, "Segoe UI", Arial, sans-serif`;
          ctx.fillStyle = "#64748b";
        }
        const ix = item.bold ? lx : lx + 20 * scale;
        // Color swatch
        ctx.fillStyle = item.color;
        ctx.globalAlpha = item.bold ? 1 : 0.7;
        ctx.fillRect(ix, ly - 8 * scale, 8 * scale, 8 * scale);
        ctx.globalAlpha = 1;
        // Text
        ctx.fillStyle = item.bold ? "#334155" : "#64748b";
        ctx.fillText(item.label, ix + 10 * scale, ly);
        ly += 16 * scale;
      }
      canvas = newCanvas;
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (!blob) return { success: false, error: "Canvas render failed" };
    downloadBlob(blob, `${filename}.png`);
    onState?.("done");
    return { success: true };
  } catch (e) {
    console.error("Export failed:", e);
    return { success: false, error: "Export failed" };
  }
}

/** SVG fallback using html2canvas canvas → data URL approach (for browsers that need it) */
export function exportSVGviaCanvas(containerId: string, filename: string): void {
  const container = document.getElementById(containerId);
  if (!container) return;
  html2canvas(container, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    logging: false,
  }).then((canvas) => {
    canvas.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, `${filename}.svg`);
    }, "image/svg+xml");
  });
}
