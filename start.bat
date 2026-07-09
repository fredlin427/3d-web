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
    echo [1/4] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed
        pause
        exit /b 1
    )
) else (
    echo [OK] node_modules exists
)

:: Backup database if it exists (safety net)
echo.
echo [2/4] Database setup...
if exist "dev.db" (
    echo [OK] Existing database found - backing up...
    if not exist "backups\" mkdir backups
    for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HHmm'"') do set "TS=%%i"
    copy /y "dev.db" "backups\dev_auto_%TS%.db" >nul
    if %errorlevel% equ 0 (
        echo [OK] Auto-backup saved: backups\dev_auto_%TS%.db
    ) else (
        echo [WARN] Backup failed, continuing anyway...
    )
) else (
    echo [INFO] No database found, will create fresh.
)

:: Generate Prisma client
call npx prisma generate
if %errorlevel% neq 0 (
    echo [ERROR] Prisma generate failed
    pause
    exit /b 1
)

:: Sync schema (safe: only adds missing tables/columns, never deletes data)
call npx prisma db push
if %errorlevel% neq 0 (
    echo [ERROR] Prisma db push failed
    pause
    exit /b 1
)

:: Seed only if database is completely empty (first-time setup)
echo.
echo [3/4] Checking database...
node --import tsx --no-warnings -e "const{PrismaClient}=require('./src/generated/prisma/client');const{PrismaSqlite}=require('prisma-adapter-sqlite');const p=new PrismaClient({adapter:new PrismaSqlite({url:'file:./dev.db'})});(async()=>{const c=await p.case.count();if(c===0){console.log('EMPTY');process.exit(10)}else{console.log('Has '+c+' cases - skipping seed');process.exit(0)}})();" >nul 2>&1
if %errorlevel% equ 10 (
    echo [INFO] Empty database detected - running initial seed...
    call npx prisma db seed
    if %errorlevel% neq 0 (
        echo [WARN] Seed may have partial failures, continuing...
    ) else (
        echo [OK] Initial seed complete
    )
) else (
    echo [OK] Database has data - seed skipped
)

:: Start server
echo.
echo [4/4] Starting server...
echo.

for /f "tokens=*" %%h in ('hostname') do set PC_HOST=%%h
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do set LAN_IP=%%a
set LAN_IP=%LAN_IP: =%

echo ============================================
echo   QEH 3D Print Server Ready
echo.
echo   Hostname: http://%PC_HOST%:8080
echo   Local:    http://localhost:8080
if not "%LAN_IP%"=="" echo   IP:       http://%LAN_IP%:8080
echo ============================================
echo.
echo   Press Ctrl+C to stop
echo.

call npm run dev -- -H 0.0.0.0
pause
