#!/usr/bin/env node

/**
 * Codebase Retrieval MCP 服务器入口
 * 
 * 提供代码库索引和语义搜索的 MCP 协议服务
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  initConfig,
  setupLogging,
  logger,
  isFirstRun,
  markFirstRunCompleted,
  getLogBroadcaster,
} from '@codebase-mcp/shared';
import { codebaseRetrievalTool } from './tools/codebaseRetrieval.js';
import { createApp, setupWebSocket } from './web/app.js';
import { createServer } from 'http';

/**
 * 解析命令行参数
 * 
 * 支持的参数：
 * - --base-url <url>: API 基础 URL
 * - --token <token>: API 认证令牌
 * - --web-port <port>: Web 管理界面端口（可选）
 */
function parseArgs(): { baseUrl?: string; token?: string; webPort?: number } {
  const args = process.argv.slice(2);
  const result: { baseUrl?: string; token?: string; webPort?: number } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--base-url' && i + 1 < args.length) {
      result.baseUrl = args[i + 1];
      i++;
    } else if (arg === '--token' && i + 1 < args.length) {
      result.token = args[i + 1];
      i++;
    } else if (arg === '--web-port' && i + 1 < args.length) {
      result.webPort = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return result;
}

/**
 * 创建 MCP 服务器实例
 */
function createMCPServer(): Server {
  return new Server(
    {
      name: 'codebase-retrieval',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );
}

/**
 * 启动 Web 服务器
 * 
 * @param port - Web 服务器端口
 * @throws 如果端口被占用或启动失败
 */
async function startWebServer(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // 创建 Express 应用
      const app = createApp();
      
      // 创建 HTTP 服务器
      const httpServer = createServer(app);
      
      // 设置 WebSocket 支持（使用 shared 的 LogBroadcaster）
      setupWebSocket(httpServer);
      
      // 初始化 LogBroadcaster（确保日志广播功能启用）
      const logBroadcaster = getLogBroadcaster();
      logger.info(`日志广播器已初始化，当前连接数: ${logBroadcaster.getClientCount()}`);
      
      // 启动服务器
      httpServer.listen(port, () => {
        logger.info(`Web 管理界面已启动: http://localhost:${port}`);
        logger.info('可通过 Web 界面管理项目、查看日志和调试工具');
        resolve();
      });
      
      // 处理端口冲突和其他错误
      httpServer.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          const errorMsg = `端口 ${port} 已被占用。请尝试以下解决方案：\n` +
            `  1. 使用其他端口: --web-port <其他端口号>\n` +
            `  2. 关闭占用该端口的程序\n` +
            `  3. 不启动 Web 界面（移除 --web-port 参数）`;
          logger.error(errorMsg);
          reject(new Error(`端口 ${port} 已被占用`));
        } else if (error.code === 'EACCES') {
          const errorMsg = `没有权限绑定端口 ${port}。请尝试：\n` +
            `  1. 使用大于 1024 的端口号\n` +
            `  2. 以管理员权限运行`;
          logger.error(errorMsg);
          reject(new Error(`没有权限绑定端口 ${port}`));
        } else {
          logger.error(`Web 服务器启动失败: ${error.message}`);
          reject(error);
        }
      });
      
    } catch (error: any) {
      logger.exception('创建 Web 服务器时发生错误', error);
      reject(error);
    }
  });
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  try {
    // 1. 解析命令行参数
    const { baseUrl, token, webPort } = parseArgs();

    // 2. 初始化配置（使用 @codebase-mcp/shared）
    // 命令行参数优先级最高，会覆盖配置文件中的值
    const config = initConfig({
      baseUrl,
      token,
      webPort,
    });

    // 3. 设置日志系统（使用 @codebase-mcp/shared）
    setupLogging();

    // 4. 验证配置
    config.validate();

    logger.info('正在启动 Codebase Retrieval MCP 服务器...');
    logger.info(`配置: index_storage_path=${config.indexStoragePath}, batch_size=${config.batchSize}`);
    logger.info(`API: base_url=${config.baseUrl}`);

    // 5. 创建 MCP 服务器
    const server = createMCPServer();

    // 6. 注册工具处理器
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'codebase-retrieval',
            description: 'Search for relevant code context based on a query within a specific project. This tool automatically performs incremental indexing before searching, ensuring results are always up-to-date. Returns formatted text snippets from the codebase that are semantically related to your query.',
            inputSchema: {
              type: 'object',
              properties: {
                project_root_path: {
                  type: 'string',
                  description: 'Absolute path to the project root directory. Supports cross-platform paths: Windows (C:/Users/...), WSL UNC (\\\\wsl$\\Ubuntu\\home\\...), Unix (/home/...), WSL-to-Windows (/mnt/c/...). Paths are automatically normalized.',
                },
                query: {
                  type: 'string',
                  description: 'Natural language search query to find relevant code context. This tool performs semantic search and returns code snippets that match your query. Examples: \'logging configuration setup initialization logger\' (finds logging setup code), \'user authentication login\' (finds auth-related code), \'database connection pool\' (finds DB connection code), \'error handling exception\' (finds error handling patterns), \'API endpoint routes\' (finds API route definitions). The tool returns formatted text snippets with file paths and line numbers showing where the relevant code is located.',
                },
              },
              required: ['project_root_path', 'query'],
            },
          },
        ],
      };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === 'codebase-retrieval') {
        const result = await codebaseRetrievalTool(request.params.arguments as any);
        return {
          content: [
            {
              type: 'text',
              text: result.text,
            },
          ],
        };
      }
      
      throw new Error(`Unknown tool: ${request.params.name}`);
    });

    // 7. 连接 MCP 传输层（stdio）
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info('MCP 服务器已通过 stdio 连接');

    // 8. 启动 Web 管理界面（仅在指定 --web-port 时）
    if (webPort) {
      try {
        await startWebServer(webPort);
      } catch (error: any) {
        // 优雅降级：Web 服务器失败不应阻止 MCP 服务器启动
        logger.warning(`Web 服务器启动失败，但 MCP 服务器将继续运行: ${error.message}`);
      }
    }

    // 9. 检查是否为首次运行
    const firstRun = isFirstRun();
    if (firstRun) {
      logger.info('检测到首次运行，配置文件已生成');
      markFirstRunCompleted();
    }

  } catch (error: any) {
    logger.exception('Server error', error);
    process.exit(1);
  }
}

// 运行主函数
main().catch((error) => {
  console.error('致命错误:', error);
  process.exit(1);
});
