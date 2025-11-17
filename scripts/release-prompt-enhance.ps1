#!/usr/bin/env pwsh
# Prompt Enhance 发布脚本

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTests,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Write-Host "=== Prompt Enhance Release Script ===" -ForegroundColor Cyan
Write-Host ""

# 验证版本号格式
if ($Version -notmatch '^\d+\.\d+\.\d+(-[a-z]+\.\d+)?$') {
    Write-Host "✗ Invalid version format: $Version" -ForegroundColor Red
    Write-Host "Expected format: X.Y.Z or X.Y.Z-alpha.N" -ForegroundColor Yellow
    exit 1
}

$TagName = "prompt-enhance-v$Version"

Write-Host "Version: $Version" -ForegroundColor Green
Write-Host "Tag: $TagName" -ForegroundColor Green
Write-Host ""

# 检查是否在正确的目录
if (-not (Test-Path "packages/prompt-enhance/package.json")) {
    Write-Host "✗ Must run from repository root" -ForegroundColor Red
    exit 1
}

# 检查 Git 状态
Write-Host "[1/8] Checking Git status..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus -and -not $DryRun) {
    Write-Host "✗ Working directory is not clean" -ForegroundColor Red
    Write-Host "Please commit or stash your changes first" -ForegroundColor Yellow
    git status
    exit 1
}
Write-Host "✓ Git status clean" -ForegroundColor Green
Write-Host ""

# 检查是否在 main 分支
Write-Host "[2/8] Checking branch..." -ForegroundColor Yellow
$currentBranch = git branch --show-current
if ($currentBranch -ne "main" -and -not $DryRun) {
    Write-Host "⚠ Warning: Not on main branch (current: $currentBranch)" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y") {
        Write-Host "Aborted" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✓ Branch: $currentBranch" -ForegroundColor Green
Write-Host ""

# 更新版本号
Write-Host "[3/8] Updating version in package.json..." -ForegroundColor Yellow
$packageJsonPath = "packages/prompt-enhance/package.json"
$packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
$oldVersion = $packageJson.version
$packageJson.version = $Version
$packageJson | ConvertTo-Json -Depth 100 | Set-Content $packageJsonPath -Encoding UTF8
Write-Host "✓ Version updated: $oldVersion → $Version" -ForegroundColor Green
Write-Host ""

# 安装依赖
Write-Host "[4/8] Installing dependencies..." -ForegroundColor Yellow
npm ci
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green
Write-Host ""

# 构建
Write-Host "[5/8] Building..." -ForegroundColor Yellow
npm run build -w @codebase-mcp/shared
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to build shared package" -ForegroundColor Red
    exit 1
}

npm run build:electron -w @codebase-mcp/prompt-enhance
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to build prompt-enhance package" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Build completed" -ForegroundColor Green
Write-Host ""

# 测试
if (-not $SkipTests) {
    Write-Host "[6/8] Running tests..." -ForegroundColor Yellow
    npm test -w @codebase-mcp/prompt-enhance
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠ Tests failed" -ForegroundColor Yellow
        $continue = Read-Host "Continue anyway? (y/N)"
        if ($continue -ne "y") {
            Write-Host "Aborted" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "✓ Tests passed" -ForegroundColor Green
    }
    Write-Host ""
} else {
    Write-Host "[6/8] Skipping tests..." -ForegroundColor Yellow
    Write-Host ""
}

# 打包测试
Write-Host "[7/8] Packaging (test)..." -ForegroundColor Yellow
npm run package:electron:win -w @codebase-mcp/prompt-enhance
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to package" -ForegroundColor Red
    exit 1
}

# 检查构建产物
$exeFiles = Get-ChildItem -Path "packages/prompt-enhance/build/electron" -Filter "*.exe" -Recurse
if ($exeFiles.Count -eq 0) {
    Write-Host "✗ No exe files found" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Package created:" -ForegroundColor Green
$exeFiles | ForEach-Object {
    $sizeMB = [math]::Round($_.Length / 1MB, 2)
    Write-Host "  - $($_.Name) ($sizeMB MB)" -ForegroundColor Cyan
}
Write-Host ""

# Dry run 模式
if ($DryRun) {
    Write-Host "=== DRY RUN MODE ===" -ForegroundColor Yellow
    Write-Host "Would execute:" -ForegroundColor Yellow
    Write-Host "  git add ." -ForegroundColor Gray
    Write-Host "  git commit -m 'chore: release prompt-enhance v$Version'" -ForegroundColor Gray
    Write-Host "  git tag -a $TagName -m 'Release Prompt Enhance v$Version'" -ForegroundColor Gray
    Write-Host "  git push origin main" -ForegroundColor Gray
    Write-Host "  git push origin $TagName" -ForegroundColor Gray
    Write-Host ""
    Write-Host "✓ Dry run completed successfully" -ForegroundColor Green
    exit 0
}

# 提交和推送
Write-Host "[8/8] Committing and pushing..." -ForegroundColor Yellow

# 确认
Write-Host ""
Write-Host "Ready to release:" -ForegroundColor Cyan
Write-Host "  Version: $Version" -ForegroundColor White
Write-Host "  Tag: $TagName" -ForegroundColor White
Write-Host "  Branch: $currentBranch" -ForegroundColor White
Write-Host ""
$confirm = Read-Host "Proceed with release? (y/N)"
if ($confirm -ne "y") {
    Write-Host "Aborted" -ForegroundColor Red
    exit 1
}

# Git 操作
git add .
git commit -m "chore: release prompt-enhance v$Version"
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to commit" -ForegroundColor Red
    exit 1
}

git tag -a $TagName -m "Release Prompt Enhance v$Version

Features and improvements in this release.
See CHANGELOG.md for details.
"
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to create tag" -ForegroundColor Red
    exit 1
}

git push origin $currentBranch
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to push commits" -ForegroundColor Red
    exit 1
}

git push origin $TagName
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to push tag" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Release completed successfully" -ForegroundColor Green
Write-Host ""

# 显示后续步骤
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Monitor GitHub Actions build:" -ForegroundColor White
Write-Host "   https://github.com/YOUR_USERNAME/YOUR_REPO/actions" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Check the release when ready:" -ForegroundColor White
Write-Host "   https://github.com/YOUR_USERNAME/YOUR_REPO/releases/tag/$TagName" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Download and test the artifacts" -ForegroundColor White
Write-Host ""
Write-Host "4. Announce the release!" -ForegroundColor White
Write-Host ""

Write-Host "✨ Release v$Version is on its way!" -ForegroundColor Green
