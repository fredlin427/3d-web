# QEH 3D Printing Office — Work Log

## 2026-06-16

### Presentation Mode — Meeting View
- Added "Meeting View" toggle on Dashboard with 3 switchable chart types:
  - **Sunburst**: Black-background pie (Dept) + nested donut (Categories + Purposes) with Excel Office 2013 colors
  - **Grouped Bars**: Horizontal bar charts with data labels, categorized by purpose
  - **Table**: Clean tabular view with counts and percentages
- Purpose sub-items now visible in both sunburst (outer ring + side legend) and grouped bars
- All charts use Calibri font stack, Excel-style color palette
- Export PNG button for each chart view
- Dashboard export functions moved to module level (no re-render cost)
- Fixed `caseByUseType` → `caseBycategory` API key mismatch
- Added `caseByPurpose` data to dashboard API for sunburst outer ring

### QEH Requirements from Tiffany (June 16 email)
- **Case number FY** now based on `applicationDate` instead of `new Date()` (requirement: FY determined by application date)
- **Model Type** changed to multi-select (checkbox group): Anatomical Model, Device/Tools
- **Required Service** changed to multi-select (checkbox group): Segmentation, Design, Printing
- Added `multiselect` field type to FieldDef + rendering in case-form and material-form
- **Stock take export** now includes Checker/Verifier signature rows at bottom of Excel
- **Purpose dropdown** already dynamically filters by category (confirmed working)

### Comprehensive Optimization Pass
- **Zod validation** on all POST/PUT API routes (cases, materials, settings, material-usage) via `validateBody()` helper
- **N+1 queries** fixed: audit logs fetched in parallel via `Promise.all` in case/material detail endpoints
- **Pagination** added to cases and materials list APIs (`page`/`pageSize`/`total`)
- **Material usage race condition** fixed: wrapped in `prisma.$transaction`
- **31 silent catch blocks** now log errors via `console.error(e)`
- **Stock-take import** made transactional: pre-validates all rows, then `$transaction` for atomic updates
- **SWR caching** installed: materials list uses `useSWR` with auto-dedup, popovers use SWR to prevent N+1 hover fetches
- **Material ID generation** moved from client to server-side (`lib/material-id.ts`) — no blocking client API call
- **watch() optimization**: replaced full `watch()` with individual field watchers in material-form
- **swapOrder** parallelized: `Promise.all` instead of sequential PUTs
- **image-upload** uses Next.js `<Image>` instead of plain `<img>`
- **Dead code** removed: `generateCaseNumber` (unused, used Math.random)
- **Error boundary** added: `app/error.tsx` global error handler
- **`cn` utility** imported in dashboard (was missing)

### Shared Code Extraction
- Created `lib/use-field-editor.ts`: `useUndoHistory` hook + `swapSortOrders`/`deactivateSetting`/`createSetting`/`fetchSettings` helpers
- Created `lib/api-utils.ts`: `validateBody()` Zod validation wrapper
- Created `lib/swr-config.ts`: `useAPI` typed SWR wrapper + `apiUrl` helper
- Created `lib/material-id.ts`: server-side material ID auto-generation

### Materials Page UI Overhaul
- 7 stat cards: Total, In Stock, Opened, Low Stock, Expired, Expiring Soon, Total Remain
- Stock level progress bars (green/amber/red) with remain count
- Material ID displayed under material name
- Status icons per row (check/warning/package/trash)
- Category tabs show item counts
- Expiry dates color-coded (red=expired, amber=soon, gray=normal)
- Brand/Type combined into single column

### Reports System Rewrite
- 9 report types (added: Stock Levels, Expiry & Disposal, Monthly Summary, Audit Trail)
- Live preview table with search, pagination, column sorting
- Column picker (select which columns to export)
- Save/load filter presets (localStorage)
- Print-friendly view
- XLSX export with bold headers, auto-width, cell formatting
- `format=json` for preview, `format=xlsx` for download

### Deployment — Portable Standalone Package
- `output: "standalone"` in next.config.ts
- `package.bat`: one-click build → portable ZIP with bundled Node.js
- `start.bat`: auto-install Node.js (winget/brew/apt) if missing
- `deploy-package/start.bat`: runs with bundled portable Node.js — no installation needed
- CORS middleware (`src/middleware.ts`) for intranet apply form cross-origin POST
- GitHub Release v1.0.0 with pre-built ZIP (62MB)
- Architecture: ZIP runs on one internal computer; apply form on qeh.home POSTs to it

### Bug Fixes
- Fixed `<button>` inside `<button>` hydration error (PopoverTrigger already renders button)
- Fixed `ZodError.errors` → `ZodError.issues` for Zod v4 API
- Fixed `PieChart` import conflict between lucide-react and recharts
- Fixed `caseByUseType` → `caseBycategory` data mapping
- Prisma 7 seed config: created `prisma.config.ts`

## 2026-06-15

### Material Form — Bug Fixes & Data Cleanup
- Fixed removeField not persisting: switched to optimistic update (UI first, then API)
- Root cause: old `material_form_field` type had 20+ active entries acting as fallback when `selectedCategory` is empty
- Nuclear cleanup: deleted ALL duplicate/inactive entries, re-seeded clean
  - FDM: 102 → 17, SLA: 114 → 20, Tank: 79 → 15, IPA: 87 → 13
- Removed `material_form_field` entirely — each category uses its own type
- Removed category filter from `apply()` — now same as case/apply logic
- Fixed PUT route: `0` no longer converted to `null` for numeric fields
- Fixed `batchNumber` unique constraint removed (multiple materials share batches)
- Fixed `materialId`, `status`, `productCode` fields being read-only
- Auto-ID generation moved to `onSubmit` (reliable) instead of `useEffect` (unreliable)

### Excel Column Alignment
- All 4 categories use only Weight / Used / Remain (3 QTY fields exact match)
- Labels: `purchaseDate` → "Order Date", `receivedDate` → "Arrival Date"
- `materialId` field: editable, auto-generates on save if blank
- Remain formula: `Weight − Used` auto-calculated
- FDM brands updated with `[CODE] Brand` format for Material ID extraction
- SLA Material Code VLOOKUP, Tank Product Code VLOOKUP

### Settings Page
- Reset to default now uses hardcoded registry defaults (not stale snapshots)
- Edit Layout entry no longer overwrites `defaultSettings`
- Removed `material_category` from sidebar (redundant)
- IPA was never locked — user confirmed it should be editable

### Material Form Edit Layout
- Inline field editing: type selector + label input always visible
- Unified edit controls across Case/Material/Apply forms

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
