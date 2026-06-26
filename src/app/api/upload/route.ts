import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { createAuditLog } from "@/lib/audit";

// Magic bytes for common image formats
const MAGIC_BYTES: Record<string, number[]> = {
  png:  [0x89, 0x50, 0x4E, 0x47],
  jpg:  [0xFF, 0xD8, 0xFF],
  gif:  [0x47, 0x49, 0x46, 0x38],
  webp: [0x52, 0x49, 0x46, 0x46],
  bmp:  [0x42, 0x4D],
};

const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp"]);

function detectImageType(buffer: Buffer): string | null {
  for (const [ext, magic] of Object.entries(MAGIC_BYTES)) {
    if (magic.every((byte, i) => buffer[i] === byte)) return ext;
  }
  return null;
}

function sanitizeExtension(ext: string): string {
  // Remove everything except alphanumeric, keep lowercase, max 4 chars
  const cleaned = ext.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4);
  return ALLOWED_EXTENSIONS.has(cleaned) ? cleaned : "png";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ success: false, error: "No file" }, { status: 400 });

    // Limit to 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "Max 10MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate magic bytes (bypassable MIME type check)
    const detectedType = detectImageType(buffer);
    if (!detectedType) {
      return NextResponse.json({ success: false, error: "Invalid image file — unsupported format" }, { status: 400 });
    }

    // Generate unique filename with sanitized extension
    const rawExt = file.name.split(".").pop() || detectedType;
    const ext = sanitizeExtension(rawExt);
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Ensure uploads dir exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const filepath = path.join(uploadsDir, filename);
    await writeFile(filepath, buffer);

    const url = `/uploads/${filename}`;

    await createAuditLog({
      entityType: "Upload",
      entityId: filename,
      action: "file_uploaded",
      staffName: "System",
      details: `Uploaded ${file.name} → ${url} (${(file.size / 1024).toFixed(1)}KB, ${detectedType})`,
    });

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  }
}
