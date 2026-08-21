$ErrorActionPreference = "Stop"
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$Root = (Get-Location).Path

function Test-Command($Name) {
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Refresh-Path {
    $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $user = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machine;$user"
}

Write-Host "============================================================"
Write-Host " Mullimulli online account setup v4.0"
Write-Host " Project: $Root"
Write-Host "============================================================"
Write-Host ""

if (-not (Test-Path -LiteralPath (Join-Path $Root "scripts\setup-online.mjs"))) {
    throw "scripts/setup-online.mjs was not found. Extract the ZIP first and run SETUP_ONLINE.cmd from the project root."
}

if (-not (Test-Path -LiteralPath (Join-Path $Root "scripts\run-wrangler.ps1"))) {
    throw "scripts/run-wrangler.ps1 was not found. Extract the v4.0 ZIP into a new folder."
}

if (-not (Test-Command "node.exe")) {
    Write-Host "[1/4] Installing Node.js LTS..."
    if (-not (Test-Command "winget.exe")) {
        Start-Process "https://nodejs.org/"
        throw "winget is unavailable. Install Node.js LTS, then run SETUP_ONLINE.cmd again."
    }
    & winget.exe install --id OpenJS.NodeJS.LTS -e --source winget --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -ne 0) { throw "Node.js installation failed." }
    Refresh-Path
}

if (-not (Test-Command "node.exe")) {
    throw "Node.js is installed but not visible yet. Close this window and run SETUP_ONLINE.cmd again."
}

if (-not (Test-Command "git.exe")) {
    Write-Host "[2/4] Installing Git..."
    if (-not (Test-Command "winget.exe")) {
        Start-Process "https://git-scm.com/download/win"
        throw "winget is unavailable. Install Git for Windows, then run SETUP_ONLINE.cmd again."
    }
    & winget.exe install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -ne 0) { throw "Git installation failed." }
    Refresh-Path
}

if (-not (Test-Command "git.exe")) {
    throw "Git is installed but not visible yet. Close this window and run SETUP_ONLINE.cmd again."
}

if (-not (Test-Command "gh.exe")) {
    Write-Host "[3/4] Installing GitHub CLI..."
    if (-not (Test-Command "winget.exe")) {
        Start-Process "https://cli.github.com/"
        throw "winget is unavailable. Install GitHub CLI, then run SETUP_ONLINE.cmd again."
    }
    & winget.exe install --id GitHub.cli -e --source winget --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -ne 0) { throw "GitHub CLI installation failed." }
    Refresh-Path
}

if (-not (Test-Command "gh.exe")) {
    throw "GitHub CLI is installed but not visible yet. Close this window and run SETUP_ONLINE.cmd again."
}

Write-Host "[4/4] Starting automatic Cloudflare + GitHub setup..."
Write-Host "Browser login/authorization windows may open. Approve them and return here."
Write-Host ""

& node.exe (Join-Path $Root "scripts\setup-online.mjs")
exit $LASTEXITCODE
