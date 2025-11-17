#!/usr/bin/env pwsh
# Test Electron app locally (before packaging)

Write-Host "=== Testing Electron App (Local) ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build
Write-Host "[1/2] Building application..." -ForegroundColor Yellow
npm run build:electron
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Build completed" -ForegroundColor Green
Write-Host ""

# Step 2: Run Electron
Write-Host "[2/2] Starting Electron..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

npm run start:electron
