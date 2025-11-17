# MCP Client Configuration Examples

本文档提供了在各种 MCP 客户端中配置 Codebase MCP 的示例。

## 目录

- [Claude Desktop](#claude-desktop)
- [Cline (VS Code Extension)](#cline-vs-code-extension)
- [Continue.dev](#continuedev)
- [Zed Editor](#zed-editor)
- [自定义 MCP 客户端](#自定义-mcp-客户端)
- [高级配置](#高级配置)
- [故障排除](#故障排除)

---

## Claude Desktop

Claude Desktop 是 Anthropic 官方的桌面应用，支持 MCP 协议。

### 配置文件位置

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### 基础配置

使用 npm 全局安装的版本：

```json
{
  "mcpServers": {
    "codebase-retrieval": {
      "command": "npx",
      "args": ["-y", "@codebase-mcp/retrieval"]
    }
  }
}
```

### 使用本地开发版本

```json
{
  "mcpServers": {
    "codebase-retrieval": {
      "command": "node",
      "args": ["/path/to/codebase-mcp/packages/retrieval/dist/index.js"]
    }
  }
}
```

### 启用 Web 管理界面

添加 `--web-port` 参数以启用 Web UI（默认端口 8090）：

```json
{
  "mcpServers": {
    "codebase-retrieval": {
      "command": "npx",
      "args": ["-y", "@codebase-mcp/retrieval", "--web-port", "8090"]
    }
  }
}
```

访问 `http://localhost:8090` 查看项目管理界面和实时日志。

---

## Cline (VS Code Extension)

Cline 是一个强大的 VS Code 扩展，支持 MCP 协议。

### 配置文件位置

在项目根目录或用户设置中编辑 `.vscode/settings.json`：

### 项目级配置

```json
{
  "cline.mcpServers": {
    "codebase-retrieval": {
      "command": "npx",
      "args": ["-y", "@codebase-mcp/retrieval"]
    }
  }
}
```

### 用户级配置

在 VS Code 设置中（`Ctrl+,` 或 `Cmd+,`），搜索 "cline.mcpServers" 并添加：

```json
{
  "cline.mcpServers": {
    "codebase-retrieval": {
      "command": "npx",
      "args": ["-y", "@codebase-mcp/retrieval", "--web-port", "8090"]
    }
  }
}
```

### 使用本地开发版本

```json
{
  "cline.mcpServers": {
    "codebase-retrieval": {
      "command": "node",
      "args": [
        "${workspaceFolder}/packages/retrieval/dist/index.js",
        "--web-port", "8090"
      ]
    }
  }
}
```

---

## Continue.dev

Continue 是另一个流行的 AI 编程助手，支持 MCP。

### 配置文件位置

- **macOS/Linux**: `~/.continue/config.json`
- **Windows**: `%USERPROFILE%\.continue\config.json`

### 配置示例

```json
{
  "mcpServers": {
    "codebase-retrieval": {
      "command": "npx",
      "args": ["-y", "@codebase-mcp/retrieval"]
    }
  }
}
```

---

## Zed Editor

Zed 是一个现代化的代码编辑器，原生支持 MCP。

### 配置文件位置

- **macOS**: `~/Library/Application Support/Zed/settings.json`
- **Linux**: `~/.config/zed/settings.json`

### 配置示例

```json
{
  "context_servers": {
    "codebase-retrieval": {
      "command": "npx",
      "args": ["-y", "@codebase-mcp/retrieval"]
    }
  }
}
```

---

## 自定义 MCP 客户端

如果你正在开发自己的 MCP 客户端，可以使用以下方式启动 Codebase Retrieval：

### 使用 stdio 传输

```javascript
import { spawn } from 'child_process';

const mcpServer = spawn('npx', ['-y', '@codebase-mcp/retrieval'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// 通过 stdin/stdout 与 MCP 服务器通信
mcpServer.stdin.write(JSON.stringify({
  jsonrpc: '2.0',
  method: 'initialize',
  params: { /* ... */ },
  id: 1
}) + '\n');

mcpServer.stdout.on('data', (data) => {
  // 处理 MCP 响应
  console.log('MCP Response:', data.toString());
});
```

### 使用命令行直接调用

```bash
# 启动 MCP 服务器（stdio 模式）
npx -y @codebase-mcp/retrieval

# 启动并启用 Web 管理界面
npx -y @codebase-mcp/retrieval --web-port 8090

# 使用自定义配置
npx -y @codebase-mcp/retrieval --base-url https://your-api.com --token your-token
```

---

## 高级配置

### 自定义 Web 端口

如果默认端口 8090 被占用，可以指定其他端口：

```json
{
  "mcpServers": {
    "codebase-retrieval": {
      "command": "npx",
      "args": ["-y", "@codebase-mcp/retrieval", "--web-port", "9000"]
    }
  }
}
```

### 覆盖配置文件设置

通过命令行参数覆盖 `settings.toml` 中的配置：

```json
{
  "mcpServers": {
    "codebase-retrieval": {
      "command": "npx",
      "args": [
        "-y", "@codebase-mcp/retrieval",
        "--base-url", "https://your-custom-api.com",
        "--token", "your-custom-token",
        "--web-port", "8090"
      ]
    }
  }
}
```

**注意**：命令行参数优先级高于配置文件。

### 多项目配置

为不同项目配置独立的 MCP 实例：

```json
{
  "mcpServers": {
    "codebase-project-a": {
      "command": "npx",
      "args": ["-y", "@codebase-mcp/retrieval"]
    },
    "codebase-project-b": {
      "command": "npx",
      "args": ["-y", "@codebase-mcp/retrieval"]
    }
  }
}
```

**说明**：
- 多个实例会共享同一个配置文件（`~/.codebase-mcp/settings.toml`）
- 如果启用 Web 界面，只有第一个实例会成功绑定端口
- 后续实例会跳过 Web 服务器启动，仅提供 MCP 工具功能

### 环境变量配置

某些 MCP 客户端支持通过环境变量传递配置：

```json
{
  "mcpServers": {
    "codebase-retrieval": {
      "command": "npx",
      "args": ["-y", "@codebase-mcp/retrieval"],
      "env": {
        "NODE_ENV": "production",
        "DEBUG": "false"
      }
    }
  }
}
```

### 使用 pnpm 或 yarn

如果你使用 pnpm 或 yarn 作为包管理器：

```json
{
  "mcpServers": {
    "codebase-retrieval": {
      "command": "pnpm",
      "args": ["dlx", "@codebase-mcp/retrieval"]
    }
  }
}
```

或

```json
{
  "mcpServers": {
    "codebase-retrieval": {
      "command": "yarn",
      "args": ["dlx", "@codebase-mcp/retrieval"]
    }
  }
}
```

### Windows 特定配置

在 Windows 上，如果遇到路径问题，可以使用完整路径：

```json
{
  "mcpServers": {
    "codebase-retrieval": {
      "command": "C:\\Program Files\\nodejs\\npx.cmd",
      "args": ["-y", "@codebase-mcp/retrieval"]
    }
  }
}
```

### WSL 配置

在 WSL 环境中使用：

```json
{
  "mcpServers": {
    "codebase-retrieval": {
      "command": "npx",
      "args": ["-y", "@codebase-mcp/retrieval"]
    }
  }
}
```

**说明**：Codebase MCP 会自动检测并转换 WSL 路径（`\\wsl$\...` 和 `/mnt/c/...`）。

---

## 配置文件说明

### 配置文件位置

首次运行后，Codebase MCP 会在用户主目录创建配置文件：

```
~/.codebase-mcp/settings.toml
```

### 配置文件示例

详细的配置说明请参考 `settings.toml.example` 文件。以下是最小配置示例：

```toml
# ============================================================================
# Codebase Retrieval 配置（必填）
# ============================================================================

# 索引服务器地址
BASE_URL = "https://d6.api.augmentcode.com/"

# 访问令牌（从 https://augmentcode.com 获取）
TOKEN = "your-token-here"

# ============================================================================
# 可选配置
# ============================================================================

# 批量上传数量（默认：10）
BATCH_SIZE = 10

# 单个代码块最大行数（默认：800）
MAX_LINES_PER_BLOB = 800

# 支持的文件扩展名
TEXT_EXTENSIONS = [
  ".py", ".js", ".ts", ".jsx", ".tsx",
  ".java", ".go", ".rs", ".cpp", ".c",
  ".md", ".txt", ".json", ".yaml", ".yml"
]

# 排除模式
EXCLUDE_PATTERNS = [
  "node_modules", ".git", "dist", "build",
  "__pycache__", ".venv", "venv"
]
```

### 配置优先级

1. **命令行参数**（最高优先级）
2. **配置文件** (`~/.codebase-mcp/settings.toml`)
3. **默认值**（最低优先级）

示例：如果在 MCP 客户端配置中指定了 `--token`，它会覆盖配置文件中的 `TOKEN` 值。

---

## 故障排除

### 问题 1：MCP 服务器无法启动

**症状**：MCP 客户端显示连接失败或超时

**解决方案**：

1. 检查 Node.js 版本（需要 >= 18.0.0）：
   ```bash
   node --version
   ```

2. 手动测试 MCP 服务器：
   ```bash
   npx -y @codebase-mcp/retrieval
   ```

3. 查看日志文件：
   ```bash
   # macOS/Linux
   cat ~/.codebase-mcp/log/acemcp.log
   
   # Windows
   type %USERPROFILE%\.codebase-mcp\log\acemcp.log
   ```

### 问题 2：配置文件未生效

**症状**：修改配置后没有变化

**解决方案**：

1. 确认配置文件位置正确：
   ```bash
   # macOS/Linux
   ls -la ~/.codebase-mcp/settings.toml
   
   # Windows
   dir %USERPROFILE%\.codebase-mcp\settings.toml
   ```

2. 检查配置文件语法（TOML 格式）

3. 重启 MCP 客户端以重新加载配置

### 问题 3：Web 管理界面无法访问

**症状**：访问 `http://localhost:8090` 显示无法连接

**解决方案**：

1. 确认启动时指定了 `--web-port` 参数

2. 检查端口是否被占用：
   ```bash
   # macOS/Linux
   lsof -i :8090
   
   # Windows
   netstat -ano | findstr :8090
   ```

3. 尝试使用其他端口：
   ```json
   {
     "args": ["-y", "@codebase-mcp/retrieval", "--web-port", "9000"]
   }
   ```

### 问题 4：索引失败或搜索无结果

**症状**：调用 `codebase-retrieval` 工具时返回错误或空结果

**解决方案**：

1. 检查 API 配置：
   - `BASE_URL` 是否正确
   - `TOKEN` 是否有效

2. 检查项目路径：
   - 路径是否存在
   - 是否有读取权限

3. 查看详细日志：
   - 启用 Web 界面查看实时日志
   - 或查看日志文件 `~/.codebase-mcp/log/acemcp.log`

4. 手动触发重新索引：
   - 访问 Web 管理界面
   - 找到对应项目
   - 点击"重新索引"按钮

### 问题 5：WSL 路径问题

**症状**：在 WSL 中使用时路径无法识别

**解决方案**：

Codebase MCP 支持以下 WSL 路径格式：

- UNC 路径：`\\wsl$\Ubuntu\home\user\project`
- 挂载路径：`/mnt/c/Users/user/project`
- WSL 原生路径：`/home/user/project`

如果仍有问题，请确保：
1. 路径使用正斜杠 `/`
2. 路径存在且可访问
3. 查看日志中的路径转换信息

### 问题 6：多个 MCP 实例冲突

**症状**：配置了多个实例但只有一个工作

**解决方案**：

这是正常行为。多个实例会：
- 共享同一个配置文件
- 共享同一个索引数据
- 只有第一个实例会启动 Web 服务器

如果需要完全独立的实例，请：
1. 使用不同的用户账户
2. 或修改源码指定不同的配置目录

---

## 相关资源

- **项目主页**：https://github.com/your-org/codebase-mcp
- **配置示例**：`settings.toml.example`
- **开发文档**：`DEVELOPMENT.md`
- **贡献指南**：`CONTRIBUTING.md`
- **MCP 协议规范**：https://modelcontextprotocol.io

---

## 获取帮助

如果遇到问题：

1. 查看 [故障排除](#故障排除) 部分
2. 查看日志文件：`~/.codebase-mcp/log/acemcp.log`
3. 访问 Web 管理界面查看实时日志
4. 在 GitHub 上提交 Issue：https://github.com/your-org/codebase-mcp/issues

---

**最后更新**：2024-11-16
