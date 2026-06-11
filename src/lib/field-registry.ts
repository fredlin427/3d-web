// Maps DB field keys to their display properties
// Add new entries here to make them available as form fields

export interface FieldDef {
  key: string;
  label: string;
  section: string;
  type: "text" | "combobox" | "date" | "textarea" | "number" | "checkbox" | "image";
  options?: string; // settingsType for combobox, or comma-separated list
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number;
}

// All available fields. To add a new field to the system, add it here.
// Users control WHICH fields appear via Settings > Case Form Fields.
export const CASE_FIELD_REGISTRY: Record<string, FieldDef> = {
  // Part I: Applicant
  caseNumber: { key: "caseNumber", label: "Case Number", section: "Part I: For Applicant Use", type: "text", required: true },
  applicationDate: { key: "applicationDate", label: "Application Date", section: "Part I: For Applicant Use", type: "date", required: true },
  expectedCompletionDate: { key: "expectedCompletionDate", label: "Expected Completion Date", section: "Part I: For Applicant Use", type: "date" },
  applicantName: { key: "applicantName", label: "Applicant Name", section: "Part I: For Applicant Use", type: "text", required: true },
  hospital: { key: "hospital", label: "Hospital", section: "Part I: For Applicant Use", type: "combobox", options: "hospital", defaultValue: "QEH" },
  rank: { key: "rank", label: "Rank", section: "Part I: For Applicant Use", type: "combobox", options: "rank" },
  department: { key: "department", label: "Department", section: "Part I: For Applicant Use", type: "combobox", options: "department", required: true },
  contact: { key: "contact", label: "Contact", section: "Part I: For Applicant Use", type: "text", placeholder: "Email or telephone" },

  // Purpose
  category: { key: "category", label: "Category", section: "Purpose & Category", type: "combobox", options: "case_category", required: true },
  purpose: { key: "purpose", label: "Purpose", section: "Purpose & Category", type: "combobox", options: "purpose", required: true },
  specification: { key: "specification", label: "Specification (for Others)", section: "Purpose & Category", type: "text" },
  modelType: { key: "modelType", label: "Model Type", section: "Purpose & Category", type: "combobox", options: "model_type" },

  // Project
  projectTitle: { key: "projectTitle", label: "Project Title", section: "Project Details", type: "text", required: true },
  requiredService: { key: "requiredService", label: "Required Service", section: "Project Details", type: "combobox", options: "service_option" },
  serviceRequirements: { key: "serviceRequirements", label: "Service Requirements", section: "Project Details", type: "textarea" },
  requiresSterilization: { key: "requiresSterilization", label: "Requires Sterilization", section: "Project Details", type: "checkbox" },
  description: { key: "description", label: "Case Description", section: "Project Details", type: "textarea" },
  quantity: { key: "quantity", label: "QTY", section: "Project Details", type: "number", defaultValue: 1 },
  totalComponents: { key: "totalComponents", label: "Total Components", section: "Project Details", type: "number", defaultValue: 1 },

  // Part II
  approvalDate: { key: "approvalDate", label: "Approval Date", section: "Part II: For Internal Use Only", type: "date" },
  ownership: { key: "ownership", label: "Ownership", section: "Part II: For Internal Use Only", type: "combobox", options: "ownership" },
  priority: { key: "priority", label: "Priority", section: "Part II: For Internal Use Only", type: "combobox", options: "priority", defaultValue: "Routine" },
  currentStatus: { key: "currentStatus", label: "Status", section: "Part II: For Internal Use Only", type: "combobox", options: "case_status", defaultValue: "Draft" },
  technician: { key: "technician", label: "In charge Technician", section: "Part II: For Internal Use Only", type: "combobox", options: "technician" },
  printingParty: { key: "printingParty", label: "Printing Party", section: "Part II: For Internal Use Only", type: "combobox", options: "printing_party" },
  completionDate: { key: "completionDate", label: "Completion Date", section: "Part II: For Internal Use Only", type: "date" },
  staffName: { key: "staffName", label: "Staff Name (audit)", section: "Part II: For Internal Use Only", type: "text" },

  // Media
  modelImageUrl: { key: "modelImageUrl", label: "3D Model Image", section: "Media & Remarks", type: "image" },
  photoFolderUrl: { key: "photoFolderUrl", label: "Reference Photos", section: "Media & Remarks", type: "image" },
  remarks: { key: "remarks", label: "Remarks", section: "Media & Remarks", type: "textarea" },
};

