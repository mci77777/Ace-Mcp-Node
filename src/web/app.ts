/**
 * MCP 服务器管理的 Express Web 应用
 */

import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import * as toml from '@iarna/toml';
import ignore from 'ignore';
import { getConfig } from '../config.js';
import { logger } from '../logger.js';
import { getLogBroadcaster } from './logBroadcaster.js';
import { codebaseRetrievalTool } from '../tools/searchContext.js';
import { USER_CONFIG_FILE } from '../config.js';
import { IndexManager } from '../index/manager.js';
import { fileURLToPath } from 'url';
import { normalizeProjectPath } from '../utils/pathUtils.js';
import { EnhancePromptService } from '../tools/enhancePrompt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 配置更新接口
 */
interface ConfigUpdate {
  base_url?: string;
  token?: string;
  enhance_base_url?: string;
  enhance_token?: string;
  batch_size?: number;
  max_lines_per_blob?: number;
  text_extensions?: string[];
  exclude_patterns?: string[];
  model?: string;
  custom_model?: string;
  custom_headers?: string | Record<string, string>;
  api_timeout?: number;
}

/**
 * 工具请求接口
 */
interface ToolRequest {
  tool_name: string;
  arguments: Record<string, any>;
}

/**
 * 全局 EnhancePromptService 实例（用于重新加载提示词文件）
 */
let globalEnhancePromptService: EnhancePromptService | null = null;

/**
 * 创建 Express 应用
 */
