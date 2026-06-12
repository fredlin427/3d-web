// Dropdown options matching QEH 3D Printing Office templates
export const DEPARTMENTS = [
  "SURG", // Surgery
  "ANA", // Anaesthesia
  "ONC", // Oncology
  "COS", // Consultant
  "ORT", // Orthopaedics
  "NS", // Neurosurgery
  "ENT",
  "DENTAL",
  "RAD",
  "PAED", // Paediatrics
  "Other",
] as const;

export const DEPARTMENT_LABELS: Record<string, string> = {
  SURG: "Surgery",
  ANA: "Anaesthesia",
  ONC: "Oncology",
  COS: "Consultant",
  ORT: "Orthopaedics",
  NS: "Neurosurgery",
  ENT: "ENT",
  DENTAL: "Dental",
  RAD: "Radiology",
  PAED: "Paediatrics",
  Other: "Other",
};

export const CATEGORIES = [
  "Clinical Use",
  "Rehabilitation",
  "Training/ Education",
] as const;

export const PURPOSES: Record<string, string[]> = {
  "Clinical Use": [
    "Pre-op planning",
    "Intra-operative guide",
    "Patient education",
  ],
  Rehabilitation: [
    "Device adaptation and modification",
    "OSH device",
    "Prosthesis and Orthosis",
    "Others",
    "Patient device for activity of daily living",
    "Patient device for training",
    "Device adaptation and modification",
    "OSH device",
  ],
  "Training/ Education": [
    "Medical training / education",
    "Research use",
  ],
};

export const MODEL_TYPES = [
  "Anatomical Model",
  "Device / Tool",
  "Anatomical + Device",
] as const;

export const OWNERSHIP_TYPES = [
  "3DPO",
  "Co-owned",
  "Applicant",
  "External",
] as const;

export const SERVICE_OPTIONS = [
  "Segmentation",
  "Design",
  "Printing",
  "Segmentation, Design",
  "Segmentation, Printing",
  "Design, Printing",
  "Segmentation, Design, Printing",
] as const;

export const STERILIZATION_OPTIONS = ["Yes", "No"] as const;

export const PRIORITIES = ["Routine", "Urgent", "High priority"] as const;

export const CASE_STATUSES = [
  "Draft",
  "In progress",
  "On hold",
  "Completed",
  "Cancelled",
] as const;

export const TECHNICIANS = ["Madeleine", "Tiffany", "Other"] as const;

export const PRINTING_PARTIES = ["3DPO", "AMMA", "Printrite", "Other"] as const;

export const RANKS = ["CON", "COS", "Physicist", "MO", "Other"] as const;

export const HOSPITALS = ["QEH", "Other"] as const;

export const MATERIAL_TYPES = ["Rigid material", "Soft material"] as const;

// FDM material types (from Excel Code List)
export const FDM_MATERIAL_TYPES = [
  "ABS","CF","CPE","Glass","PA","PC","PETG","PLA","PP","PVA","TPU","Wood","rPET","Nylon","Other",
] as const;

// SLA Resin products (from Excel Code List)
export const SLA_RESIN_PRODUCTS = [
  "BioMed Clear Resin","BioMed Durable Resin","BioMed Elastic 50A Resin","BioMed Flex 80A Resin","BioMed White Resin",
  "BioMed Amber Resin","BioMed Black Resin",
  "Black Resin","Clear Resin","Color Resin","Dental LT Clear Resin","Draft Resin","Durable Resin",
  "Elastic 50A Resin","Flexible 80A Resin","Grey Pro Resin","Grey Resin","High Temp Resin",
  "IBT Resin","IBT Flex Resin","Rigid 10K Resin","Rigid 4000 Resin","Silicone 40A Resin",
  "Surgical Guide Resin","Tough 1500 Resin","Tough 2000 Resin","White Resin",
] as const;

