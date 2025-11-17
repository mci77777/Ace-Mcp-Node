# Simulate double-click behavior
# When you double-click an exe, it runs without a console window attached
# and exits immediately if there's no GUI or if it's a console app that finishes quickly

$exe = "packages\prompt-enhance\build\prompt-enhance-win-x64.exe"

Write-Host "Simulating double-click behavior..."
Write-Host "This will start the exe without waiting (like double-click)"
Write-Host ""

# Start without waiting (like double-click)
Start-Process -FilePath $exe

Write-Host "Process started. Waiting 5 seconds..."
Start-Sleep -Seconds 5

# Check if any process is running
$processes = Get-Process | Where-Object { $_.Path -like "*prompt-enhance-win-x64.exe" }

if ($processes) {
    Write-Host "✓ Process is running!" -ForegroundColor Green
    Write-Host "Process IDs: $($processes.Id -join ', ')"
    
    # Check ports
    Write-Host "`nChecking ports..."
    $ports = netstat -ano | Select-String "LISTENING.*($($processes.Id -join '|'))"
    if ($ports) {
        Write-Host "✓ Listening on ports:" -ForegroundColor Green
        $ports | ForEach-Object { Write-Host "  $_" }
    } else {
        Write-Host "✗ No ports listening" -ForegroundColor Red
    }
    
    # Try to access default port
    Write-Host "`nTrying to access http://localhost:8090..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8090" -TimeoutSec 5 -UseBasicParsing
        Write-Host "✓ Web UI accessible!" -ForegroundColor Green
    } catch {
        Write-Host "✗ Cannot access Web UI: $_" -ForegroundColor Yellow
    }
    
    # Cleanup
    Write-Host "`nStopping processes..."
    $processes | ForEach-Object { Stop-Process -Id $_.Id -Force }
    
} else {
    Write-Host "✗ Process is NOT running (it exited)" -ForegroundColor Red
    Write-Host ""
    Write-Host "This means the exe exits immediately when double-clicked."
    Write-Host "Possible reasons:"
    Write-Host "  1. Missing console window (process exits when console closes)"
    Write-Host "  2. Unhandled exception during startup"
    Write-Host "  3. Port already in use"
    Write-Host ""
    Write-Host "Check the log file:"
    Write-Host "  $env:USERPROFILE\.codebase-mcp\log\codebase-mcp.log"
}
