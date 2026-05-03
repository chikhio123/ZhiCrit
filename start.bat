@echo off
cd /d "%~dp0"

echo.
echo   论衡 Launcher
echo   ------------------------------

:: Kill any process on port 5173
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173.*LISTENING" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Check node_modules
if not exist "node_modules" (
    echo.
    echo   [!] Installing dependencies...
    set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
    call npm install
)

echo.
echo   [*] Starting, window will open shortly...
echo   ------------------------------
echo.

set VITE_PORT=5173
call npm run dev

echo.
echo   论衡 closed
