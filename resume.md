# QEH 3D Printing Office Manager

Internal web application for managing 3D printing office daily records, case progress, material stock, material usage, and statistics.

## Stack
- **Next.js 16.2** (App Router) + TypeScript
- **Tailwind CSS v4** + shadcn/ui (base-ui)
- **SQLite** + Prisma 7
- **Recharts** for dashboard charts
- **react-hook-form** + zod for form validation
- **Sonner** for toast notifications
- **CSV import/export** via papaparse

## Features
### Dashboard
- 7 statistic cards (total cases, monthly cases, in progress, completed, low stock, expiring, opened)
- 5 chart types: bar chart, pie chart, line chart
- Filters: date range, department, use type, status
- CSV export

### Case Management
- Full CRUD with search, filters, pagination
- Auto-generated case numbers (3DP-YYYY-NNNN)
- 8 default progress steps created automatically per case
- Progress timeline with status tracking (Not started / In progress / Completed / Skipped)
- Material usage tracking linked to cases and stock
- Audit log for all actions
- Case duplication

### Material Stock Management
- Full CRUD with search, filters, pagination
- Stock alerts: low stock, expiring soon, expired
- Stock transaction history (Usage, Refill, Adjustment, Disposal, Stock take)
- Usage history with case linking

### Stock Take
- Export stock list as CSV
- Import counted quantities via CSV with validation
- Automatic stock transaction creation for adjustments

### Reports
- 5 report types: Cases, Material Usage, Stock Transactions, Department Statistics, Use Type Statistics
- Filterable by date range, department, use type, material category, status
- CSV export

### Settings
- Master data management for 7 types: Departments, Use Types, Priorities, Case Statuses, Material Categories, Material Units, Default Progress Steps
- Full CRUD with reorder and activate/deactivate

## Database Schema
6 tables: `cases`, `case_progress_steps`, `materials`, `case_material_usage`, `stock_transactions`, `settings`, `audit_logs`

## Seed Data
- 12 cases across 7 departments (3 completed, 5 in progress, 2 draft, 1 on hold, 1 cancelled)
- 20 materials across 4 categories (FDM Filaments, SLA Resins, Resin Tanks, IPA)
- 14 material usage records with stock transactions
- Complete master data and progress step settings

## Getting Started
```bash
npm install
npx prisma generate
npx prisma migrate dev
npx tsx prisma/seed.ts
npm run dev
```

Then open `http://localhost:3000`.

For internal network access:
```bash
npx next dev -H 0.0.0.0 -p 3000
```

## Privacy
No real patient identifiers are stored. Cases use anonymized case numbers only. Designed for internal staff use.

---

Built for QEH 3D Printing Office — Internal Use Only
