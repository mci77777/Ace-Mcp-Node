#!/usr/bin/env pwsh
# 测试 Retrieval EXE 打包结果

$ErrorActionPreference = "Stop"

Write-Host "=== 测试 Codebase Retrieval EXE ===" -ForegroundColor Cyan
Write-Host ""

# 1. 检查 exe 文件
Write-Host "[1/5] 检查 exe 文件..." -ForegroundColor Yellow
$exePath = "packages\retrieval\build\pkg\codebase-retrieval-win-x64.exe"

if (Test-Path $exePath) {
    $exe = Get-Item $exePath
    Write-Host "✓ 找到 exe 文件" -ForegroundColor Green
    Write-Host "  名称: $($exe.Name)" -ForegroundColor Cyan
    Write-Host "  大小: $([math]::Round($exe.Length/1MB, 2)) MB" -ForegroundColor Cyan
    Write-Host "  路径: $($exe.FullName)" -ForegroundColor Gray
} else {
    Write-Host "✗ 未找到 exe 文件: $exePath" -ForegroundColor Red
    Write-Host "请先运行: npm run package:pkg -w @codebase-mcp/retrieval" -ForegroundColor Yellow
    exit 1
}

# 2. 检查 bundle 文件
Write-Host ""
Write-Host "[2/5] 检查 bundle 文件..." -ForegroundColor Yellow
$bundlePath = "packages\retrieval\dist\bundle.cjs"

if (Test-Path $bundlePath) {
    $bundle = Get-Item $bundlePath
    Write-Host "✓ Bundle 文件存在" -ForegroundColor Green
    Write-Host "  大小: $([math]::Round($bundle.Length/1MB, 2)) MB" -ForegroundColor Cyan
} else {
    Write-Host "✗ Bundle 文件不存在" -ForegroundColor Red
}

# 3. 检查 Web 模板
Write-Host ""
Write-Host "[3/5] 检查 Web 模板..." -ForegroundColor Yellow
$templatesDir = "packages\retrieval\dist\web\templates"

if (Test-Path $templatesDir) {
    Write-Host "✓ Web 模板目录存在" -ForegroundColor Green
    
    $files = @("index.html")
    foreach ($file in $files) {
        if (Test-Path "$templatesDir\$file") {
            Write-Host "  ✓ $file" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $file 缺失" -ForegroundColor Red
        }
    }
} else {
    Write-Host "⚠ Web 模板目录不存在（可选功能）" -ForegroundColor Yellow
}

# 4. 测试 exe 启动
Write-Host ""
Write-Host "[4/5] 测试 exe 启动..." -ForegroundColor Yellow
Write-Host "启动 exe（将在 3 秒后自动停止）..." -ForegroundColor Gray

try {
    $proc = Start-Process -FilePath $exe.FullName -PassThru -NoNewWindow -RedirectStandardOutput "test-output.txt" -RedirectStandardError "test-error.txt"
    Start-Sleep -Seconds 3
    
    if ($proc.HasExited) {
        Write-Host "⚠ 进程已退出（预期行为，因为没有 MCP 客户端连接）" -ForegroundColor Yellow
        
        # 检查输出
        if (Test-Path "test-output.txt") {
            $output = Get-Content "test-output.txt" -Raw
            if ($output) {
                Write-Host "  输出: $($output.Substring(0, [Math]::Min(100, $output.Length)))..." -ForegroundColor Gray
            }
        }
        
        if (Test-Path "test-error.txt") {
            $error = Get-Content "test-error.txt" -Raw
            if ($error) {
                Write-Host "  错误: $($error.Substring(0, [Math]::Min(100, $error.Length)))..." -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "✓ 进程启动成功" -ForegroundColor Green
        Stop-Process -Id $proc.Id -Force
    }
    
    # 清理测试文件
    Remove-Item "test-output.txt" -ErrorAction SilentlyContinue
    Remove-Item "test-error.txt" -ErrorAction SilentlyContinue
    
} catch {
    Write-Host "✗ 启动失败: $_" -ForegroundColor Red
}

# 5. 检查配置目录
Write-Host ""
Write-Host "[5/5] 检查配置目录..." -ForegroundColor Yellow
$configDir = "$env:USERPROFILE\.codebase-mcp"
Write-Host "  配置目录: $configDir" -ForegroundColor Cyan

if (Test-Path $configDir) {
    Write-Host "  ✓ 配置目录已存在" -ForegroundColor Green
    
    if (Test-Path "$configDir\settings.toml") {
        Write-Host "  ✓ settings.toml 存在" -ForegroundColor Green
    } else {
        Write-Host "  ℹ settings.toml 不存在（首次运行时会创建）" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ℹ 配置目录不存在（首次运行时会创建）" -ForegroundColor Yellow
}

# 生成测试报告
Write-Host ""
Write-Host "=== 测试报告 ===" -ForegroundColor Cyan
Write-Host ""

$report = @"
文件信息:
  EXE: $($exe.Name) ($([math]::Round($exe.Length/1MB, 2)) MB)
  路径: $($exe.FullName)

配置路径:
  配置目录: $configDir
  配置文件: $configDir\settings.toml
  日志目录: $configDir\log
  日志文件: $configDir\log\codebase-mcp.log

MCP 配置示例（Claude Desktop）:
{
  "mcpServers": {
    "codebase-retrieval": {
      "command": "$($exe.FullName.Replace('\', '\\'))"
    }
  }
}

MCP 配置示例（安装到系统后）:
{
  "mcpServers": {
    "codebase-retrieval": {
      "command": "codebase-retrieval"
    }
  }
}

安装到系统:
  cd packages\retrieval
  .\scripts\install-windows.ps1

测试 Web UI:
  $($exe.FullName) --web-port 8091
  访问: http://localhost:8091

下一步:
  1. 测试 MCP 集成（需要 MCP 客户端）
  2. 运行安装脚本: .\packages\retrieval\scripts\install-windows.ps1
  3. 验证环境变量: codebase-retrieval --help
"@

Write-Host $report -ForegroundColor White

Write-Host ""
Write-Host "=== 测试完成 ===" -ForegroundColor Green
