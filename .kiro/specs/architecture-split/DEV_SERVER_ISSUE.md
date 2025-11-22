# Dev Server 启动问题

## 问题描述

**报告时间**: 2025-11-21  
**问题**: 运行 `npm run dev` 时出现模块导入错误。

```
SyntaxError: The requested module './config.js' does not provide an export named 'ConfigOptions'
```

## 根本原因

**tsx watch 模式**直接运行 TypeScript 源文件，但模块解析存在问题：
- `packages/shared/src/index.ts` 导入 `./config.js`（ESM 风格）
- 但 tsx 在运行时找不到 `ConfigOptions` 导出

## 临时解决方案

### 方案 1: 使用构建后的文件运行

```bash
# 先构建所有包
npm run build

# 运行构建后的文件
node packages/prompt-enhance/dist/index.js --port 8090
```

### 方案 2: 使用 Electron 应用

```bash
# 打包 Electron 应用
npm run package:electron -w @codebase-mcp/prompt-enhance

# 运行便携版
packages/prompt-enhance/build/electron/Prompt Enhance-0.1.0-portable.exe
```

### 方案 3: 修复 tsconfig 配置

需要添加 `composite: true` 到 shared 包的 tsconfig.json：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "declaration": true,
    "declarationMap": true
  }
}
```

## 已尝试的修复

1. ✅ 添加 `composite: true` 到 shared/tsconfig.json
2. ⚠️ tsx watch 模式仍然有问题（模块解析）
3. ✅ 构建后运行正常

## 推荐方案

**开发时使用 Electron 应用**：
1. 修改代码后运行 `npm run build:prompt-enhance`
2. 运行 Electron 应用测试
3. 或使用 `npm run package:electron` 打包测试

**生产环境**：
- 使用打包后的 Electron 应用（exe 文件）
- 配置文件：`~/.codebase-mcp/settings.toml`

## 后续优化

1. **修复 tsx watch 模式**：
   - 调整模块解析配置
   - 或使用 ts-node 替代 tsx

2. **改进开发体验**：
   - 添加 nodemon 监听文件变化
   - 自动重新构建和重启

3. **统一构建流程**：
   - 使用 turborepo 或 nx 管理 monorepo
   - 自动处理依赖顺序

## 相关文件

- `packages/shared/tsconfig.json` - 已添加 composite
- `packages/prompt-enhance/package.json` - dev 脚本
- `tsconfig.base.json` - 基础配置

---

**状态**: 🔄 进行中  
**优先级**: 中  
**影响**: 开发体验（生产环境不受影响）
