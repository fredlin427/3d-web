@echo off
title QEH 3D Printing Office

echo ============================================
echo   QEH 3D Printing Office - Startup
echo ============================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found.
    echo Please install Node.js: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [OK] Node.js %NODE_VER%

:: Install dependencies if needed
if not exist "node_modules\" (
    echo.
    echo [1/3] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed
        pause
        exit /b 1
    )
) else (
    echo [OK] node_modules exists
)

:: Setup database
echo.
echo [2/3] Setting up database...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [ERROR] Prisma generate failed
    pause
    exit /b 1
)

call npx prisma db push --accept-data-loss
if %errorlevel% neq 0 (
    echo [ERROR] Prisma db push failed
    pause
    exit /b 1
)

call npx prisma db seed
if %errorlevel% neq 0 (
    echo [WARN] Seed may have partial failures, continuing...
)

:: Start server
echo.
echo [3/3] Starting server...
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do set LAN_IP=%%a
set LAN_IP=%LAN_IP: =%

echo ============================================
echo   SERVER READY
echo   Local:   http://localhost:3000
if not "%LAN_IP%"=="" echo   Network: http://%LAN_IP%:3000
echo ============================================
echo.
echo   Press Ctrl+C to stop
echo.

call npm run dev -- -H 0.0.0.0
pause
