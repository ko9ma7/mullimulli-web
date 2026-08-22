@echo off
setlocal
cd /d "%~dp0"
title Mullimulli GitHub Pages Repair v4.2
chcp 65001 >nul
cls
echo ============================================================
echo  Mullimulli GitHub Pages Repair v4.2
echo  Cloudflare/D1 is NOT changed by this repair.
echo ============================================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Run SETUP_ONLINE.cmd once or install Node.js LTS.
  pause
  exit /b 1
)
where gh >nul 2>nul
if errorlevel 1 (
  echo GitHub CLI is required. Run SETUP_ONLINE.cmd once or install GitHub CLI.
  pause
  exit /b 1
)
node "%~dp0scripts\publish-pages.mjs"
set ERR=%ERRORLEVEL%
echo.
if not "%ERR%"=="0" (
  echo Repair stopped with an error. The real error is shown above.
) else (
  echo GitHub Pages update verified successfully.
)
pause
exit /b %ERR%
