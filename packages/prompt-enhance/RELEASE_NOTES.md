# Prompt Enhance v0.1.0 - Release Notes

## 📦 获取应用

由于 GitHub 对文件大小的限制（100MB），exe 文件无法直接提交到仓库。

### 方式 1: 本地构建（推荐）

```bash
# 克隆仓库
git clone https://github.com/mci77777/Ace-Mcp-Node.git
cd Ace-Mcp-Node

# 安装依赖
npm install

# 构建 Prompt Enhance Electron 应用
npm run package:electron -w @codebase-mcp/prompt-enhance
```

构建完成后，exe 文件位于：
- **安装版**: `packages/prompt-enhance/build/electron/Prompt Enhance-0.1.0-win-x64.exe` (92.19 MB)
- **便携版**: `packages/prompt-enhance/build/electron/Prompt Enhance-0.1.0-portable.exe` (91.97 MB)

### 方式 2: GitHub Releases（待发布）

未来版本将通过 GitHub Releases 发布预构建的 exe 文件。

## ✨ 新功能和修复

### 🔧 Prompt Context 组装优化

**问题**：之前的版本会将空内容也添加到 context 中，导致无意义的分隔符和标题。

**修复**：
- ✅ 添加 `.trim()` 检查，确保只有非空内容才被添加
- ✅ 详细的日志记录（记录添加/跳过的原因）
- ✅ 更清晰的 context 结构

**影响**：
- 节省 token 使用
- 提高 AI 模型准确性
- 更好的调试体验

### 🔍 .gitignore 向上查找修复

**问题**：扫描子目录时，无法应用父目录的 .gitignore 规则。

**修复**：
- ✅ 从扫描路径向上查找 .gitignore 文件
- ✅ 使用 gitignoreRoot 作为相对路径基准
- ✅ 正确排除 node_modules、dist 等目录

**影响**：
- 文件扫描更准确
- 避免加载不必要的文件
- 提高索引性能

### 📝 文档清理

**清理**：
- ✅ 删除 56 个中间态文档
- ✅ 保留 17 个核心文档
- ✅ 清理比例：76.7%

**保留的核心文档**：
- README.md（各包）
- CONTRIBUTING.md
- DEVELOPMENT.md
- MIGRATION_GUIDE.md
- TROUBLESHOOTING.md

## 📊 应用信息

### 文件大小

- **安装版**: 92.19 MB
- **便携版**: 91.97 MB
- **解压后**: ~201 MB

### 系统要求

- **操作系统**: Windows 10 或更高版本
- **架构**: x64
- **内存**: 建议 4GB 以上
- **磁盘空间**: 约 300MB

### 配置文件

**统一配置路径**：
```
%USERPROFILE%\.codebase-mcp\settings.toml
%USERPROFILE%\.codebase-mcp\log\codebase-mcp.log
```

## 🚀 使用方法

### 安装版

1. 运行 `Prompt Enhance-0.1.0-win-x64.exe`
2. 按照安装向导完成安装
3. 从开始菜单或桌面快捷方式启动

### 便携版

1. 双击 `Prompt Enhance-0.1.0-portable.exe`
2. 应用直接启动，无需安装

### 首次运行

- 应用会自动创建配置目录和默认配置文件
- 配置文件位置：`%USERPROFILE%\.codebase-mcp\settings.toml`
- 可以在应用内的"配置"页面修改设置

## 🐛 已知问题

1. **文件大小限制**：exe 文件超过 100MB，无法直接提交到 GitHub
2. **Windows Defender**：首次运行可能被 Windows Defender 拦截（需要允许运行）

## 📚 相关文档

- [完整文档](README.md)
- [故障排除](TROUBLESHOOTING.md)
- [Prompt Context 修复说明](../../.kiro/specs/architecture-split/PROMPT_CONTEXT_FIX.md)
- [.gitignore 修复说明](../../.kiro/specs/architecture-split/GITIGNORE_FIX.md)

## 🔄 下一步

1. 创建 GitHub Release
2. 上传预构建的 exe 文件
3. 添加自动更新功能
4. 支持 macOS 和 Linux

---

**版本**: 0.1.0  
**构建时间**: 2025-11-21  
**Electron 版本**: 39.2.1  
**Node.js 版本**: 18+
