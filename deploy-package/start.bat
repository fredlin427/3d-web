@echo off
chcp 65001 >nul
title QEH 3D Printing Office
cd /d "%~dp0"

echo ============================================
echo   QEH 3D Printing Office
echo   One-click Server
echo ============================================
echo.

:: Get LAN IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do set LAN_IP=%%a
set LAN_IP=%LAN_IP: =%

echo   Local:   http://localhost:3000
if not "%LAN_IP%"=="" echo   Network: http://%LAN_IP%:3000
echo.
echo   Press Ctrl+C to stop
echo ============================================

set PORT=3000
set HOSTNAME=0.0.0.0
"%~dp0node.exe" "%~dp0server.js"
