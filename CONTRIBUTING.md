# 贡献指南

感谢您对 Codebase MCP 项目的关注！我们欢迎各种形式的贡献，包括但不限于：

- 🐛 报告 Bug
- 💡 提出新功能建议
- 📝 改进文档
- 🔧 提交代码修复或新功能
- 🌍 翻译文档

## 行为准则

### 我们的承诺

为了营造一个开放和友好的环境，我们承诺：

- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

### 不可接受的行为

- 使用性化的语言或图像
- 人身攻击或侮辱性评论
- 公开或私下骚扰
- 未经许可发布他人的私人信息
- 其他不道德或不专业的行为

## 如何贡献

### 报告 Bug

在提交 Bug 报告之前：

1. **检查现有 Issues** - 确保问题尚未被报告
2. **使用最新版本** - 确认问题在最新版本中仍然存在
3. **收集信息** - 准备详细的复现步骤和环境信息

**Bug 报告应包含**：

- 清晰的标题和描述
- 复现步骤（越详细越好）
- 预期行为和实际行为
- 环境信息（操作系统、Node.js 版本、包版本）
- 相关日志或截图
- 可能的解决方案（如果有）

**示例**：

```markdown
## Bug 描述
索引大型项目时内存溢出

## 复现步骤
1. 运行 `codebase-retrieval --web-port 8090`
2. 索引包含 10000+ 文件的项目
3. 观察内存使用情况

## 预期行为
内存使用应保持在合理范围内（< 1GB）

## 实际行为
内存使用超过 2GB，最终导致进程崩溃

## 环境
- OS: Windows 11
- Node.js: v18.17.0
- Package: @codebase-mcp/retrieval@1.0.0

## 日志
[附加相关日志]
```

### 提出功能建议

在提交功能建议之前：

1. **检查现有 Issues** - 确保功能尚未被提出
2. **考虑范围** - 功能是否符合项目目标
3. **提供用例** - 说明功能的实际应用场景

**功能建议应包含**：

- 清晰的标题和描述
- 问题陈述（为什么需要这个功能）
- 建议的解决方案
- 替代方案（如果有）
- 额外的上下文（截图、示例等）

**示例**：

```markdown
## 功能描述
支持多项目并行索引

## 问题陈述
当前只能串行索引项目，对于需要索引多个项目的用户来说效率较低。

## 建议的解决方案
添加 `--parallel <number>` 选项，允许同时索引多个项目。

## 替代方案
1. 使用多个 MCP 服务器实例
2. 实现队列系统

## 额外上下文
类似功能在其他索引工具中很常见，如 ripgrep 的 `-j` 选项。
```

### 提交代码

#### 开发环境设置

参见 [DEVELOPMENT.md](DEVELOPMENT.md) 获取详细的开发环境设置指南。

#### 代码提交流程

1. **Fork 仓库**
   ```bash
   # 在 GitHub 上 Fork 仓库
   # 克隆你的 Fork
   git clone https://github.com/your-username/codebase-mcp.git
   cd codebase-mcp
   ```

2. **创建分支**
   ```bash
   # 从 main 分支创建新分支
   git checkout -b feature/your-feature-name
   # 或
   git checkout -b fix/your-bug-fix
   ```

3. **进行更改**
   ```bash
   # 安装依赖
   npm install
   
   # 进行代码更改
   # ...
   
   # 构建和测试
   npm run build
   npm test
   ```

4. **提交更改**
   ```bash
   # 添加更改
   git add .
   
   # 提交（遵循提交消息规范）
   git commit -m "feat: add parallel indexing support"
   ```

5. **推送分支**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **创建 Pull Request**
   - 在 GitHub 上创建 Pull Request
   - 填写 PR 模板
   - 等待代码审查

#### 提交消息规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

**格式**：
```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型（type）**：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响代码运行）
- `refactor`: 重构（既不是新功能也不是 Bug 修复）
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

**范围（scope）**：
- `shared`: @codebase-mcp/shared 包
- `prompt-enhance`: @codebase-mcp/prompt-enhance 包
- `retrieval`: @codebase-mcp/retrieval 包
- `config`: 配置相关
- `logger`: 日志相关
- `index`: 索引相关
- `web`: Web 界面相关

**示例**：

```bash
# 新功能
git commit -m "feat(retrieval): add parallel indexing support"

