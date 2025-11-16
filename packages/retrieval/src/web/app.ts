/**
 * Retrieval Web 管理界面
 * 提供项目管理、文件列表、配置管理等功能
 */

import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import * as toml from '@iarna/toml';
import ignore from 'ignore';
import { getConfig, USER_CONFIG_FILE } from '@codebase-mcp/shared';
import { logger, getLogBroadcaster } from '@codebase-mcp/shared';
import { normalizeProjectPath, scanDirectory as sharedScanDirectory } from '@codebase-mcp/shared';
import { IndexManager } from '../index/manager.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 配置更新接口
 */
interface ConfigUpdate {
  base_url?: string;
  token?: string;
  batch_size?: number;
  max_lines_per_blob?: number;
  text_extensions?: string[];
  exclude_patterns?: string[];
  api_timeout?: number;
}

/**
 * 文件节点接口
 */
interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

/**
 * 创建 Express 应用
 */
export function createApp(): express.Application {
  const app = express();

  // ============ 中间件配置 ============
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 提供模板目录作为静态文件
  const templatesDir = path.join(__dirname, 'templates');
  if (fs.existsSync(templatesDir)) {
    app.use('/static', express.static(templatesDir));
    logger.info(`Static files served from: ${templatesDir}`);
  } else {
    logger.warning(`Templates directory not found: ${templatesDir}`);
  }

  // ============ 路由注册 ============

  /**
   * GET / - 提供主管理页面
   */
  app.get('/', (req: Request, res: Response) => {
    const htmlFile = path.join(__dirname, 'templates', 'index.html');
    if (fs.existsSync(htmlFile)) {
      res.sendFile(htmlFile);
    } else {
      res.send('<h1>Codebase Retrieval</h1><p>Template not found</p>');
    }
  });

  /**
   * GET /api/status - 获取服务器状态
   */
  app.get('/api/status', (req: Request, res: Response) => {
    try {
      const config = getConfig();
      const projectsFile = path.join(config.indexStoragePath, 'projects.json');
      let projectCount = 0;

      if (fs.existsSync(projectsFile)) {
        try {
          const content = fs.readFileSync(projectsFile, 'utf-8');
          const projects = JSON.parse(content);
          projectCount = Object.keys(projects).length;
        } catch (error) {
          logger.error(`Failed to load projects: ${error}`);
        }
      }

      res.json({
        status: 'running',
        service: 'codebase-retrieval',
        project_count: projectCount,
        storage_path: config.indexStoragePath,
      });
    } catch (error: any) {
      logger.error(`Failed to get status: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/config - 获取当前配置
   */
  app.get('/api/config', (req: Request, res: Response) => {
    try {
      const config = getConfig();
      res.json({
        index_storage_path: config.indexStoragePath,
        batch_size: config.batchSize,
        max_lines_per_blob: config.maxLinesPerBlob,
        base_url: config.baseUrl,
        token: config.token,
        text_extensions: Array.from(config.textExtensions),
        exclude_patterns: config.excludePatterns,
        api_timeout: config.apiTimeout,
      });
    } catch (error: any) {
      logger.error(`Failed to get config: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/config - 更新配置
   */
  app.post('/api/config', async (req: Request, res: Response) => {
    try {
      const configUpdate: ConfigUpdate = req.body;

      if (!fs.existsSync(USER_CONFIG_FILE)) {
        return res.status(404).json({ detail: 'User configuration file not found' });
      }

      // 加载现有设置
      const content = fs.readFileSync(USER_CONFIG_FILE, 'utf-8');
      const settingsData: any = toml.parse(content);

      // 更新设置
      if (configUpdate.base_url !== undefined) {
        settingsData.BASE_URL = configUpdate.base_url;
      }
      if (configUpdate.token !== undefined) {
        settingsData.TOKEN = configUpdate.token;
      }
      if (configUpdate.batch_size !== undefined) {
        settingsData.BATCH_SIZE = configUpdate.batch_size;
      }
      if (configUpdate.max_lines_per_blob !== undefined) {
        settingsData.MAX_LINES_PER_BLOB = configUpdate.max_lines_per_blob;
      }
      if (configUpdate.text_extensions !== undefined) {
        settingsData.TEXT_EXTENSIONS = configUpdate.text_extensions;
      }
      if (configUpdate.exclude_patterns !== undefined) {
        settingsData.EXCLUDE_PATTERNS = configUpdate.exclude_patterns;
      }
      if (configUpdate.api_timeout !== undefined) {
        const timeout = parseInt(configUpdate.api_timeout as any, 10);
        if (!isNaN(timeout) && timeout > 0) {
          settingsData.API_TIMEOUT = timeout;
        } else {
          logger.warning('Invalid api_timeout value, must be a positive integer');
        }
      }

      // 保存设置
      const newContent = toml.stringify(settingsData as any);
      fs.writeFileSync(USER_CONFIG_FILE, newContent, 'utf-8');

      // 重新加载配置
      const config = getConfig();
      config.reload();

      logger.info('Configuration updated and reloaded successfully');
      res.json({ status: 'success', message: 'Configuration updated and applied successfully!' });
    } catch (error: any) {
      logger.exception('Failed to update configuration', error);
      res.status(500).json({ detail: `Failed to update configuration: ${error.message}` });
    }
  });

  /**
   * GET /api/projects - 获取所有已索引项目列表
   */
  app.get('/api/projects', (req: Request, res: Response) => {
    try {
      const config = getConfig();
      const projectsFile = path.join(config.indexStoragePath, 'projects.json');
      
      if (!fs.existsSync(projectsFile)) {
        return res.json({ projects: [] });
      }
      
      const content = fs.readFileSync(projectsFile, 'utf-8');
      const projects = JSON.parse(content);
      
      const projectList = Object.keys(projects).map(projectPath => ({
        path: projectPath,
        blob_count: projects[projectPath].length,
      }));
      
      res.json({ projects: projectList });
    } catch (error: any) {
      logger.error(`Failed to get projects: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/projects/check - 检查项目是否已索引
   */
  app.post('/api/projects/check', (req: Request, res: Response) => {
    try {
      const { project_path } = req.body;
      
      if (!project_path) {
        return res.status(400).json({ error: 'project_path is required' });
      }
      
      const config = getConfig();
      const projectsFile = path.join(config.indexStoragePath, 'projects.json');
      
      // 规范化路径（统一使用正斜杠，支持 WSL）
      let normalizedPath: string;
      try {
        normalizedPath = normalizeProjectPath(project_path);
      } catch (error: any) {
        return res.status(400).json({ error: `Invalid project path: ${error.message}` });
      }
      
      if (!fs.existsSync(projectsFile)) {
        return res.json({
          indexed: false,
          blob_count: 0,
          normalized_path: normalizedPath,
        });
      }
      
      const content = fs.readFileSync(projectsFile, 'utf-8');
      const projects = JSON.parse(content);
      
      const blobNames = projects[normalizedPath] || [];
      
      res.json({
        indexed: blobNames.length > 0,
        blob_count: blobNames.length,
        normalized_path: normalizedPath,
      });
    } catch (error: any) {
      logger.error(`Failed to check project: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/projects/reindex - 重新索引项目
   */
  app.post('/api/projects/reindex', async (req: Request, res: Response) => {
    try {
      const { project_path } = req.body;
      
      if (!project_path) {
        return res.status(400).json({ error: 'project_path is required' });
      }
      
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
      
      logger.info(`Starting reindex for project: ${project_path}`);
      
      const result = await indexManager.indexProject(project_path);
      
      res.json({
        success: true,
        message: 'Project reindexed successfully',
        result,
      });
    } catch (error: any) {
      logger.exception(`Failed to reindex project: ${error.message}`, error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /api/projects/delete - 删除项目索引
   */
  app.delete('/api/projects/delete', (req: Request, res: Response) => {
    try {
      const { project_path } = req.body;
      
      if (!project_path) {
        return res.status(400).json({ error: 'project_path is required' });
      }
      
      const config = getConfig();
      const projectsFile = path.join(config.indexStoragePath, 'projects.json');
      
      // 规范化路径（支持 WSL）
      let normalizedPath: string;
      try {
        normalizedPath = normalizeProjectPath(project_path);
      } catch (error: any) {
        return res.status(400).json({ error: `Invalid project path: ${error.message}` });
      }
      
      if (!fs.existsSync(projectsFile)) {
        return res.status(404).json({ error: 'No indexed projects found' });
      }
      
      const content = fs.readFileSync(projectsFile, 'utf-8');
      const projects = JSON.parse(content);
      
      if (!projects[normalizedPath]) {
        return res.status(404).json({ error: 'Project not found in index' });
      }
      
      // 删除项目
      delete projects[normalizedPath];
      
      // 保存更新后的 projects.json
      fs.writeFileSync(projectsFile, JSON.stringify(projects, null, 2), 'utf-8');
      
      logger.info(`Deleted project index: ${normalizedPath}`);
      
      res.json({
        success: true,
        message: 'Project index deleted successfully',
        deleted_path: normalizedPath,
      });
    } catch (error: any) {
      logger.exception(`Failed to delete project: ${error.message}`, error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/projects/details - 获取项目详细信息
   */
  app.post('/api/projects/details', (req: Request, res: Response) => {
    try {
      const { project_path } = req.body;
      
      if (!project_path) {
        return res.status(400).json({ error: 'project_path is required' });
      }
      
      const config = getConfig();
      const projectsFile = path.join(config.indexStoragePath, 'projects.json');
      
      // 规范化路径（支持 WSL）
      let normalizedPath: string;
      try {
        normalizedPath = normalizeProjectPath(project_path);
      } catch (error: any) {
        return res.status(400).json({ error: `Invalid project path: ${error.message}` });
      }
      
      if (!fs.existsSync(projectsFile)) {
        return res.status(404).json({ error: 'No indexed projects found' });
      }
      
      const content = fs.readFileSync(projectsFile, 'utf-8');
      const projects = JSON.parse(content);
      
      if (!projects[normalizedPath]) {
        return res.status(404).json({ error: 'Project not found in index' });
      }
      
      const blobNames = projects[normalizedPath];
      
      // 统计文件类型分布 - 从实际项目目录扫描
      const fileTypeStats: Record<string, number> = {};
      let totalFiles = 0;
      
      if (fs.existsSync(normalizedPath) && fs.statSync(normalizedPath).isDirectory()) {
        // 递归扫描项目目录
        const scanDir = (dir: string) => {
          try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
              const fullPath = path.join(dir, entry.name);
              
              // 跳过排除的目录
              if (entry.isDirectory()) {
                const shouldExclude = config.excludePatterns.some((pattern: string) => 
                  entry.name === pattern || entry.name.match(new RegExp(pattern))
                );
                
                if (!shouldExclude && !entry.name.startsWith('.')) {
                  scanDir(fullPath);
                }
              } else if (entry.isFile()) {
                // 统计文件类型
                const ext = path.extname(entry.name);
                if (ext && config.textExtensions.has(ext)) {
                  fileTypeStats[ext] = (fileTypeStats[ext] || 0) + 1;
                  totalFiles++;
                }
              }
            }
          } catch (error) {
            // 忽略无权限访问的目录
          }
        };
        
        scanDir(normalizedPath);
      }
      
      res.json({
        path: normalizedPath,
        blob_count: blobNames.length,
        file_count: totalFiles,
        file_type_stats: fileTypeStats,
        indexed: true,
      });
    } catch (error: any) {
      logger.exception(`Failed to get project details: ${error.message}`, error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/files/list - 获取项目文件列表
   */
  app.post('/api/files/list', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { project_path, max_depth = 30 } = req.body;
      
      if (!project_path) {
        logger.warning('Files list request missing project_path');
        return res.status(400).json({ error: 'project_path is required' });
      }
      
      // 验证 max_depth 参数
      if (typeof max_depth !== 'number' || max_depth < 1 || max_depth > 30) {
        logger.warning(`Invalid max_depth: ${max_depth}`);
        return res.status(400).json({ error: 'max_depth must be a number between 1 and 30' });
      }
      
      // 验证并规范化路径
      let normalizedPath: string;
      try {
        normalizedPath = validateAndNormalizeProjectPath(project_path);
      } catch (error: any) {
        logger.warning(`Invalid project path: ${project_path}, error: ${error.message}`);
        if (error.code === 'EACCES') {
          return res.status(403).json({ error: 'Permission denied accessing project path' });
        }
        return res.status(400).json({ error: error.message });
      }
      
      logger.info(`Scanning directory: ${normalizedPath}, max_depth: ${max_depth}`);
      
      // 加载项目路径内的 .gitignore 规则
      const { ig, gitignoreRoot } = loadProjectGitignore(normalizedPath);
      
      // 递归扫描文件
      const config = getConfig();
      const files = scanDirectory(normalizedPath, max_depth, config, normalizedPath, gitignoreRoot, ig);
      
      const fileCount = countFiles(files);
      const duration = Date.now() - startTime;
      
      logger.info(`Scanned ${fileCount} files from ${normalizedPath} in ${duration}ms`);
      
      res.json({ files });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.exception(`Failed to list files after ${duration}ms`, error);
      
      // 提供用户友好的错误消息
      let errorMessage = 'Failed to list files';
      
      if (error.code === 'EACCES') {
        errorMessage = 'Permission denied accessing directory';
      } else if (error.code === 'ENOENT') {
        errorMessage = 'Directory not found';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      res.status(500).json({ error: errorMessage });
    }
  });

  return app;
}

/**
 * 为日志设置 WebSocket 服务器
 */
export function setupWebSocket(server: any): void {
  const wss = new WebSocketServer({ server, path: '/ws/logs' });
  const logBroadcaster = getLogBroadcaster();

  wss.on('error', (error: any) => {
    logger.error(`WebSocket server error: ${error.message}`);
  });

  wss.on('connection', (ws: WebSocket) => {
    logBroadcaster.addClient(ws);
  });

  logger.info('WebSocket server setup completed');
}

// ============ 辅助函数 ============

/**
 * 验证并规范化项目路径（SSOT - 单一真值来源）
 */
function validateAndNormalizeProjectPath(projectPath: string): string {
  const normalizedPath = normalizeProjectPath(projectPath);
  logger.info(`Project path normalized: ${projectPath} -> ${normalizedPath}`);
  
  if (!fs.existsSync(normalizedPath)) {
    throw new Error(`Project path does not exist: ${normalizedPath}`);
  }
  
  const stats = fs.statSync(normalizedPath);
  if (!stats.isDirectory()) {
    throw new Error(`Project path is not a directory: ${normalizedPath}`);
  }
  
  return normalizedPath;
}

/**
 * 加载项目路径内的 .gitignore 规则
 */
function loadProjectGitignore(scanPath: string): { ig: ReturnType<typeof ignore>, gitignoreRoot: string } {
  const ig = ignore();
  ig.add('.git');
  
  let currentDir = path.resolve(scanPath);
  let gitignorePath: string | null = null;
  let gitignoreRoot: string = currentDir;
  
  while (true) {
    const candidatePath = path.join(currentDir, '.gitignore');
    if (fs.existsSync(candidatePath)) {
      gitignorePath = candidatePath;
      gitignoreRoot = currentDir;
      break;
    }
    
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }
  
  if (gitignorePath) {
    try {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
      ig.add(gitignoreContent);
      logger.info(`Loaded .gitignore from: ${gitignorePath} (root: ${gitignoreRoot})`);
    } catch (error: any) {
      logger.warning(`Failed to read .gitignore: ${gitignorePath}, error: ${error.message}`);
    }
  } else {
    logger.info(`No .gitignore found in directory tree starting from: ${scanPath}`);
  }
  
  return { ig, gitignoreRoot };
}

/**
 * 递归扫描目录（应用 .gitignore 规则）
 */
function scanDirectory(
  dir: string,
  maxDepth: number,
  config: any,
  scanRoot: string,
  gitignoreRoot: string,
  ig: ReturnType<typeof ignore>,
  currentDepth: number = 0
): FileNode[] {
  if (currentDepth >= maxDepth) {
    return [];
  }
  
  const files: FileNode[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      try {
        const fullPath = path.join(dir, entry.name);
        const relativeToGitignore = path.relative(gitignoreRoot, fullPath).replace(/\\/g, '/');
        const checkPath = entry.isDirectory() ? relativeToGitignore + '/' : relativeToGitignore;
        
        if (ig.ignores(checkPath)) {
          logger.debug(`Ignored by .gitignore: ${checkPath}`);
          continue;
        }
        
        if (entry.isDirectory()) {
          try {
            const children = scanDirectory(fullPath, maxDepth, config, scanRoot, gitignoreRoot, ig, currentDepth + 1);
            files.push({
              name: entry.name,
              path: fullPath,
              type: 'directory',
              children,
            });
          } catch (subdirError: any) {
            logger.warning(`Failed to scan subdirectory: ${fullPath}, error: ${subdirError.message}`);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (ext && config.textExtensions.has(ext)) {
            files.push({
              name: entry.name,
              path: fullPath,
              type: 'file',
            });
          }
        }
      } catch (entryError: any) {
        logger.warning(`Failed to process entry: ${entry.name} in ${dir}, error: ${entryError.message}`);
      }
    }
  } catch (error: any) {
    if (error.code === 'EACCES') {
      logger.warning(`Permission denied reading directory: ${dir}`);
    } else if (error.code === 'ENOENT') {
      logger.warning(`Directory not found: ${dir}`);
    } else {
      logger.warning(`Failed to read directory: ${dir}, error: ${error.message}`);
    }
  }
  
  return files;
}

/**
 * 统计文件树中的文件数量
 */
function countFiles(files: FileNode[]): number {
  let count = 0;
  
  for (const file of files) {
    if (file.type === 'file') {
      count++;
    } else if (file.type === 'directory' && file.children) {
      count += countFiles(file.children);
    }
  }
  
  return count;
}