export function createApp(): express.Application {
  const app = express();
  const logBroadcaster = getLogBroadcaster();

  // 中间件
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 提供模板目录作为静态文件（用于组件加载和资源）
  const templatesDir = path.join(__dirname, 'templates');
  if (fs.existsSync(templatesDir)) {
    // 将整个 templates 目录映射到 /static
    app.use('/static', express.static(templatesDir));
    logger.info(`Static files served from: ${templatesDir}`);
  } else {
    logger.warning(`Templates directory not found: ${templatesDir}`);
  }

  /**
   * GET / - 提供主管理页面
   */
  app.get('/', (req: Request, res: Response) => {
    const htmlFile = path.join(__dirname, 'templates', 'index.html');
    if (fs.existsSync(htmlFile)) {
      res.sendFile(htmlFile);
    } else {
      res.send('<h1>Codebase & Prompt Enhance</h1><p>Template not found</p>');
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
        enhance_base_url: config.enhanceBaseUrl,
        enhance_token: config.enhanceToken,
        text_extensions: Array.from(config.textExtensions),
        exclude_patterns: config.excludePatterns,
        model: (config as any).model || '',
        custom_model: (config as any).customModel || '',
        custom_headers: JSON.stringify(config.customHeaders || {}),
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
      if (configUpdate.enhance_base_url !== undefined) {
        settingsData.ENHANCE_BASE_URL = configUpdate.enhance_base_url;
      }
      if (configUpdate.enhance_token !== undefined) {
        settingsData.ENHANCE_TOKEN = configUpdate.enhance_token;
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
      if (configUpdate.model !== undefined) {
        settingsData.MODEL = configUpdate.model;
      }
      if (configUpdate.custom_model !== undefined) {
        settingsData.CUSTOM_MODEL = configUpdate.custom_model;
      }
      if (configUpdate.custom_headers !== undefined) {
        try {
          // Parse JSON string to object
          const headers = typeof configUpdate.custom_headers === 'string' 
            ? JSON.parse(configUpdate.custom_headers) 
            : configUpdate.custom_headers;
          
          if (typeof headers === 'object' && !Array.isArray(headers)) {
            settingsData.CUSTOM_HEADERS = headers;
          } else {
            logger.warning('Invalid custom_headers format, must be an object');
          }
        } catch (error) {
          logger.warning(`Failed to parse custom_headers: ${error}`);
        }
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
        project_count: projectCount,
        storage_path: config.indexStoragePath,
      });
    } catch (error: any) {
      logger.error(`Failed to get status: ${error.message}`);
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
        const scanDirectory = (dir: string) => {
          try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
              const fullPath = path.join(dir, entry.name);
              
              // 跳过排除的目录
              if (entry.isDirectory()) {
                const shouldExclude = config.excludePatterns.some(pattern => 
                  entry.name === pattern || entry.name.match(new RegExp(pattern))
                );
                
                if (!shouldExclude && !entry.name.startsWith('.')) {
                  scanDirectory(fullPath);
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
        
        scanDirectory(normalizedPath);
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
      
      // 验证并规范化路径（SSOT）
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

  /**
   * POST /api/tools/execute - 执行工具进行调试
   */
  app.post('/api/tools/execute', async (req: Request, res: Response) => {
    try {
      const toolRequest: ToolRequest = req.body;
      const { tool_name, arguments: args } = toolRequest;

      logger.info(`Executing tool: ${tool_name} with arguments: ${JSON.stringify(args)}`);

      let result: any;

      if (tool_name === 'codebase-retrieval') {
        result = await codebaseRetrievalTool(args);
      } else {
        return res.json({ status: 'error', message: `Unknown tool: ${tool_name}` });
      }

      logger.info(`Tool ${tool_name} executed successfully`);
      res.json({ status: 'success', result });
    } catch (error: any) {
      logger.exception(`Failed to execute tool ${req.body.tool_name}`, error);
      res.json({ status: 'error', message: error.message });
    }
  });

  /**
   * GET /api/models - 获取可用的模型列表
   */
  app.get('/api/models', async (req: Request, res: Response) => {
    try {
      logger.info('Fetching available models');

      const config = getConfig();

      // 验证配置 - 使用 enhance 专用配置
      if (!config.enhanceBaseUrl || !config.enhanceToken) {
        logger.error('Missing ENHANCE_BASE_URL or ENHANCE_TOKEN configuration');
        return res.status(500).json({ error: 'Server configuration error: missing ENHANCE_BASE_URL or ENHANCE_TOKEN' });
      }

      // 从配置中读取 customHeaders 和 apiTimeout 并传递给 EnhancePromptService
      // 如果全局实例不存在，创建新实例
      if (!globalEnhancePromptService) {
        globalEnhancePromptService = new EnhancePromptService(config.enhanceBaseUrl, config.enhanceToken, config.customHeaders, config.apiTimeout);
        logger.info('Created global EnhancePromptService instance for models endpoint');
      }
      
      const enhanceService = globalEnhancePromptService;

      // 获取模型列表
      const models = await enhanceService.getAvailableModels();

      logger.info(`Returning ${models.length} available models`);

      res.status(200).json({
        models,
        count: models.length,
      });
    } catch (error: any) {
      logger.exception('Failed to fetch models', error);

      res.status(500).json({
        error: 'Failed to fetch available models',
        models: [],
        count: 0,
      });
    }
  });

  /**
   * GET /api/prompt-files - 获取可编辑的提示词文件列表
   */
  app.get('/api/prompt-files', (req: Request, res: Response) => {
    try {
      res.json({
        files: [
          { 
            name: 'prompt.txt', 
            path: 'prompt/prompt.txt', 
            description: '系统提示词' 
          },
          { 
            name: 'inject-code.txt', 
            path: 'prompt/inject-code.txt', 
            description: '附加辅助信息' 
          }
        ]
      });
    } catch (error: any) {
      logger.error(`Failed to list prompt files: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/prompt-files/:filename - 读取指定提示词文件内容
   */
  app.get('/api/prompt-files/:filename', async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      
      // 验证文件名只能是 prompt.txt 或 inject-code.txt
      if (!['prompt.txt', 'inject-code.txt'].includes(filename)) {
        logger.warning(`Invalid prompt filename requested: ${filename}`);
        return res.status(400).json({ error: 'Invalid filename. Only prompt.txt and inject-code.txt are allowed.' });
      }
      
      // 定位项目根目录
      const projectRoot = path.join(__dirname, '../..');
      const filePath = path.join(projectRoot, 'prompt', filename);
      
      logger.info(`Reading prompt file: ${filePath}`);
      
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        logger.warning(`Prompt file not found: ${filePath}`);
        return res.status(404).json({ error: `File not found: ${filename}` });
      }
      
      // 读取文件内容
      const content = fs.readFileSync(filePath, 'utf-8');
      
      logger.info(`Successfully read prompt file: ${filename} (${content.length} chars)`);
      
      res.json({ 
        filename, 
        content,
        path: `prompt/${filename}`,
        size: content.length
      });
    } catch (error: any) {
      logger.exception(`Failed to read prompt file ${req.params.filename}`, error);
      res.status(500).json({ error: `Failed to read file: ${error.message}` });
    }
  });

  /**
   * PUT /api/prompt-files/:filename - 更新指定提示词文件内容
   */
  app.put('/api/prompt-files/:filename', async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      const { content } = req.body;
      
      // 验证文件名只能是 prompt.txt 或 inject-code.txt
      if (!['prompt.txt', 'inject-code.txt'].includes(filename)) {
        logger.warning(`Invalid prompt filename for update: ${filename}`);
        return res.status(400).json({ error: 'Invalid filename. Only prompt.txt and inject-code.txt are allowed.' });
      }
      
      // 验证内容格式
      if (typeof content !== 'string') {
        logger.warning(`Invalid content type for prompt file update: ${typeof content}`);
        return res.status(400).json({ error: 'Content must be a string' });
      }
      
      // 定位项目根目录
      const projectRoot = path.join(__dirname, '../..');
      const filePath = path.join(projectRoot, 'prompt', filename);
      
      logger.info(`Updating prompt file: ${filePath} (${content.length} chars)`);
      
      // 确保 prompt 目录存在
      const promptDir = path.join(projectRoot, 'prompt');
      if (!fs.existsSync(promptDir)) {
        logger.info(`Creating prompt directory: ${promptDir}`);
        fs.mkdirSync(promptDir, { recursive: true });
      }
      
      // 写入文件内容
      fs.writeFileSync(filePath, content, 'utf-8');
      
      logger.info(`Successfully updated prompt file: ${filename}`);
      
      // 通知 EnhancePromptService 重新加载提示词文件
      // 如果存在全局实例，调用 reloadPromptFiles 方法
      if (globalEnhancePromptService) {
        try {
          await globalEnhancePromptService.reloadPromptFiles();
          logger.info('Global EnhancePromptService reloaded prompt files');
        } catch (reloadError: any) {
          logger.warning(`Failed to reload prompt files in global service: ${reloadError.message}`);
        }
      } else {
        logger.info('No global EnhancePromptService instance. Changes will take effect on next API call.');
      }
      
      res.json({ 
        success: true, 
        filename,
        message: 'Prompt file updated successfully',
        size: content.length
      });
    } catch (error: any) {
      logger.exception(`Failed to update prompt file ${req.params.filename}`, error);
      res.status(500).json({ error: `Failed to write file: ${error.message}` });
    }
  });

  /**
   * POST /api/enhance-prompt - 增强用户消息（使用防封逻辑）
   */
  app.post('/api/enhance-prompt', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      // 提取请求参数
      const { 
        projectPath, 
        originalMessage, 
        model,
        language = 'zh',         // 语言选择: 'zh' | 'en'
        selectedFiles = [],      // 用户选择的文件路径列表
        userGuidelines = 'none', // 'claude-agents' | 'custom' | 'none'
        customGuidelinePath = '',
        includeReadme = false,
      } = req.body;

      // 验证必填字段
      if (!originalMessage) {
        logger.warning('Enhance prompt request missing originalMessage');
        return res.status(400).json({ error: 'originalMessage is required' });
      }

      if (!projectPath) {
        logger.warning('Enhance prompt request missing projectPath');
        return res.status(400).json({ error: 'projectPath is required for anti-block protection' });
      }
      
      // 根据语言选择追加语言提示
      let finalMessage = originalMessage;
      if (language === 'zh') {
        finalMessage = `${originalMessage}\n\n请用简体中文回应`;
        logger.info('Appended Chinese language prompt');
      } else if (language === 'en') {
        finalMessage = `${originalMessage}\n\nPlease respond in English`;
        logger.info('Appended English language prompt');
      }

      // 验证并规范化项目路径（SSOT）
      let normalizedPath: string;
      try {
        normalizedPath = validateAndNormalizeProjectPath(projectPath);
      } catch (error: any) {
        logger.warning(`Invalid project path: ${projectPath}, error: ${error.message}`);
        return res.status(400).json({ error: error.message });
      }

      logger.info(`Enhance prompt request: projectPath=${normalizedPath}, model=${model || 'default'}, selectedFiles=${selectedFiles.length}, userGuidelines=${userGuidelines}, includeReadme=${includeReadme}, messageLength=${originalMessage.length}`);

      // 集成 EnhancePromptService
      const config = getConfig();
      
      // 验证配置 - 使用 enhance 专用配置
      if (!config.enhanceBaseUrl || !config.enhanceToken) {
        logger.error('Missing ENHANCE_BASE_URL or ENHANCE_TOKEN configuration');
        return res.status(500).json({ error: 'Server configuration error: missing ENHANCE_BASE_URL or ENHANCE_TOKEN' });
      }

      // 从配置中读取 customHeaders 和 apiTimeout 并传递给 EnhancePromptService
      // 如果全局实例不存在或配置已更改，创建新实例
      if (!globalEnhancePromptService) {
        globalEnhancePromptService = new EnhancePromptService(config.enhanceBaseUrl, config.enhanceToken, config.customHeaders, config.apiTimeout);
        logger.info('Created global EnhancePromptService instance');
      }
      
      const enhanceService = globalEnhancePromptService;

      // 确定最终使用的模型
      let finalModel: string;
      
      // 如果没有指定模型或指定为 "default"，使用配置中的模型
      if (!model || model === 'default' || model === '') {
        // 优先使用 custom_model，其次使用 model，最后使用第一个可用模型
        if (config.customModel && config.customModel.trim()) {
          finalModel = config.customModel;
          logger.info(`Using custom_model from config: ${finalModel}`);
        } else if (config.model && config.model.trim()) {
          finalModel = config.model;
          logger.info(`Using model from config: ${finalModel}`);
        } else {
          // 尝试获取第一个可用模型
          try {
            const availableModels = await enhanceService.getAvailableModels();
            if (availableModels.length > 0) {
              finalModel = availableModels[0].id;
              logger.info(`Using first available model: ${finalModel}`);
            } else {
              // 如果没有可用模型，使用 gpt-4 作为默认值
              finalModel = 'gpt-4';
              logger.info('No models available, using default: gpt-4');
            }
          } catch (modelError: any) {
            finalModel = 'gpt-4';
            logger.warning(`Failed to fetch models: ${modelError.message}, using default: gpt-4`);
          }
        }
      } else {
        // 用户指定了具体模型，验证其有效性
        try {
          const availableModels = await enhanceService.getAvailableModels();
          
          if (availableModels.length > 0) {
            const modelExists = availableModels.some(m => m.id === model || m.name === model);
            
            if (!modelExists) {
              logger.warning(`Invalid model: ${model}, available models: ${availableModels.map(m => m.id).join(', ')}`);
              return res.status(400).json({
                error: `Invalid model: ${model}`,
                availableModels: availableModels.map(m => ({ id: m.id, name: m.name })),
              });
            }
          }
          
          finalModel = model;
          logger.info(`Using user-specified model: ${finalModel}`);
        } catch (modelError: any) {
          // 如果验证失败，仍然使用用户指定的模型
          finalModel = model;
          logger.warning(`Failed to validate model: ${modelError.message}, using anyway: ${finalModel}`);
        }
      }

      // 调用服务（使用新的接口，传递所有高级选项）
      // EnhancePromptService 会自动应用防封逻辑：
      // 1. 清空 blobs.added_blobs 和 deleted_blobs
      // 2. 填充 user_guided_blobs
      // 3. 填充 selected_code
      // 4. 填充 user_guidelines 和 workspace_guidelines
      const result = await enhanceService.enhancePrompt({
        projectPath: normalizedPath,
        originalMessage: finalMessage,  // 使用追加了语言提示的消息
        model: finalModel,
        selectedFiles: selectedFiles,
        userGuidelines: userGuidelines,
        customGuidelinePath: customGuidelinePath,
        includeReadme: includeReadme,
      });

      const duration = Date.now() - startTime;
      logger.info(`Enhance prompt completed successfully in ${duration}ms, result length: ${result.enhancedPrompt.length} chars`);
      
      // 构建RAW请求体预览（用于前端显示）
      const rawRequest = {
        projectPath: normalizedPath,
        originalMessage: finalMessage,
        model: finalModel,
        language: language,
        selectedFiles: selectedFiles,
        userGuidelines: userGuidelines,
        customGuidelinePath: customGuidelinePath,
        includeReadme: includeReadme,
      };
      
      // 获取项目树（用于前端预览）
      let projectTree = '';
      try {
        projectTree = result.projectTree || '';
      } catch (error: any) {
        logger.warning(`Failed to get project tree: ${error.message}`);
      }
      
      // 实现响应格式化
      res.status(200).json({
        enhancedPrompt: result.enhancedPrompt,
        originalMessage: originalMessage,  // 返回原始消息（不含语言提示）
        finalMessage: finalMessage,        // 返回最终消息（含语言提示）
        projectPath: result.projectPath,
        model: result.model,
        language: language,
        rawRequest: rawRequest,            // 返回完整请求体供前端预览
        projectTree: projectTree,          // 返回项目树供前端预览
        systemPrompt: result.systemPrompt || '',  // 返回完整的系统提示词
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // 记录详细错误信息用于调试
      logger.exception(`Failed to enhance prompt after ${duration}ms`, error);
      
      // 确保不泄露敏感信息（如 token、完整的 URL）
      let sanitizedMessage = 'Internal server error while enhancing prompt';
      
      if (error.message) {
        // 移除 Bearer token
        sanitizedMessage = error.message.replace(/Bearer\s+[^\s]+/gi, 'Bearer ***');
        // 移除可能包含 token 的完整 URL
        sanitizedMessage = sanitizedMessage.replace(/https?:\/\/[^\s]+/gi, (url) => {
          try {
            const urlObj = new URL(url);
            return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
          } catch {
            return '[URL]';
          }
        });
        // 移除可能的 token 参数
        sanitizedMessage = sanitizedMessage.replace(/token[=:]\s*[^\s&]+/gi, 'token=***');
      }
      
      // 根据错误类型返回适当的状态码
      let statusCode = 500;
      
      // 网络相关错误
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
        logger.error(`Network error connecting to backend: ${error.code}`);
        sanitizedMessage = 'Failed to connect to backend service';
        statusCode = 503; // Service Unavailable
      }
      // 文件系统错误
      else if (error.code === 'ENOENT') {
        logger.error(`File not found: ${error.path || 'unknown'}`);
        sanitizedMessage = 'Required file not found';
        statusCode = 400;
      }
      else if (error.code === 'EACCES') {
        logger.error(`Permission denied: ${error.path || 'unknown'}`);
        sanitizedMessage = 'Permission denied accessing file';
        statusCode = 403;
      }
      // API 响应错误
      else if (error.response) {
        statusCode = error.response.status || 500;
        logger.error(`Backend API error: status=${statusCode}, message=${error.response.statusText || 'unknown'}`);
        
        if (error.response.status >= 400 && error.response.status < 500) {
          sanitizedMessage = 'Invalid request to backend service';
        } else if (error.response.status >= 500) {
          sanitizedMessage = 'Backend service error';
        }
      }
      
      res.status(statusCode).json({ 
        error: sanitizedMessage
      });
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

  // 添加 WebSocket 服务器错误处理
  wss.on('error', (error: any) => {
    logger.error(`WebSocket server error: ${error.message}`);
  });

  wss.on('connection', (ws: WebSocket) => {
    logBroadcaster.addClient(ws);
  });

  logger.info('WebSocket server setup completed');
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
 * 验证并规范化项目路径（SSOT - 单一真值来源）
 * @param projectPath 原始项目路径
 * @returns 规范化后的路径
 * @throws 如果路径无效或不存在
 */
function validateAndNormalizeProjectPath(projectPath: string): string {
  // 规范化路径
  const normalizedPath = normalizeProjectPath(projectPath);
  logger.info(`Project path normalized: ${projectPath} -> ${normalizedPath}`);
  
  // 验证路径存在
  if (!fs.existsSync(normalizedPath)) {
    throw new Error(`Project path does not exist: ${normalizedPath}`);
  }
  
  // 验证是目录
  const stats = fs.statSync(normalizedPath);
  if (!stats.isDirectory()) {
    throw new Error(`Project path is not a directory: ${normalizedPath}`);
  }
  
  return normalizedPath;
}

/**
 * 加载项目路径内的 .gitignore 规则（向上查找第一个 .gitignore）
 * @param scanPath 要扫描的目录路径
 * @returns { ig: ignore 实例, gitignoreRoot: .gitignore 所在目录 }
 */
function loadProjectGitignore(scanPath: string): { ig: ReturnType<typeof ignore>, gitignoreRoot: string } {
  const ig = ignore();
  
  // 始终忽略 .git 目录
  ig.add('.git');
  
  // 从当前目录向上查找第一个 .gitignore 文件
  let currentDir = path.resolve(scanPath);
  let gitignorePath: string | null = null;
  let gitignoreRoot: string = currentDir; // 默认为扫描路径
  
  // 向上查找直到根目录
  while (true) {
    const candidatePath = path.join(currentDir, '.gitignore');
    if (fs.existsSync(candidatePath)) {
      gitignorePath = candidatePath;
      gitignoreRoot = currentDir; // .gitignore 所在目录
      break;
    }
    
    const parentDir = path.dirname(currentDir);
    // 已到达根目录
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
 * @param dir 当前扫描的目录路径
 * @param maxDepth 最大扫描深度
 * @param config 配置对象
 * @param scanRoot 用户输入的扫描根目录
 * @param gitignoreRoot .gitignore 文件所在的目录
 * @param ig ignore 实例
 * @param currentDepth 当前深度（内部使用）
 * @returns 文件节点数组
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
  // 达到最大深度，停止扫描
  if (currentDepth >= maxDepth) {
    return [];
  }
  
  const files: FileNode[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      try {
        const fullPath = path.join(dir, entry.name);
        
        // 关键修复：计算相对于 .gitignore 所在目录的路径
        const relativeToGitignore = path.relative(gitignoreRoot, fullPath).replace(/\\/g, '/');
        
        // 使用 ignore 库检查是否应该忽略
        // 对于目录，需要添加尾部斜杠
        const checkPath = entry.isDirectory() ? relativeToGitignore + '/' : relativeToGitignore;
        
        if (ig.ignores(checkPath)) {
          logger.debug(`Ignored by .gitignore: ${checkPath}`);
          continue;
        }
        
        if (entry.isDirectory()) {
          // 递归扫描子目录
          try {
            const children = scanDirectory(fullPath, maxDepth, config, scanRoot, gitignoreRoot, ig, currentDepth + 1);
            
            // 总是添加目录（即使为空，前端会过滤）
            files.push({
              name: entry.name,
              path: fullPath,
              type: 'directory',
              children,
            });
          } catch (subdirError: any) {
            // 记录子目录扫描错误但继续处理其他目录
            logger.warning(`Failed to scan subdirectory: ${fullPath}, error: ${subdirError.message}`);
          }
        } else if (entry.isFile()) {
          // 检查文件扩展名
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
        // 记录单个条目处理错误但继续处理其他条目
        logger.warning(`Failed to process entry: ${entry.name} in ${dir}, error: ${entryError.message}`);
      }
    }
  } catch (error: any) {
    // 记录目录读取错误
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
 * @param files 文件节点数组
 * @returns 文件总数
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

