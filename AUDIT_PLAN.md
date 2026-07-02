# QEH 3D Print Hub — Comprehensive Audit & Cleanup Plan

## P0 — Critical (Bug Fixes)

### 1. API Response Handling (widespread)
Many places call `fetch()` then `toast.success("Done")` without checking `res.ok` or `json.success`. Users see success messages even when the API failed.
- **Files**: materials/page.tsx:137, apply-manage/page.tsx:72,84,98, form-field-editor.tsx:54, stock-take/page.tsx:36,74, page.tsx:188
- **Fix**: Check response status before showing success. Add `console.error` to all bare `.catch()`

### 2. Silent Error Swallowing
Multiple files use `.catch(() => {})` — empty catch blocks that hide errors from users and developers.
- **Files**: case-form.tsx:114,133,149, material-form.tsx:137,156,172, apply-manage/page.tsx:115,133,362, apply/page.tsx:105,127
- **Fix**: Add `console.error(e)` + `toast.error("Failed to load")` to all empty catch blocks

### 3. State Update on Unmounted Components
7 files fetch data in useEffect without AbortController or cleanup, risking memory leaks.
- **Files**: materials/page.tsx, cases/page.tsx, page.tsx, apply/page.tsx, reports/page.tsx, apply-manage/page.tsx
- **Fix**: Add AbortController or `cancelled` flag pattern

---

## P1 — High (Dead Code & Dependencies)

### 4. Delete Dead Files
| File | Reason |
|------|--------|
| `src/lib/use-field-editor.ts` | Never imported — ~200 lines |
| `src/types/index.ts` | Never imported — ~50 lines |
| `src/components/charts/chart-legend.tsx` | Never imported (inline in chart-builder) — ~20 lines |
| `src/components/ui/dialog.tsx` | Entire component never used (project uses ConfirmDialog) |

### 5. Remove Unused npm Packages
| Package | Reason |
|---------|--------|
| `papaparse` | Never imported — uses xlsx instead |
| `html-to-image` | Never imported — uses html2canvas instead |

### 6. Remove Unused Imports
- `PieChart, Pie, Cell, LabelList` from recharts in `page.tsx` (delegated to DonutChart)
- `Filter` from lucide-react in `activity-log/page.tsx`
- `EyeOff` from lucide-react in `reports/page.tsx`

---

## P2 — Medium (Feature Gaps & UX)

### 7. Cases Page Missing Features
- **No Export button** — Materials and Stock Take have one
- **No "New" button with `bg-primary`** — currently uses `bg-teal-600` (inconsistent)
- Add cases export XLSX button

### 8. Apply Form Validation
- Only 2 of ~30 fields validated
- No inline error states (toast only)
- No required field indicators (asterisks)
- Fix: Add proper validation to all required fields

### 9. Materials Page Error State
- SWR `error` returned but never rendered in UI
- On API failure, shows "No material records" instead of error message
- Fix: Check `error` from SWR and show error state

### 10. Accessibility (aria-labels)
- 15+ icon-only buttons missing `aria-label` across DataTable, sidebar, search, dropdowns
- Fix: Add `aria-label` to all icon-only interactive elements

### 11. Stat Card Color Consistency
- Dashboard, Cases, Materials use different hardcoded hex colors for same concepts
- Fix: Define shared stat card color config

---

## P3 — Low (Polish)

### 12. Loading States
- Activity Log uses non-standard pulse animation instead of `LoadingState`
- Chart Builder uses inline `Loader2` instead of `LoadingState`
- Apply Manage has no initial loading state

### 13. Index Keys in Lists
- 5+ places use array index as React `key` on mutable lists
- Fix: Use unique stable keys (e.g., `f.field + f.value`)

### 14. Duplicate Code Consolidation
- ~600 lines of triplicated field-editing logic across case-form, material-form, apply-manage
- `shadeColor()` duplicated in donut-chart.tsx and chart-config.ts

### 15. Stock Take Page Missing
- No stat cards, no filter bar, no bulk actions, no error/empty distinction

---

## Summary

| Priority | Count | Items |
|----------|-------|-------|
| P0 (Critical) | 3 | API response checks, silent errors, unmounted state |
| P1 (High) | 3 | Dead files, unused packages, unused imports |
| P2 (Medium) | 5 | Cases export, apply validation, materials error, aria-labels, colors |
| P3 (Low) | 4 | Loading, keys, duplicates, stock-take |
| **Total** | **15** | |
