@echo off
setlocal
cd /d "%~dp0"
echo ============================================================
echo  Mullimulli update publisher
echo  This reuses the existing online setup and deploys this build.
echo ============================================================
call "%~dp0SETUP_ONLINE.cmd"
endlocal
