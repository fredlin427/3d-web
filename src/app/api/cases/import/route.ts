import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Map old master list column names to current schema fields
const COLUMN_MAP: Record<string, string> = {
  "Case No.": "caseNumber",
  "Date of application": "applicationDate",
  "Expected completion date": "expectedCompletionDate",
  "Approval Date": "approvalDate",
  "Applicant": "applicantName",
  "Hospital": "hospital",
  "Department": "department",
  "Rank": "rank",
  "Specification (for \"Others\" Purpose)": "specification",
  "Specification": "specification",
  "Type of Model": "modelType",
  "Service Required": "requiredService",
  "Required Sterilization": "requiresSterilization",
  "QTY": "quantity",
  "Total No. of Components": "totalComponents",
  "In charge Technician": "technician",
  "Vendor / Dept of Service": "printingParty",
  "Completion Date": "completionDate",
  "Financial Year": "financialYear",
  "Remarks": "remarks",
  "Receiving Centre": "receivingCentre",
  "Segmentation Region": "segmentationRegion",
  "Design Requirement": "designRequirement",
  "Printing Requirements": "printingRequirements",
};

function parseExcelDate(val: unknown): string | null {
  if (!val) return null;
  // Excel serial date number
  if (typeof val === "number") {
    const d = new Date((val - 25569) * 86400 * 1000);
    return d.toISOString().split("T")[0];
  }
  const s = String(val).trim();
  if (!s) return null;
  // Try parsing various date formats
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  // Try "14 Apr 2022" format
  const m = s.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
  if (m) {
    const months: Record<string, number> = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
    return `${m[3]}-${String(months[m[2].toLowerCase()]+1).padStart(2,"0")}-${String(parseInt(m[1])).padStart(2,"0")}`;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    // Read XLSX
    const XLSX = await import("xlsx");
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as Record<string, unknown>[];

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "Empty file" }, { status: 400 });
    }

    // Build column mapping from header row
    const firstRow = rows[0];
    const mapping: Record<string, string> = {};
    for (const key of Object.keys(firstRow)) {
      const cleanKey = key.replace(/[\r\n]+/g, " ").trim();
      if (COLUMN_MAP[cleanKey]) {
        mapping[key] = COLUMN_MAP[cleanKey];
      }
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        const data: Record<string, unknown> = {};

        // Map columns
        for (const [srcKey, destKey] of Object.entries(mapping)) {
          const val = row[srcKey];
          if (val === undefined || val === null || String(val).trim() === "" || String(val).trim() === "N/A") continue;

          // Handle dates
          if (destKey.endsWith("Date")) {
            const parsed = parseExcelDate(val);
            if (parsed) data[destKey] = new Date(parsed);
          }
          // Handle numbers
          else if (destKey === "quantity" || destKey === "totalComponents") {
            data[destKey] = parseInt(String(val)) || 1;
          }
          // Handle boolean
          else if (destKey === "requiresSterilization") {
            data[destKey] = String(val).toLowerCase() === "yes" ? "Yes" : "No";
          }
          else {
            data[destKey] = String(val).trim();
          }
        }

        // Combine purpose fields
        const purposes: string[] = [];
        const primaryPurpose = String(row["Primary Purpose"] || "").trim();
        const secondaryPurpose = String(row["Secondary Purpose"] || "").trim();
        const tertiaryPurpose = String(row["Tertiary Purpose"] || "").trim();
        if (primaryPurpose && primaryPurpose !== "N/A") purposes.push(primaryPurpose);
        if (secondaryPurpose && secondaryPurpose !== "N/A") purposes.push(secondaryPurpose);
        if (tertiaryPurpose && tertiaryPurpose !== "N/A") purposes.push(tertiaryPurpose);
        if (purposes.length > 0) data.purpose = purposes.join("; ");

        // Determine category from Type of Model
        if (data.modelType) {
          const mt = String(data.modelType).toLowerCase();
          if (mt.includes("anatomical")) data.category = "Clinical Use";
          else if (mt.includes("device") || mt.includes("tool")) data.category = "Clinical Use";
          else data.category = "Clinical Use"; // default
        }

        // Default status
        data.currentStatus = data.completionDate ? "Completed" : "Draft";
        data.priority = "Routine";
        data.applicationDate = data.applicationDate || new Date();

        // Check for duplicate case number
        if (data.caseNumber) {
          const existing = await prisma.case.findFirst({
            where: { caseNumber: String(data.caseNumber) },
          });
          if (existing) {
            skipped++;
            continue;
          }
        }

        // Generate case number if missing
        if (!data.caseNumber) {
          const count = await prisma.case.count();
          data.caseNumber = `QEH3D-${String(count + 1).padStart(3, "0")}`;
        }

        // Set defaults
        data.quantity = data.quantity || 1;
        data.totalComponents = data.totalComponents || 1;
        data.projectTitle = String(data.purpose || "Imported case");
        data.applicantName = data.applicantName || "Unknown";

        await (prisma.case as any).create({ data });
        imported++;
      } catch (e: any) {
        errors.push(`Row error: ${e.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: { totalRows: rows.length, imported, skipped, errorCount: errors.length, errors: errors.slice(0, 10) },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Import failed" }, { status: 500 });
  }
}
