#!/usr/bin/env pwsh
# Test packaged Electron app

Write-Host "=== Testing Packaged Electron App ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build
Write-Host "[1/3] Building application..." -ForegroundColor Yellow
npm run build:electron
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Build completed" -ForegroundColor Green
Write-Host ""

# Step 2: Package
Write-Host "[2/3] Packaging with electron-builder..." -ForegroundColor Yellow
npm run package:electron:win
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Packaging failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Packaging completed" -ForegroundColor Green
Write-Host ""

# Step 3: Find and run the executable
Write-Host "[3/3] Looking for executable..." -ForegroundColor Yellow

$exePath = Get-ChildItem -Path "build\electron" -Filter "*.exe" -Recurse | 
    Where-Object { $_.Name -notlike "*Uninstall*" } | 
    Select-Object -First 1 -ExpandProperty FullName

if ($exePath) {
    Write-Host "Found: $exePath" -ForegroundColor Green
    Write-Host ""
    Write-Host "Starting application..." -ForegroundColor Yellow
    Write-Host "Check the app window and logs for any errors" -ForegroundColor Gray
    Write-Host ""
    
    & $exePath
} else {
    Write-Host "✗ Executable not found in build\electron" -ForegroundColor Red
    Write-Host "Contents of build\electron:" -ForegroundColor Gray
    Get-ChildItem -Path "build\electron" -Recurse | Select-Object FullName
    exit 1
}
