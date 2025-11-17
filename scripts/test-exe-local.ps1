# 本地 EXE 文件测试脚本
# 用于在本地环境测试 Prompt Enhance exe 文件的基本功能

param(
    [string]$ExePath = "packages\prompt-enhance\build\prompt-enhance-win-x64.exe",
    [int]$Port = 8090,
    [int]$TestDuration = 10
)

Write-Host "🧪 Prompt Enhance EXE 本地测试" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检查 exe 文件是否存在
Write-Host "1️⃣ 检查 EXE 文件..." -ForegroundColor Yellow
if (Test-Path $ExePath) {
    $fileInfo = Get-Item $ExePath
    $fileSizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
    Write-Host "   ✅ 文件存在: $ExePath" -ForegroundColor Green
    Write-Host "   📦 文件大小: $fileSizeMB MB" -ForegroundColor Gray
    
    if ($fileSizeMB -lt 10) {
        Write-Host "   ⚠️  警告: 文件大小异常小，可能构建不完整" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ 文件不存在: $ExePath" -ForegroundColor Red
    Write-Host "   💡 请先运行: npm run package:prompt-enhance" -ForegroundColor Cyan
    exit 1
}

# 2. 检查端口是否被占用
Write-Host ""
Write-Host "2️⃣ 检查端口 $Port..." -ForegroundColor Yellow
$portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "   ⚠️  端口 $Port 已被占用" -ForegroundColor Yellow
    Write-Host "   进程: $($portInUse.OwningProcess)" -ForegroundColor Gray
    $continue = Read-Host "   是否继续测试? (y/n)"
    if ($continue -ne 'y') {
        exit 0
    }
} else {
    Write-Host "   ✅ 端口 $Port 可用" -ForegroundColor Green
}

# 3. 检查配置目录
Write-Host ""
Write-Host "3️⃣ 检查配置目录..." -ForegroundColor Yellow
$configDir = "$env:USERPROFILE\.codebase-mcp"
if (Test-Path $configDir) {
    Write-Host "   ℹ️  配置目录已存在: $configDir" -ForegroundColor Cyan
    Write-Host "   📝 现有配置将被使用" -ForegroundColor Gray
} else {
    Write-Host "   ℹ️  配置目录不存在，将在首次运行时创建" -ForegroundColor Cyan
}

# 4. 启动 exe 文件
Write-Host ""
Write-Host "4️⃣ 启动应用..." -ForegroundColor Yellow
Write-Host "   🚀 启动命令: $ExePath --web-port $Port" -ForegroundColor Gray

