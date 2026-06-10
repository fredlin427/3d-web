// API Response type
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Case types
export interface CaseWithRelations {
  id: string;
  caseNumber: string;
  applicationDate: string;
  department: string;
  applicantName: string;
  contact: string | null;
  useType: string;
  projectTitle: string;
  description: string | null;
  clinicalPurpose: string | null;
  priority: string;
  requiredDate: string | null;
  currentStatus: string;
  currentProgressStep: string | null;
  modelImageUrl: string | null;
  photoFolderUrl: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  progressSteps?: ProgressStep[];
  materialUsage?: MaterialUsageWithRelations[];
  _count?: {
    progressSteps: number;
    materialUsage: number;
  };
}

// Material types
export interface MaterialWithRelations {
  id: string;
  category: string;
  materialName: string;
  brand: string | null;
  materialType: string | null;
  colour: string | null;
  batchNumber: string;
  supplier: string | null;
  purchaseDate: string | null;
  receivedDate: string | null;
  openDate: string | null;
  expiryDate: string | null;
  disposalDate: string | null;
  initialQuantity: number;
  currentQuantity: number;
  unit: string;
  reorderThreshold: number;
  storageLocation: string | null;
  status: string;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  materialUsage?: MaterialUsageWithRelations[];
  stockTransactions?: StockTransaction[];
}

export interface ProgressStep {
  id: string;
  caseId: string;
  stepName: string;
  stepOrder: number;
  status: string;
  completedDate: string | null;
  staffName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialUsageWithRelations {
  id: string;
  caseId: string;
  materialId: string;
  usageDate: string;
  quantityUsed: number;
  unit: string;
  staffName: string | null;
  printerOrTank: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  case?: CaseWithRelations;
  material?: MaterialWithRelations;
}

export interface StockTransaction {
  id: string;
  materialId: string;
  transactionType: string;
  quantityChange: number;
  quantityAfter: number;
  relatedCaseId: string | null;
  transactionDate: string;
  staffName: string | null;
  notes: string | null;
  createdAt: string;
  material?: MaterialWithRelations;
  relatedCase?: CaseWithRelations;
}

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  details: string | null;
  staffName: string;
  createdAt: string;
}

export interface Setting {
  id: string;
  type: string;
  value: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Dashboard types
export interface DashboardStats {
  totalCases: number;
  casesThisMonth: number;
  casesInProgress: number;
  completedCases: number;
  lowStockItems: number;
  expiringMaterials: number;
  materialsOpened: number;
}

export interface CaseVolumeByMonth {
  month: string;
  count: number;
}

export interface CaseByDepartment {
  department: string;
  count: number;
}

export interface CaseByUseType {
  useType: string;
  count: number;
}

export interface MaterialUsageTrend {
  month: string;
  usageCount: number;
}

export interface MaterialUsageByCategory {
  category: string;
  totalUsed: number;
}

// Stock take
export interface StockTakeImportRow {
  materialId?: string;
  batchNumber?: string;
  countedQuantity: number;
  staffName?: string;
  notes?: string;
}

export interface StockTakeImportResult {
  totalRows: number;
  updatedItems: number;
  errors: { row: number; message: string }[];
  importedAt: string;
}

// Table types
export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}
