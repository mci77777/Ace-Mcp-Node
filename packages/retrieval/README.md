# @codebase-mcp/retrieval

MCP (Model Context Protocol) 服务器，为 AI 助手提供语义代码搜索和代码库检索功能。

## 特性

- 🔍 **语义搜索** - 基于自然语言的代码搜索
- 📦 **增量索引** - SHA-256 去重，仅上传变更文件
- 🌐 **Web 管理界面** - 项目管理、日志查看、配置编辑
- 🔄 **实时日志** - WebSocket 实时日志广播
- 🖥️ **跨平台** - 支持 Windows、Linux、macOS、WSL
- 🌍 **多编码** - UTF-8、GBK、GB2312、Latin-1
- 🚀 **MCP 协议** - 标准 stdio 传输，兼容所有 MCP 客户端

## 安装

### 方式 1: 通过 npm（推荐）

```bash
# 全局安装
npm install -g @codebase-mcp/retrieval

# 运行
codebase-retrieval

# 或使用 npx（无需安装）
npx @codebase-mcp/retrieval
```

### 方式 2: 从源码运行

```bash
# 克隆仓库
git clone https://github.com/your-repo/codebase-mcp.git
cd codebase-mcp

# 安装依赖
npm install

# 构建
npm run build:shared
npm run build:retrieval

# 运行
npm run dev:retrieval
```

## 快速开始

### 1. 配置 API

创建或编辑配置文件：`~/.codebase-mcp/settings.toml`

```toml
# Codebase Retrieval API 配置
BASE_URL = "https://d6.api.augmentcode.com/"
TOKEN = "your-token-here"

# Web 服务器配置（可选）
WEB_PORT = 8090

# 索引配置
BATCH_SIZE = 10
MAX_LINES_PER_BLOB = 800

# 文件扩展名
TEXT_EXTENSIONS = [
  ".py", ".js", ".ts", ".jsx", ".tsx",
  ".java", ".go", ".rs", ".cpp", ".c",
  ".md", ".txt", ".json", ".yaml", ".yml"
]

# 排除模式
EXCLUDE_PATTERNS = [
  ".venv", "venv", "node_modules", ".git",
  "__pycache__", "dist", "build"
]
```

### 2. 配置 MCP 客户端

#### Claude Desktop

编辑 `claude_desktop_config.json`:

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

#### 其他 MCP 客户端

使用 stdio 传输：
```bash
npx @codebase-mcp/retrieval
```

### 3. 使用工具

在 AI 助手中使用 `codebase-retrieval` 工具：

```typescript
{
  "project_root_path": "/path/to/your/project",
  "query": "authentication logic"
}
```

## MCP 工具

### codebase-retrieval

语义搜索代码库，返回相关代码片段。

**输入参数**:
- `project_root_path` (string, required): 项目根目录的绝对路径
- `query` (string, required): 自然语言搜索查询

**输出**:
- 格式化的代码片段，包含文件路径、行号和相关代码

**示例**:
```json
{
  "project_root_path": "/home/user/myproject",
  "query": "user authentication and login flow"
}
```

**响应示例**:
```
Found 5 relevant code snippets:

File: src/auth/login.ts (Lines 15-30)
```typescript
export async function login(username: string, password: string) {
  const user = await User.findOne({ username });
  if (!user) {
    throw new Error('User not found');
  }
  // ... authentication logic
}
```

File: src/middleware/auth.ts (Lines 8-20)
...
```

## Web 管理界面

### 启动 Web 界面

```bash
# 方式 1: 命令行参数
codebase-retrieval --web-port 8090

# 方式 2: 配置文件
# 在 settings.toml 中设置 WEB_PORT = 8090
```

访问：`http://localhost:8090`

### 功能

#### 项目管理
- 查看所有已索引项目
- 检查项目索引状态
- 重新索引项目
- 删除项目索引
- 查看项目详情（文件数、blob 数）

#### 文件浏览
- 浏览项目文件树
- 查看文件内容
- 支持 .gitignore 过滤

#### 配置管理
- 在线编辑配置
- 实时保存
- 配置验证

#### 实时日志
- WebSocket 实时日志流
- 日志级别过滤
- 搜索和导出

