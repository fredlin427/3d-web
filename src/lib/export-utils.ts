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

/** Export chart as PNG via html2canvas — direct DOM→pixel rendering, no SVG serialization */
export async function exportPNG(
  containerId: string,
  filename: string,
  onState?: (state: "rendering" | "done") => void,
): Promise<ExportResult> {
  const container = document.getElementById(containerId);
  if (!container) return { success: false, error: "No chart to export" };

  try {
    onState?.("rendering");
    const canvas = await html2canvas(container, {
      backgroundColor: "#ffffff",
      scale: 3,
      useCORS: true,
      logging: false,
      onclone: (clonedDoc) => {
        // Strip oklch/lab from cloned stylesheets AND inline styles
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
        // Also strip from inline styles
        clonedDoc.querySelectorAll("*").forEach((el) => {
          const s = (el as HTMLElement).style;
          for (let i = s.length - 1; i >= 0; i--) {
            const v = s.getPropertyValue(s[i]);
            if (v.includes("oklch(") || v.includes("lab(")) s.removeProperty(s[i]);
          }
        });
      },
    });
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