# Bug 修复
git commit -m "fix(shared): resolve WSL path conversion issue"

# 文档更新
git commit -m "docs: update installation guide"

# 重构
git commit -m "refactor(prompt-enhance): simplify API client logic"

# 性能优化
git commit -m "perf(index): optimize file scanning performance"
```

**详细提交消息**：

```
feat(retrieval): add parallel indexing support

Add --parallel option to enable concurrent project indexing.
This improves indexing performance for users with multiple projects.

- Add parallel option to CLI
- Implement worker pool for concurrent indexing
- Update documentation

Closes #123
```

#### 代码审查

所有代码提交都需要经过审查：

1. **自动检查**
   - TypeScript 编译通过
   - 所有测试通过
   - 代码风格检查通过

2. **人工审查**
   - 代码质量和可读性
   - 是否遵循项目规范
   - 是否有充分的测试
   - 文档是否更新

3. **反馈处理**
   - 及时响应审查意见
   - 进行必要的修改
   - 更新 PR 描述

#### Pull Request 检查清单

在提交 PR 之前，请确保：

- [ ] 代码遵循项目代码规范
- [ ] 所有测试通过（`npm test`）
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] 提交消息遵循规范
- [ ] PR 描述清晰完整
- [ ] 没有合并冲突
- [ ] 构建成功（`npm run build`）

## 代码规范

### TypeScript 规范

#### 命名约定

```typescript
// 类名：PascalCase
class IndexManager { }

// 接口：PascalCase，可选 I 前缀
interface ConfigOptions { }
interface ILogger { }

// 函数/方法：camelCase
function normalizeProjectPath() { }

// 变量：camelCase
const projectPath = '/path/to/project';

// 常量：UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;

// 私有成员：下划线前缀
private _internalState: any;

// 类型别名：PascalCase
type ProjectInfo = { path: string; blobCount: number };

// 枚举：PascalCase
enum LogLevel {
  DEBUG,
  INFO,
  WARNING,
  ERROR
}
```

#### 类型注解

```typescript
// 显式类型注解（公共 API）
export function scanDirectory(
  rootPath: string,
  options: ScanOptions
): Promise<ScanResult> {
  // ...
}

// 类型推断（内部实现）
const files = await readdir(path); // 类型自动推断

// 避免 any，使用 unknown
function processData(data: unknown) {
  if (typeof data === 'string') {
    // 类型收窄
  }
}
```

#### 导入规范

```typescript
// ESM 导入必须包含 .js 扩展名
import { getConfig } from './config.js';
import { IndexManager } from './index/manager.js';

// 分组导入
// 1. Node.js 内置模块
import { readFile } from 'fs/promises';
import path from 'path';

// 2. 第三方依赖
import express from 'express';
import axios from 'axios';

// 3. 项目内部模块
import { getConfig } from './config.js';
import { logger } from './logger.js';
```

#### 错误处理

```typescript
// 使用 try-catch 处理异步错误
async function indexProject(projectPath: string): Promise<void> {
  try {
    const files = await scanDirectory(projectPath);
    await uploadFiles(files);
  } catch (error) {
    logger.exception('Failed to index project', error as Error);
    throw error; // 重新抛出或处理
  }
}

// 自定义错误类
class IndexError extends Error {
  constructor(
    message: string,
    public readonly projectPath: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'IndexError';
  }
}
```

#### 异步编程

```typescript
// 优先使用 async/await
async function fetchData(): Promise<Data> {
  const response = await axios.get(url);
  return response.data;
}

// 并行执行
const [users, posts] = await Promise.all([
  fetchUsers(),
  fetchPosts()
]);

// 错误处理
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', error);
}
```

### 代码风格

#### 格式化

- 使用 2 空格缩进
- 使用单引号（字符串）
- 行尾不加分号（可选，保持一致）
- 最大行长度：100 字符
- 使用 Prettier 自动格式化

#### 注释

```typescript
/**
 * 扫描项目目录并返回文件列表
 * 
 * @param rootPath - 项目根目录的绝对路径
 * @param options - 扫描选项
 * @returns 扫描结果，包含文件列表和统计信息
 * @throws {Error} 如果路径不存在或无权限访问
 * 
 * @example
 * ```typescript
 * const result = await scanDirectory('/path/to/project', {
 *   maxDepth: 30,
 *   textExtensions: new Set(['.ts', '.js'])
 * });
 * ```
 */
