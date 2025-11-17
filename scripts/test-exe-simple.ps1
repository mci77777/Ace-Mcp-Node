# Simple EXE Test Script
# Tests basic functionality of prompt-enhance exe without Node.js dependency

param(
    [string]$ExePath = "packages\prompt-enhance\build\prompt-enhance-win-x64.exe",
    [int]$Port = 8090,
    [int]$TestDuration = 5
)

Write-Host "Testing Prompt Enhance EXE" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# 1. Check if exe exists
Write-Host "1. Checking EXE file..." -ForegroundColor Yellow
if (Test-Path $ExePath) {
    $fileInfo = Get-Item $ExePath
    $fileSizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
    Write-Host "   OK: File exists at $ExePath" -ForegroundColor Green
    Write-Host "   Size: $fileSizeMB MB" -ForegroundColor Gray
    
    if ($fileSizeMB -lt 100) {
        Write-Host "   OK: Size check passed (< 100 MB)" -ForegroundColor Green
    } else {
        Write-Host "   FAIL: Size too large (>= 100 MB)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   FAIL: File not found at $ExePath" -ForegroundColor Red
    exit 1
}

# 2. Check port availability
Write-Host ""
Write-Host "2. Checking port $Port..." -ForegroundColor Yellow
$portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "   WARNING: Port $Port is already in use" -ForegroundColor Yellow
    Write-Host "   Process: $($portInUse.OwningProcess)" -ForegroundColor Gray
} else {
    Write-Host "   OK: Port $Port is available" -ForegroundColor Green
}

# 3. Start the exe
Write-Host ""
Write-Host "3. Starting application..." -ForegroundColor Yellow
Write-Host "   Command: $ExePath --web-port $Port" -ForegroundColor Gray

try {
    $process = Start-Process -FilePath $ExePath -ArgumentList "--web-port", $Port -PassThru -WindowStyle Normal
    
    if ($process) {
        Write-Host "   OK: Process started (PID: $($process.Id))" -ForegroundColor Green
        
        # Wait for server to start
        Write-Host ""
        Write-Host "4. Waiting for server startup..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
        
        # Check if process is still running
        if ($process.HasExited) {
            Write-Host "   FAIL: Process exited (Exit code: $($process.ExitCode))" -ForegroundColor Red
            exit 1
        }
        
        # 5. Test HTTP connection
        Write-Host ""
        Write-Host "5. Testing HTTP connection..." -ForegroundColor Yellow
        $maxRetries = 5
        $connected = $false
        
        for ($i = 1; $i -le $maxRetries; $i++) {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:$Port" -TimeoutSec 2 -UseBasicParsing
                if ($response.StatusCode -eq 200) {
                    Write-Host "   OK: HTTP connection successful (Status: 200)" -ForegroundColor Green
                    $connected = $true
                    break
                }
            } catch {
                Write-Host "   Retry $i/$maxRetries..." -ForegroundColor Gray
                Start-Sleep -Seconds 2
            }
        }
        
        if (-not $connected) {
            Write-Host "   FAIL: Cannot connect to http://localhost:$Port" -ForegroundColor Red
        }
        
        # 6. Test API endpoints
        if ($connected) {
            Write-Host ""
            Write-Host "6. Testing API endpoints..." -ForegroundColor Yellow
            
            try {
                $statusResponse = Invoke-RestMethod -Uri "http://localhost:$Port/api/status" -Method Get
                Write-Host "   OK: /api/status works" -ForegroundColor Green
            } catch {
                Write-Host "   WARNING: /api/status failed" -ForegroundColor Yellow
            }
            
            try {
                $configResponse = Invoke-RestMethod -Uri "http://localhost:$Port/api/config" -Method Get
                Write-Host "   OK: /api/config works" -ForegroundColor Green
            } catch {
                Write-Host "   WARNING: /api/config failed" -ForegroundColor Yellow
            }
        }
        
        # 7. Stability test
        Write-Host ""
        Write-Host "7. Running stability test ($TestDuration seconds)..." -ForegroundColor Yellow
        
        $startTime = Get-Date
        $stable = $true
        
        while (((Get-Date) - $startTime).TotalSeconds -lt $TestDuration) {
            if ($process.HasExited) {
                Write-Host "   FAIL: Process crashed" -ForegroundColor Red
                $stable = $false
                break
            }
            
            $process.Refresh()
            $memoryMB = [math]::Round($process.WorkingSet64 / 1MB, 2)
            $elapsed = [math]::Round(((Get-Date) - $startTime).TotalSeconds, 0)
            Write-Host "   Running: $elapsed/$TestDuration sec | Memory: $memoryMB MB" -ForegroundColor Gray
            
            Start-Sleep -Seconds 1
        }
        
        if ($stable) {
            Write-Host "   OK: Stability test passed" -ForegroundColor Green
        }
        
        # 8. Cleanup
        Write-Host ""
        Write-Host "8. Cleaning up..." -ForegroundColor Yellow
        
        if (-not $process.HasExited) {
            Stop-Process -Id $process.Id -Force
            Start-Sleep -Seconds 1
            Write-Host "   OK: Process stopped" -ForegroundColor Green
        }
        
        # 9. Verify config files
        Write-Host ""
        Write-Host "9. Verifying configuration files..." -ForegroundColor Yellow
        
        $configDir = "$env:USERPROFILE\.codebase-mcp"
        $settingsFile = "$configDir\settings.toml"
        
        if (Test-Path $settingsFile) {
            Write-Host "   OK: settings.toml created" -ForegroundColor Green
        } else {
            Write-Host "   WARNING: settings.toml not found" -ForegroundColor Yellow
        }
        
        $logFile = "$configDir\log\acemcp.log"
        if (Test-Path $logFile) {
            Write-Host "   OK: Log file created" -ForegroundColor Green
        } else {
            Write-Host "   WARNING: Log file not found" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "   FAIL: Cannot start process" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "   FAIL: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Summary
Write-Host ""
Write-Host "Test Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  - EXE file: OK" -ForegroundColor Gray
Write-Host "  - Size check: OK (< 100 MB)" -ForegroundColor Gray
Write-Host "  - Process start: OK" -ForegroundColor Gray
Write-Host "  - HTTP connection: $(if ($connected) { 'OK' } else { 'FAIL' })" -ForegroundColor Gray
Write-Host "  - Stability: $(if ($stable) { 'OK' } else { 'FAIL' })" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Open browser: http://localhost:$Port" -ForegroundColor Gray
Write-Host "  2. Test Web UI functionality" -ForegroundColor Gray
Write-Host "  3. Verify no Node.js dependency" -ForegroundColor Gray
Write-Host ""
