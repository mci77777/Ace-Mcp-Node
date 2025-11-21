#!/usr/bin/env pwsh
# Windows 安装脚本 - 将 codebase-retrieval.exe 注册到系统环境变量

param(
    [string]$InstallPath = "$env:LOCALAPPDATA\codebase-retrieval",
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

function Add-ToPath {
    param([string]$Path)
    
    # 获取当前用户的 PATH
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    
    # 检查是否已存在
    if ($currentPath -split ';' | Where-Object { $_ -eq $Path }) {
        Write-Host "✓ 路径已存在于 PATH 中: $Path" -ForegroundColor Green
        return
    }
    
    # 添加到 PATH
    $newPath = "$currentPath;$Path"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "✓ 已添加到 PATH: $Path" -ForegroundColor Green
}

function Remove-FromPath {
    param([string]$Path)
    
    # 获取当前用户的 PATH
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    
    # 移除指定路径
    $newPath = ($currentPath -split ';' | Where-Object { $_ -ne $Path }) -join ';'
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "✓ 已从 PATH 移除: $Path" -ForegroundColor Green
}

if ($Uninstall) {
    Write-Host "=== 卸载 Codebase Retrieval ===" -ForegroundColor Cyan
    
    # 从 PATH 移除
    Remove-FromPath $InstallPath
    
    # 删除安装目录
    if (Test-Path $InstallPath) {
        Remove-Item -Path $InstallPath -Recurse -Force
        Write-Host "✓ 已删除安装目录: $InstallPath" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "卸载完成！" -ForegroundColor Green
    Write-Host "配置文件保留在: $env:USERPROFILE\.codebase-mcp" -ForegroundColor Yellow
    exit 0
}

Write-Host "=== 安装 Codebase Retrieval ===" -ForegroundColor Cyan
Write-Host ""

# 1. 检查 exe 文件
$exePath = "build\pkg\codebase-retrieval-win-x64.exe"
if (-not (Test-Path $exePath)) {
    Write-Host "✗ 未找到 exe 文件: $exePath" -ForegroundColor Red
    Write-Host "请先运行: npm run package:pkg -w @codebase-mcp/retrieval" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ 找到 exe 文件: $exePath" -ForegroundColor Green

# 2. 创建安装目录
if (-not (Test-Path $InstallPath)) {
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    Write-Host "✓ 创建安装目录: $InstallPath" -ForegroundColor Green
}

# 3. 复制 exe 文件
$targetExe = Join-Path $InstallPath "codebase-retrieval.exe"
Copy-Item -Path $exePath -Destination $targetExe -Force
Write-Host "✓ 已复制到: $targetExe" -ForegroundColor Green

# 4. 添加到 PATH
Add-ToPath $InstallPath

# 5. 验证安装
Write-Host ""
Write-Host "=== 验证安装 ===" -ForegroundColor Cyan
Write-Host "请重新打开终端，然后运行以下命令测试：" -ForegroundColor Yellow
Write-Host ""
Write-Host "  codebase-retrieval --help" -ForegroundColor White
Write-Host ""
Write-Host "MCP 配置示例（Claude Desktop）：" -ForegroundColor Yellow
Write-Host @"
{
  "mcpServers": {
    "codebase-retrieval": {
      "command": "codebase-retrieval"
    }
  }
}
"@ -ForegroundColor White
Write-Host ""
Write-Host "安装完成！" -ForegroundColor Green
Write-Host ""
Write-Host "卸载命令: .\scripts\install-windows.ps1 -Uninstall" -ForegroundColor Gray
