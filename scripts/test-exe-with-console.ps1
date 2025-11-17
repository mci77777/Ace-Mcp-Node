# Test exe with visible console window
$exe = "packages\prompt-enhance\build\prompt-enhance-win-x64.exe"

Write-Host "Starting exe with visible console window..."
Write-Host "The console window should stay open."
Write-Host "Press Ctrl+C in the new window to stop the server."
Write-Host ""

# Start with a new console window
Start-Process -FilePath $exe -Wait
