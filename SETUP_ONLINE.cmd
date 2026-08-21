@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Mullimulli Online Setup v3.6

where powershell.exe >nul 2>&1
if errorlevel 1 (
  echo PowerShell is required.
  pause
  exit /b 1
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-online.ps1"
set "RESULT=%ERRORLEVEL%"
echo.
if "%RESULT%"=="0" (
  echo Setup finished successfully.
) else (
  echo Setup stopped with an error.
  echo Do not rerun an older v3.4 folder. Use this v3.6 folder.
)
echo.
pause
exit /b %RESULT%
