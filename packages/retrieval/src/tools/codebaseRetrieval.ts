/**
 * MCP 服务器的代码库检索工具
 */

import { getConfig, logger, normalizeProjectPath } from '@codebase-mcp/shared';
import { IndexManager } from '../index/manager.js';

/**
 * 工具参数接口
 */
interface CodebaseRetrievalArgs {
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
 * 代码库检索工具实现
 */
export async function codebaseRetrievalTool(arguments_: CodebaseRetrievalArgs): Promise<ToolResult> {
  try {
    const projectRootPath = arguments_.project_root_path;
    const query = arguments_.query;

    // 参数验证
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

    // 创建 IndexManager 实例（从 settings.toml 读取配置）
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

    // 调用 codebaseRetrieval 方法
    const result = await indexManager.codebaseRetrieval(normalizedPath, query);

    return { type: 'text', text: result };
  } catch (error: any) {
    logger.exception('Error in codebase-retrieval tool', error);
    return { type: 'text', text: `Error: ${error.message}` };
  }
}