export async function scanDirectory(
  rootPath: string,
  options: ScanOptions
): Promise<ScanResult> {
  // 实现...
}

// 单行注释：解释"为什么"而不是"是什么"
// 使用 SHA-256 而不是 MD5，因为需要更好的碰撞抵抗
const hash = crypto.createHash('sha256');
```

#### 函数设计

```typescript
// 单一职责：函数只做一件事
function calculateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// 参数数量：最多 3-4 个，否则使用对象
// 不好
function createUser(name: string, email: string, age: number, role: string) { }

// 好
interface CreateUserOptions {
  name: string;
  email: string;
  age: number;
  role: string;
}
function createUser(options: CreateUserOptions) { }

// 返回值：明确的类型，避免 null/undefined 混用
// 不好
function findUser(id: string): User | null | undefined { }

// 好
function findUser(id: string): User | null { }
// 或
function findUser(id: string): User | undefined { }
```

### 测试规范

#### 测试结构

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('IndexManager', () => {
  let manager: IndexManager;
  
  beforeEach(() => {
    manager = new IndexManager(/* ... */);
  });
  
  afterEach(() => {
    // 清理
  });
  
  describe('indexProject', () => {
    it('should index new files', async () => {
      // Arrange
      const projectPath = '/path/to/project';
      
      // Act
      const result = await manager.indexProject(projectPath);
      
      // Assert
      expect(result.uploaded).toBeGreaterThan(0);
    });
    
    it('should skip already indexed files', async () => {
      // ...
    });
    
    it('should handle errors gracefully', async () => {
      // ...
    });
  });
});
```

#### 测试覆盖率

- 核心功能：100% 覆盖
- 工具函数：> 90% 覆盖
- UI 组件：> 80% 覆盖

#### 测试类型

1. **单元测试** - 测试单个函数/类
2. **集成测试** - 测试模块间交互
3. **端到端测试** - 测试完整流程

### 文档规范

#### README 结构

每个包的 README 应包含：

1. 简介和特性
2. 安装说明
3. 快速开始
4. API 文档
5. 配置说明
6. 示例
7. 故障排除
8. 许可证

#### API 文档

使用 JSDoc 注释：

```typescript
/**
 * 配置管理类
 * 
 * 负责加载、验证和管理应用配置。配置从 TOML 文件加载，
 * 支持运行时重载和命令行参数覆盖。
 * 
 * @example
 * ```typescript
 * const config = initConfig({ webPort: 8090 });
 * console.log(config.baseUrl);
 * ```
 */
export class Config {
  /**
   * 创建配置实例
   * 
   * @param overrides - 覆盖配置文件的选项
   */
  constructor(overrides?: Partial<ConfigOptions>) {
    // ...
  }
}
```

## 发布流程

### 版本号规范

遵循 [Semantic Versioning](https://semver.org/)：

- **主版本号（Major）**：不兼容的 API 变更
- **次版本号（Minor）**：向后兼容的功能新增
- **修订号（Patch）**：向后兼容的 Bug 修复

**示例**：
- `1.0.0` → `1.0.1`：Bug 修复
- `1.0.1` → `1.1.0`：新功能
- `1.1.0` → `2.0.0`：破坏性变更

### 发布检查清单

- [ ] 所有测试通过
- [ ] 文档已更新
- [ ] CHANGELOG 已更新
- [ ] 版本号已更新
- [ ] 创建 Git tag
- [ ] 推送到 GitHub
- [ ] GitHub Actions 构建成功
- [ ] Release 创建成功

## 获取帮助

如果您有任何问题：

1. **查看文档** - [README.md](README.md)、[DEVELOPMENT.md](DEVELOPMENT.md)
2. **搜索 Issues** - 可能已有相关讨论
3. **提问** - 创建新 Issue，使用 "question" 标签
4. **讨论** - 使用 GitHub Discussions

## 许可证

通过贡献代码，您同意您的贡献将在 ISC 许可证下发布。

## 致谢

感谢所有贡献者的付出！您的贡献让这个项目变得更好。

---

再次感谢您的贡献！🎉
