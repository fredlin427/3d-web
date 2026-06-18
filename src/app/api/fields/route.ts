import { NextRequest, NextResponse } from "next/server";

const FIELD_GROUPS: Record<string, string> = {
  department: "Case Info", category: "Case Info", purpose: "Case Info",
  projectTitle: "Case Info", description: "Case Info", specification: "Case Info",
  currentStatus: "Case Progress", priority: "Case Progress",
  technician: "Case Progress", printingParty: "Case Progress",
  hospital: "Case Details", rank: "Case Details",
  modelType: "Case Details", requiredService: "Case Details",
  fundingSource: "Case Details", ownership: "Case Details",
  quantity: "Metrics", totalComponents: "Metrics",
  brand: "Material Info", materialType: "Material Info",
  colour: "Material Info", supplier: "Material Info",
  storageLocation: "Material Info", unit: "Material Info",
  status: "Stock Status",
  staffName: "Staff", printerOrTank: "Equipment",
  transactionType: "Transaction",
};

const JOIN_LABELS: Record<string, string> = {
  "case.department": "Case Department", "case.category": "Case Category",
  "case.currentStatus": "Case Status", "case.purpose": "Case Purpose",
  "material.materialName": "Material Name", "material.category": "Material Category",
  "material.brand": "Material Brand", "material.status": "Material Status",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") || "cases";

  const fields: { key: string; label: string; type: string; group: string }[] = [];

  switch (source) {
    case "cases":
      for (const f of ["department","category","purpose","currentStatus","priority","technician","printingParty","hospital","rank","modelType","requiredService","fundingSource","ownership"]) {
        fields.push({ key: f, label: f.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()), type: "text", group: FIELD_GROUPS[f] || "Other" });
      }
      fields.push({ key: "quantity", label: "Quantity", type: "number", group: "Metrics" });
      fields.push({ key: "totalComponents", label: "Components", type: "number", group: "Metrics" });
      break;

    case "materials":
      for (const f of ["category","brand","materialType","status","colour","supplier","storageLocation","unit"]) {
        fields.push({ key: f, label: f.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()), type: "text", group: FIELD_GROUPS[f] || "Other" });
      }
      fields.push({ key: "currentQuantity", label: "Current Qty", type: "number", group: "Metrics" });
      fields.push({ key: "initialQuantity", label: "Initial Qty", type: "number", group: "Metrics" });
      break;

    case "usage":
      for (const f of ["unit","staffName","printerOrTank"]) {
        fields.push({ key: f, label: f.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()), type: "text", group: FIELD_GROUPS[f] || "Other" });
      }
      for (const [key, label] of Object.entries(JOIN_LABELS)) {
        if (key.startsWith("case.") || key.startsWith("material.")) {
          fields.push({ key, label, type: "join", group: key.startsWith("case.") ? "Case (via usage)" : "Material (via usage)" });
        }
      }
      break;

    case "transactions":
      for (const f of ["transactionType","staffName"]) {
        fields.push({ key: f, label: f.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()), type: "text", group: FIELD_GROUPS[f] || "Other" });
      }
      for (const [key, label] of Object.entries(JOIN_LABELS)) {
        if (key.startsWith("material.")) {
          fields.push({ key, label, type: "join", group: "Material (via transaction)" });
        }
      }
      break;
  }

  // Sort by group
  fields.sort((a, b) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label));

  return NextResponse.json({ success: true, data: { source, fields } });
}
