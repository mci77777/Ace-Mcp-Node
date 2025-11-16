/**
 * MCP 服务器的搜索上下文工具
 */

import { getConfig } from '../config.js';
import { IndexManager } from '../index/manager.js';
import { logger } from '../logger.js';
import { normalizeProjectPath } from '../utils/pathUtils.js';

/**
 * 工具参数接口
 */
interface codebaseRetrievalArgs {
  project_root_path?: string;
  query?: string;
}

/**
 * 工具结果接口
 */
interface ToolResult {
  type: string;
  text: string;
}

/**
 * 搜索上下文工具实现
 */
export async function codebaseRetrievalTool(arguments_: codebaseRetrievalArgs): Promise<ToolResult> {
  try {
    const projectRootPath = arguments_.project_root_path;
    const query = arguments_.query;

    if (!projectRootPath) {
      return { type: 'text', text: 'Error: project_root_path is required' };
    }

    if (!query) {
      return { type: 'text', text: 'Error: query is required' };
    }

    // 规范化路径，支持 WSL 和跨平台兼容性
    let normalizedPath: string;
    try {
      normalizedPath = normalizeProjectPath(projectRootPath);
    } catch (error: any) {
      return { type: 'text', text: `Error: Invalid project path - ${error.message}` };
    }

    logger.info(`Tool invoked: codebase-retrieval for project ${normalizedPath} with query: ${query}`);

    const config = getConfig();
    const indexManager = new IndexManager(
      config.indexStoragePath,
      config.baseUrl,
      config.token,
      config.textExtensions,
      config.batchSize,
      config.maxLinesPerBlob,
      config.excludePatterns
    );

    const result = await indexManager.codebaseRetrieval(normalizedPath, query);

    return { type: 'text', text: result };
  } catch (error: any) {
    logger.exception('Error in codebase-retrieval_tool', error);
    return { type: 'text', text: `Error: ${error.message}` };
  }
}

