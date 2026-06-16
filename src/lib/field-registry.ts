// Maps DB field keys to their display properties
// Add new entries here to make them available as form fields

export interface FieldDef {
  key: string;
  label: string;
  section: string;
  type: "text" | "combobox" | "date" | "textarea" | "number" | "checkbox" | "image" | "multiselect";
  options?: string; // settingsType for combobox/multiselect, or comma-separated list for checkbox groups
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
  modelType: { key: "modelType", label: "Model Type", section: "Purpose & Category", type: "multiselect", options: "Anatomical Model,Device/Tools" },

  // Project
  projectTitle: { key: "projectTitle", label: "Project Title", section: "Project Details", type: "text", required: true },
  requiredService: { key: "requiredService", label: "Required Service", section: "Project Details", type: "multiselect", options: "Segmentation,Design,Printing" },
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
  materialId: { key: "materialId", label: "Material ID (auto, editable)", section: "Material Details", type: "text" },
  batchNumber: { key: "batchNumber", label: "Batch No.", section: "Material Details", type: "text" },
  supplier: { key: "supplier", label: "Supplier", section: "Material Details", type: "text" },
  initialQuantity: { key: "initialQuantity", label: "Weight", section: "Stock & Quantities", type: "number", required: true, defaultValue: 0 },
  unusedQuantity: { key: "unusedQuantity", label: "Used", section: "Stock & Quantities", type: "number", defaultValue: 0 },
  currentQuantity: { key: "currentQuantity", label: "Remain (auto)", section: "Stock & Quantities", type: "number", defaultValue: 0 },
  unit: { key: "unit", label: "Unit", section: "Stock & Quantities", type: "combobox", options: "material_unit", defaultValue: "unit" },
  reorderThreshold: { key: "reorderThreshold", label: "Reorder Threshold", section: "Stock & Quantities", type: "number", defaultValue: 0 },
  storageLocation: { key: "storageLocation", label: "Storage Location", section: "Stock & Quantities", type: "text" },
  status: { key: "status", label: "Status", section: "Stock & Quantities", type: "combobox", options: "material_status", defaultValue: "In stock" },
  purchaseDate: { key: "purchaseDate", label: "Order Date", section: "Dates", type: "date" },
  receivedDate: { key: "receivedDate", label: "Arrival Date", section: "Dates", type: "date" },
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

// Public application form fields (/apply) — matches V5 DOCX sections
export const APPLY_FIELD_REGISTRY: Record<string, FieldDef> = {
  // Part I — For Applicant Use
  applicantName: { key: "applicantName", label: "Applicant", section: "Part I — For Applicant Use", type: "text", required: true },
  expectedCompletionDate: { key: "expectedCompletionDate", label: "Expected Completion Date", section: "Part I — For Applicant Use", type: "date" },
  hospital: { key: "hospital", label: "Hospital", section: "Part I — For Applicant Use", type: "combobox", options: "hospital", defaultValue: "QEH" },
  rank: { key: "rank", label: "Rank", section: "Part I — For Applicant Use", type: "combobox", options: "rank" },
  department: { key: "department", label: "Department", section: "Part I — For Applicant Use", type: "combobox", options: "department" },
  telephone: { key: "telephone", label: "Telephone", section: "Part I — For Applicant Use", type: "text" },
  email: { key: "email", label: "Email", section: "Part I — For Applicant Use", type: "text" },

  // Purpose(s) of Using 3D Printed Model
  purposeCategory: { key: "purposeCategory", label: "Purpose Category", section: "Purpose(s) of Using 3D Printed Model", type: "combobox", options: "case_category", required: true },
  purposeCheckboxes: { key: "purposeCheckboxes", label: "Purpose Options (Checkboxes)", section: "Purpose(s) of Using 3D Printed Model", type: "checkbox" },
  isReprint: { key: "isReprint", label: "Is Reprint Model?", section: "Purpose(s) of Using 3D Printed Model", type: "combobox", options: "reprint" },
  fundingSource: { key: "fundingSource", label: "Funding Source", section: "Purpose(s) of Using 3D Printed Model", type: "text" },

  // Service & Printing Requirements
  serviceRequirement: { key: "serviceRequirement", label: "Service Requirement", section: "Service & Printing Requirements", type: "checkbox" },
  modelMaterial: { key: "modelMaterial", label: "Model Material (Rigid / Soft)", section: "Service & Printing Requirements", type: "checkbox" },
  materialSpecify: { key: "materialSpecify", label: "Material Specification", section: "Service & Printing Requirements", type: "text" },
  colourRequirement: { key: "colourRequirement", label: "Colour Requirement", section: "Service & Printing Requirements", type: "checkbox" },
  requiresSterilization: { key: "requiresSterilization", label: "Sterilization", section: "Service & Printing Requirements", type: "checkbox" },
  otherRequirements: { key: "otherRequirements", label: "Other Requirements", section: "Service & Printing Requirements", type: "checkbox" },
  quantity: { key: "quantity", label: "Quantity Required", section: "Service & Printing Requirements", type: "number", defaultValue: 1 },

  // Copyright
  copyrightRisk: { key: "copyrightRisk", label: "Copyright Risk?", section: "Copyright", type: "combobox", options: "copyright_risk" },
  copyrightDetails: { key: "copyrightDetails", label: "Copyright Details", section: "Copyright", type: "text" },
  consentText: { key: "consentText", label: "Consent Statement", section: "Copyright", type: "textarea" },

  // Signature
  signature: { key: "signature", label: "Signature of Applicant", section: "Signature", type: "text" },
  signatureDate: { key: "signatureDate", label: "Signature Date", section: "Signature", type: "date" },
};

export const APPLY_SECTION_ORDER = [
  "Part I — For Applicant Use",
  "Purpose(s) of Using 3D Printed Model",
  "Service & Printing Requirements",
  "Copyright",
  "Signature",
];

export const MATERIAL_SECTION_ORDER = [
  "Material Details",
  "Stock & Quantities",
  "Dates",
  "Additional",
];

// Category-specific field sets — exact match with QEH Stock Taking Excel columns
// Formulas preserved: Remain = Weight - Used, Status = auto from dates
export const MATERIAL_CATEGORY_FIELDS: Record<string, string[]> = {
  "FDM Filaments": [
    "materialId",
    "batchNumber",
    "materialName", "colour",
    "brand", "materialType", "diameter", "supplier",
    "initialQuantity", "unusedQuantity", "currentQuantity",
    "status",
    "purchaseDate", "receivedDate", "openDate", "disposalDate",
    "remarks",
  ],
  "SLA Resins": [
    "materialId",
    "batchNumber",
    "materialName", "colour",
    "productCode",
    "materialType", "compatiblePrinter", "brand", "supplier",
    "initialQuantity", "unusedQuantity", "currentQuantity",
    "status",
    "purchaseDate", "receivedDate", "manufacturingDate", "expiryDate", "openDate", "disposalDate",
    "remarks",
  ],
  "Resin Tanks": [
    "materialId",
    "batchNumber",
    "materialName", "materialType",
    "productCode", "supplier",
    "initialQuantity", "unusedQuantity", "currentQuantity",
    "status",
    "purchaseDate", "receivedDate", "openDate", "disposalDate",
    "remarks",
  ],
  "IPA": [
    "materialId",
    "batchNumber",
    "materialName", "supplier",
    "unit", "expiryDate",
    "initialQuantity", "unusedQuantity", "currentQuantity",
    "purchaseDate", "receivedDate", "openDate",
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
