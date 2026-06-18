# QEH 3D Print — Session Log

## 2026-06-18 — Bug Fixes (1 commit: 47463c2)

### Field Reorder Fix
- **Bug:** moveField swapped with invisible (inactive) items, reorder arrows appeared broken
- **Fix:** Filter to only isActive items when finding adjacent swap target
- **File:** src/components/materials/material-form.tsx

### Edit Page Dynamic Defaults
- **Bug:** Edit page hardcoded field list — new fields (volume, custom) showed blank values
- **Fix:** Dynamically spread ALL fields from API response instead of picking specific keys
- **File:** src/app/materials/[id]/edit/page.tsx

### Chart Legend Height
- **Bug:** Container height 550/700px clipped grouped legend with many sub-items
- **Fix:** Increased to 620/750px
- **File:** src/app/chart-builder/page.tsx

### Detail Page Sync
- **Bug:** Material/Case detail pages didn't re-fetch when Settings form fields changed
- **Fix:** form-fields-changed event system
  - Dispatch from MasterDataTable (toggle/delete) and material-form (edit layout)
  - Listen in MaterialDetailFields / CaseDetailFields to re-fetch
- **Files:** src/components/settings/master-data-table.tsx, src/components/cases/case-detail-fields.tsx, src/components/materials/material-detail-fields.tsx

---

## 2026-06-17 — Chart & UI Overhaul (36 commits, v1.2.0)
See GitHub releases for details.
