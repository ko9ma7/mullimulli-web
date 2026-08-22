@echo off
setlocal
cd /d "%~dp0"
title Mullimulli v4.4 Cloudflare Password Fix
chcp 65001 >nul
cls
echo ============================================================
echo  Mullimulli v4.4 - Cloudflare signup/login repair
echo  Fix: PBKDF2 210000 ^> 100000 (workerd-compatible)
echo  Existing D1 data is preserved.
echo ============================================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is required.
  pause
  exit /b 1
)
echo [1/2] Repairing Cloudflare D1 and deploying Worker v4.4...
node "%~dp0scripts\repair-online.mjs"
set RERR=%ERRORLEVEL%
if not "%RERR%"=="0" (
  echo.
  echo Online server repair failed. Screenshot the full error above.
  pause
  exit /b %RERR%
)
echo.
echo [2/2] Publishing GitHub Pages v4.4...
node "%~dp0scripts\publish-pages.mjs"
set PERR=%ERRORLEVEL%
if not "%PERR%"=="0" (
  echo.
  echo GitHub Pages publish failed. Screenshot the full error above.
  pause
  exit /b %PERR%
)
echo.
echo ============================================================
echo  SUCCESS - Mullimulli v4.4 repaired and deployed.
echo  Site: https://ko9ma7.github.io/mullimulli-web/
echo  API : https://mullimulli-api.mullimulli-api.workers.dev/api/health
echo ============================================================
pause
exit /b 0
