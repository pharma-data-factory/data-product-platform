# Prepare deploy/production.local.env for local production smoke.
# Generates a throwaway RSA key so Octokit can parse GITHUB_APP_* at boot.
# Login/publish still need real GitHub credentials.
#
# Usage (repo root):
#   .\scripts\prepare-production-local-env.ps1
#   .\scripts\prepare-production-local-env.ps1 -Port 7017

param(
  [int]$Port = 7007,
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

$Example = Join-Path $Root "deploy\production.local.env.example"
$Target = Join-Path $Root "deploy\production.local.env"

if (-not (Test-Path $Example)) {
  throw "Missing $Example"
}
if ((Test-Path $Target) -and -not $Force) {
  Write-Host "Exists: $Target (pass -Force to overwrite)"
  exit 0
}

$oneLineKey = node -e @"
const { generateKeyPairSync } = require('crypto');
const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
process.stdout.write(privateKey.replace(/\r?\n/g, '\\n'));
"@

if (-not $oneLineKey -or $oneLineKey.Length -lt 100) {
  throw "Failed to generate RSA private key"
}

$base = "http://localhost:$Port"
$content = Get-Content $Example -Raw
$content = $content -replace 'APP_BASE_URL=.*', "APP_BASE_URL=$base"
$content = $content -replace 'BACKEND_BASE_URL=.*', "BACKEND_BASE_URL=$base"
$content = $content -replace 'CONTROL_PLANE_PORT=.*', "CONTROL_PLANE_PORT=$Port"
$content = $content -replace 'AUTH_GITHUB_CALLBACK_URL=.*', "AUTH_GITHUB_CALLBACK_URL=$base/api/auth/github/handler/frame"
$content = $content -replace 'GITHUB_APP_ID=.*', 'GITHUB_APP_ID=999001'
$content = $content -replace 'GITHUB_PRIVATE_KEY=.*', "GITHUB_PRIVATE_KEY=$oneLineKey"

Set-Content -Path $Target -Value $content -NoNewline
Write-Host "Wrote $Target (port $Port, throwaway GitHub App key)"
Write-Host "Next: yarn docker:prod:build && yarn docker:prod:up"
