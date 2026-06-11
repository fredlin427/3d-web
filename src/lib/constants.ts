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
    "Device adaptation and modification",
    "OSH device",
    "Prosthesis and Orthosis",
    "Others",
  ],
  Rehabilitation: [
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
