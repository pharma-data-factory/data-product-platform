# Build the hosted Control Plane image (packages/backend/Dockerfile).
# Requires Docker Desktop and Yarn 4.13+.
#
# Usage (repo root):
#   .\scripts\build-production-image.ps1
#   .\scripts\build-production-image.ps1 -Tag "pharma-data-factory:mvp-1.0"
#
# Then:
#   copy deploy\production.local.env.example deploy\production.local.env
#   docker compose -f docker-compose.production.yml --env-file deploy/production.local.env up -d

param(
  [string]$Tag = "pharma-data-factory:mvp-1.0",
  [switch]$SkipInstall,
  [switch]$SkipTsc
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

Write-Host "==> Repo: $Root"
Write-Host "==> Image tag: $Tag"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "docker not found. Start Docker Desktop first."
}

function Invoke-Step([string]$Label, [scriptblock]$Action) {
  Write-Host "==> $Label"
  & $Action
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed (exit $LASTEXITCODE)"
  }
}

if (-not $SkipInstall) {
  Invoke-Step "yarn install --immutable" { yarn install --immutable }
}

if (-not $SkipTsc) {
  Invoke-Step "yarn tsc" { yarn tsc }
}

Invoke-Step "yarn build:backend" { yarn build:backend }

if (-not (Test-Path "packages/backend/dist/bundle.tar.gz")) {
  throw "packages/backend/dist/bundle.tar.gz missing after build:backend"
}
if (-not (Test-Path "packages/backend/dist/skeleton.tar.gz")) {
  throw "packages/backend/dist/skeleton.tar.gz missing after build:backend"
}

Write-Host "==> docker build -f packages/backend/Dockerfile -t $Tag ."
docker build -f packages/backend/Dockerfile -t $Tag .

Write-Host ""
Write-Host "OK: built $Tag"
Write-Host "Next:"
Write-Host "  .\scripts\prepare-production-local-env.ps1"
Write-Host "  docker compose -f docker-compose.production.yml --env-file deploy/production.local.env up -d"
Write-Host "  curl http://localhost:7007/.backstage/health/v1/readiness"
