// Chart builder configuration — extracted from page component
import { BarChart3, PieChartIcon, TrendingUp, AreaChartIcon, Database, Layers } from "lucide-react";

export const COLOR_PALETTES: Record<string, string[]> = {
  "Vivid": [
    "#E6194B","#3CB44B","#FFE119","#4363D8","#F58231","#911EB4",
    "#46F0F0","#F032E6","#BCF60C","#FABEBE","#008080","#E6BEFF",
    "#9A6324","#FFFAC8","#800000","#AAFFC3","#808000","#FFD8B1",
    "#000075","#808080","#A9A9A9","#DCBEFF","#FF6F61","#92A8D1",
  ],
  "Bright": [
    "#E6194B","#3CB44B","#FFE119","#0082C8","#F58231","#911EB4",
    "#46F0F0","#F032E6","#D2F53C","#FABEBE","#008080","#E6BEFF",
    "#AA6E28","#FFFAC8","#800000","#AAFFC3","#808000","#FFD8B1",
    "#000075","#A9A9A9","#DCBEFF","#FF6F61","#88CCEE","#CC6677",
  ],
  "Excel": [
    "#4472C4","#ED7D31","#A5A5A5","#FFC000","#5B9BD5","#70AD47",
    "#F15C5C","#9B59B6","#1ABC9C","#E67E22","#2E75B6","#C55A11",
    "#7F7F7F","#A68A00","#3B6FB6","#D44C2B","#8C8C8C","#E5A800",
    "#4A90D9","#F07020","#B0B0B0","#FFB300","#6BA5DA","#85C056",
  ],
  "Dark": [
    "#1B2A4A","#8B1E1E","#2D5A27","#7A5C00","#1E3A6E","#3D6B35",
    "#9B2335","#5B2C8E","#0E6B5E","#8B4513","#2C3E8C","#7C3A00",
    "#4A4A4A","#6B5B00","#2E5090","#A04020","#5C5C5C","#C68600",
    "#3A6FC0","#D05030","#7A7A7A","#D09020","#5080CC","#60A040",
  ],
  "Pastel": [
    "#A8C8F0","#F4B183","#C8C8C8","#FFE080","#A8C8E8","#B0D888",
    "#F0A0A0","#C0A0E0","#90D8C8","#F0C080","#A0C0F0","#E8A870",
    "#B8B8B8","#D8C860","#A8C8F8","#E0A878","#C0C0C0","#F0C860",
    "#B8D4F4","#ECB088","#D0D0D0","#F8D0A0","#B8D8F8","#C0E0A0",
  ],
};
export const DEFAULT_PALETTE = "Vivid";

export const SOURCES = [
  { key: "cases", label: "Cases", icon: Database },
  { key: "materials", label: "Materials", icon: Database },
  { key: "usage", label: "Material Usage", icon: Database },
  { key: "transactions", label: "Stock Transactions", icon: Database },
];

export const CHART_TYPES = [
  { key: "bar", label: "Bar", icon: BarChart3 },
  { key: "barH", label: "Bar H", icon: BarChart3 },
  { key: "pie", label: "Pie", icon: PieChartIcon },
  { key: "donut", label: "Donut", icon: PieChartIcon },
  { key: "line", label: "Line", icon: TrendingUp },
  { key: "area", label: "Area", icon: AreaChartIcon },
  { key: "stacked", label: "Stacked", icon: Layers },
];

export const FIELD_LABELS: Record<string, string> = {
  department: "Department", category: "Category", purpose: "Purpose",
  currentStatus: "Status", priority: "Priority", technician: "Technician",
  printingParty: "Printing Party", hospital: "Hospital", rank: "Rank",
  modelType: "Model Type", requiredService: "Required Service",
  brand: "Brand", materialType: "Material Type", status: "Stock Status",
  colour: "Colour", supplier: "Supplier", storageLocation: "Location",
  unit: "Unit", staffName: "Staff", printerOrTank: "Printer/Tank",
  transactionType: "Transaction Type",
  "case.department": "→ Case Dept", "case.category": "→ Case Category",
  "case.currentStatus": "→ Case Status", "case.purpose": "→ Case Purpose",
  "material.materialName": "→ Material Name", "material.category": "→ Material Category",
  "material.brand": "→ Material Brand", "material.status": "→ Material Status",
};

export const SOURCE_FIELDS: Record<string, string[]> = {
  cases: ["department","category","purpose","currentStatus","priority","technician","printingParty","hospital","rank","modelType","requiredService"],
  materials: ["category","brand","materialType","status","colour","supplier","storageLocation","unit"],
  usage: ["unit","staffName","printerOrTank","case.department","case.category","case.currentStatus","case.purpose","material.materialName","material.category","material.brand","material.status"],
  transactions: ["transactionType","staffName","material.materialName","material.category","material.brand","material.status"],
};

export const FIELD_PARENTS: Record<string, string> = {
  purpose: "category", modelType: "category", requiredService: "category",
  currentStatus: "category", "case.purpose": "case.category",
  "material.materialName": "material.category",
};

// Return auto-default stackBy for each source
export function getDefaultStackBy(source: string, xField: string): string {
  if (source === "cases") return xField === "category" ? "purpose" : "category";
  if (source === "usage") return "material.materialName";
  if (source === "materials") return "status";
  if (source === "transactions") return "material.materialName";
  return "";
}

export function truncateLabel(s: string, max = 24): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

export function formatYAxis(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return String(value);
}

export function shadeColor(hex: string, step: number, total: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) & 0xFF, g = (num >> 8) & 0xFF, b = num & 0xFF;
  const mix = Math.min(0.4, step / (total + 2));
  r = Math.round(r + (255 - r) * mix);
  g = Math.round(g + (255 - g) * mix);
  b = Math.round(b + (255 - b) * mix);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
