@echo off
chcp 65001 >nul
title QEH 3D Printing Office

echo ============================================
echo   QEH 3D Printing Office - Startup
echo ============================================
echo.

:: Check Node.js — auto-install via winget if missing
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [INFO] Node.js not found. Attempting automatic install...
    echo.
    where winget >nul 2>&1
    if %errorlevel% equ 0 (
        echo   Installing Node.js LTS via winget...
        winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
        if %errorlevel% equ 0 (
            echo [OK] Node.js installed! Restarting script...
            :: Refresh PATH and restart this script
            set "PATH=%PATH%;%ProgramFiles%\nodejs;%AppData%\npm"
            start "" "%~f0" & exit
        )
    ) else (
        echo   winget not available. Trying Chocolatey...
        where choco >nul 2>&1
        if %errorlevel% equ 0 (
            choco install nodejs-lts -y
            if %errorlevel% equ 0 (
                echo [OK] Node.js installed! Restarting script...
                set "PATH=%PATH%;%ProgramFiles%\nodejs"
                start "" "%~f0" & exit
            )
        )
    )
    echo.
    echo [ERROR] Could not auto-install Node.js.
    echo   winget:  winget install -e --id OpenJS.NodeJS.LTS
    echo   manual:  https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set node_version=%%i
echo [OK] Node.js v%node_version%

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

:: Generate Prisma client + run migrations
echo.
echo [2/4] Setting up database...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [ERROR] Prisma generate failed
    pause
    exit /b 1
)

call npx prisma db push
if %errorlevel% neq 0 (
    echo [ERROR] Prisma db push failed
    pause
    exit /b 1
)

:: Seed database
echo.
echo [3/4] Seeding database...
call npx prisma db seed
if %errorlevel% neq 0 (
    echo [WARN] Seed may have partial failures, continuing...
)

:: Get LAN IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do set LAN_IP=%%a
set LAN_IP=%LAN_IP: =%

echo.
echo [4/4] Starting server...
echo.
echo ============================================
echo   SERVER READY
echo   Local:   http://localhost:3000
if not "%LAN_IP%"=="" echo   Network: http://%LAN_IP%:3000
echo ============================================
echo.
echo   Press Ctrl+C to stop the server
echo.

call npm run dev -- -H 0.0.0.0
pause
