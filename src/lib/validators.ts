import { z } from "zod";

// Case validation
export const caseFormSchema = z.object({
  caseNumber: z.string().min(1, "Case number is required"),
  applicationDate: z.string().min(1, "Application date is required"),
  department: z.string().min(1, "Department is required"),
  applicantName: z.string().min(1, "Applicant name is required"),
  contact: z.string().optional().or(z.literal("")),
  useType: z.string().min(1, "Use type is required"),
  projectTitle: z.string().min(1, "Project title is required"),
  description: z.string().optional().or(z.literal("")),
  clinicalPurpose: z.string().optional().or(z.literal("")),
  priority: z.string().default("Routine"),
  requiredDate: z.string().optional().or(z.literal("")),
  currentStatus: z.string().default("Draft"),
  modelImageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  photoFolderUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  remarks: z.string().optional().or(z.literal("")),
});

export type CaseFormValues = z.infer<typeof caseFormSchema>;

// Material validation
export const materialFormSchema = z.object({
  category: z.string().min(1, "Category is required"),
  materialName: z.string().min(1, "Material name is required"),
  brand: z.string().optional().or(z.literal("")),
  materialType: z.string().optional().or(z.literal("")),
  colour: z.string().optional().or(z.literal("")),
  batchNumber: z.string().min(1, "Batch number is required"),
  supplier: z.string().optional().or(z.literal("")),
  purchaseDate: z.string().optional().or(z.literal("")),
  receivedDate: z.string().optional().or(z.literal("")),
  openDate: z.string().optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
  disposalDate: z.string().optional().or(z.literal("")),
  initialQuantity: z.coerce.number().min(0, "Must be 0 or greater"),
  currentQuantity: z.coerce.number().min(0, "Must be 0 or greater"),
  unit: z.string().default("unit"),
  reorderThreshold: z.coerce.number().min(0, "Must be 0 or greater").default(0),
  storageLocation: z.string().optional().or(z.literal("")),
  status: z.string().default("In stock"),
  remarks: z.string().optional().or(z.literal("")),
});

export type MaterialFormValues = z.infer<typeof materialFormSchema>;

// Progress step validation
export const progressStepFormSchema = z.object({
  stepName: z.string().min(1, "Step name is required"),
  stepOrder: z.coerce.number().int().min(0),
  status: z.string().default("Not started"),
  completedDate: z.string().optional().or(z.literal("")),
  staffName: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type ProgressStepFormValues = z.infer<typeof progressStepFormSchema>;

// Material usage validation
export const materialUsageFormSchema = z.object({
  caseId: z.string().min(1, "Case is required"),
  materialId: z.string().min(1, "Material is required"),
  usageDate: z.string().min(1, "Usage date is required"),
  quantityUsed: z.coerce.number().positive("Must be greater than 0"),
  unit: z.string().default("unit"),
  staffName: z.string().optional().or(z.literal("")),
  printerOrTank: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type MaterialUsageFormValues = z.infer<typeof materialUsageFormSchema>;

// Setting validation
export const settingFormSchema = z.object({
  type: z.string().min(1, "Type is required"),
  value: z.string().min(1, "Value is required"),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type SettingFormValues = z.infer<typeof settingFormSchema>;

// Stock take import validation
export const stockTakeRowSchema = z.object({
  materialId: z.string().optional(),
  batchNumber: z.string().optional(),
  countedQuantity: z.coerce.number().min(0, "Must be 0 or greater"),
  staffName: z.string().optional(),
  notes: z.string().optional(),
});

export type StockTakeRow = z.infer<typeof stockTakeRowSchema>;

// Dashboard filters
export const dashboardFiltersSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  department: z.string().optional(),
  useType: z.string().optional(),
  caseStatus: z.string().optional(),
});

export type DashboardFilters = z.infer<typeof dashboardFiltersSchema>;
