param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$WranglerArgs
)

$ErrorActionPreference = 'Stop'

# This tiny wrapper exists because Node.js on Windows can return EINVAL when
# spawnSync tries to execute npx.cmd directly. PowerShell can execute .cmd
# files reliably, while preserving every Wrangler argument as a separate item.
$npx = Get-Command npx.cmd -ErrorAction Stop
& $npx.Source --yes wrangler@latest --install-skills=false @WranglerArgs
$code = $LASTEXITCODE
if ($null -eq $code) { $code = 0 }
exit $code
