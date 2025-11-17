# @codebase-mcp/prompt-enhance

**真正的桌面应用程序**，提供 AI 驱动的提示词增强功能，支持项目上下文集成和实时编辑。基于 Electron 构建，内嵌 Web UI，无需浏览器。

## 特性

- 🖥️ **原生桌面应用** - 基于 Electron，内嵌 WebView，无需浏览器
- 🎨 **Web UI 编辑器** - 直观的提示词编辑界面
- 🤖 **AI 增强** - 基于 OpenAI/XAI 的智能提示词优化
- 📁 **项目集成** - 自动加载项目文件树和上下文
- 🔄 **实时预览** - 即时查看增强结果
- 📝 **提示词管理** - 编辑和管理系统提示词文件
- 🌐 **多语言支持** - 中文/英文界面切换
- 📦 **独立运行** - 打包为 exe，无需 Node.js 环境
- 🔒 **安全隔离** - Electron 沙箱保护

## 安装

### 方式 1: 下载桌面应用（推荐）

从 [Releases](https://github.com/your-repo/codebase-mcp/releases) 下载：

- **Windows 安装版**: `Prompt Enhance-x.x.x-win-x64.exe` (NSIS 安装程序)
- **Windows 便携版**: `Prompt Enhance-x.x.x-portable.exe` (免安装，双击运行)
- **macOS**: `Prompt Enhance-x.x.x.dmg`
- **Linux**: `Prompt Enhance-x.x.x.AppImage`

双击运行即可，应用会自动打开窗口。

### 方式 2: 通过 npm（CLI 模式）

```bash
# 全局安装
npm install -g @codebase-mcp/prompt-enhance

# CLI 模式运行（启动服务器 + 打开浏览器）
prompt-enhance

# 或使用 npx（无需安装）
npx @codebase-mcp/prompt-enhance
```

### 方式 3: 从源码运行

```bash
# 克隆仓库
git clone https://github.com/your-repo/codebase-mcp.git
cd codebase-mcp

# 安装依赖
npm install

# 构建
npm run build:shared
npm run build:electron -w @codebase-mcp/prompt-enhance

# 运行 Electron 应用
npm run start:electron -w @codebase-mcp/prompt-enhance

# 或运行 CLI 模式
npm run dev -w @codebase-mcp/prompt-enhance
```

## 快速开始

### 首次运行

1. 启动应用（exe 或命令行）
2. 浏览器自动打开 `http://localhost:8090`
3. 配置 API 密钥（设置页面）
4. 开始使用提示词增强功能

### 配置 API

在设置页面配置以下信息：

```toml
# Prompt Enhance API 配置
ENHANCE_BASE_URL = "https://api.x.ai"  # 或 "https://api.openai.com"
ENHANCE_TOKEN = "your-api-token-here"
MODEL = "grok-2-1212"  # 或 "gpt-4"
```

配置文件位置：`~/.codebase-mcp/settings.toml`

## 使用指南

### 基本工作流

1. **选择项目**
   - 点击"选择项目"按钮
   - 浏览并选择项目根目录
   - 系统自动加载文件树

2. **编写提示词**
   - 在左侧编辑器输入原始提示词
   - 选择目标语言（中文/英文）
   - 点击"增强提示词"按钮

3. **查看结果**
   - 右侧显示增强后的提示词
   - 支持复制到剪贴板
   - 可继续编辑和重新增强

### 高级功能

#### 项目文件树

- 自动加载项目文件结构
- 支持 .gitignore 规则过滤
- 可展开/折叠目录
- 显示文件类型图标

#### 提示词文件管理

编辑系统提示词文件：
- `prompt.txt` - 主提示词模板
- `inject-code.txt` - 代码注入模板

在设置页面的"提示词文件"标签中编辑。

#### 模型选择

支持多种 AI 模型：
- **XAI**: grok-2-1212, grok-beta
- **OpenAI**: gpt-4, gpt-4-turbo, gpt-3.5-turbo
- **自定义模型**: 输入任意模型名称

#### 实时日志

在日志页面查看：
- API 调用记录
- 错误信息
- 性能指标
- 系统状态

## API 端点

Prompt Enhance 提供以下 HTTP API：

### POST /api/enhance-prompt

增强提示词

**请求体**:
```json
{
  "projectPath": "/path/to/project",
  "originalMessage": "How to implement authentication?",
  "language": "zh"
}
```

**响应**:
```json
{
  "enhancedPrompt": "...",
  "model": "grok-2-1212",
  "tokensUsed": 1234
}
```

### GET /api/models

获取可用模型列表

**响应**:
```json
{
  "models": ["grok-2-1212", "grok-beta", "gpt-4"]
}
```

### GET /api/config

获取当前配置

**响应**:
```json
{
  "enhanceBaseUrl": "https://api.x.ai",
  "model": "grok-2-1212",
  "webPort": 8090
}
```

### POST /api/config

更新配置

**请求体**:
```json
{
  "enhanceBaseUrl": "https://api.openai.com",
  "enhanceToken": "new-token",
  "model": "gpt-4"
}
```

### GET /api/prompt-files

获取提示词文件列表

**响应**:
```json
{
  "files": ["prompt.txt", "inject-code.txt"]
}
```

### GET /api/prompt-files/:filename

获取提示词文件内容

**响应**:
```json
{
  "filename": "prompt.txt",
  "content": "..."
}
```

### PUT /api/prompt-files/:filename

更新提示词文件内容

**请求体**:
```json
{
  "content": "new content..."
}
```

## 命令行选项

```bash
prompt-enhance [options]

Options:
  --base-url <url>      API base URL (覆盖配置文件)
  --token <token>       API token (覆盖配置文件)
  --port <port>         Web server port (默认: 8090)
  --model <model>       AI model name (覆盖配置文件)
  --no-browser          不自动打开浏览器
  --help                显示帮助信息
  --version             显示版本号
```

**示例**:
```bash
# 使用自定义端口
prompt-enhance --port 9000

# 覆盖 API 配置
prompt-enhance --base-url https://api.openai.com --token sk-xxx --model gpt-4

# 不自动打开浏览器
prompt-enhance --no-browser
```

## 打包为 exe

### 开发者打包

```bash
# 在项目根目录
npm run package:prompt-enhance

# 输出位置
# packages/prompt-enhance/build/prompt-enhance-win-x64.exe
```

### 打包配置

打包使用 `pkg` 工具，配置文件：`pkg.config.json`

```json
{
  "name": "prompt-enhance",
  "version": "1.0.0",
  "bin": "dist/index.js",
  "targets": ["node18-win-x64"],
  "assets": [
    "dist/web/templates/**/*",
    "prompt/**/*"
  ],
  "outputPath": "build"
}
```

### 打包内容

exe 文件包含：
- Node.js 18 运行时
- 所有依赖包
- Web UI 模板
- 提示词文件
- 编译后的代码

**不包含**（需用户提供）：
- 配置文件（`~/.codebase-mcp/settings.toml`）
- 日志文件（`~/.codebase-mcp/log/`）

## 开发

### 项目结构

```
packages/prompt-enhance/
├── src/
│   ├── index.ts              # 入口文件
│   ├── services/
│   │   └── enhancePrompt.ts  # 增强服务
│   └── web/
│       ├── app.ts            # Express 应用
│       └── templates/        # Web UI
├── prompt/
│   ├── prompt.txt            # 系统提示词
│   └── inject-code.txt       # 代码注入模板
├── package.json
├── tsconfig.json
└── pkg.config.json           # pkg 打包配置
```

### 开发命令

```bash
# 开发模式（热重载）
npm run dev

# 构建
npm run build

# 打包为 exe
npm run package

# 清理构建产物
npm run clean
```

### 添加依赖

```bash
# 在 monorepo 根目录
npm install <package> -w @codebase-mcp/prompt-enhance

# 或在包目录
cd packages/prompt-enhance
npm install <package>
```

## 故障排除

### 端口被占用

```bash
# 使用其他端口
prompt-enhance --port 9000
```

### API 调用失败

1. 检查配置文件中的 API URL 和 Token
2. 查看日志页面的错误信息
3. 验证网络连接
4. 确认 API 配额未超限

### exe 无法启动

1. 检查是否有杀毒软件拦截
2. 以管理员身份运行
3. 查看日志文件：`~/.codebase-mcp/log/codebase-mcp.log`
4. 确认 Windows 版本 >= Windows 10

### 配置文件丢失

配置文件会在首次运行时自动生成。如果丢失：
```bash
# 删除旧配置（如果存在）
rm ~/.codebase-mcp/settings.toml

# 重新运行应用，会自动生成默认配置
prompt-enhance
```

## 性能优化

### 大型项目

对于大型项目（> 5000 文件）：
1. 使用 .gitignore 排除不必要的文件
2. 在配置中添加自定义排除模式
3. 限制文件树深度

### API 调用

- 使用缓存避免重复调用
- 批量处理多个提示词
- 选择合适的模型（速度 vs 质量）

## 安全性

### API Token 保护

- Token 存储在本地配置文件（`~/.codebase-mcp/settings.toml`）
- 文件权限设置为 600（仅所有者可读写）
- 日志中自动脱敏（显示为 `***`）
- 不在错误消息中暴露

### 网络安全

- 默认使用 HTTPS
- 验证 SSL 证书
- 支持自定义请求头（如代理认证）

## 许可证

ISC

## 作者

wmymz <wmymz@icloud.com>

## 链接

- [GitHub 仓库](https://github.com/your-repo/codebase-mcp)
- [问题反馈](https://github.com/your-repo/codebase-mcp/issues)
- [发布页面](https://github.com/your-repo/codebase-mcp/releases)
