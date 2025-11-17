#!/usr/bin/env node
/**
 * Prompt Enhance 主入口文件
 * 支持两种模式：
 * 1. CLI 模式：启动 Express 服务器 + 打开浏览器
 * 2. Electron 模式：由 Electron 主进程调用
 */

import { initConfig, setupLogging, logger, isFirstRun, markFirstRunCompleted } from '@codebase-mcp/shared';
import { createApp, setupWebSocket } from './web/app.js';
import { Server } from 'http';
import { exec } from 'child_process';
import { platform } from 'os';

/**
 * 检测是否在 Electron 环境中运行
 */
function isElectron(): boolean {
  return process.versions.hasOwnProperty('electron');
}

/**
 * 解析命令行参数
 */
function parseArgs(): {
  baseUrl?: string;
  token?: string;
  port?: number;
  help?: boolean;
  electron?: boolean;
} {
  const args = process.argv.slice(2);
  const result: any = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--electron') {
      result.electron = true;
    } else if (arg === '--base-url' && i + 1 < args.length) {
      result.baseUrl = args[++i];
    } else if (arg === '--token' && i + 1 < args.length) {
      result.token = args[++i];
    } else if ((arg === '--port' || arg === '--web-port') && i + 1 < args.length) {
      result.port = parseInt(args[++i], 10);
    }
  }

  return result;
}

/**
 * 显示帮助信息
 */
function showHelp(): void {
  console.log(`
Prompt Enhance - 提示词增强桌面应用

用法:
  prompt-enhance [选项]

选项:
  --base-url <url>    设置 API 基础 URL (覆盖配置文件)
  --token <token>     设置 API Token (覆盖配置文件)
  --port <port>       设置 Web 服务器端口 (默认: 8090)
  --electron          使用 Electron 桌面模式（自动检测）
  --help, -h          显示此帮助信息

模式:
  1. 桌面应用模式（双击 exe）：自动启动 Electron 窗口
  2. CLI 模式（命令行）：启动服务器并打开浏览器

示例:
  prompt-enhance                    # 启动服务器 + 打开浏览器
  prompt-enhance --port 8091        # 使用自定义端口
  prompt-enhance --electron         # 强制使用 Electron 模式

配置文件位置: ~/.codebase-mcp/settings.toml
  `);
}

/**
 * 打开浏览器
 */
function openBrowser(url: string): void {
  const os = platform();
  let command: string;

  if (os === 'win32') {
    command = `start ${url}`;
  } else if (os === 'darwin') {
    command = `open ${url}`;
  } else {
    command = `xdg-open ${url}`;
  }

  exec(command, (error) => {
    if (error) {
      logger.warning(`Failed to open browser automatically: ${error.message}`);
      logger.info(`Please manually open: ${url}`);
    } else {
      logger.info('Browser opened successfully');
    }
  });
}

/**
 * CLI 模式主函数
 */
async function runCLIMode(): Promise<void> {
  const args = parseArgs();

  // 显示帮助信息
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  try {
    // 初始化配置
    const config = initConfig({
      enhanceBaseUrl: args.baseUrl,
      enhanceToken: args.token,
      webPort: args.port || 8090,
    });

    // 设置日志系统
    setupLogging({ enableWebSocket: true });

    logger.info('='.repeat(60));
    logger.info('Prompt Enhance Starting (CLI Mode)...');
    logger.info('='.repeat(60));
    logger.info(`Web Port: ${config.webPort}`);
    logger.info(`API Base URL: ${config.enhanceBaseUrl || 'Not configured'}`);
    logger.info(`Config File: ~/.codebase-mcp/settings.toml`);
    logger.info('='.repeat(60));

    // 创建 Express 应用
    const app = createApp();

    // 启动 HTTP 服务器
    const server: Server = app.listen(config.webPort, () => {
      logger.info(`✓ Prompt Enhance server started successfully`);
      logger.info(`✓ Web UI available at: http://localhost:${config.webPort}`);
      logger.info(`✓ Press Ctrl+C to stop the server`);
      
      // 在控制台也输出（方便用户看到）
      console.log(`\n✓ Prompt Enhance started successfully!`);
      console.log(`✓ Web UI: http://localhost:${config.webPort}`);
      console.log(`✓ Press Ctrl+C to stop\n`);

      // 首次运行检测
      if (isFirstRun()) {
        logger.info('First run detected - opening browser...');
        
        // 延迟打开浏览器，确保服务器完全启动
        setTimeout(() => {
          openBrowser(`http://localhost:${config.webPort}`);
          markFirstRunCompleted();
        }, 1000);
      }
    });

    // 设置 WebSocket 服务器
    setupWebSocket(server);

    // 保持进程运行
    const keepAliveTimer = setInterval(() => {
      // 空操作，保持事件循环活跃
    }, 60000);

    // 错误处理
    server.on('error', (error: any) => {
      console.error(`[ERROR] Server error: ${error.message}`);
      if (error.code === 'EADDRINUSE') {
        const msg = `Port ${config.webPort} is already in use. Please try a different port with --port option`;
        console.error(`[ERROR] ${msg}`);
        logger.error(msg);
        
        // 在 Windows 上显示消息框（如果是双击运行）
        if (process.platform === 'win32' && !process.stdin.isTTY) {
          const { exec } = require('child_process');
          exec(`powershell -Command "Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('Port ${config.webPort} is already in use.\\n\\nPlease close other applications using this port or run with --port option to use a different port.', 'Prompt Enhance - Port Error', 'OK', 'Error')"`);
          setTimeout(() => process.exit(1), 2000);
        } else {
          process.exit(1);
        }
      } else {
        logger.exception('Server error', error);
        console.error(`[ERROR] Unexpected server error, exiting...`);
        process.exit(1);
      }
    });

    // 优雅退出处理
    let isShuttingDown = false;

    const gracefulShutdown = (signal: string) => {
      if (isShuttingDown) {
        return;
      }
      isShuttingDown = true;

      logger.info(`\nReceived ${signal} signal - shutting down gracefully...`);

      clearInterval(keepAliveTimer);
      
      server.close(() => {
        logger.info('HTTP server closed');
        logger.info('Prompt Enhance stopped');
        process.exit(0);
      });

      // 强制退出超时
      setTimeout(() => {
        logger.warning('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // 注册信号处理器
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // 全局错误捕获
    process.on('uncaughtException', (error: Error) => {
      logger.exception('Uncaught exception', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason: any) => {
      logger.error(`Unhandled rejection: ${reason}`);
      if (reason instanceof Error) {
        logger.exception('Unhandled rejection', reason);
      }
      gracefulShutdown('unhandledRejection');
    });

  } catch (error: any) {
    console.error('Fatal error during startup:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Electron 模式主函数
 */
async function runElectronMode(): Promise<void> {
  // 在 Electron 模式下，主进程逻辑在 electron/main.ts 中
  // 这里只是一个占位符，实际不会被调用
  console.log('Running in Electron mode...');
  console.log('Please use: npm run electron');
}

/**
 * 主函数 - 根据环境选择模式
 */
async function main(): Promise<void> {
  const args = parseArgs();
  
  // 检测运行模式
  if (args.electron || isElectron()) {
    // Electron 模式
    await runElectronMode();
  } else {
    // CLI 模式
    await runCLIMode();
  }
}

// 启动应用
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
