# Test exe and capture all output
$exe = "packages\prompt-enhance\build\prompt-enhance-win-x64.exe"
$logDir = "$env:USERPROFILE\.codebase-mcp\log"
$appLog = "$logDir\codebase-mcp.log"

# Clear old log
if (Test-Path $appLog) {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    Move-Item $appLog "$logDir\codebase-mcp.log.$timestamp" -Force
}

Write-Host "Starting exe (simulating double-click)..."
Write-Host "Log file: $appLog"
Write-Host ""

# Start process and capture output
$proc = Start-Process -FilePath $exe -PassThru -WindowStyle Normal

Write-Host "Process ID: $($proc.Id)"
Write-Host "Waiting 3 seconds..."
Start-Sleep -Seconds 3

if ($proc.HasExited) {
    Write-Host "Process EXITED with code: $($proc.ExitCode)" -ForegroundColor Red
} else {
    Write-Host "Process is RUNNING" -ForegroundColor Green
}

Write-Host "`nApplication log:"
Write-Host "=" * 60
if (Test-Path $appLog) {
    Get-Content $appLog
} else {
    Write-Host "No log file created!" -ForegroundColor Red
}
Write-Host "=" * 60

if (-not $proc.HasExited) {
    Write-Host "`nStopping process..."
    Stop-Process -Id $proc.Id -Force
}
