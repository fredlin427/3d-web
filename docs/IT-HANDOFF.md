# QEH 3D Print Hub — IT Handoff Guide

## System Architecture

```
┌─ IT Server (qeh.home) ───┐          ┌─ Internal PC ─────────────┐
│                           │          │                           │
│  demo.html                │  POST →  │  Portable Server :8080    │
│  apply-standalone.html    │          │  SQLite (dev.db)          │
│  (static HTML only)       │          │                           │
│                           │          │  Windows: start.bat       │
│  ZERO dependencies        │          │  Linux: ./start.sh        │
└───────────────────────────┘          └───────────────────────────┘
```

## Deployment

### Option A — Windows Internal PC
1. Download: `qeh-3d-print-portable.zip` (74MB)
2. Extract to: `C:\QEH-3D-Print\`
3. Double-click: `start.bat`
4. Server runs on: `http://localhost:8080`
5. Auto-start: Add `start.bat` to Task Scheduler

### Option B — Linux Server
1. Download: `qeh-3d-print-linux.tar.gz` (116MB)
2. Extract: `tar -xzf qeh-3d-print-linux.tar.gz`
3. Run: `chmod +x start.sh && ./start.sh`
4. Server runs on: `http://localhost:8080`
5. Auto-start: Add to systemd

### Apply Form on Intranet
1. Copy `apply-standalone.html` to intranet web directory
2. Edit line 64: change API URL to server IP
3. No server-side dependencies needed

## Requirements
- **Zero installation**: Node.js is bundled inside both packages
- **No Python, no IIS, no Docker required**
- **Database**: SQLite (single file: `dev.db`)
- **Backup**: Copy `dev.db` to safe location (or use `backup.ps1`)

## Flexible Data Handling

### Dynamic Form Fields
- All form fields are stored in the `settings` database table
- Adding/removing fields: Settings page → toggle `isActive`
- Different form versions = different active field sets
- No code changes needed for field modifications

### Multi-Format Import
- The system handles column mapping from Excel imports
- `/api/cases/import` accepts XLSX files
- `/api/stock-take/import` accepts stock take spreadsheets
- Column names are auto-mapped (handles format variations)
- BOM characters and Excel serial dates are auto-corrected

### Case Number Format
- Format: `QEH3D-{FY}-{SEQ}` (e.g., QEH3D-2627-001)
- FY auto-calculated from application date (April = new FY)
- Sequential numbering per financial year

### Material ID Format
- FDM: `{BrandCode}-{MaterialType}-{Year}-{Seq}`
- SLA: `{MaterialCode}-{Year}-{Seq}` (27-code lookup table)
- Tank: `{ProductCode}-{Year}-{Seq}`
- IPA: auto-generated from name

## Key URLs
| Page | URL | Purpose |
|------|-----|---------|
| Dashboard | `/` | Overview & statistics |
| Cases | `/cases` | Case management |
| Materials | `/materials` | Inventory management |
| Chart Builder | `/chart-builder` | Custom analytics |
| Activity Log | `/activity-log` | Audit trail |
| Apply Form | `/apply` | Internal submission form |
| Standalone Apply | `/apply-standalone.html` | Intranet deployment |
| Reports | `/reports` | Export reports |
| Stock Take | `/stock-take` | Stock counting |
| Settings | `/settings` | Configure form fields |

## Backup & Recovery
- Daily scheduled backup: `backup.ps1` (Windows Task Scheduler, 18:00)
- Manual backup: Double-click `backup.ps1`
- Keeps last 30 backups in `backups/` folder
- Recovery: Copy backup `dev.db` to replace current `dev.db`

## Security Notes
- CORS: Enabled for intranet cross-origin requests
- Upload: Image validation via magic bytes
- Input: All API routes use Zod schema validation
- Audit: All operations logged to Activity Log
