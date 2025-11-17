# GitHub Actions 工作流验证脚本
# 用于检查工作流运行状态和 Release 创建情况

param(
    [string]$Tag = "prompt-enhance-v0.1.0-test",
    [string]$Repo = "mci77777/Ace-Mcp-Node"
)

Write-Host "🔍 验证 GitHub Actions 工作流..." -ForegroundColor Cyan
Write-Host ""

# 1. 检查 tag 是否存在
Write-Host "1️⃣ 检查 Git Tag..." -ForegroundColor Yellow
$tagExists = git tag -l $Tag
if ($tagExists) {
    Write-Host "   ✅ Tag '$Tag' 存在" -ForegroundColor Green
} else {
    Write-Host "   ❌ Tag '$Tag' 不存在" -ForegroundColor Red
    exit 1
}

# 2. 检查 tag 是否已推送到远程
Write-Host ""
Write-Host "2️⃣ 检查远程 Tag..." -ForegroundColor Yellow
$remoteTags = git ls-remote --tags origin
if ($remoteTags -match $Tag) {
    Write-Host "   ✅ Tag 已推送到远程仓库" -ForegroundColor Green
} else {
    Write-Host "   ❌ Tag 未推送到远程仓库" -ForegroundColor Red
    exit 1
}

# 3. 提供 GitHub Actions 链接
Write-Host ""
Write-Host "3️⃣ GitHub Actions 工作流" -ForegroundColor Yellow
$actionsUrl = "https://github.com/$Repo/actions"
Write-Host "   🔗 访问: $actionsUrl" -ForegroundColor Cyan
Write-Host "   📋 查找工作流: 'Build Prompt Enhance'" -ForegroundColor Gray
Write-Host "   🏷️  触发 Tag: $Tag" -ForegroundColor Gray

# 4. 提供 Release 链接
Write-Host ""
Write-Host "4️⃣ GitHub Release" -ForegroundColor Yellow
$releaseUrl = "https://github.com/$Repo/releases/tag/$Tag"
Write-Host "   🔗 访问: $releaseUrl" -ForegroundColor Cyan
Write-Host "   📦 预期文件: prompt-enhance-win-x64.exe" -ForegroundColor Gray

# 5. 本地构建验证（可选）
Write-Host ""
Write-Host "5️⃣ 本地构建验证（可选）" -ForegroundColor Yellow
Write-Host "   运行以下命令验证本地构建：" -ForegroundColor Gray
Write-Host "   npm run clean" -ForegroundColor DarkGray
Write-Host "   npm ci" -ForegroundColor DarkGray
Write-Host "   npm run build:shared" -ForegroundColor DarkGray
Write-Host "   npm run build:prompt-enhance" -ForegroundColor DarkGray
Write-Host "   npm run package:prompt-enhance" -ForegroundColor DarkGray

# 6. 验证清单
Write-Host ""
Write-Host "📋 验证清单" -ForegroundColor Yellow
Write-Host "   [ ] 工作流已触发并运行" -ForegroundColor Gray
Write-Host "   [ ] 所有构建步骤成功" -ForegroundColor Gray
Write-Host "   [ ] exe 文件已生成（40-60 MB）" -ForegroundColor Gray
Write-Host "   [ ] Release 已创建" -ForegroundColor Gray
Write-Host "   [ ] exe 文件可下载" -ForegroundColor Gray

Write-Host ""
Write-Host "✨ 验证完成！请访问上述链接检查工作流状态。" -ForegroundColor Green
Write-Host ""
Write-Host "💡 提示：如果工作流失败，请查看详细日志并参考 WORKFLOW_TEST_GUIDE.md" -ForegroundColor Cyan
