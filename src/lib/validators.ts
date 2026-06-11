import { z } from "zod";

// Case validation - matching QEH 3D Application Form V5
export const caseFormSchema = z.object({
  caseNumber: z.string().min(1, "Case number is required"),
  applicationDate: z.string().min(1, "Application date is required"),
  expectedCompletionDate: z.string().optional().or(z.literal("")),
  approvalDate: z.string().optional().or(z.literal("")),
  completionDate: z.string().optional().or(z.literal("")),
  ownership: z.string().optional().or(z.literal("")),
  department: z.string().min(1, "Department is required"),
  hospital: z.string().default("QEH"),
  applicantName: z.string().min(1, "Applicant name is required"),
  contact: z.string().optional().or(z.literal("")),
  rank: z.string().optional().or(z.literal("")),
  category: z.string().min(1, "Category is required"),
  purpose: z.string().min(1, "Purpose is required"),
  specification: z.string().optional().or(z.literal("")),
  projectTitle: z.string().min(1, "Project title is required"),
  description: z.string().optional().or(z.literal("")),
  modelType: z.string().optional().or(z.literal("")),
  requiredService: z.string().optional().or(z.literal("")),
  serviceRequirements: z.string().optional().or(z.literal("")),
  requiresSterilization: z.string().optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(1).default(1),
  totalComponents: z.coerce.number().int().min(1).default(1),
  priority: z.string().default("Routine"),
  currentStatus: z.string().default("Draft"),
  technician: z.string().optional().or(z.literal("")),
  printingParty: z.string().optional().or(z.literal("")),
  modelImageUrl: z.string().optional().or(z.literal("")),
  photoFolderUrl: z.string().optional().or(z.literal("")),
  remarks: z.string().optional().or(z.literal("")),
  staffName: z.string().optional().or(z.literal("")),
});

export type CaseFormValues = z.infer<typeof caseFormSchema>;

// Material validation
export const materialFormSchema = z.object({
  category: z.string().min(1, "Category is required"),
  materialName: z.string().min(1, "Material name is required"),
  brand: z.string().optional().or(z.literal("")),
  materialType: z.string().optional().or(z.literal("")),
  compatiblePrinter: z.string().optional().or(z.literal("")),
  colour: z.string().optional().or(z.literal("")),
  diameter: z.coerce.number().optional(),
  productCode: z.string().optional().or(z.literal("")),
  batchNumber: z.string().optional().or(z.literal("")),
  supplier: z.string().optional().or(z.literal("")),
  purchaseDate: z.string().optional().or(z.literal("")),
  receivedDate: z.string().optional().or(z.literal("")),
  openDate: z.string().optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
  disposalDate: z.string().optional().or(z.literal("")),
  manufacturingDate: z.string().optional().or(z.literal("")),
  initialQuantity: z.coerce.number().min(0, "Must be 0 or greater"),
  currentQuantity: z.coerce.number().min(0, "Must be 0 or greater"),
  unusedQuantity: z.coerce.number().min(0, "Must be 0 or greater").default(0),
  openedQuantity: z.coerce.number().min(0, "Must be 0 or greater").default(0),
  expiredQuantity: z.coerce.number().min(0, "Must be 0 or greater").default(0),
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
  category: z.string().optional(),
  caseStatus: z.string().optional(),
});

export type DashboardFilters = z.infer<typeof dashboardFiltersSchema>;
