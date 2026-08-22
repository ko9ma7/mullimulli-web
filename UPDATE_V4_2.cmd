@echo off
setlocal
cd /d "%~dp0"
title Mullimulli v4.2 Online Update
chcp 65001 >nul
cls
echo ============================================================
echo  Mullimulli v4.2 - Worker + GitHub Pages update
echo  Existing D1 data and MESSAGE_KEY are preserved.
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
where gh >nul 2>nul
if errorlevel 1 (
  echo ERROR: GitHub CLI is required.
  pause
  exit /b 1
)
echo [1/2] Deploying Cloudflare Worker v4.2...
pushd "%~dp0worker"
call npx wrangler@latest deploy
set WERR=%ERRORLEVEL%
popd
if not "%WERR%"=="0" (
  echo.
  echo ERROR: Worker deployment failed. The error is shown above.
  pause
  exit /b %WERR%
)
echo.
echo [2/2] Publishing GitHub Pages v4.2...
node "%~dp0scripts\publish-pages.mjs"
set PERR=%ERRORLEVEL%
if not "%PERR%"=="0" (
  echo.
  echo ERROR: GitHub Pages publish failed. The error is shown above.
  pause
  exit /b %PERR%
)
echo.
echo ============================================================
echo  SUCCESS - Mullimulli v4.2 is deployed.
echo  Site: https://ko9ma7.github.io/mullimulli-web/
echo  API : https://mullimulli-api.mullimulli-api.workers.dev
echo ============================================================
pause
exit /b 0
