@echo off
chcp 65001 >/dev/null
title Building QEH Deploy Package...
cd /d "%~dp0"

echo ============================================
echo   QEH 3D Printing - Build Deploy Package
echo ============================================
echo.

:: Step 1: Build Next.js
echo [1/4] Building Next.js (standalone mode)...
call npx next build
if %errorlevel% neq 0 ( echo [ERROR] Build failed & pause & exit /b 1 )

:: Step 2: Prepare deploy folder
echo [2/4] Preparing deploy package...
rmdir /s /q deploy-package 2>/dev/null
mkdir deploy-package

xcopy /e /i /q ".next\standalone\*" "deploy-package\"
xcopy /e /i /q ".next\static" "deploy-package\.next\static"
xcopy /e /i /q ".next\server" "deploy-package\.next\server" 2>/dev/null
copy ".next\BUILD_ID" "deploy-package\.next\" >/dev/null
copy ".next\*.json" "deploy-package\.next\" >/dev/null 2>&1
if exist "public" xcopy /e /i /q "public" "deploy-package\public"

:: Copy Prisma client
xcopy /e /i /q "node_modules\@prisma" "deploy-package\node_modules\@prisma"

:: Create Prisma hash alias for Turbopack
for /f "delims=" %%h in ('dir /b /ad ".next\standalone\node_modules\@prisma\client-*" 2^>nul') do (
  if not exist "deploy-package\node_modules\@prisma\%%h" (
    xcopy /e /i /q "deploy-package\node_modules\@prisma\client" "deploy-package\node_modules\@prisma\%%h" >/dev/null
    echo   Alias: %%h
  )
)

:: Copy database
copy dev.db "deploy-package\" >/dev/null 2>&1
copy prisma.config.ts "deploy-package\" >/dev/null 2>&1

:: Create portable start.bat
(
echo @echo off
echo title QEH 3D Printing Office
echo cd /d "%%~dp0"
echo.
echo echo ============================================
echo echo   QEH 3D Printing Office - Portable Server
echo echo ============================================
echo echo.
echo for /f "tokens=2 delims=:" %%%%a in ^('ipconfig ^| findstr /c:"IPv4 Address"'^) do set LAN_IP=%%%%a
echo set LAN_IP=%%LAN_IP: =%%
echo set PORT=8080
echo set HOST=0.0.0.0
echo.
echo echo   Local:   http://localhost:8080
echo if not "%%LAN_IP%%"=="" echo   Network: http://%%LAN_IP%%:8080
echo echo.
echo echo   Press Ctrl+C to stop
echo echo ============================================
echo echo.
echo "%%~dp0node.exe" "%%~dp0server.js"
echo pause
) > "deploy-package\start.bat"
echo   Created start.bat

:: Step 3: Bundle Node.js portable
echo [3/4] Bundling Node.js...
if not exist "node-portable\node.exe" (
    echo   Downloading portable Node.js...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v24.16.0/node-v24.16.0-win-x64.zip' -OutFile 'node-tmp.zip'" 2>/dev/null
    if exist "node-tmp.zip" (
        powershell -Command "Expand-Archive -Path 'node-tmp.zip' -DestinationPath 'node-tmp' -Force" 2>/dev/null
        mkdir node-portable 2>/dev/null
        xcopy /e /i /q "node-tmp\node-v24.16.0-win-x64\*" "node-portable\" 2>/dev/null
        rmdir /s /q node-tmp 2>/dev/null
        del node-tmp.zip 2>/dev/null
    )
)
if exist "node-portable\node.exe" (
    copy "node-portable\node.exe" "deploy-package\" >/dev/null
    copy "node-portable\npm.cmd" "deploy-package\" >/dev/null 2>&1
    copy "node-portable\npm" "deploy-package\" >/dev/null 2>&1
    copy "node-portable\npx.cmd" "deploy-package\" >/dev/null 2>&1
    copy "node-portable\npx" "deploy-package\" >/dev/null 2>&1
    copy "node-portable\corepack.cmd" "deploy-package\" >/dev/null 2>&1
    copy "node-portable\corepack" "deploy-package\" >/dev/null 2>&1
) else (
    echo [WARN] Portable Node.js not found
)

:: Step 4: Create ZIP
echo [4/4] Creating ZIP...
powershell -Command "Compress-Archive -Path 'deploy-package\*' -DestinationPath 'qeh-3d-print-portable.zip' -Force"

echo.
echo ============================================
echo   DONE - qeh-3d-print-portable.zip
echo ============================================
pause
