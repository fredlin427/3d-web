# Resume — QEH 3D Printing Office

## Where We Left Off (2026-06-16 EOD)

### Current State
- Full Next.js 16.2 app with TypeScript, Prisma 7 + SQLite, Tailwind CSS
- Running on `https://github.com/fredlin427/3d-web`
- GitHub Release v1.0.0 with portable ZIP (62MB) for hospital deployment

### Key Features Implemented
- **Dashboard**: Stat cards, 4 charts, Meeting View (3 chart types: Sunburst/Grouped Bars/Table)
- **Case Management**: CRUD, progress tracking, material usage, audit logs
- **Material Stock**: 4 categories (FDM/SLA/Tank/IPA), auto-ID, Excel-aligned fields
- **Stock Take**: Export/Import XLSX with checker/verifier signatures
- **Reports**: 9 types with live preview, column picker, saved filters, print
- **Settings**: Accordion layout, per-category field configuration
- **Edit Layout**: Inline field editing with undo/redo
- **Apply Form**: Public /apply with Edit Layout in /apply-manage
- **Multiselect fields**: Model Type, Required Service

### Deployment Architecture
- **Portable ZIP**: Bundled Node.js + pre-built server + pre-seeded DB
- **Intranet**: Apply form on qeh.home, backend on internal computer
- **Startup**: start.bat one-click (auto-installs Node.js if missing)

### Next Steps
- June 22 meeting presentation
- Test on hospital computer with portable package
- Verify apply form integration with intranet
