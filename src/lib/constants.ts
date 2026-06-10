export const DEPARTMENTS = [
  "Surgery",
  "Orthopaedics",
  "Neurosurgery",
  "ENT",
  "Dental",
  "Radiology",
  "Oncology",
  "Cardiology",
  "Other",
] as const;

export const USE_TYPES = [
  "Surgical planning",
  "Patient-specific model",
  "Education",
  "Training",
  "Research",
  "Device / jig / guide",
  "Other",
] as const;

export const PRIORITIES = ["Routine", "Urgent", "High priority"] as const;

export const CASE_STATUSES = [
  "Draft",
  "In progress",
  "On hold",
  "Completed",
  "Cancelled",
] as const;

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
