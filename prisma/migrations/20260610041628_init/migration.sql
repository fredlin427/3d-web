-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "case_number" TEXT NOT NULL,
    "application_date" DATETIME NOT NULL,
    "department" TEXT NOT NULL,
    "applicant_name" TEXT NOT NULL,
    "contact" TEXT,
    "use_type" TEXT NOT NULL,
    "project_title" TEXT NOT NULL,
    "description" TEXT,
    "clinical_purpose" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'Routine',
    "required_date" DATETIME,
    "current_status" TEXT NOT NULL DEFAULT 'Draft',
    "current_progress_step" TEXT,
    "model_image_url" TEXT,
    "photo_folder_url" TEXT,
    "remarks" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "case_progress_steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "case_id" TEXT NOT NULL,
    "step_name" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Not started',
    "completed_date" DATETIME,
    "staff_name" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "case_progress_steps_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "material_name" TEXT NOT NULL,
    "brand" TEXT,
    "material_type" TEXT,
    "colour" TEXT,
    "batch_number" TEXT NOT NULL,
    "supplier" TEXT,
    "purchase_date" DATETIME,
    "received_date" DATETIME,
    "open_date" DATETIME,
    "expiry_date" DATETIME,
    "disposal_date" DATETIME,
    "initial_quantity" REAL NOT NULL,
    "current_quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "reorder_threshold" REAL NOT NULL DEFAULT 0,
    "storage_location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'In stock',
    "remarks" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "case_material_usage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "case_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "usage_date" DATETIME NOT NULL,
    "quantity_used" REAL NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "staff_name" TEXT,
    "printer_or_tank" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "case_material_usage_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "case_material_usage_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stock_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "material_id" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "quantity_change" REAL NOT NULL,
    "quantity_after" REAL NOT NULL,
    "related_case_id" TEXT,
    "transaction_date" DATETIME NOT NULL,
    "staff_name" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_transactions_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_transactions_related_case_id_fkey" FOREIGN KEY ("related_case_id") REFERENCES "cases" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "staff_name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "cases_case_number_key" ON "cases"("case_number");

-- CreateIndex
CREATE UNIQUE INDEX "materials_batch_number_key" ON "materials"("batch_number");
