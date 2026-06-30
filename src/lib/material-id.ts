import { prisma } from "@/lib/prisma";

// ── SLA Material Code Lookup ──
const SLA_CODES: Record<string, string> = {
  "BioMed Clear Resin": "BioCL", "BioMed Durable Resin": "BioDU", "BioMed Elastic 50A Resin": "BioE50A",
  "BioMed Flex 80A Resin": "BioF80A", "BioMed White Resin": "BioWH", "Black Resin": "BL",
  "Clear Resin": "CL", "Color Resin": "CO", "Dental LT Clear Resin": "DenLT",
  "Draft Resin": "DR", "Durable Resin": "DUR", "Elastic 50A Resin": "E50A",
  "Flexible 80A Resin": "F80A", "Grey Pro Resin": "GR+", "Grey Resin": "GR",
  "IBT Resin": "IBT", "Rigid 10K Resin": "R10K", "Rigid 4000 Resin": "R4K",
  "Silicone 40A Resin": "SI40A", "Tough 1500 Resin": "T15", "Tough 2000 Resin": "T20",
  "White Resin": "WH", "BioMed Amber Resin": "BioAM", "BioMed Black Resin": "BioBL",
  "High Temp Resin": "HT", "IBT Flex Resin": "FlexIBT", "Surgical Guide Resin": "SG",
};

// ── Resin Tank Code Lookup ──
const TANK_CODES: Record<string, string> = {
  "Form 2 Resin Tank": "F2LT", "Form 3L Resin Tank V2": "F3L02", "Form 3L Resin Tank V3": "F3L03",
  "Form 4 Resin Tank": "F401", "Form 4L Resin Tank": "F4L01",
};

function extractYear(data: Record<string, unknown>): number {
  const d = data.receivedDate || data.purchaseDate;
  if (d) { const y = new Date(d as string).getFullYear(); if (!isNaN(y)) return y; }
  return new Date().getFullYear();
}

function buildPrefix(data: Record<string, unknown>): { prefix: string; exact: boolean } | null {
  const cat = data.category as string;
  const name = (data.materialName as string) || "";

  if (cat === "FDM Filaments") {
    const brand = (data.brand as string) || "";
    const matType = (data.materialType as string) || "";
    const year = extractYear(data);
    // Extract brand code from brackets: "eSun [UM]" → "UM", or use first word
    const bracketMatch = brand.match(/\[([^\]]+)\]/);
    const code = bracketMatch ? bracketMatch[1] : brand.split(" ")[0]?.toUpperCase() || "FD";
    return { prefix: `${code}-${matType}-${year}`, exact: true };
  }

  if (cat === "SLA Resins") {
    const matType = (data.materialType as string) || "";
    const code = SLA_CODES[name] || matType || "RESIN";
    const version = (data.version as string) || (data.compatiblePrinter as string) || "";
    const year = extractYear(data);
    const verPart = version ? `-${version}` : "";
    return { prefix: `${code}${verPart}-${year}`, exact: !!version };
  }

  if (cat === "Resin Tanks") {
    const code = TANK_CODES[name] || (data.productCode as string) || name.replace(/[^A-Z0-9]/gi, "").slice(0, 6).toUpperCase();
    const year = extractYear(data);
    return { prefix: `${code}-${year}`, exact: true };
  }

  if (cat === "IPA") {
    const code = (data.productCode as string) || name.replace(/[^A-Z0-9]/gi, "").slice(0, 6).toUpperCase() || "IPA";
    const year = extractYear(data);
    return { prefix: `${code}-${year}`, exact: true };
  }

  // Generic fallback
  const code = (data.productCode as string) || (data.brand as string) || name || "MAT";
  const year = extractYear(data);
  return { prefix: `${code}-${year}`, exact: false };
}

export async function generateMaterialId(data: Record<string, unknown>): Promise<string | null> {
  const cat = data.category as string;
  const result = buildPrefix(data);
  if (!result || !cat) return null;

  const materials = await prisma.material.findMany({
    where: { category: cat, materialId: { startsWith: result.prefix } },
    select: { materialId: true },
    orderBy: { materialId: "desc" },
  });

  let maxSeq = 0;
  for (const m of materials) {
    if (!m.materialId) continue;
    const parts = m.materialId.split("-");
    const lastPart = parts[parts.length - 1];
    const seq = parseInt(lastPart, 10);
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }

  const nextSeq = maxSeq + 1;
  return `${result.prefix}-${String(nextSeq).padStart(3, "0")}`;
}
