# QEH 3D Printing Office Manager

Internal web application for QEH 3D Printing Office to manage daily records, case progress, material stock, material usage, and statistics. Matches existing QEH paper forms and Excel templates.

## Stack
- **Next.js 16.2** (App Router) + TypeScript + Turbopack
- **Tailwind CSS v4** + shadcn/ui (base-ui)
- **SQLite** + Prisma 7 with driver adapter
- **Recharts 3** for dashboard charts
- **XLSX** for Excel export/import
- **react-hook-form** + zod for form validation
- **Sonner** for toast notifications

## Recent Changes (2026-06-12)

### Apply Form V5 — Complete Rewrite
- `/apply` rebuilt to match QEH 3D Printing Application Form V5 DOCX exactly
- Part I: Applicant info, Purpose checkboxes (Clinical Use / Rehabilitation / Training-Education), Service & Printing Requirements (Segmentation, Device Design, Printing Service, Others), Material (Rigid/Soft), Colour, Sterilization, Copyright risk, Signature
- Reprint question for Training/Education with funding source
- "First print free" remark
- `/api/apply` updated with 11 new Case fields: telephone, email, signature, signatureDate, modelMaterial, colourRequirement, copyrightRisk, copyrightDetails, isReprint, fundingSource
- `/apply-manage` refactored as full form editor with inline label/type editing + purpose checkbox management

### Material Management — Excel Alignment
- All 4 categories (FDM, SLA, Tank, IPA) field lists aligned to Stock Taking Excel columns EXACTLY
- FDM: Weight(g), Used(g), Remain(g) — no openedQuantity/unit
- SLA: +productCode (Material Code), Volume(mL), Used(mL), Remain(mL)
- Tank: Product Code VLOOKUP from Code List
- IPA: +unit (Volume/Bottle L), QTY/Bottle, no status
- New `materialId` field (separate from productCode):
  - FDM: auto-generated `{BrandCode}-{MaterialType}-{Year}-{Seq}` (e.g., UM-PLA-2024-001)
  - SLA: auto-generated `{MaterialCode}-{Version}-{Year}-{Seq}` (e.g., CL-V4-2021-001)
  - API `/api/materials/next-material-id` for auto-sequence
- SLA Material Code VLOOKUP from Product Name (27 codes from Excel Code List)
- Tank Product Code VLOOKUP (5 tank codes)
- Remain (currentQuantity) auto-calculated: Weight - Used - Opened - Expired
- Status auto-calculated per category:
  - SLA: Excel formula (Batch check → Expired/Trial Only → Disposed/Opened/N/A/New)
  - FDM/Tank: Disposal → Disposed, Open → Opened, else → New
  - IPA: no auto-status
- All code tables updated: FDM material types (14), SLA products (28), SLA printers (2), Tank products (5)
- API PUT preserves non-rendered fields (category-specific field lists don't lose data)

### Edit Layout — Inline Field Editing
- All 3 forms (Case, Material, Apply) have unified Edit Layout:
  - Type selector (text/combobox/checkbox/date/number/textarea) — always visible
  - Label input — always editable
  - Key replacement via dropdown
  - Reorder ↑↓, Remove 🗑, Add field
  - Undo/Redo/Reset to default
- Seed ID fix: after initial seed, refresh from server to get real IDs
- Deduplication in field list building (prevents React duplicate key warnings)

## Database
7 models: `Case`, `CaseProgressStep`, `Material`, `CaseMaterialUsage`, `StockTransaction`, `AuditLog`, `Setting`

Case model: 40+ fields including V5 form fields (telephone, email, signature, signatureDate, modelMaterial, colourRequirement, copyrightRisk, copyrightDetails, isReprint, fundingSource)

Material model: 26+ fields including `materialId` (auto-generated), `productCode` (SLA/Tank code), category-specific columns

## Routes
| Route | Description |
|-------|------------|
| `/` | Dashboard |
| `/cases` | Case list |
| `/cases/new` | New case form |
| `/cases/[id]` | Case detail → edit |
| `/materials` | Material list |
| `/materials/new` | New material (category picker) |
| `/materials/[id]` | Material detail → edit |
| `/settings` | Settings / master data |
| `/apply` | Public application form (V5) |
| `/apply-manage` | Apply form editor |
| `/reports` | Reports & exports |
| `/stock-take` | Stock take |
| `/api/materials/next-material-id` | Auto-sequence Material ID |

## Getting Started
```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Then open `http://localhost:3000`.

## Privacy
No real patient identifiers. Cases use anonymized case numbers. Internal staff use only.

---
Built for QEH 3D Printing Office — Internal Use Only
