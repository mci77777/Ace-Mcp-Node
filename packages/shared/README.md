# @codebase-mcp/shared

共享核心模块，为 Codebase MCP 项目提供配置管理、日志系统、路径工具、文件扫描和编码检测等核心功能。

## 安装

```bash
npm install @codebase-mcp/shared
```

## 功能模块

### 配置管理 (Config)

统一的配置管理，从 `~/.codebase-mcp/settings.toml` 加载配置。

```typescript
import { initConfig, getConfig } from '@codebase-mcp/shared';

// 初始化配置（可选覆盖）
const config = initConfig({
  baseUrl: 'https://api.example.com',
  token: 'your-token',
  webPort: 8090,
});

// 获取配置实例
const config = getConfig();
console.log(config.baseUrl);
console.log(config.token);

// 重新加载配置
config.reload();

// 验证配置
config.validate();
```

### 日志系统 (Logger)

支持文件轮转和 WebSocket 广播的日志系统。

```typescript
import { setupLogging, logger } from '@codebase-mcp/shared';

// 设置日志（可选配置）
setupLogging({
  consoleLevel: LogLevel.INFO,
  fileLevel: LogLevel.DEBUG,
  enableConsole: true,
  enableWebSocket: true,
});

// 使用日志
logger.info('应用启动');
logger.warning('警告信息');
logger.error('错误信息');
logger.debug('调试信息');
logger.exception('异常信息', error);
```

### 日志广播器 (LogBroadcaster)

WebSocket 日志广播，用于实时日志查看。

```typescript
import { getLogBroadcaster } from '@codebase-mcp/shared';
import { WebSocket } from 'ws';

const broadcaster = getLogBroadcaster();

// 添加 WebSocket 客户端
broadcaster.addClient(ws);

// 获取客户端数量
console.log(broadcaster.getClientCount());
```

### 路径工具 (PathUtils)

跨平台路径处理，支持 Windows、WSL、Unix。

```typescript
import {
  normalizeProjectPath,
  isWSLPath,
  convertWSLToWindows,
  convertWindowsToWSL,
  validateProjectPath,
} from '@codebase-mcp/shared';

// 规范化路径
const normalized = normalizeProjectPath('C:\\Users\\...'); // -> C:/Users/...
const wslPath = normalizeProjectPath('\\\\wsl$\\Ubuntu\\home\\...'); // -> /home/...

// 检查 WSL 路径
if (isWSLPath('\\\\wsl$\\Ubuntu\\home\\...')) {
  console.log('这是 WSL 路径');
}

// 路径转换
const wslInternal = convertWSLToWindows('\\\\wsl$\\Ubuntu\\home\\user'); // -> /home/user
const wslMount = convertWindowsToWSL('C:\\Users\\...'); // -> /mnt/c/Users/...

// 验证路径
validateProjectPath('/path/to/project'); // 抛出错误如果无效
```

### 文件扫描 (FileScanner)

递归目录扫描，支持 .gitignore 规则和文件过滤。

```typescript
import { scanDirectory, loadGitignore } from '@codebase-mcp/shared';

// 扫描目录
const result = await scanDirectory('/path/to/project', {
  maxDepth: 30,
  textExtensions: new Set(['.ts', '.js', '.py']),
  excludePatterns: ['node_modules', '.git'],
  followSymlinks: false,
  buildTree: true,
});

console.log(`找到 ${result.stats.totalFiles} 个文件`);
console.log(`排除 ${result.stats.excludedCount} 个文件`);

// 加载 .gitignore
const gitignore = loadGitignore('/path/to/project');
```

### 编码检测 (Encoding)

多编码检测和转换，支持 UTF-8、GBK、GB2312、Latin-1。

```typescript
import {
  detectEncoding,
  decodeText,
  isBinaryFile,
  decodeTextWithFallback,
} from '@codebase-mcp/shared';

// 检测编码
const buffer = fs.readFileSync('file.txt');
const encoding = detectEncoding(buffer); // -> 'utf-8' | 'gbk' | 'gb2312' | 'latin1' | 'binary'

// 解码文本
const text = decodeText(buffer); // 自动检测编码
const textGBK = decodeText(buffer, 'gbk'); // 指定编码

// 检查二进制文件
if (isBinaryFile(buffer)) {
  console.log('这是二进制文件');
}

// 带回退的解码
const text = decodeTextWithFallback(buffer); // 尝试所有编码，返回最佳结果
```

## 导出方式

### 主入口导入

```typescript
import {
  Config,
  getConfig,
  initConfig,
  Logger,
  logger,
  setupLogging,
  LogBroadcaster,
  getLogBroadcaster,
  normalizeProjectPath,
  scanDirectory,
  detectEncoding,
  // ... 其他导出
} from '@codebase-mcp/shared';
```

### 子模块导入

```typescript
// 配置模块
import { Config, getConfig } from '@codebase-mcp/shared/config';

// 日志模块
import { Logger, logger } from '@codebase-mcp/shared/logger';

// 日志广播器
import { LogBroadcaster } from '@codebase-mcp/shared/logBroadcaster';

// 路径工具
import { normalizeProjectPath } from '@codebase-mcp/shared/utils/pathUtils';

// 文件扫描
import { scanDirectory } from '@codebase-mcp/shared/utils/fileScanner';

// 编码检测
import { detectEncoding } from '@codebase-mcp/shared/utils/encoding';
```

## 配置文件格式

配置文件位置：`~/.codebase-mcp/settings.toml`

```toml
# Codebase Retrieval API 配置
BASE_URL = "https://api.example.com"
TOKEN = "your-token-here"

# Prompt Enhance API 配置
ENHANCE_BASE_URL = "https://api.openai.com"
ENHANCE_TOKEN = "your-enhance-token-here"

# 模型配置
MODEL = "gpt-4"
CUSTOM_MODEL = ""

# 自定义请求头
[CUSTOM_HEADERS]
"X-Custom-Header" = "value"

# 索引配置
BATCH_SIZE = 10
MAX_LINES_PER_BLOB = 800
API_TIMEOUT = 120000

# Web 服务器配置
WEB_PORT = 8090

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

## 日志文件

日志文件位置：`~/.codebase-mcp/log/`

- `codebase-mcp.log` - 当前日志文件
- `codebase-mcp.log.1` - 轮转日志文件 1
- `codebase-mcp.log.2` - 轮转日志文件 2
- ...
- `codebase-mcp.log.10` - 轮转日志文件 10

日志轮转规则：
- 单个文件最大 5MB
- 保留最近 10 个文件
- 自动删除最旧的文件

## 开发

```bash
# 构建
npm run build

# 开发模式（监听变更）
npm run dev

# 清理构建产物
npm run clean

# 测试
npm test
```

## 许可证

ISC

## 作者

wmymz <wmymz@icloud.com>
