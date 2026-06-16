@echo off
chcp 65001 >nul
title Building QEH Deploy Package...
cd /d "%~dp0"

echo ============================================
echo   QEH 3D Printing - Build Deploy Package
echo ============================================
echo.

:: Step 1: Build Next.js
echo [1/5] Building Next.js (standalone mode)...
call npx next build
if %errorlevel% neq 0 ( echo [ERROR] Build failed & pause & exit /b 1 )

:: Step 2: Reset DB and seed
echo [2/5] Setting up fresh database...
del dev.db dev.db-journal 2>nul
call npx prisma db push --accept-data-loss
call npx prisma db seed

:: Step 3: Prepare deploy folder
echo [3/5] Preparing deploy package...
rmdir /s /q deploy-package 2>nul
mkdir deploy-package

:: Copy standalone output
xcopy /e /i /q ".next\standalone\*" "deploy-package\"

:: Copy static assets (CSS, JS chunks)
xcopy /e /i /q ".next\static" "deploy-package\.next\static"

:: Copy Next.js manifests and server files
xcopy /e /i /q ".next\server" "deploy-package\.next\server" 2>nul
copy ".next\*.json" "deploy-package\.next\" >nul 2>&1

:: Copy public folder (uploaded images etc)
if exist "public" xcopy /e /i /q "public" "deploy-package\public"

:: Copy seeded database
copy dev.db "deploy-package\" >nul
copy dev.db-journal "deploy-package\" >nul 2>&1

:: Copy Prisma config for future use
xcopy /e /i /q "prisma" "deploy-package\prisma"
copy prisma.config.ts "deploy-package\" >nul 2>&1

:: Step 4: Download and bundle portable Node.js
echo [4/5] Bundling Node.js runtime...
if not exist "node-portable\node.exe" (
    echo   Downloading portable Node.js v24...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v24.16.0/node-v24.16.0-win-x64.zip' -OutFile 'node-tmp.zip'" 2>nul
    if exist "node-tmp.zip" (
        powershell -Command "Expand-Archive -Path 'node-tmp.zip' -DestinationPath 'node-tmp' -Force" 2>nul
        mkdir node-portable 2>nul
        xcopy /e /i /q "node-tmp\node-v24.16.0-win-x64\*" "node-portable\" 2>nul
        rmdir /s /q node-tmp 2>nul
        del node-tmp.zip 2>nul
    )
)

:: Copy Node.js portable to deploy package
if exist "node-portable\node.exe" (
    copy "node-portable\node.exe" "deploy-package\" >nul
    copy "node-portable\npm.cmd" "deploy-package\" >nul 2>&1
    copy "node-portable\npm" "deploy-package\" >nul 2>&1
    copy "node-portable\npx.cmd" "deploy-package\" >nul 2>&1
    copy "node-portable\npx" "deploy-package\" >nul 2>&1
    copy "node-portable\corepack.cmd" "deploy-package\" >nul 2>&1
    copy "node-portable\corepack" "deploy-package\" >nul 2>&1
    echo [OK] Node.js portable bundled
) else (
    echo [WARN] Portable Node.js not found - deploy package will need system Node.js
)

:: Step 5: Create ZIP
echo [5/5] Creating ZIP...
powershell -Command "Compress-Archive -Path 'deploy-package\*' -DestinationPath 'qeh-3d-print-portable.zip' -Force"

echo.
echo ============================================
echo   DONE!
echo.
echo   qeh-3d-print-portable.zip  (ready to share)
echo   deploy-package\            (folder, ready to run)
echo.
echo   To run: extract ZIP, double-click start.bat
echo ============================================
pause
