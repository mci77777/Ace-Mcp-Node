# README V2 更新内容

## 建议添加到主README.md的内容

---

## 🆕 Enhance Prompt V2 新功能 (2025-11-16)

### 核心特性

#### 1. 🌐 智能语言切换
自动根据用户选择追加语言提示,无需手动输入:
- **中文模式**: 自动追加 "请用简体中文回应"
- **英文模式**: 自动追加 "Please respond in English"

#### 2. 📦 RAW请求预览
实时查看发送给API的完整请求体:
- JSON格式化显示
- 一键复制功能
- 隐私保护(可隐藏)

#### 3. 📝 Markdown渲染
增强结果支持两种显示模式:
- **Raw模式**: 终端风格原始文本
- **Markdown模式**: 格式化渲染预览

#### 4. 🎨 优化的UI布局
全新2x2网格布局,信息组织更清晰:
```
┌─────────────────┬─────────────────┐
│ Project Path    │ RAW Message     │
│ Original Message│ (Request Body)  │
├─────────────────┴─────────────────┤
│ Submit Button                     │
├───────────────────────────────────┤
│ Enhanced Result                   │
└───────────────────────────────────┘
```

### 快速开始

```bash
# 1. 编译
npm run build

# 2. 启动服务
npm start:web

# 3. 打开浏览器
# http://localhost:8080

# 4. 运行测试
node test/test-v2-integration.js
```

### API使用示例

#### 中文增强
```javascript
const response = await axios.post('/api/enhance-prompt', {
    projectPath: 'D:/project',
    originalMessage: '如何实现登录?',
    language: 'zh'  // 自动追加中文提示
});
```

#### 英文增强
```javascript
const response = await axios.post('/api/enhance-prompt', {
    projectPath: 'D:/project',
    originalMessage: 'How to implement login?',
    language: 'en'  // 自动追加英文提示
});
```

#### 响应格式
```json
{
  "enhancedPrompt": "增强后的完整提示词",
  "originalMessage": "原始消息",
  "finalMessage": "原始消息\n\n请用简体中文回应",
  "language": "zh",
  "rawRequest": {
    "projectPath": "...",
    "originalMessage": "...",
    "model": "...",
    "language": "zh",
    "selectedFiles": [],
    "userGuidelines": "none",
    "includeReadme": false
  }
}
```

### 文档

- 📖 [快速启动指南](QUICK_START_V2.md)
- 📚 [完整功能指南](docs/ENHANCE_PROMPT_V2_GUIDE.md)
- 📋 [快速参考](docs/ENHANCE_PROMPT_QUICK_REFERENCE_V2.md)
- 📝 [更新日志](docs/ENHANCE_PROMPT_V2_CHANGELOG.md)
- ✅ [验收清单](ENHANCE_PROMPT_V2_VERIFICATION.md)

### 兼容性

- ✅ 完全向后兼容
- ✅ `language` 参数可选(默认 'zh')
- ✅ 旧版本可忽略新字段

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Enter` | 提交增强请求 |
| `ESC` | 关闭通知/模态框 |

---

## 建议的README.md结构

```markdown
# Codebase Retrieval MCP

## 目录
- [简介](#简介)
- [功能特性](#功能特性)
- [🆕 V2新功能](#-enhance-prompt-v2-新功能-2025-11-16) ← 新增
- [安装](#安装)
- [使用](#使用)
- [API文档](#api文档)
- [开发](#开发)
- [测试](#测试)
- [贡献](#贡献)
- [许可证](#许可证)
```

## 建议的CHANGELOG.md更新

```markdown
# Changelog

## [2.0.0] - 2025-11-16

### Added
- 🌐 智能语言切换功能(中文/英文)
- 📦 RAW请求体预览功能
- 📝 Markdown/Raw格式切换
- 🎨 优化的2x2网格布局
- 📚 完整的V2功能文档

### Changed
- 优化Enhance Prompt UI布局
- 改进用户体验和交互流程

### API Changes
- 新增 `language` 请求参数(可选)
- 新增 `finalMessage` 响应字段
- 新增 `rawRequest` 响应字段

### Documentation
- 新增快速启动指南
- 新增V2功能完整文档
- 新增部署检查清单

## [1.x.x] - Previous versions
...
```

## 建议的package.json更新

```json
{
  "name": "codebase-retrieval-mcp",
  "version": "2.0.0",
  "description": "High-performance MCP server with enhanced prompt features",
  "scripts": {
    "test:v2": "node test/test-v2-integration.js",
    "test:v2:ui": "start test/test-enhance-prompt-ui-v2.html"
  }
}
```
