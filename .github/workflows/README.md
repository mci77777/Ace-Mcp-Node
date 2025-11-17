# GitHub Actions Workflows

本目录包含自动化构建和发布工作流。

## 工作流列表

- **build-prompt-enhance-electron.yml** - 构建和发布 Prompt Enhance Electron 桌面应用（Windows/macOS/Linux）
- **build-retrieval.yml** - 构建和发布 Retrieval MCP 服务器

---

## Build Prompt Enhance Electron（新版）

自动构建和发布 Prompt Enhance Electron 桌面应用，支持 Windows、macOS 和 Linux。

### 触发条件

- **自动触发**: 推送符合 `prompt-enhance-v*` 格式的 tag
- **手动触发**: 在 GitHub Actions 页面手动运行

### 支持平台

| 平台 | 构建产物 | 说明 |
|------|---------|------|
| Windows | `.exe` (NSIS 安装版 + Portable 便携版) | 约 92 MB |
| macOS | `.dmg` + `.zip` | 需要 macOS runner |
| Linux | `.AppImage` + `.deb` | 适用于大多数发行版 |

### 使用方法

#### 方法 1: 自动发布（推荐）

```bash
# 1. 更新版本号
cd packages/prompt-enhance
# 编辑 package.json 中的 version 字段

# 2. 提交更改
git add .
git commit -m "chore: release prompt-enhance v0.1.0"

# 3. 创建并推送 tag
git tag -a prompt-enhance-v0.1.0 -m "Release Prompt Enhance v0.1.0"
git push origin main
git push origin prompt-enhance-v0.1.0
```

#### 方法 2: 使用发布脚本

```powershell
# 自动化整个发布流程
.\scripts\release-prompt-enhance.ps1 -Version "0.1.0"

# Dry run（测试但不实际发布）
.\scripts\release-prompt-enhance.ps1 -Version "0.1.0" -DryRun

# 跳过测试
.\scripts\release-prompt-enhance.ps1 -Version "0.1.0" -SkipTests
```

#### 方法 3: 手动触发

1. 访问 GitHub Actions 页面
2. 选择 "Build Prompt Enhance Electron"
3. 点击 "Run workflow"
4. 输入版本号（可选）
5. 点击 "Run workflow"

### 工作流步骤

每个平台的构建流程：

1. **Checkout code** - 检出代码
2. **Setup Node.js** - 设置 Node.js 18 环境
3. **Install dependencies** - 安装依赖（npm ci）
4. **Build shared package** - 构建共享包
5. **Build prompt-enhance package** - 构建 prompt-enhance 包（TypeScript + 复制模板）
6. **Verify build output** - 验证构建产物（检查模板文件）
7. **Package Electron app** - 使用 electron-builder 打包
8. **List build artifacts** - 列出构建产物
9. **Upload artifacts** - 上传到 GitHub（保留 7 天）
10. **Create Release** - 创建 GitHub Release（仅 tag 触发时）

### 构建产物

#### Windows
- `Prompt Enhance-{version}-win-x64.exe` - NSIS 安装程序（约 92 MB）
- `Prompt Enhance-{version}-portable.exe` - 便携版（约 92 MB）

#### macOS
- `Prompt Enhance-{version}.dmg` - DMG 镜像
- `Prompt Enhance-{version}-mac.zip` - ZIP 压缩包

#### Linux
- `Prompt Enhance-{version}.AppImage` - AppImage 格式
- `Prompt Enhance-{version}.deb` - Debian 包

### 本地测试

发布前务必本地测试：

```powershell
# 1. 构建
npm run build:electron -w @codebase-mcp/prompt-enhance

# 2. 验证文件
ls packages/prompt-enhance/dist/web/templates

# 3. 本地运行
npm run start:electron -w @codebase-mcp/prompt-enhance

# 4. 打包测试
npm run package:electron:win -w @codebase-mcp/prompt-enhance

# 5. 运行打包后的应用
$exe = Get-ChildItem -Path "packages/prompt-enhance/build/electron" -Filter "*.exe" -Recurse | 
    Where-Object { $_.Name -notlike "*Uninstall*" } | 
    Select-Object -First 1
& $exe.FullName
```

### 故障排除

#### 构建失败

1. **检查依赖**
   ```bash
   npm ci
   ```

2. **本地测试构建**
   ```bash
   npm run build:electron -w @codebase-mcp/prompt-enhance
   ```

3. **验证模板文件**
   ```bash
   ls packages/prompt-enhance/dist/web/templates
   # 应该看到: index.html, debug.html, scripts/, styles/, components/
   ```

#### Web UI 空白

如果打包后 Web UI 显示空白：

1. 访问 `http://localhost:8090/debug` 查看诊断信息
2. 查看日志：`%USERPROFILE%\.codebase-mcp\log\codebase-mcp.log`
3. 参考 [WEB_UI_DEBUG_GUIDE.md](../../.kiro/specs/architecture-split/WEB_UI_DEBUG_GUIDE.md)