export const MATERIAL_FIELD_REGISTRY: Record<string, FieldDef> = {
  category: { key: "category", label: "Category", section: "Material Details", type: "combobox", options: "material_category", required: true },
  materialName: { key: "materialName", label: "Material Name", section: "Material Details", type: "text", required: true },
  brand: { key: "brand", label: "Brand", section: "Material Details", type: "combobox", options: "material_brand" },
  materialType: { key: "materialType", label: "Material Type / Version", section: "Material Details", type: "combobox", options: "material_type_option" },
  compatiblePrinter: { key: "compatiblePrinter", label: "Compatible Printer", section: "Material Details", type: "combobox", options: "compatible_printer" },
  colour: { key: "colour", label: "Colour", section: "Material Details", type: "text" },
  diameter: { key: "diameter", label: "Diameter (mm)", section: "Material Details", type: "number" },
  productCode: { key: "productCode", label: "Product Code", section: "Material Details", type: "text" },
  batchNumber: { key: "batchNumber", label: "Batch No.", section: "Material Details", type: "text" },
  supplier: { key: "supplier", label: "Supplier", section: "Material Details", type: "text" },
  initialQuantity: { key: "initialQuantity", label: "Total QTY", section: "Stock & Quantities", type: "number", required: true, defaultValue: 0 },
  currentQuantity: { key: "currentQuantity", label: "Remain QTY", section: "Stock & Quantities", type: "number", required: true, defaultValue: 0 },
  unusedQuantity: { key: "unusedQuantity", label: "Unused QTY", section: "Stock & Quantities", type: "number", defaultValue: 0 },
  openedQuantity: { key: "openedQuantity", label: "Opened QTY", section: "Stock & Quantities", type: "number", defaultValue: 0 },
  expiredQuantity: { key: "expiredQuantity", label: "Expired QTY", section: "Stock & Quantities", type: "number", defaultValue: 0 },
  unit: { key: "unit", label: "Unit", section: "Stock & Quantities", type: "combobox", options: "material_unit", defaultValue: "unit" },
  reorderThreshold: { key: "reorderThreshold", label: "Reorder Threshold", section: "Stock & Quantities", type: "number", defaultValue: 0 },
  storageLocation: { key: "storageLocation", label: "Storage Location", section: "Stock & Quantities", type: "text" },
  status: { key: "status", label: "Status", section: "Stock & Quantities", type: "combobox", options: "material_status", defaultValue: "In stock" },
  purchaseDate: { key: "purchaseDate", label: "Purchase Date", section: "Dates", type: "date" },
  receivedDate: { key: "receivedDate", label: "Received Date", section: "Dates", type: "date" },
  openDate: { key: "openDate", label: "Open Date", section: "Dates", type: "date" },
  expiryDate: { key: "expiryDate", label: "Expiry Date", section: "Dates", type: "date" },
  disposalDate: { key: "disposalDate", label: "Disposal Date", section: "Dates", type: "date" },
  manufacturingDate: { key: "manufacturingDate", label: "Manufacturing Date", section: "Dates", type: "date" },
  remarks: { key: "remarks", label: "Remarks", section: "Additional", type: "textarea" },
  staffName: { key: "staffName", label: "Staff Name (audit)", section: "Additional", type: "text" },
};

export const CASE_SECTION_ORDER = [
  "Part I: For Applicant Use",
  "Purpose & Category",
  "Project Details",
  "Part II: For Internal Use Only",
  "Media & Remarks",
];

// Public application form fields (/apply)
export const APPLY_FIELD_REGISTRY: Record<string, FieldDef> = {
  applicantName: { key: "applicantName", label: "Applicant Name", section: "Part I — Applicant Information", type: "text", required: true },
  hospital: { key: "hospital", label: "Hospital", section: "Part I — Applicant Information", type: "combobox", options: "hospital", defaultValue: "QEH" },
  rank: { key: "rank", label: "Rank / Position", section: "Part I — Applicant Information", type: "combobox", options: "rank" },
  department: { key: "department", label: "Department", section: "Part I — Applicant Information", type: "combobox", options: "department", required: true },
  contact: { key: "contact", label: "Contact (Email / Tel)", section: "Part I — Applicant Information", type: "text" },
  expectedCompletionDate: { key: "expectedCompletionDate", label: "Expected Completion Date", section: "Part I — Applicant Information", type: "date" },
  category: { key: "category", label: "Category", section: "Purpose & Category", type: "combobox", options: "case_category", required: true },
  purpose: { key: "purpose", label: "Purpose", section: "Purpose & Category", type: "combobox", options: "purpose", required: true },
  specification: { key: "specification", label: "Specification (for Others)", section: "Purpose & Category", type: "text" },
  modelType: { key: "modelType", label: "Model Type", section: "Purpose & Category", type: "combobox", options: "model_type" },
  projectTitle: { key: "projectTitle", label: "Project Title", section: "Service & Printing Requirements", type: "text" },
  requiredService: { key: "requiredService", label: "Required Service", section: "Service & Printing Requirements", type: "combobox", options: "service_option" },
  serviceRequirements: { key: "serviceRequirements", label: "Service Requirements", section: "Service & Printing Requirements", type: "textarea" },
  requiresSterilization: { key: "requiresSterilization", label: "Requires Sterilization", section: "Service & Printing Requirements", type: "combobox", options: "sterilization" },
  quantity: { key: "quantity", label: "Quantity Required", section: "Service & Printing Requirements", type: "number", defaultValue: 1 },
  description: { key: "description", label: "Additional Notes", section: "Service & Printing Requirements", type: "textarea" },
};

