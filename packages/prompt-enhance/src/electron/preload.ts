/**
 * Electron 预加载脚本
 * 在渲染进程中运行，但在网页内容加载之前
 * 用于安全地暴露 Node.js API 到渲染进程
 */

import { contextBridge, ipcRenderer } from 'electron';

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 示例：获取应用版本
  getVersion: () => process.versions.electron,
  
  // 示例：发送消息到主进程
  send: (channel: string, data: any) => {
    // 白名单允许的频道
    const validChannels = ['toMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  
  // 示例：接收来自主进程的消息
  receive: (channel: string, func: (...args: any[]) => void) => {
    const validChannels = ['fromMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
});

// 注意：当前应用不需要复杂的 IPC 通信，因为 Web UI 通过 HTTP/WebSocket 与后端通信
// 这个文件主要是为了展示 Electron 的安全最佳实践