// SLA Material Code mapping (from Excel)
export const SLA_MATERIAL_CODES: Record<string, string> = {
  "BioMed Clear Resin": "BioCL",
  "BioMed Durable Resin": "BioDU",
  "BioMed Elastic 50A Resin": "BioE50A",
  "BioMed Flex 80A Resin": "BioF80A",
  "BioMed White Resin": "BioWH",
  "BioMed Amber Resin": "BioAM",
  "BioMed Black Resin": "BioBL",
  "Black Resin": "BL",
  "Clear Resin": "CL",
  "Color Resin": "CO",
  "Dental LT Clear Resin": "DenLT",
  "Draft Resin": "DR",
  "Durable Resin": "DUR",
  "Elastic 50A Resin": "E50A",
  "Flexible 80A Resin": "F80A",
  "Grey Pro Resin": "GR+",
  "Grey Resin": "GR",
  "High Temp Resin": "HT",
  "IBT Resin": "IBT",
  "IBT Flex Resin": "FlexIBT",
  "Rigid 10K Resin": "R10K",
  "Rigid 4000 Resin": "R4K",
  "Silicone 40A Resin": "SI40A",
  "Surgical Guide Resin": "SG",
  "Tough 1500 Resin": "T15",
  "Tough 2000 Resin": "T20",
  "White Resin": "WH",
};

// SLA compatible printers (from Excel)
export const SLA_PRINTERS = ["Form 3BL","Form 4B"] as const;

// Resin Tank products (from Excel)
export const TANK_PRODUCTS = [
  "Form 2 Resin Tank LT","Form 3L Resin Tank V2","Form 3L Resin Tank V3","Form 4 Resin Tank","Form 4L Resin Tank",
] as const;

// Tank Product Name → Code (from Excel Code List)
export const TANK_PRODUCT_CODES: Record<string, string> = {
  "Form 2 Resin Tank LT": "F2LT",
  "Form 3L Resin Tank V2": "F3L02",
  "Form 3L Resin Tank V3": "F3L03",
  "Form 4 Resin Tank": "F401",
  "Form 4L Resin Tank": "F4L01",
};

export const COPYRIGHT_RISK_OPTIONS = ["No", "Yes"] as const;

export const REPRINT_OPTIONS = ["No", "Yes"] as const;

export const PRINTING_REQUIREMENT_OPTIONS = [
  "Segmentation",
  "Device / Tools Design",
  "Printing Service",
  "Others",
] as const;

// Material categories (unchanged)
export const MATERIAL_CATEGORIES = [
  "FDM Filaments",
  "SLA Resins",
  "Resin Tanks",
  "IPA",
] as const;

export const MATERIAL_UNITS = [
  "roll",
  "bottle",
  "cartridge",
  "litre",
  "ml",
  "kg",
  "g",
  "unit",
] as const;

export const MATERIAL_STATUSES = [
  "In stock",
  "Opened",
  "Low stock",
  "Expired",
  "Disposed",
] as const;

export const PROGRESS_STEP_STATUSES = [
  "Not started",
  "In progress",
  "Completed",
  "Skipped",
] as const;

export const TRANSACTION_TYPES = [
  "Usage",
  "Refill",
  "Adjustment",
  "Disposal",
  "Stock take adjustment",
] as const;

export const DEFAULT_PROGRESS_STEPS = [
  "Application Received",
  "Approval",
  "Segmentation / Design",
  "Verify Segmentation / Design",
  "Printing",
  "Post-processing",
  "Final Product",
  "Completion",
] as const;

export const STORAGE_LOCATIONS = [
  "Shelf A",
  "Shelf B",
  "Shelf C",
  "Cabinet 1",
  "Cabinet 2",
  "Cold Storage",
  "Hazardous Cabinet",
  "Printer Station 1",
  "Printer Station 2",
] as const;

export const AUDIT_ACTIONS = {
  CASE_CREATED: "case_created",
  CASE_UPDATED: "case_updated",
  CASE_DELETED: "case_deleted",
  CASE_DUPLICATED: "case_duplicated",
  CASE_COMPLETED: "case_completed",
  PROGRESS_UPDATED: "progress_updated",
  MATERIAL_USAGE_ADDED: "material_usage_added",
  MATERIAL_USAGE_EDITED: "material_usage_edited",
  MATERIAL_USAGE_DELETED: "material_usage_deleted",
  MATERIAL_CREATED: "material_created",
  MATERIAL_UPDATED: "material_updated",
  MATERIAL_DELETED: "material_deleted",
  STOCK_ADJUSTED: "stock_adjusted",
  STOCK_TAKE: "stock_take",
} as const;

export const ENTITY_TYPES = {
  CASE: "Case",
  MATERIAL: "Material",
  CASE_PROGRESS_STEP: "CaseProgressStep",
  CASE_MATERIAL_USAGE: "CaseMaterialUsage",
} as const;