#### Release 创建失败

- 确保 `GITHUB_TOKEN` 有足够权限
- 检查 tag 格式（必须是 `prompt-enhance-v*`）
- 确保构建产物路径正确

### 版本管理

- **Tag 格式**: `prompt-enhance-v<major>.<minor>.<patch>[-prerelease]`
- **正式版本**: `prompt-enhance-v0.1.0`, `prompt-enhance-v1.0.0`
- **预发布版本**: `prompt-enhance-v0.1.0-alpha.1`, `prompt-enhance-v1.0.0-beta.2`
- **语义化版本**: 遵循 [Semantic Versioning](https://semver.org/)

### 相关文档

- [RELEASE_GUIDE.md](../../packages/prompt-enhance/RELEASE_GUIDE.md) - 详细发布流程
- [TROUBLESHOOTING.md](../../packages/prompt-enhance/TROUBLESHOOTING.md) - 故障排除指南
- [WEB_UI_DEBUG_GUIDE.md](../../.kiro/specs/architecture-split/WEB_UI_DEBUG_GUIDE.md) - Web UI 调试指南
- [ELECTRON_INTEGRATION_SUMMARY.md](../../.kiro/specs/architecture-split/ELECTRON_INTEGRATION_SUMMARY.md) - Electron 集成总结

---

## Build Prompt Enhance（旧版 - 已弃用）

> ⚠️ **注意**: 此工作流已被 `build-prompt-enhance-electron.yml` 替代。
> 
> 新版本使用 Electron 打包，提供更好的用户体验和跨平台支持。

---

## Build Prompt Enhance

自动构建和发布 Prompt Enhance Windows 桌面应用。

### 触发条件

当推送符合 `prompt-enhance-v*` 格式的 tag 时自动触发。

### 使用方法

1. **更新版本号**
   ```bash
   cd packages/prompt-enhance
   npm version patch  # 或 minor/major
   ```

2. **创建并推送 tag**
   ```bash
   git add .
   git commit -m "chore: bump prompt-enhance version"
   git tag prompt-enhance-v0.1.0
   git push origin main
   git push origin prompt-enhance-v0.1.0
   ```

3. **等待构建完成**
   - 访问 GitHub Actions 页面查看构建进度
   - 构建成功后会自动创建 Release
   - Release 中包含 `prompt-enhance-win-x64.exe` 文件

### 工作流步骤

1. **Checkout code** - 检出代码
2. **Setup Node.js** - 设置 Node.js 18 环境
3. **Install dependencies** - 安装依赖（npm ci）
4. **Build shared package** - 构建共享包
5. **Build prompt-enhance package** - 构建 prompt-enhance 包
6. **Package to exe** - 使用 pkg 打包为 exe
7. **Verify exe file** - 验证 exe 文件生成
8. **Create Release** - 创建 GitHub Release 并上传文件

### 构建产物

- **文件名**: `prompt-enhance-win-x64.exe`
- **位置**: `packages/prompt-enhance/build/`
- **目标平台**: Windows x64
- **Node.js 版本**: 18

### 故障排除

#### 构建失败

1. **检查依赖安装**
   ```bash
   npm ci
   ```

2. **本地测试构建**
   ```bash
   npm run build:shared
   npm run build:prompt-enhance
   npm run package:prompt-enhance
   ```

3. **验证 exe 文件**
   ```bash
   ls -lh packages/prompt-enhance/build/
   ```

#### Release 创建失败

- 确保 `GITHUB_TOKEN` 有足够权限
- 检查 tag 格式是否正确（必须是 `prompt-enhance-v*`）
- 确保 exe 文件路径正确

### 版本管理

- **Tag 格式**: `prompt-enhance-v<major>.<minor>.<patch>`
- **示例**: `prompt-enhance-v0.1.0`, `prompt-enhance-v1.0.0`
- **语义化版本**: 遵循 [Semantic Versioning](https://semver.org/)

### 扩展

未来可以添加：
- macOS 打包（.app 或 .dmg）
- Linux 打包（AppImage 或 .deb）
- 多平台并行构建
- 自动化测试步骤


---

## Build Retrieval

自动构建和发布 Retrieval MCP 服务器包。

### 触发条件

当推送符合 `retrieval-v*` 格式的 tag 时自动触发。

### 使用方法

1. **更新版本号**
   ```bash
   cd packages/retrieval
   npm version patch  # 或 minor/major
   ```

2. **创建并推送 tag**
   ```bash
   git add .
   git commit -m "chore: bump retrieval version"
   git tag retrieval-v0.1.0
   git push origin main
   git push origin retrieval-v0.1.0
   ```

3. **等待构建完成**
   - 访问 GitHub Actions 页面查看构建进度
   - 构建成功后会自动创建 Release
   - Release 中包含 npm tarball 文件

### 工作流步骤

1. **Checkout code** - 检出代码
2. **Setup Node.js** - 设置 Node.js 18 环境（带 npm 缓存）
3. **Install dependencies** - 安装依赖（npm ci）
4. **Build shared package** - 构建共享包
5. **Build retrieval package** - 构建 retrieval 包
6. **Verify build output** - 验证构建产物
7. **Run tests** - 运行测试（如果有）
8. **Create tarball** - 创建 npm 包 tarball
9. **Create Release** - 创建 GitHub Release 并上传文件
10. **Publish to npm** - （可选）发布到 npm registry

### 构建产物

- **文件名**: `codebase-mcp-retrieval-<tag>.tgz`
- **位置**: 项目根目录
- **内容**: 完整的 npm 包（包含编译后的代码和类型定义）
- **目标平台**: 跨平台（Linux/macOS/Windows）

### npm 发布（可选）

默认情况下，npm 发布步骤是注释掉的。要启用自动发布到 npm：

1. **在 GitHub 仓库设置中添加 NPM_TOKEN**
   - 访问 Settings → Secrets and variables → Actions
   - 添加名为 `NPM_TOKEN` 的 secret
   - 值为你的 npm access token

2. **取消注释工作流中的发布步骤**
   ```yaml
   # 在 .github/workflows/build-retrieval.yml 中找到并取消注释：
   - name: Publish to npm
     if: startsWith(github.ref, 'refs/tags/retrieval-v') && !contains(github.ref, '-')
     run: |
       cd packages/retrieval
       echo "//registry.npmjs.org/:_authToken=${{ secrets.NPM_TOKEN }}" > ~/.npmrc
       npm publish --access public
     env:
       NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
   ```

3. **推送 tag 触发发布**
   - 只有正式版本（不含 `-alpha`、`-beta` 等后缀）会发布到 npm
   - 预发布版本只会创建 GitHub Release

### 安装方式

**从 GitHub Release 安装**:
```bash
# 下载 tarball
wget https://github.com/your-org/your-repo/releases/download/retrieval-v0.1.0/codebase-mcp-retrieval-retrieval-v0.1.0.tgz

# 全局安装
npm install -g codebase-mcp-retrieval-retrieval-v0.1.0.tgz
```

**从 npm 安装**（如果已发布）:
```bash
npm install -g @codebase-mcp/retrieval
```

### MCP 客户端配置

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "codebase-retrieval": {
      "command": "npx",
      "args": ["@codebase-mcp/retrieval"]
    }
  }
}
```

**带 Web 管理界面**:
```json
{
  "mcpServers": {
    "codebase-retrieval": {
      "command": "npx",
      "args": ["@codebase-mcp/retrieval", "--web-port", "8091"]
    }
  }
}
```

### 故障排除

#### 构建失败

1. **检查依赖安装**
   ```bash
   npm ci
   ```

2. **本地测试构建**
   ```bash
   npm run build:shared
   npm run build:retrieval
   ```

3. **验证构建产物**
   ```bash
   ls -lh packages/retrieval/dist/
   ```

#### 测试失败

- 测试步骤设置为 `continue-on-error: true`，不会阻止发布
- 如果需要强制测试通过，移除该选项

#### Release 创建失败

- 确保 `GITHUB_TOKEN` 有足够权限
- 检查 tag 格式是否正确（必须是 `retrieval-v*`）
- 确保 tarball 文件路径正确

#### npm 发布失败

- 确保 `NPM_TOKEN` 已正确配置
- 检查包名是否已被占用
- 确保 npm 账户有发布权限
- 验证 package.json 中的 `name` 字段

### 版本管理

- **Tag 格式**: `retrieval-v<major>.<minor>.<patch>[-prerelease]`
- **正式版本示例**: `retrieval-v0.1.0`, `retrieval-v1.0.0`
- **预发布版本示例**: `retrieval-v0.1.0-alpha.1`, `retrieval-v1.0.0-beta.2`
- **语义化版本**: 遵循 [Semantic Versioning](https://semver.org/)

### 与 Prompt Enhance 的区别

| 特性 | Prompt Enhance | Retrieval |
|------|----------------|-----------|
| 运行环境 | Windows | 跨平台（Linux/macOS/Windows） |
| 打包方式 | pkg → exe | npm tarball |
| 分发方式 | GitHub Release | GitHub Release + npm（可选） |
| 安装方式 | 下载 exe 直接运行 | npm install -g |
| 依赖 Node.js | 否（内嵌） | 是（需要 Node.js 18+） |

### 扩展

未来可以添加：
- 自动化集成测试
- 性能基准测试
- Docker 镜像构建
- 多版本并行发布
- 自动生成 changelog
