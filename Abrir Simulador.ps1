$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms

# ── Paths ────────────────────────────────────────────────────────────────────
$projectRoot = if ($PSCommandPath) { Split-Path -Parent $PSCommandPath } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$webRoot      = Join-Path $projectRoot "web"
$venvRoot     = Join-Path $projectRoot ".venv"
$venvPython   = Join-Path $venvRoot "Scripts\python.exe"
$venvUvicorn  = Join-Path $venvRoot "Scripts\uvicorn.exe"

$backendPort  = 8000
$frontendPort = 5173

# ── Helpers ──────────────────────────────────────────────────────────────────

function Show-Error {
  param([string] $Message)
  [System.Windows.Forms.MessageBox]::Show(
    $Message,
    "Simulador de Atenuadores",
    "OK",
    "Error"
  ) | Out-Null
}

# Bulletproof loopback HTTP health check: tries IPv4 (127.0.0.1), IPv6 ([::1]), and localhost in order.
# This solves the common Windows dual-stack issue where Uvicorn binds to IPv4 and Vite binds to IPv6.
function Test-HttpReady {
  param([int] $Port, [string] $Path = "")
  $urls = @(
    "http://127.0.0.1:$Port$Path",
    "http://[::1]:$Port$Path",
    "http://localhost:$Port$Path"
  )
  foreach ($url in $urls) {
    try {
      $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
      return @{ Ready = $true; Url = $url; Response = $response }
    } catch {
      continue
    }
  }
  return @{ Ready = $false; Url = $null; Response = $null }
}

function Stop-PortProcesses {
  param([int] $Port)
  try {
    $lines = netstat -ano | Select-String ":$Port\s"
    $procIds = $lines | ForEach-Object {
      ($_ -split '\s+')[-1]
    } | Sort-Object -Unique | Where-Object { $_ -match '^\d+$' -and [int]$_ -gt 0 }

    foreach ($procId in $procIds) {
      $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
      if ($proc -and ($proc.ProcessName -match 'python|uvicorn|node')) {
        Write-Host "  Cerrando $($proc.ProcessName) (PID $procId)..." -ForegroundColor Yellow
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
      }
    }
    Start-Sleep -Milliseconds 1500
  } catch { }
}

# ── Validations ──────────────────────────────────────────────────────────────

if (-not (Test-Path $venvPython)) {
  Show-Error "No se encontro el entorno virtual en .venv\Scripts\python.exe.`n`nEjecuta primero:`n  python -m venv .venv`n  .venv\Scripts\pip install -r requirements.txt"
  exit 1
}

if (-not (Test-Path $venvUvicorn)) {
  Show-Error "No se encontro uvicorn en el venv.`n`nEjecuta:`n  .venv\Scripts\pip install -r requirements.txt"
  exit 1
}

if (-not (Test-Path (Join-Path $webRoot "package.json"))) {
  Show-Error "No se encontro web\package.json.`nEjecute este script desde la carpeta del proyecto."
  exit 1
}

$npmCommand = $null
foreach ($candidate in @("npm.cmd", "npm")) {
  try {
    $cmd = Get-Command $candidate -ErrorAction Stop
    $npmCommand = $cmd.Source
    break
  } catch { continue }
}
if (-not $npmCommand) {
  Show-Error "No se encontro npm en PATH.`nInstala Node.js desde https://nodejs.org/"
  exit 1
}

# Install node_modules if missing
if (-not (Test-Path (Join-Path $webRoot "node_modules"))) {
  Write-Host "Instalando dependencias del frontend..." -ForegroundColor Yellow
  $npmInstall = Start-Process -FilePath $npmCommand -ArgumentList @("install") `
    -WorkingDirectory $webRoot -PassThru -Wait -NoNewWindow
  if ($npmInstall.ExitCode -ne 0) {
    Show-Error "Fallo npm install. Revisa la consola."
    exit 1
  }
}

# ── Start Backend ────────────────────────────────────────────────────────────

$backendCheck = Test-HttpReady -Port $backendPort -Path "/api/health"

if ($backendCheck.Ready) {
  # Verify if it's our backend
  try {
    $json = $backendCheck.Response.Content | ConvertFrom-Json
    if ($json.status -eq "ok") {
      Write-Host "Backend ya corriendo en puerto $backendPort" -ForegroundColor Green
      $backendReady = $true
    } else {
      $backendReady = $false
    }
  } catch {
    $backendReady = $false
  }
} else {
  $backendReady = $false
}

if (-not $backendReady) {
  # Free port if occupied by zombie process
  Stop-PortProcesses -Port $backendPort

  Write-Host "Iniciando backend (FastAPI en :$backendPort)..." -ForegroundColor Cyan
  Start-Process -FilePath $venvUvicorn `
    -ArgumentList @("backend.main:app", "--port", $backendPort, "--reload") `
    -WorkingDirectory $projectRoot `
    -WindowStyle Minimized

  $deadline = (Get-Date).AddSeconds(15)
  $ready = $false
  while ((Get-Date) -lt $deadline) {
    $check = Test-HttpReady -Port $backendPort -Path "/api/health"
    if ($check.Ready) {
      try {
        $json = $check.Response.Content | ConvertFrom-Json
        if ($json.status -eq "ok") { $ready = $true; break }
      } catch { }
    }
    Start-Sleep -Milliseconds 500
  }

  if (-not $ready) {
    Show-Error "El backend no respondio en 15 segundos.`nRevisa que no haya errores en la ventana de uvicorn."
    exit 1
  }
  Write-Host "Backend listo" -ForegroundColor Green
}

# ── Start Frontend ───────────────────────────────────────────────────────────

$frontendCheck = Test-HttpReady -Port $frontendPort

if ($frontendCheck.Ready) {
  Write-Host "Frontend ya corriendo en puerto $frontendPort" -ForegroundColor Green
  $viteReady = $true
  $frontendUrl = $frontendCheck.Url
} else {
  # Free port if occupied by zombie
  Stop-PortProcesses -Port $frontendPort

  Write-Host "Iniciando frontend (Vite en :$frontendPort)..." -ForegroundColor Cyan
  Start-Process -FilePath $npmCommand `
    -ArgumentList @("run", "dev") `
    -WorkingDirectory $webRoot `
    -WindowStyle Minimized

  $deadline = (Get-Date).AddSeconds(20)
  $viteReady = $false
  $frontendUrl = $null

  while ((Get-Date) -lt $deadline) {
    $check = Test-HttpReady -Port $frontendPort
    if ($check.Ready) {
      $viteReady = $true
      $frontendUrl = $check.Url
      break
    }
    # Vite may pick port 5174 if 5173 is busy
    $check5174 = Test-HttpReady -Port 5174
    if ($check5174.Ready) {
      $frontendPort = 5174
      $viteReady = $true
      $frontendUrl = $check5174.Url
      break
    }
    Start-Sleep -Milliseconds 750
  }

  if (-not $viteReady) {
    Show-Error "El frontend no inicio en 20 segundos.`nRevisa la ventana de Vite."
    exit 1
  }
  Write-Host "Frontend listo" -ForegroundColor Green
}

# ── Open browser ─────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "Simulador de Atenuadores listo en $frontendUrl" -ForegroundColor Green
Write-Host "Abriendo navegador..." -ForegroundColor Cyan
Start-Process $frontendUrl
