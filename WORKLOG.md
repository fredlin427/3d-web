# QEH 3D Printing Office — Work Log

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
