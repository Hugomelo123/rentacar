# Autocunha Rent-a-Car — arranque local (Windows)
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
Set-Location $Root

Write-Host "`n=== Premium-Strong / Autocunha — Setup Local ===`n" -ForegroundColor Cyan

# pnpm
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Write-Host "A instalar pnpm globalmente..." -ForegroundColor Yellow
  npm install -g pnpm
}

# .env
if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Criado .env a partir de .env.example" -ForegroundColor Green
}

# PostgreSQL via Docker
Write-Host "A iniciar PostgreSQL (Docker)..." -ForegroundColor Yellow
docker compose up -d

Write-Host "A aguardar base de dados..." -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 40; $i++) {
  docker exec premium-strong-db pg_isready -U autocunha -d rentacar 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { $ready = $true; break }
  Start-Sleep -Seconds 2
}
if (-not $ready) {
  Write-Host "ERRO: PostgreSQL nao arrancou. Verifique Docker Desktop." -ForegroundColor Red
  exit 1
}
Write-Host "PostgreSQL OK" -ForegroundColor Green

# Dependencias
if (-not (Test-Path "node_modules")) {
  Write-Host "A instalar dependencias (pnpm install)..." -ForegroundColor Yellow
  pnpm install
}

# Schema + seed
$env:DATABASE_URL = "postgresql://autocunha:autocunha@localhost:5432/rentacar"
Write-Host "A aplicar schema (drizzle push)..." -ForegroundColor Yellow
pnpm db:push
Write-Host "A popular dados de demo..." -ForegroundColor Yellow
pnpm db:seed

Write-Host "`n=== Arranque dos servicos ===`n" -ForegroundColor Cyan
Write-Host "API:       http://localhost:5000/api/healthz" -ForegroundColor White
Write-Host "Dashboard: http://localhost:5173`n" -ForegroundColor White

# API em background
$apiJob = Start-Job -ScriptBlock {
  Set-Location $using:Root
  $env:DATABASE_URL = "postgresql://autocunha:autocunha@localhost:5432/rentacar"
  $env:PORT = "5000"
  $env:NODE_ENV = "development"
  pnpm dev:api 2>&1
}

Start-Sleep -Seconds 4

# Dashboard em foreground (Ctrl+C para parar)
$env:PORT = "5173"
$env:BASE_PATH = "/"
$env:API_PROXY_TARGET = "http://127.0.0.1:5000"
try {
  pnpm dev:web
} finally {
  Stop-Job $apiJob -ErrorAction SilentlyContinue
  Remove-Job $apiJob -Force -ErrorAction SilentlyContinue
}
