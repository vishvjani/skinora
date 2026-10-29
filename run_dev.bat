@echo off
title NEXAURA - Cross-Device Dev Server
chcp 65001 >nul
cls

echo ========================================================
echo        NEXAURA - AI E-COMMERCE PLATFORM LAUNCHER        
echo ========================================================
echo.

:: Detect local IPv4 address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address" /c:"IP Address"') do (
    set IP=%%a
    goto :found_ip
)

:found_ip
set IP=%IP: =%
if "%IP%"=="" set IP=localhost

echo [*] Local Machine IPv4 Address : %IP%
echo [*] Starting FastAPI Backend on 0.0.0.0:8000...
echo [*] Starting Vite React Frontend on 0.0.0.0:3000...
echo.
echo --------------------------------------------------------
echo  ACCESS URLS:
echo   Local PC Browser : http://localhost:3000
echo   Same Wi-Fi Phone : http://%IP%:3000
echo   Backend Swagger  : http://localhost:8000/docs
echo   Admin Portal     : http://localhost:3000/admin (admin / admin123)
echo --------------------------------------------------------
echo.

:: Start Backend in separate window
start "NEXAURA Backend (FastAPI)" cmd /k "cd /d %~dp0nexaura\backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: Start Frontend in separate window
start "NEXAURA Frontend (Vite React)" cmd /k "cd /d %~dp0nexaura\frontend && npm run dev"

echo Both services launched in separate windows!
echo Keep those windows open while testing.
echo Press any key to exit this launcher window...
pause >nul
