/**
 * Electron 主进程
 * 负责创建窗口和启动 Express 服务器
 */

import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initConfig, setupLogging, logger } from '@codebase-mcp/shared';
import { createApp, setupWebSocket } from '../web/app.js';
import { Server } from 'http';
import * as net from 'net';

// 在 Electron 打包后，__dirname 会指向 app.asar 内部
// 这是正确的，因为我们的资源文件也在 asar 内
let __dirname: string;
if (typeof __filename !== 'undefined') {
  __dirname = dirname(__filename);
} else {
  const __filename = fileURLToPath(import.meta.url);
  __dirname = dirname(__filename);
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let server: Server | null = null;
let serverPort: number = 0;

/**
 * 查找可用端口
 */
async function findAvailablePort(startPort: number = 8090): Promise<number> {
  return new Promise((resolve, reject) => {
    const testServer = net.createServer();
    
    testServer.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        // 端口被占用，尝试下一个
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
    
    testServer.once('listening', () => {
      const port = (testServer.address() as net.AddressInfo).port;
      testServer.close(() => {
        resolve(port);
      });
    });
    
    testServer.listen(startPort);
  });
}

/**
 * 启动 Express 服务器
 */
async function startExpressServer(): Promise<number> {
  try {
    // 查找可用端口
    const port = await findAvailablePort(8090);
    
    logger.info(`Starting Express server on port ${port}...`);
    
    // 创建 Express 应用
    const expressApp = createApp();
    
    // 启动服务器
    server = expressApp.listen(port, () => {
      logger.info(`✓ Express server started on port ${port}`);
    });
    
    // 设置 WebSocket
    setupWebSocket(server);
    
    // 错误处理
    server.on('error', (error: any) => {
      logger.error(`Express server error: ${error.message}`);
      throw error;
    });
    
    serverPort = port;
    return port;
    
  } catch (error: any) {
    logger.exception('Failed to start Express server', error);
    throw error;
  }
}

/**
 * 创建主窗口
 */
function createMainWindow(port: number): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Prompt Enhance',
    icon: join(__dirname, '../../assets/icon.png'), // 可选：添加应用图标
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // 安全设置
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    // 窗口样式
    backgroundColor: '#ffffff',
    show: false, // 先不显示，等加载完成后再显示
  });

  // 加载 Express 服务器的 URL
  const url = `http://localhost:${port}`;
  mainWindow.loadURL(url);

  // 窗口加载完成后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    logger.info('Main window shown');
  });

  // 开发模式下打开 DevTools
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // 窗口关闭事件
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 阻止新窗口打开（在默认浏览器中打开外部链接）
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // 如果是外部链接，在默认浏览器中打开
    if (url.startsWith('http://') || url.startsWith('https://')) {
      require('electron').shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  logger.info(`Main window created, loading ${url}`);
}

/**
 * 创建系统托盘（可选）
 */
function createTray(): void {
  // 创建托盘图标（需要准备图标文件）
  // const iconPath = join(__dirname, '../../assets/tray-icon.png');
  // tray = new Tray(nativeImage.createFromPath(iconPath));
  
  // 托盘菜单
  // const contextMenu = Menu.buildFromTemplate([
  //   {
  //     label: 'Show App',
  //     click: () => {
  //       if (mainWindow) {
  //         mainWindow.show();
  //       }
  //     }
  //   },
  //   {
  //     label: 'Quit',
  //     click: () => {
  //       app.quit();
  //     }
  //   }
  // ]);
  
  // tray.setToolTip('Prompt Enhance');
  // tray.setContextMenu(contextMenu);
  
  // 点击托盘图标显示窗口
  // tray.on('click', () => {
  //   if (mainWindow) {
  //     mainWindow.show();
  //   }
  // });
}

/**
 * 应用启动
 */
app.whenReady().then(async () => {
  try {
    // 初始化配置
    const config = initConfig();
    
    // 设置日志系统
    setupLogging({ enableWebSocket: true });
    
    logger.info('='.repeat(60));
    logger.info('Prompt Enhance (Electron) Starting...');
    logger.info('='.repeat(60));
    logger.info(`Electron Version: ${process.versions.electron}`);
    logger.info(`Chrome Version: ${process.versions.chrome}`);
    logger.info(`Node Version: ${process.versions.node}`);
    logger.info('='.repeat(60));
    
    // 启动 Express 服务器
    const port = await startExpressServer();
    
    // 创建主窗口
    createMainWindow(port);
    
    // 创建系统托盘（可选）
    // createTray();
    
    logger.info('Application started successfully');
    
  } catch (error: any) {
    logger.exception('Failed to start application', error);
    app.quit();
  }
});

/**
 * 所有窗口关闭时
 */
app.on('window-all-closed', () => {
  // 在 macOS 上，除非用户明确退出，否则应用和菜单栏会保持活动状态
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * 应用激活时（macOS）
 */
app.on('activate', () => {
  // 在 macOS 上，当点击 dock 图标且没有其他窗口打开时，重新创建窗口
  if (BrowserWindow.getAllWindows().length === 0 && serverPort > 0) {
    createMainWindow(serverPort);
  }
});

/**
 * 应用退出前
 */
app.on('before-quit', () => {
  logger.info('Application quitting...');
  
  // 关闭 Express 服务器
  if (server) {
    server.close(() => {
      logger.info('Express server closed');
    });
  }
});

/**
 * 全局错误处理
 */
process.on('uncaughtException', (error: Error) => {
  logger.exception('Uncaught exception in main process', error);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error(`Unhandled rejection in main process: ${reason}`);
  if (reason instanceof Error) {
    logger.exception('Unhandled rejection', reason);
  }
});
