@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js LTS, then run this file again.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing frontend and backend packages...
  call npm install
  if errorlevel 1 pause & exit /b 1
)
echo Building React frontend...
call npm run build
if errorlevel 1 pause & exit /b 1
start "EscapeForge Server" /D "%~dp0" cmd /k npm start
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:3001
endlocal
