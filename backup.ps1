# QEH 3D Print Hub — Database Backup Script
# Usage: powershell -File backup.ps1

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DB = Join-Path $ProjectDir "dev.db"
$BackupDir = Join-Path $ProjectDir "backups"

if (-not (Test-Path $DB)) {
    Write-Host "[ERROR] dev.db not found at $DB"
    exit 1
}

if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir | Out-Null }

$TS = Get-Date -Format "yyyy-MM-dd_HHmm"
$BackupFile = Join-Path $BackupDir "dev_$TS.db"

Copy-Item $DB $BackupFile -Force
Write-Host "[OK] Backed up to $BackupFile"

# Keep only last 30 backups
$Backups = Get-ChildItem $BackupDir -Filter "dev_*.db" | Sort-Object LastWriteTime -Descending
if ($Backups.Count -gt 30) {
    $Backups[30..($Backups.Count-1)] | ForEach-Object {
        Remove-Item $_.FullName -Force
        Write-Host "[CLEAN] Removed old: $($_.Name)"
    }
}

Write-Host "[DONE] Total backups: $((Get-ChildItem $BackupDir -Filter 'dev_*.db').Count)"
