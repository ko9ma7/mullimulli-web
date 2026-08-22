@echo off
setlocal
cd /d "%~dp0"
title Mullimulli v4.4 Online DB Repair
chcp 65001 >nul
cls
echo ============================================================
echo  Mullimulli v4.4 - Online account / D1 repair
echo  Existing users, friends and messages will NOT be deleted.
echo ============================================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is required.
  pause
  exit /b 1
)
where npx >nul 2>nul
if errorlevel 1 (
  echo ERROR: npx is required.
  pause
  exit /b 1
)
node "%~dp0scripts\repair-online.mjs"
set ERR=%ERRORLEVEL%
echo.
if not "%ERR%"=="0" (
  echo Repair failed. Copy or screenshot the error above.
  pause
  exit /b %ERR%
)
echo Repair completed successfully.
pause
exit /b 0
