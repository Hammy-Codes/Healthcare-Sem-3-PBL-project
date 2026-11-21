$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $repo 'data\demo-processes.json'
if (!(Test-Path $pidFile)) { Write-Host 'No CareBridge launch record found.'; exit 0 }
$pids = Get-Content -Raw $pidFile | ConvertFrom-Json
foreach ($id in @($pids.frontend, $pids.backend)) {
  if ($id) {
    $process = Get-Process -Id ([int]$id) -ErrorAction SilentlyContinue
    if ($process) { Stop-Process -Id $process.Id -Force }
  }
}
Remove-Item -LiteralPath $pidFile -Force
Write-Host 'CareBridge frontend and backend stopped.'
