#!/usr/bin/env pwsh
# 测试 Electron 应用配置读取

$ErrorActionPreference = "Stop"

Write-Host "=== 测试 Electron 应用配置读取 ===" -ForegroundColor Cyan
Write-Host ""

# 1. 检查配置文件
Write-Host "[1/4] 检查配置文件..." -ForegroundColor Yellow
$configFile = "$env:USERPROFILE\.codebase-mcp\settings.toml"

if (Test-Path $configFile) {
    Write-Host "✓ 配置文件存在: $configFile" -ForegroundColor Green
    
    # 读取配置文件内容
    $content = Get-Content $configFile -Raw
    
    # 检查关键字段
    if ($content -match 'BASE_URL\s*=\s*"([^"]+)"') {
        $baseUrl = $matches[1]
        Write-Host "  BASE_URL: $baseUrl" -ForegroundColor Cyan
    } else {
        Write-Host "  ✗ BASE_URL 未找到" -ForegroundColor Red
    }
    
    if ($content -match 'TOKEN\s*=\s*"([^"]+)"') {
        $token = $matches[1]
        $maskedToken = $token.Substring(0, [Math]::Min(10, $token.Length)) + "..."
        Write-Host "  TOKEN: $maskedToken" -ForegroundColor Cyan
    } else {
        Write-Host "  ✗ TOKEN 未找到" -ForegroundColor Red
    }
    
    if ($content -match 'ENHANCE_BASE_URL\s*=\s*"([^"]+)"') {
        $enhanceUrl = $matches[1]
        Write-Host "  ENHANCE_BASE_URL: $enhanceUrl" -ForegroundColor Cyan
    } else {
        Write-Host "  ✗ ENHANCE_BASE_URL 未找到" -ForegroundColor Red
    }
    
    if ($content -match 'ENHANCE_TOKEN\s*=\s*"([^"]+)"') {
        $enhanceToken = $matches[1]
        $maskedEnhanceToken = $enhanceToken.Substring(0, [Math]::Min(10, $enhanceToken.Length)) + "..."
        Write-Host "  ENHANCE_TOKEN: $maskedEnhanceToken" -ForegroundColor Cyan
    } else {
        Write-Host "  ✗ ENHANCE_TOKEN 未找到" -ForegroundColor Red
    }
} else {
    Write-Host "✗ 配置文件不存在: $configFile" -ForegroundColor Red
    Write-Host ""
    Write-Host "请先创建配置文件:" -ForegroundColor Yellow
    Write-Host "  Copy-Item settings.toml `"$configFile`"" -ForegroundColor Gray
    exit 1
}

Write-Host ""

# 2. 检查日志目录
Write-Host "[2/4] 检查日志目录..." -ForegroundColor Yellow
$logDir = "$env:USERPROFILE\.codebase-mcp\log"

if (Test-Path $logDir) {
    Write-Host "✓ 日志目录存在: $logDir" -ForegroundColor Green
} else {
    Write-Host "ℹ 日志目录不存在（首次运行时会创建）" -ForegroundColor Yellow
}

Write-Host ""

# 3. 检查 Electron 应用
Write-Host "[3/4] 检查 Electron 应用..." -ForegroundColor Yellow
$exePath = "packages\prompt-enhance\build\electron\Prompt Enhance-0.1.0-portable.exe"

if (Test-Path $exePath) {
    $exeInfo = Get-Item $exePath
    Write-Host "✓ 应用存在: $($exeInfo.Name)" -ForegroundColor Green
    Write-Host "  大小: $([math]::Round($exeInfo.Length/1MB, 2)) MB" -ForegroundColor Cyan
    Write-Host "  路径: $($exeInfo.FullName)" -ForegroundColor Gray
} else {
    Write-Host "✗ 应用不存在: $exePath" -ForegroundColor Red
    Write-Host ""
    Write-Host "请先打包应用:" -ForegroundColor Yellow
    Write-Host "  npm run package:electron:win -w @codebase-mcp/prompt-enhance" -ForegroundColor Gray
    exit 1
}

Write-Host ""

# 4. 启动应用并检查日志
Write-Host "[4/4] 测试应用启动..." -ForegroundColor Yellow
Write-Host ""
Write-Host "准备启动应用进行测试..." -ForegroundColor Cyan
Write-Host ""
Write-Host "测试步骤:" -ForegroundColor White
Write-Host "  1. 应用将在后台启动" -ForegroundColor Gray
Write-Host "  2. 等待 10 秒让应用初始化" -ForegroundColor Gray
Write-Host "  3. 检查日志文件中的配置信息" -ForegroundColor Gray
Write-Host "  4. 自动关闭应用" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "按 Enter 开始测试（或 Ctrl+C 取消）"

Write-Host ""
Write-Host "启动应用..." -ForegroundColor Green

# 启动应用（后台）
$process = Start-Process -FilePath $exePath -PassThru -WindowStyle Hidden

Write-Host "应用已启动 (PID: $($process.Id))" -ForegroundColor Green
Write-Host "等待 10 秒让应用初始化..." -ForegroundColor Yellow

Start-Sleep -Seconds 10

# 检查日志
$logFile = "$logDir\codebase-mcp.log"

if (Test-Path $logFile) {
    Write-Host ""
    Write-Host "✓ 日志文件已创建" -ForegroundColor Green
    Write-Host ""
    Write-Host "最后 30 行日志:" -ForegroundColor Cyan
    Write-Host "=" * 80 -ForegroundColor Gray
    
    $logContent = Get-Content $logFile -Tail 30
    foreach ($line in $logContent) {
        # 高亮显示配置相关的行
        if ($line -match "Configuration|Config|BASE_URL|TOKEN|ENHANCE") {
            Write-Host $line -ForegroundColor Yellow
        } elseif ($line -match "ERROR|Error|error") {
            Write-Host $line -ForegroundColor Red
        } elseif ($line -match "SUCCESS|Success|✓") {
            Write-Host $line -ForegroundColor Green
        } else {
            Write-Host $line -ForegroundColor Gray
        }
    }
    
    Write-Host "=" * 80 -ForegroundColor Gray
    Write-Host ""
    
    # 检查配置是否正确加载
    $configLoaded = $logContent | Select-String -Pattern "Configuration loaded from"
    if ($configLoaded) {
        Write-Host "✓ 配置文件已加载" -ForegroundColor Green
    } else {
        Write-Host "⚠ 未找到配置加载日志" -ForegroundColor Yellow
    }
    
    # 检查是否有错误
    $errors = $logContent | Select-String -Pattern "ERROR|Error|Failed"
    if ($errors) {
        Write-Host ""
        Write-Host "⚠ 发现错误:" -ForegroundColor Yellow
        foreach ($error in $errors) {
            Write-Host "  $error" -ForegroundColor Red
        }
    }
} else {
    Write-Host "✗ 日志文件未创建" -ForegroundColor Red
}

# 关闭应用
Write-Host ""
Write-Host "关闭应用..." -ForegroundColor Yellow

try {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    Write-Host "✓ 应用已关闭" -ForegroundColor Green
} catch {
    Write-Host "ℹ 应用可能已经关闭" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== 测试完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "下一步:" -ForegroundColor Cyan
Write-Host "  1. 查看完整日志: notepad `"$logFile`"" -ForegroundColor White
Write-Host "  2. 手动启动应用: .\scripts\test-portable.ps1" -ForegroundColor White
Write-Host "  3. 访问 Web UI: http://localhost:8090" -ForegroundColor White
Write-Host "  4. 访问调试页面: http://localhost:8090/debug" -ForegroundColor White
