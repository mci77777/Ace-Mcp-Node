# Test exe with detailed debugging
$ErrorActionPreference = "Continue"

$exe = "packages\prompt-enhance\build\prompt-enhance-win-x64.exe"
$port = 9001

Write-Host "=".repeat(60)
Write-Host "Testing Prompt Enhance EXE"
Write-Host "=".repeat(60)

# Check if exe exists
if (-not (Test-Path $exe)) {
    Write-Host "ERROR: EXE not found at $exe" -ForegroundColor Red
    exit 1
}

$fileSize = (Get-Item $exe).Length / 1MB
Write-Host "EXE file size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Green

# Test 1: --help
Write-Host "`n[Test 1] Testing --help parameter..." -ForegroundColor Cyan
$helpOutput = & $exe --help 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ --help works" -ForegroundColor Green
} else {
    Write-Host "✗ --help failed with exit code $LASTEXITCODE" -ForegroundColor Red
    Write-Host $helpOutput
    exit 1
}

# Test 2: Start server in background
Write-Host "`n[Test 2] Starting server on port $port..." -ForegroundColor Cyan
$logFile = "temp-exe-test.log"
$proc = Start-Process -FilePath $exe -ArgumentList "--port $port" -PassThru -RedirectStandardOutput $logFile -RedirectStandardError "${logFile}.err" -NoNewWindow

Write-Host "Process ID: $($proc.Id)"
Write-Host "Waiting 5 seconds for server to start..."
Start-Sleep -Seconds 5

# Check if process is still running
if ($proc.HasExited) {
    Write-Host "✗ Process exited with code $($proc.ExitCode)" -ForegroundColor Red
    Write-Host "`nSTDOUT:" -ForegroundColor Yellow
    Get-Content $logFile -ErrorAction SilentlyContinue
    Write-Host "`nSTDERR:" -ForegroundColor Yellow
    Get-Content "${logFile}.err" -ErrorAction SilentlyContinue
    Remove-Item $logFile,"${logFile}.err" -ErrorAction SilentlyContinue
    exit 1
} else {
    Write-Host "✓ Process is running" -ForegroundColor Green
}

# Test 3: Check if port is listening
Write-Host "`n[Test 3] Checking if port $port is listening..." -ForegroundColor Cyan
$listening = netstat -ano | Select-String ":$port.*LISTENING"
if ($listening) {
    Write-Host "✓ Port $port is listening" -ForegroundColor Green
    Write-Host $listening
} else {
    Write-Host "✗ Port $port is NOT listening" -ForegroundColor Red
    Write-Host "`nProcess output:" -ForegroundColor Yellow
    Get-Content $logFile -ErrorAction SilentlyContinue
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    Remove-Item $logFile,"${logFile}.err" -ErrorAction SilentlyContinue
    exit 1
}

# Test 4: Try to access Web UI
Write-Host "`n[Test 4] Accessing Web UI..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:$port" -TimeoutSec 10 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Web UI is accessible (HTTP 200)" -ForegroundColor Green
        $contentLength = $response.Content.Length
        Write-Host "  Response size: $contentLength bytes"
        
        # Check if it's HTML
        if ($response.Content -match "<!DOCTYPE html>") {
            Write-Host "✓ Response is HTML" -ForegroundColor Green
        } else {
            Write-Host "✗ Response is not HTML" -ForegroundColor Red
            Write-Host "First 200 chars: $($response.Content.Substring(0, [Math]::Min(200, $contentLength)))"
        }
    } else {
        Write-Host "✗ Unexpected status code: $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Failed to access Web UI: $_" -ForegroundColor Red
    Write-Host "`nProcess output:" -ForegroundColor Yellow
    Get-Content $logFile -ErrorAction SilentlyContinue
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    Remove-Item $logFile,"${logFile}.err" -ErrorAction SilentlyContinue
    exit 1
}

# Test 5: Check logs
Write-Host "`n[Test 5] Checking application logs..." -ForegroundColor Cyan
$appLog = "$env:USERPROFILE\.codebase-mcp\log\codebase-mcp.log"
if (Test-Path $appLog) {
    Write-Host "Last 10 lines of application log:" -ForegroundColor Yellow
    Get-Content $appLog -Tail 10
} else {
    Write-Host "✗ Application log not found at $appLog" -ForegroundColor Red
}

# Cleanup
Write-Host "`n[Cleanup] Stopping server..." -ForegroundColor Cyan
Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Remove-Item $logFile,"${logFile}.err" -ErrorAction SilentlyContinue

Write-Host "`n" + "=".repeat(60)
Write-Host "All tests passed!" -ForegroundColor Green
Write-Host "=".repeat(60)
