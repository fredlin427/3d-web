# QEH 3D Printing Office — Work Log

## 2026-06-12

### Apply Form V5 — Complete Rewrite
- `/apply` rebuilt to match QEH 3D Printing Application Form V5 DOCX
- Part I: Applicant info, Purpose checkboxes (Clinical Use / Rehabilitation / Training-Education)
- Service & Printing Requirements: Segmentation, Device Design, Printing Service, Others
- Material (Rigid/Soft), Colour, Sterilization, Copyright risk, Signature fields
- Reprint question for Training/Education with funding source
- "First print free" remark
- `/api/apply` updated with 11 new Case DB fields: telephone, email, signature, signatureDate, modelMaterial, colourRequirement, copyrightRisk, copyrightDetails, isReprint, fundingSource
- `/apply-manage` refactored as full form editor with inline label/type editing + purpose checkbox management

### Material Management — Excel Alignment v2
- All 4 categories field lists aligned to Stock Taking Excel columns EXACTLY
- **FDM**: Weight(g), Used(g), Remain(g) — removed openedQuantity/unit from list
- **SLA**: +productCode (Material Code), Volume(mL), Used(mL), Remain(mL)
- **Tank**: Product Code VLOOKUP from Code List
- **IPA**: +unit (Volume/Bottle L), QTY/Bottle, removed status
- New `materialId` field (auto-generated, separate from productCode):
  - FDM: `{BrandCode}-{MaterialType}-{Year}-{Seq}` (e.g., UM-PLA-2024-001)
  - SLA: `{MaterialCode}-{Version}-{Year}-{Seq}` (e.g., CL-V4-2021-001)
  - API `/api/materials/next-material-id` for auto-sequence
- SLA Material Code VLOOKUP from Product Name (27 codes)
- Tank Product Code VLOOKUP (5 codes)
- Remain (currentQuantity) auto-calculated: Weight - Used - Opened - Expired
- Status auto-calculated per category with batch check logic
- Code tables: FDM types (14), SLA products (28), SLA printers (2), Tank products (5)
- API PUT preserves non-rendered fields

### Edit Layout — Unified Inline Field Editing
- All 3 forms (Case, Material, Apply) have unified Edit Layout:
  - Type selector (text/combobox/checkbox/date/number/textarea)
  - Label input always editable
  - Key replacement via dropdown
  - Reorder ↑↓, Remove 🗑, Add field
  - Undo/Redo/Reset to default
- Seed ID fix: refresh from server after initial seed to get real IDs
- Deduplication in field list building

## 2026-06-11

### Material Form — Excel Alignment
- Aligned all 4 material category forms with QEH Stock Taking Excel templates
- **FDM**: Batch No., Order Date, Arrival Date, Brand, Material Type, Product Name, Supplier, Color, Diameter(mm), Weight(g), Used(g), Remain(g), Status, Open Date, Disposal Date, Remarks
- **SLA**: Batch No., Order Date, Arrival Date, Product Name, Version, Compatible Printer, Brand, Supplier, Color, Manufacturing Date, Expiry Date, Volume(mL), Used(mL), Remain(mL), Status, Open Date, Disposal Date, Remarks
- **Tank**: Batch, Order Date, Arrival Date, Product Code, Product Name, Supplier, Status, Open Date, Resin Type, Disposal Date, Remarks
- **IPA**: Batch, Order Date, Arrival Date, Product Name, Supplier, Expiry Date, QTY, Used, Remain, Status, Remarks
- New DB fields: `unusedQuantity`, `openedQuantity`, `expiredQuantity`, `diameter`, `manufacturingDate`, `productCode`
- Each category has fully independent settings types (no sharing)
- Status auto-calculation from dates per category

### Settings Page Redesign
- Replaced sidebar layout with accordion card groups
- Added search bar for filtering settings types
- Grid layout for setting type cards with active/total counts
- Right panel editor for MasterDataTable
- Groups: Case, FDM, SLA, Tank, IPA, Application
- Removed shared "Material Categories" — each category is independent

### Image Upload
- Created `/api/upload` endpoint for image files
- Created `ImageUpload` component with drag & drop, preview, remove
- Integrated into case form for `modelImageUrl` and `photoFolderUrl` fields

### Apply Form Management
- `/apply` — clean public submission form (no edit controls)
- `/apply-manage` — internal Edit Layout page (with sidebar)
- Settings → Application Form Fields for field configuration
- All combo options synced between Settings and forms

### ComboBox & Options System
- Added `settings-updated` custom event for real-time option sync
- All forms auto-refresh options when new values are created
- Every combo field has its options type in Settings
- ~40 independent settings types across all categories

### Dashboard
- Chart PNG export (Camera button on each chart)
- Chart XLSX data export (Download button)
- Stock alert banner with dismiss/dismiss-today

### Bug Fixes
- Custom field key mapping (use settings value as key, not `custom_N`)
- `applySettings` handles custom fields (`custom::...` format)
- Card `overflow-hidden` causing ComboBox dropdown clipping → `overflow-visible`
- ComboBox z-index bumped to `z-[999]`
- Settings ↔ Edit Layout sync (re-fetch on entering edit mode)
- Remove field working for custom fields (key matching fix)
- `batchNumber` unique constraint removed (multiple materials share batch)
- `material_category` removed from Settings (redundant with per-category setup)

## 2026-06-10

### Initial Setup
- Next.js 16.2 + TypeScript + Turbopack
- Tailwind CSS v4, shadcn/ui (base-ui), Prisma 7 + SQLite
- Recharts 3, XLSX library
- Complete database schema with 6 models
- Data-driven form system via Settings table
- Case management with Edit Layout
- Material stock management
- Stock take export/import (XLSX)
- Dashboard with charts and statistics
- Public application form (/apply)
