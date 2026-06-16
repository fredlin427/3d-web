import { prisma } from "@/lib/prisma";

/**
 * Build a material ID prefix from category-specific rules.
 * FDM: {BrandCode}-{MaterialType}-{Year}
 * SLA: {ProductCode}-{MaterialType}-{Year}
 * Tank: {ProductCode}-{Year}
 * IPA: no auto-ID
 */
function buildPrefix(data: Record<string, unknown>): string | null {
  const cat = data.category as string;
  if (cat === "FDM Filaments") {
    const brand = data.brand as string;
    const materialType = data.materialType as string;
    if (!brand || !materialType) return null;
    const bracketMatch = String(brand).match(/\[([^\]]+)\]/);
    const code = bracketMatch ? bracketMatch[1] : String(brand).split(" ")[0];
    if (!code) return null;
    const year = extractYear(data);
    if (!year) return null;
    return `${code}-${materialType}-${year}`;
  }
  if (cat === "SLA Resins") {
    const productCode = data.productCode as string;
    const materialType = data.materialType as string;
    if (!productCode || !materialType) return null;
    const year = extractYear(data);
    if (!year) return null;
    return `${productCode}-${materialType}-${year}`;
  }
  if (cat === "Resin Tanks") {
    const productCode = data.productCode as string;
    if (!productCode) return null;
    const year = extractYear(data);
    if (!year) return null;
    return `${productCode}-${year}`;
  }
  return null;
}

function extractYear(data: Record<string, unknown>): number | null {
  const d = data.receivedDate || data.purchaseDate;
  if (!d) return null;
  const year = new Date(d as string).getFullYear();
  return isNaN(year) ? null : year;
}

/**
 * Generate the next material ID for a given category and field data.
 * Call this from API routes when materialId is empty.
 */
export async function generateMaterialId(data: Record<string, unknown>): Promise<string | null> {
  const cat = data.category as string;
  const prefix = buildPrefix(data);
  if (!prefix || !cat) return null;

  const materials = await prisma.material.findMany({
    where: { category: cat, materialId: { startsWith: prefix } },
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
  return `${prefix}-${String(nextSeq).padStart(3, "0")}`;
}
