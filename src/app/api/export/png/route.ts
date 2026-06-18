import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { svg } = await request.json();
    if (!svg || typeof svg !== "string") {
      return NextResponse.json({ error: "SVG string required" }, { status: 400 });
    }

    // Dynamic import — resvg-js is WASM, only loads server-side
    const { Resvg } = await import("@resvg/resvg-js");

    const resvg = new Resvg(svg, {
      fitTo: { mode: "original" },
      background: "#ffffff",
    });

    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'attachment; filename="chart.png"',
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("PNG export error:", error);
    return NextResponse.json({ error: "Failed to render PNG" }, { status: 500 });
  }
}
