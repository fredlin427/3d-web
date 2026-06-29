"use client";

/** Export chart SVG directly — no html2canvas screenshot. The chart is already SVG. */
export async function exportPNG(containerId: string, filename: string): Promise<{ success: boolean; error?: string }> {
  const container = document.getElementById(containerId);
  if (!container) return { success: false, error: "No chart element" };

  try {
    // Find the SVG element inside the chart container
    const svg = container.querySelector("svg");
    if (!svg) return { success: false, error: "No SVG found" };

    // Clone the SVG to avoid mutating the live one
    const clone = svg.cloneNode(true) as SVGSVGElement;

    // Set white background
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("width", "100%");
    rect.setAttribute("height", "100%");
    rect.setAttribute("fill", "white");
    clone.insertBefore(rect, clone.firstChild);

    // Set explicit dimensions
    const bbox = svg.getBoundingClientRect();
    const w = bbox.width || svg.getAttribute("width") || "800";
    const h = bbox.height || svg.getAttribute("height") || "600";
    clone.setAttribute("width", String(w));
    clone.setAttribute("height", String(h));
    clone.setAttribute("viewBox", `0 0 ${w} ${h}`);

    // Get all CSS and inline it (browser handles this natively)
    const serializer = new XMLSerializer();
    let svgStr = serializer.serializeToString(clone);

    // Create canvas to convert SVG → PNG
    const canvas = document.createElement("canvas");
    canvas.width = Number(w) * 2;
    canvas.height = Number(h) * 2;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(2, 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw SVG to canvas via data URL
    const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("SVG→Image failed"));
      img.src = url;
    });

    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    // Download as PNG
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${filename}.png`;
      a.click();
    }, "image/png");

    return { success: true };
  } catch (e) {
    console.error("Export failed:", e);
    return { success: false, error: String(e) };
  }
}
