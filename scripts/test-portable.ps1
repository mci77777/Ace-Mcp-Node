#!/usr/bin/env pwsh
# 测试便携版 Electron 应用

$ErrorActionPreference = "Stop"

Write-Host "=== 测试 Prompt Enhance 便携版 ===" -ForegroundColor Cyan
Write-Host ""

# 查找便携版 exe
$portableExe = Get-ChildItem -Path "packages/prompt-enhance/build/electron" -Filter "*portable.exe" | Select-Object -First 1

if (-not $portableExe) {
    Write-Host "✗ 未找到便携版 exe 文件" -ForegroundColor Red
    exit 1
}

Write-Host "找到便携版: $($portableExe.Name)" -ForegroundColor Green
Write-Host "大小: $([math]::Round($portableExe.Length/1MB, 2)) MB" -ForegroundColor Cyan
Write-Host "路径: $($portableExe.FullName)" -ForegroundColor Gray
Write-Host ""

# 检查配置目录
$configDir = "$env:USERPROFILE\.codebase-mcp"
Write-Host "配置目录: $configDir" -ForegroundColor Yellow

if (Test-Path $configDir) {
    Write-Host "✓ 配置目录已存在" -ForegroundColor Green
    
    $settingsFile = "$configDir\settings.toml"
    if (Test-Path $settingsFile) {
        Write-Host "✓ 配置文件已存在" -ForegroundColor Green
    } else {
        Write-Host "ℹ 配置文件不存在，首次运行时会自动创建" -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ 配置目录不存在，首次运行时会自动创建" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "准备启动应用..." -ForegroundColor Yellow
Write-Host ""
Write-Host "测试清单:" -ForegroundColor Cyan
Write-Host "  1. 应用窗口是否正常显示" -ForegroundColor White
Write-Host "  2. Web UI 是否正常加载（不是空白）" -ForegroundColor White
Write-Host "  3. 访问 http://localhost:8090 查看界面" -ForegroundColor White
Write-Host "  4. 访问 http://localhost:8090/debug 查看调试信息" -ForegroundColor White
Write-Host "  5. 检查配置文件是否创建在 $configDir" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "按 Enter 启动应用（或 Ctrl+C 取消）"

Write-Host ""
Write-Host "启动应用..." -ForegroundColor Green
Write-Host "按 Ctrl+C 停止应用" -ForegroundColor Gray
Write-Host ""

# 启动应用
& $portableExe.FullName

Write-Host ""
Write-Host "应用已关闭" -ForegroundColor Yellow

# 检查配置文件是否创建
Write-Host ""
Write-Host "验证配置文件..." -ForegroundColor Yellow

if (Test-Path "$configDir\settings.toml") {
    Write-Host "✓ 配置文件已创建: $configDir\settings.toml" -ForegroundColor Green
} else {
    Write-Host "✗ 配置文件未创建" -ForegroundColor Red
}

if (Test-Path "$configDir\log") {
    Write-Host "✓ 日志目录已创建: $configDir\log" -ForegroundColor Green
    
    $logFile = "$configDir\log\codebase-mcp.log"
    if (Test-Path $logFile) {
        Write-Host "✓ 日志文件已创建" -ForegroundColor Green
        Write-Host ""
        Write-Host "最后 10 行日志:" -ForegroundColor Cyan
        Get-Content $logFile -Tail 10 | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    }
} else {
    Write-Host "✗ 日志目录未创建" -ForegroundColor Red
}

Write-Host ""
Write-Host "测试完成！" -ForegroundColor Green
