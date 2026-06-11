-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_materials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "material_name" TEXT NOT NULL,
    "brand" TEXT,
    "material_type" TEXT,
    "compatible_printer" TEXT,
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
    "unused_quantity" REAL NOT NULL DEFAULT 0,
    "opened_quantity" REAL NOT NULL DEFAULT 0,
    "expired_quantity" REAL NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "reorder_threshold" REAL NOT NULL DEFAULT 0,
    "storage_location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'In stock',
    "remarks" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_materials" ("batch_number", "brand", "category", "colour", "compatible_printer", "created_at", "current_quantity", "disposal_date", "expiry_date", "id", "initial_quantity", "material_name", "material_type", "open_date", "purchase_date", "received_date", "remarks", "reorder_threshold", "status", "storage_location", "supplier", "unit", "updated_at") SELECT "batch_number", "brand", "category", "colour", "compatible_printer", "created_at", "current_quantity", "disposal_date", "expiry_date", "id", "initial_quantity", "material_name", "material_type", "open_date", "purchase_date", "received_date", "remarks", "reorder_threshold", "status", "storage_location", "supplier", "unit", "updated_at" FROM "materials";
DROP TABLE "materials";
ALTER TABLE "new_materials" RENAME TO "materials";
CREATE UNIQUE INDEX "materials_batch_number_key" ON "materials"("batch_number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