#### 工具调试
- 测试 codebase-retrieval 工具
- 查看请求/响应
- 性能指标

## API 端点

### 项目管理

#### GET /api/projects
获取所有已索引项目列表

**响应**:
```json
{
  "projects": [
    {
      "path": "/path/to/project1",
      "blobCount": 150,
      "lastIndexed": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### POST /api/projects/check
检查项目是否已索引

**请求体**:
```json
{
  "projectPath": "/path/to/project"
}
```

**响应**:
```json
{
  "indexed": true,
  "blobCount": 150
}
```

#### POST /api/projects/reindex
重新索引项目

**请求体**:
```json
{
  "projectPath": "/path/to/project"
}
```

**响应**:
```json
{
  "success": true,
  "uploaded": 10,
  "total": 150
}
```

#### DELETE /api/projects/delete
删除项目索引

**请求体**:
```json
{
  "projectPath": "/path/to/project"
}
```

#### POST /api/projects/details
获取项目详细信息

**请求体**:
```json
{
  "projectPath": "/path/to/project"
}
```

**响应**:
```json
{
  "path": "/path/to/project",
  "blobCount": 150,
  "files": ["src/main.ts", "src/utils.ts", ...],
  "lastIndexed": "2024-01-15T10:30:00Z"
}
```

### 文件管理

#### POST /api/files/list
获取项目文件树

**请求体**:
```json
{
  "projectPath": "/path/to/project"
}
```

**响应**:
```json
{
  "tree": {
    "name": "project",
    "type": "directory",
    "children": [...]
  }
}
```

### 配置管理

#### GET /api/config
获取当前配置

**响应**:
```json
{
  "baseUrl": "https://api.example.com",
  "batchSize": 10,
  "maxLinesPerBlob": 800,
  "webPort": 8090
}
```

#### POST /api/config
更新配置

**请求体**:
```json
{
  "baseUrl": "https://api.example.com",
  "token": "new-token",
  "batchSize": 20
}
```

#### GET /api/status
获取服务器状态

**响应**:
```json
{
  "status": "running",
  "version": "1.0.0",
  "uptime": 3600,
  "projectCount": 5
}
```

## 命令行选项

```bash
codebase-retrieval [options]

Options:
  --base-url <url>      API base URL (覆盖配置文件)
  --token <token>       API token (覆盖配置文件)
  --web-port <port>     启用 Web 管理界面的端口
  --batch-size <size>   批量上传大小 (默认: 10)
  --help                显示帮助信息
  --version             显示版本号
```

**示例**:
```bash
# 启动 MCP 服务器（stdio 模式）
codebase-retrieval

# 启动 MCP 服务器 + Web 界面
codebase-retrieval --web-port 8090

# 覆盖 API 配置
codebase-retrieval --base-url https://api.example.com --token your-token

# 自定义批量大小
codebase-retrieval --batch-size 20
```

## 工作原理

### 索引流程

1. **文件扫描**
   - 递归扫描项目目录
   - 应用 .gitignore 规则
   - 过滤文件扩展名和排除模式

2. **哈希计算**
   - 对每个文件计算 SHA-256 哈希
   - 与已索引的 blob 比较
   - 仅处理新文件或变更文件

3. **内容提取**
   - 读取文件内容
   - 自动检测编码（UTF-8、GBK、GB2312、Latin-1）
   - 跳过二进制文件

4. **批量上传**
   - 将文件内容分批上传到 API
   - 默认每批 10 个文件
   - 实现重试机制（最多 3 次）

5. **索引更新**
   - 更新 `projects.json` 记录
   - 保存 blob 哈希列表
   - 记录索引时间戳

### 搜索流程

1. **路径规范化**
   - 转换 Windows 路径为 Unix 格式
   - 处理 WSL UNC 路径（`\\wsl$\...`）
   - 验证路径存在性

2. **索引检查**
   - 检查项目是否已索引
   - 如未索引，自动触发增量索引

3. **语义搜索**
   - 调用后端搜索 API
   - 传递项目路径和查询
   - 获取相关代码片段

4. **结果格式化**
   - 格式化为 Markdown
   - 包含文件路径和行号
   - 添加语法高亮

## 数据存储

### 项目索引

**位置**: `~/.codebase-mcp/data/projects.json`

**格式**:
```json
{
  "/path/to/project1": [
    "blob_hash_1",
    "blob_hash_2",
    "blob_hash_3"
  ],
  "/path/to/project2": [
    "blob_hash_4",
    "blob_hash_5"
  ]
}
```

### 日志文件

**位置**: `~/.codebase-mcp/log/`

- `codebase-mcp.log` - 当前日志
- `codebase-mcp.log.1` - 轮转日志 1
- ...
- `codebase-mcp.log.10` - 轮转日志 10

**轮转规则**:
- 单文件最大 5MB
- 保留最近 10 个文件

## 开发

### 项目结构

```
packages/retrieval/
├── src/
│   ├── index.ts              # MCP 服务器入口
│   ├── tools/
│   │   └── codebaseRetrieval.ts  # codebase-retrieval 工具
│   ├── index/
│   │   └── manager.ts        # 索引管理器
│   └── web/
│       ├── app.ts            # Express 应用
│       └── templates/        # Web UI
├── package.json
└── tsconfig.json
```

### 开发命令

```bash
# 开发模式（热重载）
npm run dev

