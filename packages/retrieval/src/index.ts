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
} from '@codebase-mcp/shared';
import { codebaseRetrievalTool } from './tools/searchContext.js';

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

    // 8. 检查是否为首次运行
    const firstRun = isFirstRun();
    if (firstRun) {
      logger.info('检测到首次运行，配置文件已生成');
      markFirstRunCompleted();
    }

    // TODO: 启动 Web 管理界面（任务 22.1，仅在指定 --web-port 时）
    if (webPort) {
      logger.info(`Web 管理界面将在端口 ${webPort} 启动（待实现）`);
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
