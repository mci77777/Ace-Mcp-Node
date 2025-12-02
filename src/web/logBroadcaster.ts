/**
 * WebSocket 客户端的日志广播器
 * 将日志消息广播到所有连接的 WebSocket 客户端
 */

import { WebSocket } from 'ws';
import { logger } from '../logger.js';

/**
 * 日志广播器类
 */
class LogBroadcaster {
  private clients: Set<WebSocket> = new Set();
  private static instance?: LogBroadcaster;
  private static loggerSetup: boolean = false;
  private boundBroadcast: (message: string) => void;

  constructor() {
    // 绑定 broadcast 方法，确保引用稳定
    this.boundBroadcast = this.broadcast.bind(this);
    this.setupLogger();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): LogBroadcaster {
    if (!LogBroadcaster.instance) {
      LogBroadcaster.instance = new LogBroadcaster();
    }
    return LogBroadcaster.instance;
  }

  /**
   * 设置日志器以广播消息
   * 使用静态标志确保只注册一次，防止重复广播
   */
  private setupLogger(): void {
    // 防止重复注册广播处理器
    if (LogBroadcaster.loggerSetup) {
      console.error('[LogBroadcaster] setupLogger called again, but already setup - skipping');
      return;
    }
    LogBroadcaster.loggerSetup = true;
    console.error('[LogBroadcaster] setupLogger: registering broadcast handler');
    
    // 添加广播处理器到日志器
    logger.addBroadcastHandler(this.boundBroadcast);
  }

  /**
   * 添加 WebSocket 客户端
   */
  addClient(ws: WebSocket): void {
    const prevCount = this.clients.size;
    this.clients.add(ws);
    const newCount = this.clients.size;
    
    // 调试：输出客户端数量变化
    console.error(`[LogBroadcaster] addClient: ${prevCount} -> ${newCount} clients`);
    logger.debug('WebSocket 客户端已连接');

    // 设置关闭处理器
    ws.on('close', () => {
      this.removeClient(ws);
      logger.debug('WebSocket 客户端已断开');
    });

    // 设置错误处理器
    ws.on('error', (error) => {
      logger.warning(`WebSocket 错误: ${error.message}`);
      this.removeClient(ws);
    });
  }

  /**
   * 移除 WebSocket 客户端
   */
  removeClient(ws: WebSocket): void {
    this.clients.delete(ws);
  }

  /**
   * 向所有连接的客户端广播消息
   */
  broadcast(message: string): void {
    const deadClients: WebSocket[] = [];
    const clientCount = this.clients.size;
    
    // 调试：如果有多个客户端，输出警告
    if (clientCount > 1) {
      console.error(`[LogBroadcaster] WARNING: Broadcasting to ${clientCount} clients`);
    }

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          logger.debug(`发送到客户端失败: ${error}`);
          deadClients.push(client);
        }
      } else {
        deadClients.push(client);
      }
    }

    // 移除死亡的客户端
    for (const client of deadClients) {
      this.removeClient(client);
    }
  }

  /**
   * 获取连接的客户端数量
   */
  getClientCount(): number {
    return this.clients.size;
  }
}

/**
 * 获取全局日志广播器实例
 */
export function getLogBroadcaster(): LogBroadcaster {
  return LogBroadcaster.getInstance();
}

