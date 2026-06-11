-- DropIndex
DROP INDEX "materials_batch_number_key";

-- AlterTable
ALTER TABLE "materials" ADD COLUMN "diameter" REAL;
