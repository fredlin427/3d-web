@echo off
REM QEH 3D Print Hub — Database Backup Script
REM Usage: backup.bat   (creates timestamped backup of dev.db, keeps last 30)

setlocal enabledelayedexpansion

set "PROJECT_DIR=%~dp0"
set "DB_FILE=%PROJECT_DIR%dev.db"
set "BACKUP_DIR=%PROJECT_DIR%backups"

if not exist "%DB_FILE%" (
    echo [ERROR] dev.db not found at %DB_FILE%
    exit /b 1
)

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Timestamp via PowerShell (wmic removed in Win11)
for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HHmm'"') do set "TS=%%I"

set "BACKUP_FILE=%BACKUP_DIR%dev_%TS%.db"

copy /y "%DB_FILE%" "%BACKUP_FILE%" >nul

if %ERRORLEVEL% equ 0 (
    echo [OK] Backed up to %BACKUP_FILE%
) else (
    echo [ERROR] Backup failed
    exit /b 1
)

REM Keep only last 30 backups
for /f "skip=30 delims=" %%F in ('dir /b /o-d "%BACKUP_DIR%\dev_*.db" 2^>nul') do (
    del "%BACKUP_DIR%\%%F" >nul 2>&1
    echo [CLEAN] Removed old: %%F
)

echo [DONE] Total backups:
dir /b "%BACKUP_DIR%\dev_*.db" 2>nul | find /c /v ""
