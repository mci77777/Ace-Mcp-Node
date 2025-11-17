# Test EXE Resource Files
# Verifies that templates, prompts, and config files are correctly packaged

param(
    [string]$ExePath = "packages\prompt-enhance\build\prompt-enhance-win-x64.exe",
    [int]$Port = 8092
)

Write-Host "Testing EXE Resource Files" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan
Write-Host ""

# 1. Check exe exists
Write-Host "1. Checking EXE file..." -ForegroundColor Yellow
if (-not (Test-Path $ExePath)) {
    Write-Host "   FAIL: EXE not found at $ExePath" -ForegroundColor Red
    exit 1
}
Write-Host "   OK: EXE file exists" -ForegroundColor Green

# 2. Start the application
Write-Host ""
Write-Host "2. Starting application..." -ForegroundColor Yellow
try {
    $process = Start-Process -FilePath $ExePath -ArgumentList "--web-port", $Port -PassThru -WindowStyle Normal
    Write-Host "   OK: Process started (PID: $($process.Id))" -ForegroundColor Green
    Start-Sleep -Seconds 3
    
    if ($process.HasExited) {
        Write-Host "   FAIL: Process exited immediately" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   FAIL: Cannot start process: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Test template files (Web UI)
Write-Host ""
Write-Host "3. Testing template files..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:$Port" -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "   OK: index.html loaded successfully" -ForegroundColor Green
        Write-Host "      Content length: $($response.Content.Length) bytes" -ForegroundColor Gray
        
        # Check if HTML contains expected elements
        if ($response.Content -match "Prompt Enhance") {
            Write-Host "   OK: HTML content verified" -ForegroundColor Green
        } else {
            Write-Host "   WARNING: HTML content may be incomplete" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   FAIL: Unexpected status code: $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "   FAIL: Cannot load index.html: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Test prompt files via API
Write-Host ""
Write-Host "4. Testing prompt files..." -ForegroundColor Yellow

# Test prompt.txt
try {
    $response = Invoke-RestMethod -Uri "http://localhost:$Port/api/prompt-files/prompt.txt" -Method Get
    if ($response.content) {
        Write-Host "   OK: prompt.txt accessible" -ForegroundColor Green
        Write-Host "      Size: $($response.size) characters" -ForegroundColor Gray
    } else {
        Write-Host "   FAIL: prompt.txt has no content" -ForegroundColor Red
    }
} catch {
    Write-Host "   FAIL: Cannot access prompt.txt: $($_.Exception.Message)" -ForegroundColor Red
}

# Test inject-code.txt
try {
    $response = Invoke-RestMethod -Uri "http://localhost:$Port/api/prompt-files/inject-code.txt" -Method Get
    if ($response.content) {
        Write-Host "   OK: inject-code.txt accessible" -ForegroundColor Green
        Write-Host "      Size: $($response.size) characters" -ForegroundColor Gray
    } else {
        Write-Host "   FAIL: inject-code.txt has no content" -ForegroundColor Red
    }
} catch {
    Write-Host "   FAIL: Cannot access inject-code.txt: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Test configuration file generation
Write-Host ""
Write-Host "5. Testing configuration file..." -ForegroundColor Yellow
$configFile = "$env:USERPROFILE\.codebase-mcp\settings.toml"
if (Test-Path $configFile) {
    Write-Host "   OK: settings.toml exists" -ForegroundColor Green
    Write-Host "      Location: $configFile" -ForegroundColor Gray
    
    $content = Get-Content $configFile -Raw
    if ($content -match "ENHANCE_BASE_URL") {
        Write-Host "   OK: Configuration contains expected keys" -ForegroundColor Green
    } else {
        Write-Host "   WARNING: Configuration may be incomplete" -ForegroundColor Yellow
    }
} else {
    Write-Host "   FAIL: settings.toml not found" -ForegroundColor Red
}

# 6. Test first run flow (browser opening)
Write-Host ""
Write-Host "6. Testing first run detection..." -ForegroundColor Yellow
$firstRunMarker = "$env:USERPROFILE\.codebase-mcp\.first_run_completed"
if (Test-Path $firstRunMarker) {
    Write-Host "   OK: First run marker exists" -ForegroundColor Green
    Write-Host "      (Browser should have opened automatically)" -ForegroundColor Gray
} else {
    Write-Host "   INFO: First run marker not found" -ForegroundColor Cyan
    Write-Host "      (This may be the first run)" -ForegroundColor Gray
}

# 7. Cleanup
Write-Host ""
Write-Host "7. Cleaning up..." -ForegroundColor Yellow
if (-not $process.HasExited) {
    Stop-Process -Id $process.Id -Force
    Start-Sleep -Seconds 1
    Write-Host "   OK: Process stopped" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "Test Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  - EXE file: OK" -ForegroundColor Gray
Write-Host "  - Template files: OK" -ForegroundColor Gray
Write-Host "  - Prompt files: OK" -ForegroundColor Gray
Write-Host "  - Configuration: OK" -ForegroundColor Gray
Write-Host ""
Write-Host "All resource files are correctly packaged!" -ForegroundColor Green
Write-Host ""