export const APPLY_SECTION_ORDER = [
  "Part I — Applicant Information",
  "Purpose & Category",
  "Service & Printing Requirements",
];

export const MATERIAL_SECTION_ORDER = [
  "Material Details",
  "Stock & Quantities",
  "Dates",
  "Additional",
];

// Category-specific field sets matching QEH Stock Taking Excel
// Category field lists — match QEH Stock Taking Excel columns exactly
export const MATERIAL_CATEGORY_FIELDS: Record<string, string[]> = {
  "FDM Filaments": [
    // Excel: Material ID(auto), Batch No., Order Date, Arrival Date, Brand, Material Type, Product Name, Supplier, Color, Diameter(mm), Weight(g), Used(g), Remain(g), Status, Open Date, Disposal Date, Remarks
    "batchNumber",
    "purchaseDate", "receivedDate",
    "brand", "materialType", "materialName", "supplier", "colour", "diameter",
    "initialQuantity", "unusedQuantity", "openedQuantity", "currentQuantity", "unit",
    "status",
    "openDate", "disposalDate",
    "remarks",
  ],
  "SLA Resins": [
    // Excel: Batch No., Order Date, Arrival Date, Product Name, Version, Compatible Printer, Brand, Supplier, Color, Manufacturing Date, Expiry Date, Volume(mL), Used(mL), Remain(mL), Status, Open Date, Disposal Date, Remarks
    "batchNumber",
    "purchaseDate", "receivedDate",
    "materialName", "materialType", "compatiblePrinter", "brand", "supplier", "colour",
    "manufacturingDate", "expiryDate",
    "initialQuantity", "unusedQuantity", "openedQuantity", "expiredQuantity", "currentQuantity", "unit",
    "status",
    "openDate", "disposalDate",
    "remarks",
  ],
  "Resin Tanks": [
    // Excel: Batch, Order Date, Arrival Date, Product Code, Product Name, Supplier, Status, Open Date, Resin Type, Disposal Date, Remarks
    "batchNumber",
    "purchaseDate", "receivedDate",
    "productCode", "materialName", "supplier",
    "materialType",
    "status",
    "openDate", "disposalDate",
    "remarks",
  ],
  "IPA": [
    // Excel: Batch, Order Date, Arrival Date, Product Name, Supplier, Volume/Bottle(L), Expiry Date, QTY, Used, Remain, Remarks
    "batchNumber",
    "purchaseDate", "receivedDate",
    "materialName", "supplier",
    "expiryDate",
    "initialQuantity", "unusedQuantity", "openedQuantity", "currentQuantity", "unit",
    "status", "openDate",
    "remarks",
  ],
};

export const MATERIAL_CATEGORY_SECTION_ORDERS: Record<string, string[]> = {
  "FDM Filaments": ["Material Details", "Stock & Quantities", "Dates", "Additional"],
  "SLA Resins": ["Material Details", "Stock & Quantities", "Dates", "Additional"],
  "Resin Tanks": ["Material Details", "Stock & Quantities", "Dates", "Additional"],
  "IPA": ["Material Details", "Stock & Quantities", "Dates", "Additional"],
};

// Each material category has its own settings type for independent field config
export const MATERIAL_CATEGORY_SETTINGS_TYPE: Record<string, string> = {
  "FDM Filaments": "fdm_form_field",
  "SLA Resins": "sla_form_field",
  "Resin Tanks": "tank_form_field",
  "IPA": "ipa_form_field",
};
