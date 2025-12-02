# Prompt Enhance 故障排除

## 快速诊断

如果打包后的应用出现问题，按以下步骤操作：

### 1. 检查应用是否启动

```powershell
# 查看进程
Get-Process | Where-Object { $_.Name -like "*Prompt*" }

# 查看端口占用
netstat -ano | findstr "8090"
```

### 2. 访问调试页面

应用启动后，在浏览器中访问：
```
http://localhost:8090/debug
```

这个页面会显示：
- ✅ 运行环境（Electron/Node.js）
- ✅ 所有路径解析尝试
- ✅ 模板目录内容
- ✅ 关键文件存在性检查

### 3. 查看日志文件

日志位置：
```
Windows: %USERPROFILE%\.codebase-mcp\log\codebase-mcp.log
macOS/Linux: ~/.codebase-mcp/log/codebase-mcp.log
```

查看日志：
```powershell
# Windows
Get-Content "$env:USERPROFILE\.codebase-mcp\log\codebase-mcp.log" -Tail 50

# 或使用记事本
notepad "$env:USERPROFILE\.codebase-mcp\log\codebase-mcp.log"
```

## 常见问题

### 问题 1: 窗口显示空白

**症状**: 应用启动后窗口是白色的

**解决步骤**:
1. 访问 `http://localhost:8090/debug` 查看路径信息
2. 检查日志中是否有 "✓ EXISTS" 的路径
3. 如果所有路径都是 "✗ NOT FOUND"，重新构建：
   ```powershell
   npm run build:electron
   npm run package:electron:win
   ```

### 问题 2: 端口被占用

**症状**: 日志显示 "EADDRINUSE" 错误

**解决步骤**:
1. 关闭占用端口的程序：
   ```powershell
   # 查找占用 8090 端口的进程
   netstat -ano | findstr "8090"
   
   # 结束进程（替换 PID）
   taskkill /PID <PID> /F
   ```
2. 或者应用会自动尝试下一个端口（8091, 8090...）

### 问题 3: 配置文件错误

**症状**: 应用启动失败，日志显示配置错误

**解决步骤**:
1. 删除配置文件：
   ```powershell
   Remove-Item "$env:USERPROFILE\.codebase-mcp\settings.toml"
   ```
2. 重新启动应用，会自动生成默认配置

### 问题 4: 资源文件加载失败

**症状**: 页面显示但样式错乱

**解决步骤**:
1. 打开 DevTools（开发模式）
2. 查看 Network 标签，找到 404 的资源
3. 检查 `/static/` 路径映射：
   ```powershell
   # 验证模板文件存在
   ls dist\web\templates\scripts
   ls dist\web\templates\styles
   ```

## 开发者工具

### 启用 DevTools

在 `src/electron/main.ts` 中取消注释：
```typescript
// 开发模式下打开 DevTools
if (process.env.NODE_ENV === 'development') {
  mainWindow.webContents.openDevTools();
}
```

或设置环境变量：
```powershell
$env:NODE_ENV = "development"
npm run start:electron
```

### 解压 asar 文件

检查打包后的文件结构：
```powershell
# 安装 asar 工具
npm install -g asar

# 解压
asar extract "build\electron\win-unpacked\resources\app.asar" "extracted"

# 查看文件
ls extracted\dist\web\templates
```

### 手动测试路径

在 Node.js 中测试路径解析：
```javascript
const path = require('path');
const fs = require('fs');

const __dirname = 'C:\\path\\to\\app.asar\\dist\\web';
const templatesDir = path.join(__dirname, 'templates');

console.log('Templates dir:', templatesDir);
console.log('Exists:', fs.existsSync(templatesDir));
console.log('Contents:', fs.readdirSync(templatesDir));
```

## 测试脚本

### 本地测试
```powershell
cd packages/prompt-enhance
.\test-electron-local.ps1
```

### 打包测试
```powershell
cd packages/prompt-enhance
.\test-electron-packaged.ps1
```

### 完整测试流程
```powershell
# 1. 清理
npm run clean

# 2. 构建
npm run build:electron

# 3. 验证文件
ls dist\web\templates

# 4. 本地测试
npm run start:electron

# 5. 打包
npm run package:electron:win

# 6. 运行打包后的应用
$exe = Get-ChildItem -Path "build\electron" -Filter "*.exe" -Recurse | 
    Where-Object { $_.Name -notlike "*Uninstall*" } | 
    Select-Object -First 1
& $exe.FullName
```

## 获取帮助

如果以上步骤无法解决问题：

1. **收集信息**:
   - 访问 `/debug` 页面并截图
   - 复制日志文件内容
   - 记录错误消息

2. **检查文档**:
   - [WEB_UI_DEBUG_GUIDE.md](../../.kiro/specs/architecture-split/WEB_UI_DEBUG_GUIDE.md)
   - [ELECTRON_INTEGRATION_SUMMARY.md](../../.kiro/specs/architecture-split/ELECTRON_INTEGRATION_SUMMARY.md)

3. **提交 Issue**:
   - 包含调试信息
   - 包含日志文件
   - 说明复现步骤

## 预防措施

### 构建前检查清单

- [ ] 运行 `npm run build:electron`
- [ ] 验证 `dist/web/templates/` 存在
- [ ] 验证 `dist/web/templates/index.html` 存在
- [ ] 验证 `dist/web/templates/scripts/app.js` 存在
- [ ] 检查日志中没有构建错误

### 打包前检查清单

- [ ] 所有构建检查通过
- [ ] 本地测试成功（`npm run start:electron`）
- [ ] 配置文件正确（`~/.codebase-mcp/settings.toml`）
- [ ] 没有端口冲突

### 发布前检查清单

- [ ] 所有打包检查通过
- [ ] 打包后的应用可以启动
- [ ] Web UI 正常显示
- [ ] 所有功能正常工作
- [ ] 在干净的系统上测试（无开发环境）

## 性能优化

### 减小应用体积

1. **排除开发依赖**:
   ```json
   // electron-builder.json
   "files": [
     "dist/**/*",
     "!dist/**/*.map",  // 排除 source maps
     "!dist/**/*.d.ts"  // 排除类型定义
   ]
   ```

2. **使用 asar 压缩**:
   ```json
   "asar": true
   ```

3. **排除不必要的 node_modules**:
   ```json
   "files": [
     "!node_modules/@types/**"
   ]
   ```

### 加快启动速度

1. **延迟加载模块**
2. **优化 Express 中间件**
3. **使用缓存**

## 相关资源

- [Electron 官方文档](https://www.electronjs.org/docs)
- [electron-builder 文档](https://www.electron.build/)
- [Node.js asar 文档](https://github.com/electron/asar)
