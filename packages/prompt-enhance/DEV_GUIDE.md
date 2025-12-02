# Prompt Enhance 开发指南

## ✅ 开发服务器启动（已修复）

### 快速开始

```bash
# 启动开发服务器（默认端口 8090）
npm run dev -w @codebase-mcp/prompt-enhance

# 指定端口
npm run dev -w @codebase-mcp/prompt-enhance -- --port 8090
```

### 工作流程

1. **自动构建 shared 包**：`npm run build:shared`
2. **构建 prompt-enhance**：`npm run build`（使用 esbuild）
3. **启动服务器**：`node dist/bundle.cjs --port <port>`

### 访问应用

- **Web UI**: http://localhost:8090
- **调试页面**: http://localhost:8090/debug

## 📁 项目结构

```
packages/prompt-enhance/
├── src/
│   ├── index.ts              # 主入口
│   ├── electron/             # Electron 主进程
│   ├── services/             # 服务层
│   │   └── enhancePrompt.ts  # 提示词增强服务
│   └── web/                  # Web 应用
│       ├── app.ts            # Express 应用
│       └── templates/        # Web UI 模板
│           ├── index.html
│           ├── scripts/
│           └── styles/
├── dist/
│   ├── bundle.cjs            # esbuild 打包后的文件
│   └── web/
│       └── templates/        # 复制的模板文件
└── build/
    └── electron/             # Electron 打包产物
```

## 🔧 开发命令

### 构建

```bash
# 构建所有包
npm run build

# 只构建 prompt-enhance
npm run build -w @codebase-mcp/prompt-enhance

# 只构建 shared
npm run build:shared -w @codebase-mcp/prompt-enhance
```

### 开发

```bash
# 开发模式（构建 + 运行）
npm run dev -w @codebase-mcp/prompt-enhance -- --port 8090

# Electron 开发模式
npm run dev:electron -w @codebase-mcp/prompt-enhance
```

### 打包

```bash
# 打包 Electron 应用（Windows）
npm run package:electron -w @codebase-mcp/prompt-enhance

# 打包所有平台
npm run package:electron:win -w @codebase-mcp/prompt-enhance
npm run package:electron:mac -w @codebase-mcp/prompt-enhance
npm run package:electron:linux -w @codebase-mcp/prompt-enhance
```

## 🐛 常见问题

### 1. 端口被占用

**错误**：`EADDRINUSE: address already in use :::8090`

**解决**：使用不同的端口
```bash
npm run dev -w @codebase-mcp/prompt-enhance -- --port 8090
```

### 2. 页面显示空白

**原因**：模板文件路径不正确

**检查**：
1. 确认 `dist/web/templates/` 目录存在
2. 查看日志中的模板路径搜索结果
3. 重新构建：`npm run build -w @codebase-mcp/prompt-enhance`

### 3. 模块导入错误

**错误**：`Cannot find module '@codebase-mcp/shared'`

**解决**：先构建 shared 包
```bash
npm run build:shared -w @codebase-mcp/prompt-enhance
```

### 4. 配置文件错误

**位置**：`~/.codebase-mcp/settings.toml`

**重置**：删除配置文件，重新启动会自动生成默认配置

## 📝 配置说明

### 配置文件位置

```
%USERPROFILE%\.codebase-mcp\
├── settings.toml           # 主配置文件
├── log\
│   └── codebase-mcp.log   # 日志文件
└── data\
    └── projects.json       # 项目索引数据
```

### 配置示例

```toml
# ~/.codebase-mcp/settings.toml

# 提示词增强服务 API 配置
ENHANCE_BASE_URL = "https://api.openai.com/v1"
ENHANCE_TOKEN = "sk-your-api-key"

# Web 服务器端口
WEB_PORT = 8090

# API 超时时间（毫秒）
API_TIMEOUT = 120000

# 模型配置
MODEL = "gpt-4"
CUSTOM_MODEL = ""

# 自定义请求头
[CUSTOM_HEADERS]
# "X-Custom-Header" = "value"
```

## 🔍 调试

### 查看日志

```bash
# Windows
Get-Content "$env:USERPROFILE\.codebase-mcp\log\codebase-mcp.log" -Tail 50

# 或使用记事本
notepad "$env:USERPROFILE\.codebase-mcp\log\codebase-mcp.log"
```

### 调试页面

访问 http://localhost:8090/debug 查看：
- 服务器状态
- 配置信息
- 模板文件路径
- 环境变量

### 开发者工具

在浏览器中按 F12 打开开发者工具，查看：
- 网络请求
- 控制台错误
- 资源加载情况

## 🚀 发布流程

### 1. 更新版本号

```bash
# 更新 package.json 中的版本号
npm version patch -w @codebase-mcp/prompt-enhance
```

### 2. 构建和打包

```bash
# 构建所有包
npm run build

# 打包 Electron 应用
npm run package:electron -w @codebase-mcp/prompt-enhance
```

### 3. 测试

```bash
# 测试打包后的应用
packages/prompt-enhance/build/electron/Prompt Enhance-0.1.0-portable.exe
```

### 4. 发布

- 创建 GitHub Release
- 上传 exe 文件
- 更新 CHANGELOG.md

## 📚 相关文档

- [README.md](README.md) - 项目概述
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 故障排除
- [RELEASE_NOTES.md](RELEASE_NOTES.md) - 发布说明
- [CHANGELOG.md](CHANGELOG.md) - 变更日志

## 💡 开发技巧

### 1. 快速重启

修改代码后：
```bash
# 重新构建并运行
npm run dev -w @codebase-mcp/prompt-enhance -- --port 8090
```

### 2. 只重新构建前端

如果只修改了模板文件：
```bash
# 手动复制模板
npm run copy-templates -w @codebase-mcp/prompt-enhance
```

### 3. 监听文件变化

使用 `dev:watch` 命令（需要安装 concurrently 和 nodemon）：
```bash
npm run dev:watch -w @codebase-mcp/prompt-enhance
```

## 🎯 最佳实践

1. **修改代码前先拉取最新代码**
   ```bash
   git pull origin main
   ```

2. **提交前先测试**
   ```bash
   npm run build
   npm run dev -w @codebase-mcp/prompt-enhance -- --port 8090
   ```

3. **保持依赖更新**
   ```bash
   npm update
   ```

4. **定期清理构建产物**
   ```bash
   npm run clean -w @codebase-mcp/prompt-enhance
   ```

---

**最后更新**: 2025-11-21  
**版本**: 0.1.0  
**状态**: ✅ 开发服务器正常工作
