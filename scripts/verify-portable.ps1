#!/usr/bin/env pwsh
# 验证便携版打包结果

$ErrorActionPreference = "Stop"

Write-Host "=== 验证 Prompt Enhance 便携版 ===" -ForegroundColor Cyan
Write-Host ""

# 1. 检查 exe 文件
Write-Host "[1/5] 检查 exe 文件..." -ForegroundColor Yellow
$portableExe = Get-ChildItem -Path "packages/prompt-enhance/build/electron" -Filter "*portable.exe" | Select-Object -First 1

if ($portableExe) {
    Write-Host "✓ 找到便携版: $($portableExe.Name)" -ForegroundColor Green
    Write-Host "  大小: $([math]::Round($portableExe.Length/1MB, 2)) MB" -ForegroundColor Cyan
    Write-Host "  路径: $($portableExe.FullName)" -ForegroundColor Gray
} else {
    Write-Host "✗ 未找到便携版 exe" -ForegroundColor Red
    exit 1
}

# 2. 检查 unpacked 目录
Write-Host ""
Write-Host "[2/5] 检查 unpacked 目录..." -ForegroundColor Yellow
$unpackedDir = "packages/prompt-enhance/build/electron/win-unpacked"

if (Test-Path $unpackedDir) {
    Write-Host "✓ unpacked 目录存在" -ForegroundColor Green
    
    # 检查关键文件
    $exeFile = Get-ChildItem -Path $unpackedDir -Filter "*.exe" | Select-Object -First 1
    if ($exeFile) {
        Write-Host "  ✓ 主程序: $($exeFile.Name)" -ForegroundColor Green
    }
    
    $resourcesDir = "$unpackedDir/resources"
    if (Test-Path $resourcesDir) {
        Write-Host "  ✓ resources 目录存在" -ForegroundColor Green
        
        $asarFile = "$resourcesDir/app.asar"
        if (Test-Path $asarFile) {
            $asarSize = [math]::Round((Get-Item $asarFile).Length/1MB, 2)
            Write-Host "  ✓ app.asar 存在 ($asarSize MB)" -ForegroundColor Green
        } else {
            Write-Host "  ✗ app.asar 不存在" -ForegroundColor Red
        }
    }
} else {
    Write-Host "✗ unpacked 目录不存在" -ForegroundColor Red
}

# 3. 检查 dist 目录结构
Write-Host ""
Write-Host "[3/5] 检查 dist 目录结构..." -ForegroundColor Yellow
$distDir = "packages/prompt-enhance/dist"

if (Test-Path $distDir) {
    Write-Host "✓ dist 目录存在" -ForegroundColor Green
    
    # 检查关键目录
    $webTemplates = "$distDir/web/templates"
    if (Test-Path $webTemplates) {
        Write-Host "  ✓ web/templates 目录存在" -ForegroundColor Green
        
        $files = @("index.html", "debug.html")
        foreach ($file in $files) {
            if (Test-Path "$webTemplates/$file") {
                Write-Host "    ✓ $file" -ForegroundColor Green
            } else {
                Write-Host "    ✗ $file 缺失" -ForegroundColor Red
            }
        }
        
        $dirs = @("scripts", "styles", "components")
        foreach ($dir in $dirs) {
            if (Test-Path "$webTemplates/$dir") {
                Write-Host "    ✓ $dir/" -ForegroundColor Green
            } else {
                Write-Host "    ✗ $dir/ 缺失" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "  ✗ web/templates 目录不存在" -ForegroundColor Red
    }
} else {
    Write-Host "✗ dist 目录不存在" -ForegroundColor Red
}

# 4. 检查配置文件路径
Write-Host ""
Write-Host "[4/5] 检查配置文件路径..." -ForegroundColor Yellow
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

# 5. 生成测试报告
Write-Host ""
Write-Host "[5/5] 生成测试报告..." -ForegroundColor Yellow

$report = @"
=== Prompt Enhance 便携版验证报告 ===

文件信息:
  名称: $($portableExe.Name)
  大小: $([math]::Round($portableExe.Length/1MB, 2)) MB
  路径: $($portableExe.FullName)
  修改时间: $($portableExe.LastWriteTime)

配置路径:
  配置目录: $configDir
  配置文件: $configDir\settings.toml
  日志目录: $configDir\log
  日志文件: $configDir\log\codebase-mcp.log

使用方法:
  1. 双击运行: $($portableExe.Name)
  2. 访问 Web UI: http://localhost:8090
  3. 访问调试页面: http://localhost:8090/debug
  4. 查看日志: notepad $configDir\log\codebase-mcp.log

测试清单:
  ☐ 应用能够启动
  ☐ 窗口正常显示
  ☐ Web UI 正常加载（不是空白）
  ☐ 配置文件自动创建
  ☐ 日志文件正常记录
  ☐ /debug 页面可访问
  ☐ 所有功能正常工作

下一步:
  运行测试脚本: .\scripts\test-portable.ps1
"@

Write-Host $report -ForegroundColor White

# 保存报告
$reportFile = "packages/prompt-enhance/build/VERIFICATION_REPORT.txt"
$report | Out-File -FilePath $reportFile -Encoding UTF8
Write-Host ""
Write-Host "✓ 报告已保存: $reportFile" -ForegroundColor Green

Write-Host ""
Write-Host "=== 验证完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "便携版已准备就绪！" -ForegroundColor Cyan
Write-Host "运行测试: .\scripts\test-portable.ps1" -ForegroundColor Yellow
