# QEH 3D Print Hub — Production Readiness Audit Plan

## Overview
Comprehensive audit covering bugs, security, performance, and cleanup.
Goal: production-ready, safe to deploy for daily use.

---

## 🔴 P0 — Critical (Must Fix Before Production)

### 1. Data Loss: start.bat runs seed on every boot
- **Root cause:** Old `start.bat` line 44: `prisma db push --accept-data-loss` + line 51: `prisma db seed` (seed deletes all data via deleteMany)
- **Fix:** ✅ Already fixed — now backs up before DB ops, uses safe `db push`, only seeds empty DB
- **Files:** `start.bat`

### 2. Apply form has zero input validation
- **File:** `src/app/api/apply/route.ts:8`
- **Issue:** `const body = await request.json()` with no Zod schema. Any field can be injected.
- **Fix:** Add `validateBody(request, applyFormSchema)` or reuse `caseFormSchema`

### 3. File upload missing content validation
- **File:** `src/app/api/upload/route.ts:12-26`
- **Issue:** Only checks MIME type (spoofable). No magic byte check, no filename sanitization.
- **Fix:** Check file magic bytes, sanitize filename (remove path traversal chars)

### 4. No database indexes on FK columns
- **File:** `prisma/schema.prisma`
- **Missing indexes:**
  - `CaseProgressStep.caseId`
  - `CaseMaterialUsage.caseId`, `CaseMaterialUsage.materialId`
  - `StockTransaction.materialId`, `StockTransaction.relatedCaseId`
  - `AuditLog.entityId`, `AuditLog.entityType`, `AuditLog.createdAt`
- **Fix:** Add `@@index` declarations to all FK columns that appear in WHERE clauses

### 5. Cases list fetches ALL records by default
- **File:** `src/app/api/cases/route.ts:18` — `pageSize=0` returns everything
- **File:** `src/app/cases/page.tsx:71` — no pageSize in request
- **Fix:** Default pageSize to 50, fix client to send pageSize

---

## 🟠 P1 — High Priority

### 6. Dashboard N+1: fetches all material usage records
- **File:** `src/app/api/dashboard/route.ts:145-163`
- **Issue:** `findMany` on all CaseMaterialUsage to compute category aggregation. Use `groupBy` instead.

### 7. Chart data unbounded queries
- **File:** `src/app/api/chart-data/route.ts:175,203`
- **Issue:** `take: 5000` — no limit on stacked queries. Already fixed with groupTop/childTop.

### 8. Cases endpoint fetches progressSteps then discards them
- **File:** `src/app/api/cases/route.ts:41-58`
- **Issue:** Includes progressSteps to compute progressStats, then strips them. Wasted I/O.
- **Fix:** Compute progress stats in the query or use raw SQL count.

### 9. Settings duplicate entries possible
- **File:** `prisma/schema.prisma` (Setting model)
- **Issue:** No unique constraint on `(type, value)`. Can create duplicate settings.
- **Fix:** Add `@@unique([type, value])`

### 10. BatchNumber not indexed, used in lookups
- **File:** `prisma/schema.prisma:89`, `src/app/api/stock-take/import/route.ts:75`
- **Fix:** Add `@@index([batchNumber])` on Material model

---

## 🟡 P2 — Medium Priority (Bugs & Improvements)

### 11. Broken Tailwind class (sort icon invisible)
- **File:** `src/components/reports/preview-table.tsx:121`
- **Issue:** `group-hover:opacity-100` used without parent `group` class. Sort arrow permanently invisible.
- **Fix:** Add `group` class to parent `<th>`

### 12. useEffect stale dependencies
- **File:** `src/components/materials/material-form.tsx:220` — `allSettings` used but not in deps
- **File:** `src/app/reports/page.tsx:156` — `fetchReport` not in deps

### 13. DOM queries instead of React refs
- **File:** `src/app/apply-manage/page.tsx:412` — `document.getElementById`
- **File:** `src/components/settings/master-data-table.tsx:37` — `document.querySelector`
- **Fix:** Use `useRef` instead

### 14. Missing aria-labels on icon-only buttons
- **Files:** Sidebar collapse, pagination buttons, table action menus
- **Fix:** Add `aria-label` to all icon-only buttons

### 15. Duplicate chart color definitions
- **File:** `src/app/page.tsx:21` (CHART_COLORS) duplicates `src/lib/chart-colors.ts`
- **File:** `src/app/chart-builder/page.tsx:26-51` — inline palettes
- **Fix:** Consolidate into `src/lib/chart-colors.ts`

### 16. Large inline IIFEs causing re-renders
- **Files:** `page.tsx:287`, `cases/page.tsx:290`, `materials/page.tsx:263`
- **Issue:** 50-115 line IIFEs inside JSX re-evaluate on every render
- **Fix:** Extract into named components

---

## 🔵 P3 — Low Priority (Polish)

### 17. Activity Log: add entityType/action filters for all operations
- Status: ✅ Already comprehensive — Settings, Upload, Import, Apply all covered

### 18. Loading states missing
- **Issue:** No `loading.tsx` files for route segments
- **Fix:** Add `loading.tsx` to major route groups

### 19. Unused files / dead code
- **File:** `src/components/charts/progress-stepper.tsx` — created but replaced by inline progress bar
- Scan for: unused imports, unused components, dead code paths

### 20. CORS wildcard `*` in middleware
- **File:** `src/middleware.ts:8`
- **Note:** Intentional for intranet use (apply form from qeh.home POSTs to internal PC)
- **Recommendation:** Restrict to known intranet origins if possible

### 21. Hardcoded database path
- **File:** `src/lib/prisma.ts:10` — `url: "file:./dev.db"` hardcoded
- **Fix:** Use `process.env.DATABASE_URL` with fallback

### 22. `as any` type casts in chart-data route
- **File:** `src/app/api/chart-data/route.ts` (multiple lines)
- **Fix:** Use proper Prisma types instead of `as any`

---

## 📊 Summary

| Priority | Count | Items |
|----------|-------|-------|
| P0 Critical | 5 | Validation, indexes, pagination, upload security |
| P1 High | 5 | Performance queries, constraints, indexes |
| P2 Medium | 6 | UI bugs, React patterns, accessibility |
| P3 Low | 5 | Polish, types, dead code |

---

*Last updated: 2026-06-26. Plan subject to updates from ongoing audits.*