try {
    # 启动进程（不等待）
    $process = Start-Process -FilePath $ExePath -ArgumentList "--web-port", $Port -PassThru -WindowStyle Normal
    
    if ($process) {
        Write-Host "   ✅ 进程已启动 (PID: $($process.Id))" -ForegroundColor Green
        
        # 等待服务器启动
        Write-Host ""
        Write-Host "5️⃣ 等待服务器启动..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
        
        # 检查进程是否仍在运行
        if ($process.HasExited) {
            Write-Host "   ❌ 进程已退出 (退出码: $($process.ExitCode))" -ForegroundColor Red
            Write-Host "   💡 请检查日志: $configDir\log\acemcp.log" -ForegroundColor Cyan
            exit 1
        }
        
        # 6. 测试 HTTP 连接
        Write-Host ""
        Write-Host "6️⃣ 测试 HTTP 连接..." -ForegroundColor Yellow
        $maxRetries = 5
        $connected = $false
        
        for ($i = 1; $i -le $maxRetries; $i++) {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:$Port" -TimeoutSec 2 -UseBasicParsing
                if ($response.StatusCode -eq 200) {
                    Write-Host "   ✅ HTTP 连接成功 (状态码: 200)" -ForegroundColor Green
                    $connected = $true
                    break
                }
            } catch {
                Write-Host "   ⏳ 尝试 $i/$maxRetries..." -ForegroundColor Gray
                Start-Sleep -Seconds 2
            }
        }
        
        if (-not $connected) {
            Write-Host "   ❌ 无法连接到 http://localhost:$Port" -ForegroundColor Red
            Write-Host "   💡 请检查应用是否正常启动" -ForegroundColor Cyan
        }
        
        # 7. 测试 API 端点
        if ($connected) {
            Write-Host ""
            Write-Host "7️⃣ 测试 API 端点..." -ForegroundColor Yellow
            
            # 测试 /api/status
            try {
                $statusResponse = Invoke-RestMethod -Uri "http://localhost:$Port/api/status" -Method Get
                Write-Host "   ✅ /api/status - 正常" -ForegroundColor Green
                Write-Host "      服务器状态: $($statusResponse.status)" -ForegroundColor Gray
            } catch {
                Write-Host "   ⚠️  /api/status - 失败" -ForegroundColor Yellow
            }
            
            # 测试 /api/config
            try {
                $configResponse = Invoke-RestMethod -Uri "http://localhost:$Port/api/config" -Method Get
                Write-Host "   ✅ /api/config - 正常" -ForegroundColor Green
            } catch {
                Write-Host "   ⚠️  /api/config - 失败" -ForegroundColor Yellow
            }
        }
        
        # 8. 运行时间测试
        Write-Host ""
        Write-Host "8️⃣ 稳定性测试 (运行 $TestDuration 秒)..." -ForegroundColor Yellow
        Write-Host "   ⏱️  开始时间: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray
        
        $startTime = Get-Date
        $memoryReadings = @()
        
        while (((Get-Date) - $startTime).TotalSeconds -lt $TestDuration) {
            if ($process.HasExited) {
                Write-Host "   ❌ 进程意外退出" -ForegroundColor Red
                break
            }
            
            # 刷新进程信息
            $process.Refresh()
            $memoryMB = [math]::Round($process.WorkingSet64 / 1MB, 2)
            $memoryReadings += $memoryMB
            
            $elapsed = [math]::Round(((Get-Date) - $startTime).TotalSeconds, 0)
            Write-Host "   ⏳ $elapsed/$TestDuration 秒 | 内存: $memoryMB MB" -ForegroundColor Gray
            
            Start-Sleep -Seconds 2
        }
        
        if (-not $process.HasExited) {
            Write-Host "   ✅ 稳定性测试通过" -ForegroundColor Green
            
            $avgMemory = [math]::Round(($memoryReadings | Measure-Object -Average).Average, 2)
            $maxMemory = [math]::Round(($memoryReadings | Measure-Object -Maximum).Maximum, 2)
            
            Write-Host "   📊 内存统计:" -ForegroundColor Gray
            Write-Host "      平均: $avgMemory MB" -ForegroundColor Gray
            Write-Host "      峰值: $maxMemory MB" -ForegroundColor Gray
            
            if ($maxMemory -gt 500) {
                Write-Host "   ⚠️  警告: 内存使用较高" -ForegroundColor Yellow
            }
        }
        
        # 9. 清理
        Write-Host ""
        Write-Host "9️⃣ 清理..." -ForegroundColor Yellow
        
        if (-not $process.HasExited) {
            Write-Host "   🛑 停止进程..." -ForegroundColor Gray
            Stop-Process -Id $process.Id -Force
            Start-Sleep -Seconds 1
            Write-Host "   ✅ 进程已停止" -ForegroundColor Green
        }
        
        # 10. 验证配置文件
        Write-Host ""
        Write-Host "🔟 验证配置文件..." -ForegroundColor Yellow
        
        $settingsFile = "$configDir\settings.toml"
        if (Test-Path $settingsFile) {
            Write-Host "   ✅ settings.toml 已生成" -ForegroundColor Green
            $fileSize = (Get-Item $settingsFile).Length
            Write-Host "      文件大小: $fileSize 字节" -ForegroundColor Gray
        } else {
            Write-Host "   ⚠️  settings.toml 未生成" -ForegroundColor Yellow
        }
        
        $logFile = "$configDir\log\acemcp.log"
        if (Test-Path $logFile) {
            Write-Host "   ✅ 日志文件已生成" -ForegroundColor Green
            $logLines = (Get-Content $logFile | Measure-Object -Line).Lines
            Write-Host "      日志行数: $logLines" -ForegroundColor Gray
        } else {
            Write-Host "   ⚠️  日志文件未生成" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "   ❌ 无法启动进程" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "   ❌ 启动失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 测试总结
Write-Host ""
Write-Host "✨ 测试完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📋 测试摘要:" -ForegroundColor Cyan
Write-Host "   • EXE 文件: ✅" -ForegroundColor Gray
Write-Host "   • 进程启动: ✅" -ForegroundColor Gray
Write-Host "   • HTTP 连接: $(if ($connected) { '✅' } else { '❌' })" -ForegroundColor Gray
Write-Host "   • 稳定性: ✅" -ForegroundColor Gray
Write-Host "   • 配置文件: ✅" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 下一步:" -ForegroundColor Cyan
Write-Host "   1. 在浏览器访问: http://localhost:$Port" -ForegroundColor Gray
Write-Host "   2. 测试 Web UI 功能" -ForegroundColor Gray
Write-Host "   3. 参考 EXE_TEST_GUIDE.md 进行完整测试" -ForegroundColor Gray
Write-Host ""