# 构建
npm run build

# 测试
npm test

# 清理构建产物
npm run clean
```

### 添加依赖

```bash
# 在 monorepo 根目录
npm install <package> -w @codebase-mcp/retrieval

# 或在包目录
cd packages/retrieval
npm install <package>
```

## 故障排除

### MCP 客户端连接失败

1. 检查命令和参数是否正确
2. 验证 npm 包已安装（`npm list -g @codebase-mcp/retrieval`）
3. 查看日志文件：`~/.codebase-mcp/log/codebase-mcp.log`
4. 尝试手动运行：`npx @codebase-mcp/retrieval`

### 索引失败

1. 检查 API URL 和 Token 配置
2. 验证网络连接
3. 查看日志中的错误信息
4. 确认项目路径正确且可访问
5. 检查 API 配额是否超限

### 路径问题（WSL）

对于 WSL 路径：
- UNC 路径：`\\wsl$\Ubuntu\home\user\project` → 自动转换为 `/home/user/project`
- 挂载路径：`/mnt/c/Users/...` → 自动转换为 `C:/Users/...`

如果路径转换失败，手动使用 Unix 格式路径。

### Web 界面无法访问

1. 确认已启用 Web 端口（`--web-port` 或配置文件）
2. 检查端口是否被占用
3. 尝试使用其他端口
4. 检查防火墙设置

### 编码问题

如果文件内容显示乱码：
1. 检查文件实际编码
2. 系统会自动尝试 UTF-8、GBK、GB2312、Latin-1
3. 如果仍有问题，转换文件为 UTF-8

## 性能优化

### 大型项目

对于大型项目（> 5000 文件）：
1. 使用 .gitignore 排除不必要的文件
2. 添加自定义排除模式（`EXCLUDE_PATTERNS`）
3. 增加批量大小（`BATCH_SIZE`）
4. 限制每个 blob 的行数（`MAX_LINES_PER_BLOB`）

### 网络优化

- 增加批量大小减少请求次数
- 使用更快的网络连接
- 考虑使用代理或 CDN

### 索引优化

- 定期清理不再使用的项目索引
- 避免频繁重新索引
- 使用增量索引（默认行为）

## 安全性

### API Token 保护

- Token 存储在本地配置文件
- 文件权限设置为 600
- 日志中自动脱敏
- 不在错误消息中暴露

### 文件系统安全

- 验证路径存在性和权限
- 防止路径遍历攻击
- 跳过无权限的文件/目录

### 网络安全

- 默认使用 HTTPS
- 验证 SSL 证书
- 支持自定义请求头

## 许可证

ISC

## 作者

wmymz <wmymz@icloud.com>

## 链接

- [GitHub 仓库](https://github.com/your-repo/codebase-mcp)
- [问题反馈](https://github.com/your-repo/codebase-mcp/issues)
- [MCP 协议规范](https://modelcontextprotocol.io)
