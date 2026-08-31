@echo off
echo ========================================
echo   CarryFree - Full Stack App Starter
echo ========================================
echo.

echo [1/3] Starting Backend Server...
cd /d "%~dp0Backend"
start "CarryFree Backend" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Frontend Server...
cd /d "%~dp0Frontend"
start "CarryFree Frontend" cmd /k "npm run dev"

echo [3/3] Opening browser...
timeout /t 5 /nobreak >nul
start http://localhost:5173

echo.
echo ========================================
echo   Servers are starting...
echo   Backend: http://localhost:5000
echo   Frontend: http://localhost:5173
echo ========================================
echo.
echo Press any key to exit this window...
pause >nul
