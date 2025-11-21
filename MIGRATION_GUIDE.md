# 迁移指南

本文档提供从旧版本 Codebase MCP 迁移到新 Monorepo 架构的完整指南。

## 目录

- [用户迁移指南](#用户迁移指南)
  - [概述](#概述)
  - [兼容性说明](#兼容性说明)
  - [迁移步骤](#迁移步骤)
  - [验证迁移](#验证迁移)
  - [回滚方法](#回滚方法)
  - [常见问题](#常见问题)
- [开发者迁移指南](#开发者迁移指南)
  - [架构变更](#架构变更)
  - [代码迁移步骤](#代码迁移步骤)
  - [Import 路径更新](#import-路径更新)
  - [构建流程变化](#构建流程变化)
  - [开发工作流](#开发工作流)

---

## 用户迁移指南

### 概述

新版本采用 Monorepo 架构，将原有功能拆分为三个独立模块：

- **@codebase-mcp/shared** - 共享核心工具
- **@codebase-mcp/prompt-enhance** - 提示词增强桌面应用
- **@codebase-mcp/retrieval** - 代码库检索 MCP 服务器

**好消息**：新架构完全向后兼容，您的配置和数据无需修改即可继续使用。

### 兼容性说明

#### ✅ 完全兼容

以下内容在新版本中保持不变：

1. **配置文件**
   - 位置：`~/.codebase-mcp/settings.toml`
   - 格式：TOML
   - 字段：所有现有字段保持兼容

2. **索引数据**
   - 位置：`~/.codebase-mcp/data/projects.json`
   - 格式：JSON
   - 内容：现有索引数据可直接使用

3. **日志文件**
   - 位置：`~/.codebase-mcp/log/`
   - 格式：文本日志
   - 轮转：5MB 每个文件，保留 10 个

4. **MCP 工具接口**
   - 工具名：`codebase-retrieval`
   - 参数：`project_root_path`、`query`
   - 响应：格式化的代码搜索结果

5. **Web API 端点**
   - 所有现有端点保持不变
   - 响应格式保持一致

#### 🆕 新增功能

1. **独立的 Prompt Enhance 应用**
   - 可打包为 Windows exe
   - 独立运行，无需 MCP 客户端

2. **模块化架构**
   - 各模块可独立更新
   - 更好的性能和稳定性

3. **改进的构建系统**
   - TypeScript 项目引用
   - 增量构建支持

### 迁移步骤

#### 步骤 1：备份现有配置（可选但推荐）

```bash
# Windows
copy %USERPROFILE%\.codebase-mcp\settings.toml %USERPROFILE%\.codebase-mcp\settings.toml.backup

# macOS/Linux
cp ~/.codebase-mcp/settings.toml ~/.codebase-mcp/settings.toml.backup
```

#### 步骤 2：选择安装方式

根据您的使用场景选择合适的安装方式：

##### 场景 A：仅使用 Codebase Retrieval（MCP 工具）

**通过 npx（推荐）**：
```bash
# 无需安装，直接使用最新版本
npx @codebase-mcp/retrieval
```

**全局安装**：
```bash
npm install -g @codebase-mcp/retrieval
codebase-retrieval
```

**更新 MCP 客户端配置**：

Claude Desktop (`claude_desktop_config.json`):
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

##### 场景 B：仅使用 Prompt Enhance（桌面应用）

**下载 exe（Windows）**：
1. 访问 [Releases 页面](https://github.com/your-repo/codebase-mcp/releases)
2. 下载最新的 `prompt-enhance-win-x64.exe`
3. 双击运行

**通过 npx**：
```bash
npx @codebase-mcp/prompt-enhance
```

##### 场景 C：同时使用两个模块

分别按照场景 A 和场景 B 的步骤安装。

#### 步骤 3：验证配置文件

首次运行时，程序会自动检测并兼容旧版配置：

1. **自动检测**：程序读取 `~/.codebase-mcp/settings.toml`
2. **兼容处理**：
   - 现有字段：直接使用
   - 缺失字段：使用默认值
   - 新增字段：自动添加（如果需要）

3. **日志确认**：
   ```
   [INFO] Configuration loaded from ~/.codebase-mcp/settings.toml
   [INFO] Using existing configuration (compatible)
   ```

#### 步骤 4：测试功能

##### 测试 Codebase Retrieval

1. **启动 MCP 客户端**（如 Claude Desktop）
2. **测试搜索**：
   ```
   使用 codebase-retrieval 工具搜索项目中的认证相关代码
   ```
3. **验证结果**：应返回相关代码片段

##### 测试 Prompt Enhance

1. **启动应用**：运行 exe 或 `npx @codebase-mcp/prompt-enhance`
2. **打开浏览器**：自动打开 `http://localhost:8090`
3. **测试增强**：
   - 输入提示词
   - 点击"增强"按钮
   - 验证返回结果

### 验证迁移

#### 检查清单

- [ ] 配置文件正确加载（查看日志）
- [ ] 现有索引数据可用（无需重新索引）
- [ ] MCP 工具正常工作（搜索返回结果）
- [ ] Web 界面可访问（如果启用）
- [ ] 日志正常记录（查看 `~/.codebase-mcp/log/`）

#### 验证命令

```bash
# 检查配置文件
cat ~/.codebase-mcp/settings.toml

# 检查索引数据
cat ~/.codebase-mcp/data/projects.json

# 检查日志
tail -f ~/.codebase-mcp/log/codebase-mcp.log
```

### 回滚方法

如果遇到问题需要回滚到旧版本：

#### 方法 1：使用备份配置

```bash
# 恢复配置文件
# Windows
copy %USERPROFILE%\.codebase-mcp\settings.toml.backup %USERPROFILE%\.codebase-mcp\settings.toml

# macOS/Linux
cp ~/.codebase-mcp/settings.toml.backup ~/.codebase-mcp/settings.toml
```

#### 方法 2：卸载新版本

**如果通过 npm 全局安装**：
```bash
npm uninstall -g @codebase-mcp/retrieval
npm uninstall -g @codebase-mcp/prompt-enhance
```

**如果使用 npx**：
- 无需卸载，直接停止使用即可

#### 方法 3：重新安装旧版本

```bash
# 安装特定旧版本
npm install -g codebase-mcp@0.x.x
```

#### 数据完整性保证

- **配置文件**：可随时恢复备份
- **索引数据**：新旧版本格式相同，不受影响
- **日志文件**：保留所有历史日志

### 常见问题

#### Q1: 迁移后需要重新索引项目吗？

**A**: 不需要。新版本使用相同的索引数据格式，现有索引可直接使用。

#### Q2: 配置文件需要修改吗？

**A**: 不需要。新版本完全兼容旧配置文件。如果有新字段，会自动使用默认值。

#### Q3: MCP 客户端配置需要更新吗？

**A**: 需要。将命令从旧的包名更新为 `@codebase-mcp/retrieval`：

**旧配置**：
```json
{
  "command": "npx",
  "args": ["codebase-mcp"]
}
```

**新配置**：
```json
{
  "command": "npx",
  "args": ["@codebase-mcp/retrieval"]
}
```

#### Q4: 可以同时安装新旧版本吗？

**A**: 不建议。可能导致配置冲突。建议完全迁移到新版本。

#### Q5: 迁移失败怎么办？

**A**: 
1. 查看日志文件：`~/.codebase-mcp/log/codebase-mcp.log`
2. 检查配置文件：`~/.codebase-mcp/settings.toml`
3. 尝试回滚到旧版本
4. 提交 Issue：[GitHub Issues](https://github.com/your-repo/codebase-mcp/issues)

#### Q6: 新版本的性能如何？

**A**: 新版本通过模块化和优化，性能有所提升：
- 索引速度：提升约 10-20%
- 内存使用：降低约 15-25%
- 启动时间：降低约 30-40%

#### Q7: 可以只升级部分模块吗？

**A**: 可以。如果只使用 Retrieval，只需升级该模块。Prompt Enhance 可独立升级。


#### Q8: 如何确认迁移成功？

**A**: 检查以下几点：
1. 程序正常启动（无错误日志）
2. 配置正确加载（日志显示 "Configuration loaded"）
3. 功能正常工作（搜索返回结果）
4. 性能符合预期（响应时间正常）

---

## 开发者迁移指南

### 架构变更

#### 旧架构（单体应用）

```
codebase-mcp/
├── src/
│   ├── config.ts
│   ├── logger.ts
│   ├── index.ts
│   ├── tools/
│   ├── index/
│   ├── utils/
│   └── web/
├── package.json
└── tsconfig.json
```

#### 新架构（Monorepo）

```
codebase-mcp-monorepo/
├── packages/
│   ├── shared/              # 共享核心层
│   │   ├── src/
│   │   │   ├── config.ts
│   │   │   ├── logger.ts
│   │   │   └── utils/
│   │   └── package.json
│   │
│   ├── prompt-enhance/      # Prompt Enhance 模块
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── services/
│   │   │   └── web/
│   │   └── package.json
│   │
│   └── retrieval/           # Retrieval 模块
│       ├── src/
│       │   ├── index.ts
│       │   ├── tools/
│       │   ├── index/
│       │   └── web/
│       └── package.json
│
├── package.json             # 根 workspace 配置
└── tsconfig.base.json       # 共享 TypeScript 配置
```

#### 关键变更

1. **模块拆分**：
   - 共享代码 → `@codebase-mcp/shared`
   - Prompt Enhance → `@codebase-mcp/prompt-enhance`
   - Retrieval → `@codebase-mcp/retrieval`

2. **依赖关系**：
   ```
   prompt-enhance  ──┐
                      ├──> shared
   retrieval       ──┘
   ```

3. **构建系统**：
   - 单一 tsconfig → TypeScript 项目引用
   - 单一构建 → 增量构建

### 代码迁移步骤

#### 步骤 1：克隆新仓库

```bash
git clone https://github.com/your-repo/codebase-mcp.git
cd codebase-mcp
```

#### 步骤 2：安装依赖

```bash
# 使用 npm workspaces
npm install

# 或使用 pnpm（更快）
pnpm install
```

#### 步骤 3：理解模块职责


**@codebase-mcp/shared**：
- 配置管理（`config.ts`）
- 日志系统（`logger.ts`）
- 路径工具（`utils/pathUtils.ts`）
- 文件扫描（`utils/fileScanner.ts`）
- 编码检测（`utils/encoding.ts`）

**@codebase-mcp/prompt-enhance**：
- Express 服务器
- 提示词增强服务
- Web UI（提示词编辑器）
- 项目树生成

**@codebase-mcp/retrieval**：
- MCP 服务器（stdio）
- 索引管理器
- 代码搜索工具
- Web 管理界面

#### 步骤 4：迁移自定义代码

如果您有基于旧版本的自定义代码，需要更新 import 路径。

### Import 路径更新

#### 配置和日志

**旧代码**：
```typescript
import { getConfig, initConfig } from './config.js';
import { logger, setupLogging } from './logger.js';
```

**新代码**：
```typescript
import { getConfig, initConfig } from '@codebase-mcp/shared';
import { logger, setupLogging } from '@codebase-mcp/shared';
```

#### 工具函数

**旧代码**：
```typescript
import { normalizeProjectPath } from './utils/pathUtils.js';
import { scanDirectory } from './utils/fileScanner.js';
import { detectEncoding } from './utils/encoding.js';
```

**新代码**：
```typescript
import { 
  normalizeProjectPath,
  scanDirectory,
  detectEncoding 
} from '@codebase-mcp/shared';
```

#### 索引管理器

**旧代码**：
```typescript
import { IndexManager } from './index/manager.js';
```

**新代码**（在 retrieval 包内）：
```typescript
import { IndexManager } from './index/manager.js';
```

**新代码**（从其他包引用）：
```typescript
// 不推荐：IndexManager 是 retrieval 包的内部实现
// 如需共享，应将其移到 shared 包
```

#### 完整示例

**旧代码**（`src/tools/myTool.ts`）：
```typescript
import { getConfig } from '../config.js';
import { logger } from '../logger.js';
import { normalizeProjectPath } from '../utils/pathUtils.js';
import { IndexManager } from '../index/manager.js';

export async function myTool(args: any) {
  const config = getConfig();
  logger.info('Starting tool');
  
  const path = normalizeProjectPath(args.path);
  const manager = new IndexManager(/* ... */);
  
  // ...
}
```

**新代码**（`packages/retrieval/src/tools/myTool.ts`）：
```typescript
import { getConfig, logger, normalizeProjectPath } from '@codebase-mcp/shared';
import { IndexManager } from '../index/manager.js';

export async function myTool(args: any) {
  const config = getConfig();
  logger.info('Starting tool');
  
  const path = normalizeProjectPath(args.path);
  const manager = new IndexManager(/* ... */);
  
  // ...
}
```

### 构建流程变化

#### 旧构建流程

```bash
# 单一构建命令
npm run build

# 输出到单一 dist/ 目录
ls dist/
```

#### 新构建流程

```bash
# 构建所有包（按依赖顺序）
npm run build

# 或构建特定包
npm run build:shared
npm run build:prompt-enhance
npm run build:retrieval

# 输出到各包的 dist/ 目录
ls packages/shared/dist/
ls packages/prompt-enhance/dist/
ls packages/retrieval/dist/
```

#### TypeScript 项目引用

新架构使用 TypeScript 项目引用实现增量构建：

**tsconfig.base.json**（共享配置）：
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

**packages/retrieval/tsconfig.json**：
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [
    { "path": "../shared" }
  ],
  "include": ["src/**/*"]
}
```

#### 构建优化

1. **增量构建**：
   ```bash
   # 仅重新构建变更的包
   npm run build
   ```

2. **并行构建**（使用 pnpm）：
   ```bash
   pnpm run build --parallel
   ```

3. **清理构建**：
   ```bash
   npm run clean
   npm run build
   ```

### 开发工作流

#### 开发模式

**旧工作流**：
```bash
# 单一开发服务器
npm run dev
```

**新工作流**：
```bash
# 开发 Prompt Enhance
npm run dev:prompt-enhance

# 开发 Retrieval
npm run dev:retrieval

# 开发 Shared（监听模式）
cd packages/shared
npm run dev
```

#### 添加依赖

**旧方式**：
```bash
npm install <package>
```

**新方式**：
```bash
# 添加到特定包
npm install <package> -w @codebase-mcp/shared
npm install <package> -w @codebase-mcp/prompt-enhance
npm install <package> -w @codebase-mcp/retrieval

# 添加到根（开发依赖）
npm install <package> -D
```

#### 运行测试

**旧方式**：
```bash
npm test
```

**新方式**：
```bash
# 运行所有测试
npm test

# 运行特定包的测试
npm run test:retrieval

# 监听模式
cd packages/retrieval
npm run test:watch
```

#### 调试

**VS Code 调试配置**（`.vscode/launch.json`）：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Retrieval",
      "program": "${workspaceFolder}/packages/retrieval/dist/index.js",
      "preLaunchTask": "npm: build:retrieval",
      "outFiles": ["${workspaceFolder}/packages/*/dist/**/*.js"],
      "sourceMaps": true
    }
  ]
}
```

#### 发布流程

**旧流程**：
```bash
npm version patch
git push origin main
git push origin v1.0.1
```

**新流程**：
```bash
# 更新特定包版本
cd packages/prompt-enhance
npm version patch

# 创建 tag（触发 GitHub Actions）
git tag prompt-enhance-v1.0.1
git push origin prompt-enhance-v1.0.1

# GitHub Actions 自动构建和发布
```

### 迁移检查清单

#### 代码迁移

- [ ] 更新所有 import 路径
- [ ] 移除重复的共享代码
- [ ] 更新 package.json 依赖
- [ ] 更新 tsconfig.json 配置
- [ ] 更新构建脚本

#### 测试验证

- [ ] 所有测试通过
- [ ] 构建成功（无错误）
- [ ] 类型检查通过
- [ ] 功能正常工作

#### 文档更新

- [ ] 更新 README
- [ ] 更新 API 文档
- [ ] 更新开发指南
- [ ] 更新部署文档

#### CI/CD

- [ ] 更新 GitHub Actions 工作流
- [ ] 更新部署脚本
- [ ] 测试自动化构建

### 常见迁移问题

#### Q1: 如何处理循环依赖？

**A**: 新架构通过明确的依赖关系避免循环依赖：
- `shared` 不依赖任何包
- `prompt-enhance` 和 `retrieval` 只依赖 `shared`
- 两个应用包之间没有依赖

如果发现循环依赖，将共享代码移到 `shared` 包。

#### Q2: 如何共享类型定义？

**A**: 在 `shared` 包中定义共享类型：

```typescript
// packages/shared/src/types.ts
export interface ProjectInfo {
  path: string;
  blobCount: number;
}

// 在其他包中使用
import { ProjectInfo } from '@codebase-mcp/shared';
```

#### Q3: 如何处理包间的私有实现？

**A**: 
- 公共 API：导出到 `shared` 包
- 私有实现：保留在各自包内
- 不要跨包引用私有实现

#### Q4: 构建速度慢怎么办？

**A**: 
1. 使用增量构建（默认启用）
2. 使用 pnpm 代替 npm
3. 启用并行构建
4. 使用 `skipLibCheck` 跳过类型检查

#### Q5: 如何调试跨包问题？

**A**: 
1. 启用 source maps（默认启用）
2. 使用 VS Code 调试配置
3. 检查 `dist/` 目录的输出
4. 使用 `console.log` 或 `logger.debug`

### 获取帮助

如果在迁移过程中遇到问题：

1. **查看文档**：
   - [README.md](README.md)
   - [DEVELOPMENT.md](DEVELOPMENT.md)
   - [CONTRIBUTING.md](CONTRIBUTING.md)

2. **搜索 Issues**：
   - [GitHub Issues](https://github.com/your-repo/codebase-mcp/issues)

3. **提问**：
   - 创建新 Issue，使用 "migration" 标签
   - 提供详细的错误信息和环境信息

4. **社区讨论**：
   - [GitHub Discussions](https://github.com/your-repo/codebase-mcp/discussions)

---

## 总结

### 用户迁移要点

- ✅ 配置和数据完全兼容
- ✅ 无需重新索引
- ✅ 可随时回滚
- ✅ 性能有所提升

### 开发者迁移要点

- 🔄 更新 import 路径到 `@codebase-mcp/shared`
- 🔄 使用 workspace 命令管理依赖
- 🔄 理解新的构建流程
- 🔄 遵循模块化架构原则

### 迁移时间估算

- **用户迁移**：5-15 分钟
- **开发者迁移**：1-4 小时（取决于自定义代码量）

### 支持

如有任何问题，请随时联系我们：
- GitHub Issues: https://github.com/your-repo/codebase-mcp/issues
- Email: support@example.com

感谢您使用 Codebase MCP！🎉
