# 开发指南

本文档提供 Codebase MCP Monorepo 的开发环境设置和开发工作流指南。

## 目录

- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [Monorepo 结构](#monorepo-结构)
- [开发工作流](#开发工作流)
- [构建系统](#构建系统)
- [测试](#测试)
- [调试](#调试)
- [常见任务](#常见任务)
- [故障排除](#故障排除)

## 环境要求

### 必需

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0（或 pnpm >= 8.0.0）
- **Git** >= 2.30.0

### 推荐

- **VS Code** - 推荐的 IDE
- **VS Code 扩展**：
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - GitLens

### 操作系统

- Windows 10/11
- macOS 12+
- Linux (Ubuntu 20.04+, Debian 11+)
- WSL2 (Ubuntu 20.04+)

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/your-repo/codebase-mcp.git
cd codebase-mcp
```

### 2. 安装依赖

```bash
# 使用 npm workspaces
npm install

# 或使用 pnpm（更快）
pnpm install
```

这将安装所有包的依赖，包括：
- 根目录的开发依赖
- `@codebase-mcp/shared` 的依赖
- `@codebase-mcp/prompt-enhance` 的依赖
- `@codebase-mcp/retrieval` 的依赖

### 3. 构建所有包

```bash
npm run build
```

这将按依赖顺序构建所有包：
1. `@codebase-mcp/shared`
2. `@codebase-mcp/prompt-enhance`
3. `@codebase-mcp/retrieval`

### 4. 运行开发服务器

```bash
# Prompt Enhance（带 Web UI）
npm run dev:prompt-enhance

# Retrieval（MCP 服务器 + Web UI）
npm run dev:retrieval
```

### 5. 验证安装

```bash
# 运行测试
npm test

# 检查构建产物
ls packages/shared/dist
ls packages/prompt-enhance/dist
ls packages/retrieval/dist
```

## Monorepo 结构

### 目录布局

```
codebase-mcp-monorepo/
├── packages/                    # 所有包
│   ├── shared/                 # 共享核心包
│   │   ├── src/               # TypeScript 源码
│   │   ├── dist/              # 编译输出
│   │   ├── package.json       # 包配置
│   │   └── tsconfig.json      # TypeScript 配置
│   │
│   ├── prompt-enhance/         # Prompt Enhance 包
│   │   ├── src/
│   │   ├── dist/
│   │   ├── prompt/            # 提示词文件
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── pkg.config.json    # pkg 打包配置
│   │
│   └── retrieval/              # Retrieval 包
│       ├── src/
│       ├── dist/
│       ├── package.json
│       └── tsconfig.json
│
├── .github/                     # GitHub Actions
│   └── workflows/
│       ├── build-prompt-enhance.yml
│       └── build-retrieval.yml
│
├── scripts/                     # 构建脚本
│   ├── deploy-prepare.js
│   └── deploy.js
│
├── package.json                 # 根 package.json（workspaces）
├── tsconfig.base.json          # 共享 TypeScript 配置
├── README.md                    # 项目文档
├── CONTRIBUTING.md              # 贡献指南
└── DEVELOPMENT.md               # 本文档
```

### 包依赖关系

```
@codebase-mcp/prompt-enhance  ──┐
                                 ├──> @codebase-mcp/shared
@codebase-mcp/retrieval       ──┘
```

- `shared` 是基础包，不依赖其他包
- `prompt-enhance` 和 `retrieval` 都依赖 `shared`
- `prompt-enhance` 和 `retrieval` 之间没有依赖关系

## 开发工作流

### 工作区命令

npm workspaces 提供了便捷的命令来管理多个包：

```bash
# 在所有包中运行命令
npm run build --workspaces
npm test --workspaces

# 在特定包中运行命令
npm run build -w @codebase-mcp/shared
npm run dev -w @codebase-mcp/prompt-enhance
npm test -w @codebase-mcp/retrieval

# 添加依赖到特定包
npm install axios -w @codebase-mcp/retrieval
npm install -D @types/node -w @codebase-mcp/shared

# 移除依赖
npm uninstall axios -w @codebase-mcp/retrieval
```

### 开发模式

#### Shared 包开发

```bash
# 监听模式（自动重新编译）
cd packages/shared
npm run dev

# 或从根目录
npm run dev -w @codebase-mcp/shared
```

#### Prompt Enhance 开发

```bash
# 开发模式（热重载）
npm run dev:prompt-enhance

# 浏览器自动打开 http://localhost:8090
```

开发模式特性：
- 自动重新编译 TypeScript
- 自动重启服务器
- 保留日志和状态

#### Retrieval 开发

```bash
# 开发模式（MCP 服务器 + Web UI）
npm run dev:retrieval

# 仅 MCP 服务器（stdio）
cd packages/retrieval
npm run dev
```

### 代码更改流程

1. **创建分支**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **进行更改**
   - 编辑源代码
   - 添加测试
   - 更新文档

3. **本地验证**
   ```bash
   # 构建
   npm run build
   
   # 运行测试
   npm test
   
   # 检查类型
   npx tsc --noEmit
   ```

4. **提交更改**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

5. **推送并创建 PR**
   ```bash
   git push origin feature/your-feature
   ```

## 构建系统

### TypeScript 配置

#### 基础配置（tsconfig.base.json）

所有包共享的基础配置：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

#### 包配置（tsconfig.json）

每个包继承基础配置并添加特定设置：

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
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 项目引用

TypeScript 项目引用实现增量构建：

```bash
# 构建所有项目（增量）
npm run build

# 强制重新构建
npm run clean
npm run build
```

### 构建顺序

构建按依赖顺序自动执行：

1. `@codebase-mcp/shared` - 基础包
2. `@codebase-mcp/prompt-enhance` - 依赖 shared
3. `@codebase-mcp/retrieval` - 依赖 shared

### 清理构建产物

```bash
# 清理所有包
npm run clean

# 清理特定包
npm run clean -w @codebase-mcp/shared
```

## 测试

### 测试框架

使用 Vitest 作为测试框架：

```bash
# 运行所有测试
npm test

# 运行特定包的测试
npm run test:retrieval

# 监听模式
cd packages/retrieval
npm run test:watch

# 覆盖率报告
npm run test:coverage
```

### 测试结构

```
packages/retrieval/
├── src/
│   ├── index.ts
│   └── tools/
│       └── searchContext.ts
└── __tests__/
    ├── index.test.ts
    └── tools/
        └── searchContext.test.ts
```

### 编写测试

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { IndexManager } from '../src/index/manager.js';

describe('IndexManager', () => {
  let manager: IndexManager;
  
  beforeEach(() => {
    manager = new IndexManager(/* ... */);
  });
  
  it('should index new files', async () => {
    const result = await manager.indexProject('/path/to/project');
    expect(result.uploaded).toBeGreaterThan(0);
  });
});
```

### 测试覆盖率目标

- 核心功能：100%
- 工具函数：> 90%
- UI 组件：> 80%

## 调试

### VS Code 调试配置

创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Prompt Enhance",
      "program": "${workspaceFolder}/packages/prompt-enhance/dist/index.js",
      "preLaunchTask": "npm: build:prompt-enhance",
      "outFiles": ["${workspaceFolder}/packages/*/dist/**/*.js"],
      "sourceMaps": true
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Retrieval",
      "program": "${workspaceFolder}/packages/retrieval/dist/index.js",
      "args": ["--web-port", "8090"],
      "preLaunchTask": "npm: build:retrieval",
      "outFiles": ["${workspaceFolder}/packages/*/dist/**/*.js"],
      "sourceMaps": true
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["test"],
      "console": "integratedTerminal"
    }
  ]
}
```

### 日志调试

```typescript
import { logger } from '@codebase-mcp/shared';

// 不同级别的日志
logger.debug('Detailed debug information');
logger.info('General information');
logger.warning('Warning message');
logger.error('Error message');
logger.exception('Exception occurred', error);
```

日志文件位置：`~/.codebase-mcp/log/codebase-mcp.log`

### Chrome DevTools

对于 Web UI 调试：

1. 打开浏览器开发者工具（F12）
2. 查看 Console、Network、Sources 标签
3. 设置断点和查看变量

## 常见任务

### 添加新功能

1. **确定范围**
   - 功能属于哪个包？
   - 是否需要修改 shared 包？

2. **创建分支**
   ```bash
   git checkout -b feature/new-feature
   ```

3. **实现功能**
   - 编写代码
   - 添加测试
   - 更新文档

4. **验证**
   ```bash
   npm run build
   npm test
   ```

5. **提交**
   ```bash
   git commit -m "feat(scope): add new feature"
   ```

### 修复 Bug

1. **复现问题**
   - 编写失败的测试用例
   - 确认问题存在

2. **修复代码**
   - 修改源代码
   - 确保测试通过

3. **验证修复**
   ```bash
   npm test
   npm run build
   ```

4. **提交**
   ```bash
   git commit -m "fix(scope): resolve issue description"
   ```

### 更新依赖

```bash
# 检查过时的依赖
npm outdated

# 更新特定依赖
npm update <package-name>

# 更新所有依赖（谨慎）
npm update

# 更新特定包的依赖
npm update -w @codebase-mcp/shared
```

### 添加新包

1. **创建包目录**
   ```bash
   mkdir -p packages/new-package/src
   cd packages/new-package
   ```

2. **初始化 package.json**
   ```bash
   npm init -y
   ```

3. **配置 package.json**
   ```json
   {
     "name": "@codebase-mcp/new-package",
     "version": "0.1.0",
     "type": "module",
     "main": "./dist/index.js",
     "types": "./dist/index.d.ts",
     "scripts": {
       "build": "tsc",
       "dev": "tsc --watch",
       "clean": "rm -rf dist"
     }
   }
   ```

4. **创建 tsconfig.json**
   ```json
   {
     "extends": "../../tsconfig.base.json",
     "compilerOptions": {
       "outDir": "./dist",
       "rootDir": "./src"
     },
     "include": ["src/**/*"]
   }
   ```

5. **更新根 package.json**
   - 确保 `workspaces` 包含新包

6. **安装依赖**
   ```bash
   cd ../..
   npm install
   ```

### 打包 Prompt Enhance

```bash
# 构建
npm run build:prompt-enhance

# 打包为 exe
npm run package:prompt-enhance

# 输出位置
ls packages/prompt-enhance/build/
```

### 发布新版本

1. **更新版本号**
   ```bash
   # 在特定包目录
   cd packages/prompt-enhance
   npm version patch  # 或 minor, major
   ```

2. **更新 CHANGELOG**
   - 记录变更内容

3. **创建 tag**
   ```bash
   git tag prompt-enhance-v1.0.1
   git push origin prompt-enhance-v1.0.1
   ```

4. **GitHub Actions 自动构建**
   - 监控工作流执行
   - 验证 Release 创建

## 故障排除

### 构建失败

**问题**：TypeScript 编译错误

**解决**：
```bash
# 清理并重新构建
npm run clean
npm install
npm run build
```

**问题**：找不到模块

**解决**：
- 检查 import 路径是否包含 `.js` 扩展名
- 检查 `tsconfig.json` 的 `paths` 配置
- 确保依赖包已构建

### 测试失败

**问题**：测试超时

**解决**：
```typescript
// 增加超时时间
it('long running test', async () => {
  // ...
}, 10000); // 10 秒
```

**问题**：模块解析错误

**解决**：
- 检查 `package.json` 的 `type: "module"`
- 确保 import 使用 `.js` 扩展名

### 开发服务器问题

**问题**：端口被占用

**解决**：
```bash
# 使用其他端口
npm run dev:prompt-enhance -- --port 9000
```

**问题**：热重载不工作

**解决**：
- 重启开发服务器
- 检查文件监听限制（Linux）
  ```bash
  echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
  sudo sysctl -p
  ```

### WSL 相关问题

**问题**：路径转换失败

**解决**：
- 使用 Unix 格式路径（`/mnt/c/...`）
- 避免使用 UNC 路径（`\\wsl$\...`）

**问题**：文件监听不工作

**解决**：
```bash
# 在 WSL 中增加监听限制
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 依赖问题

**问题**：依赖版本冲突

**解决**：
```bash
# 删除所有 node_modules
rm -rf node_modules packages/*/node_modules

# 删除 package-lock.json
rm package-lock.json

# 重新安装
npm install
```

**问题**：Workspace 链接问题

**解决**：
```bash
# 重新链接 workspaces
npm install --force
```

## 性能优化

### 构建性能

- 使用 TypeScript 项目引用（增量构建）
- 启用 `skipLibCheck` 跳过类型检查
- 使用 `tsc --build` 而不是 `tsc`

### 开发体验

- 使用 `tsx` 或 `ts-node` 快速运行 TypeScript
- 启用 VS Code 的 TypeScript 服务器
- 使用 `nodemon` 自动重启

### 测试性能

- 使用 `vitest` 的并行执行
- 避免不必要的文件系统操作
- 使用内存数据库（如果需要）

## 资源

### 文档

- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [npm Workspaces](https://docs.npmjs.com/cli/v9/using-npm/workspaces)
- [Vitest 文档](https://vitest.dev/)
- [MCP 协议规范](https://modelcontextprotocol.io)

### 工具

- [VS Code](https://code.visualstudio.com/)
- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/)（可选，更快的包管理器）

### 社区

- [GitHub Issues](https://github.com/your-repo/codebase-mcp/issues)
- [GitHub Discussions](https://github.com/your-repo/codebase-mcp/discussions)

---

如有任何问题，请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 或创建 Issue。
