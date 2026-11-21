$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$msys = 'C:\msys64\ucrt64\bin'
if (!(Test-Path (Join-Path $msys 'g++.exe')) -or !(Test-Path (Join-Path $msys 'ninja.exe'))) {
  throw 'MSYS2 UCRT64 GCC/G++ and Ninja are required. Install MSYS2 UCRT64 (https://www.msys2.org/) and run: pacman -S --needed mingw-w64-ucrt-x86_64-toolchain mingw-w64-ucrt-x86_64-cmake mingw-w64-ucrt-x86_64-ninja'
}
$env:PATH = "$msys;$env:PATH"
$cmake = (Get-Command cmake -ErrorAction SilentlyContinue).Source
if (!$cmake) {
  $cmakeRoot = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages\Kitware.CMake_Microsoft.Winget.Source_8wekyb3d8bbwe'
  $cmake = Get-ChildItem $cmakeRoot -Filter cmake.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
}
if (!$cmake) { throw 'CMake is required. Install with: winget install --id Kitware.CMake --scope user' }
$build = Join-Path $repo 'backend\build\ninja-ucrt'
& $cmake -S $repo -B $build -G Ninja "-DCMAKE_MAKE_PROGRAM=$msys/ninja.exe" "-DCMAKE_C_COMPILER=$msys/gcc.exe" "-DCMAKE_CXX_COMPILER=$msys/g++.exe"
if ($LASTEXITCODE -ne 0) { throw 'CMake configuration failed.' }
& $cmake --build $build --parallel 2
if ($LASTEXITCODE -ne 0) { throw 'Backend build failed.' }
$frontend = Join-Path $repo 'frontend'
if (!(Test-Path (Join-Path $frontend 'node_modules'))) {
  Push-Location $frontend
  try { npm ci; if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' } } finally { Pop-Location }
}
$data = Join-Path $repo 'data'
New-Item -ItemType Directory -Force $data | Out-Null
$keyFile = Join-Path $data 'technician-provision.key'
if (!(Test-Path $keyFile)) {
  $bytes = New-Object byte[] 32
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  [System.IO.File]::WriteAllText($keyFile, [Convert]::ToBase64String($bytes))
}
$env:CAREBRIDGE_PROVISION_KEY = (Get-Content -Raw $keyFile).Trim()
$env:CAREBRIDGE_PORT = '8001'
if (!$env:VITE_CAREBRIDGE_TIMEZONE) { $env:VITE_CAREBRIDGE_TIMEZONE = 'Asia/Kolkata' }
$exe = Join-Path $build 'backend\carebridge-api.exe'
$backendLog = Join-Path $data 'backend.log'
$frontendLog = Join-Path $data 'frontend.log'
$storePath = if ($env:CAREBRIDGE_DATA_FILE) { $env:CAREBRIDGE_DATA_FILE } else { 'data/carebridge.json' }
$backendProc = Start-Process -FilePath $exe -ArgumentList ('"{0}"' -f $storePath) -WorkingDirectory $repo -WindowStyle Hidden -RedirectStandardOutput $backendLog -RedirectStandardError (Join-Path $data 'backend-error.log') -PassThru
try {
  $ready = $false
  for ($i=0; $i -lt 40; $i++) {
    if ($backendProc.HasExited) { throw "Backend exited. See $backendLog" }
    try { Invoke-RestMethod 'http://127.0.0.1:8001/health' -TimeoutSec 1 | Out-Null; $ready = $true; break } catch { Start-Sleep -Milliseconds 250 }
  }
  if (!$ready) { throw 'Backend did not become ready on port 8001.' }
  $node = (Get-Command node.exe -ErrorAction Stop).Source
  $vite = Join-Path $frontend 'node_modules\vite\bin\vite.js'
  $frontendProc = Start-Process -FilePath $node -ArgumentList @($vite, '--host', '127.0.0.1', '--port', '5173', '--strictPort') -WorkingDirectory $frontend -WindowStyle Hidden -RedirectStandardOutput $frontendLog -RedirectStandardError (Join-Path $data 'frontend-error.log') -PassThru
  $pids = @{ backend = $backendProc.Id; frontend = $frontendProc.Id } | ConvertTo-Json
  Set-Content -Path (Join-Path $data 'demo-processes.json') -Value $pids -NoNewline
  Write-Host 'CareBridge is running: http://127.0.0.1:5173 (API http://127.0.0.1:8001)'
  Write-Host 'Patient and doctor accounts can be registered from the UI.'
  Write-Host "Lab technician provisioning key: $($env:CAREBRIDGE_PROVISION_KEY)"
  Write-Host "Logs: $backendLog and $frontendLog"
} catch {
  if (!$backendProc.HasExited) { Stop-Process -Id $backendProc.Id -Force }
  throw
}
