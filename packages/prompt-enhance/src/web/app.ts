/**
 * Prompt Enhance Express Web 应用
 * 提供提示词增强服务的 Web 界面和 API
 */

import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import * as toml from '@iarna/toml';
import { getConfig, USER_CONFIG_FILE } from '@codebase-mcp/shared';
import { logger, getLogBroadcaster } from '@codebase-mcp/shared';
import { EnhancePromptService } from '../services/enhancePrompt.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 配置更新接口
 */
interface ConfigUpdate {
  enhance_base_url?: string;
  enhance_token?: string;
  model?: string;
  custom_model?: string;
  custom_headers?: string | Record<string, string>;
  api_timeout?: number;
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
      res.send('<h1>Prompt Enhance</h1><p>Template not found</p>');
    }
  });

  /**
   * GET /api/status - 获取服务器状态
   */
  app.get('/api/status', (req: Request, res: Response) => {
    try {
      const config = getConfig();
      res.json({
        status: 'running',
        service: 'prompt-enhance',
        enhance_base_url: config.enhanceBaseUrl,
        model: (config as any).model || '',
        custom_model: (config as any).customModel || '',
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
        enhance_base_url: config.enhanceBaseUrl,
        enhance_token: config.enhanceToken,
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
        return res.status(404).json({ detail: 'Configuration file not found' });
      }

      // 加载现有设置
      const content = fs.readFileSync(USER_CONFIG_FILE, 'utf-8');
      const settingsData: any = toml.parse(content);

      // 更新设置
      if (configUpdate.enhance_base_url !== undefined) {
        settingsData.ENHANCE_BASE_URL = configUpdate.enhance_base_url;
      }
      if (configUpdate.enhance_token !== undefined) {
        settingsData.ENHANCE_TOKEN = configUpdate.enhance_token;
      }
      if (configUpdate.model !== undefined) {
        settingsData.MODEL = configUpdate.model;
      }
      if (configUpdate.custom_model !== undefined) {
        settingsData.CUSTOM_MODEL = configUpdate.custom_model;
      }
      if (configUpdate.custom_headers !== undefined) {
        try {
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
   * GET /api/models - 获取可用的模型列表
   */
  app.get('/api/models', async (req: Request, res: Response) => {
    try {
      logger.info('Fetching available models');

      const config = getConfig();

      // 验证配置
      if (!config.enhanceBaseUrl || !config.enhanceToken) {
        logger.error('Missing ENHANCE_BASE_URL or ENHANCE_TOKEN configuration');
        return res.status(500).json({ error: 'Server configuration error: missing ENHANCE_BASE_URL or ENHANCE_TOKEN' });
      }

      // 创建或复用全局 EnhancePromptService 实例
      if (!globalEnhancePromptService) {
        globalEnhancePromptService = new EnhancePromptService(
          config.enhanceBaseUrl, 
          config.enhanceToken, 
          config.customHeaders, 
          config.apiTimeout
        );
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
   * POST /api/enhance-prompt - 增强用户提示词
   */
  app.post('/api/enhance-prompt', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      // 提取请求参数
      const { 
        projectPath, 
        originalMessage, 
        model,
        language = 'zh',
        selectedFiles = [],
        userGuidelines = 'none',
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
        return res.status(400).json({ error: 'projectPath is required' });
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

      logger.info(`Enhance prompt request: projectPath=${projectPath}, model=${model || 'default'}, selectedFiles=${selectedFiles.length}, messageLength=${originalMessage.length}`);

      // 集成 EnhancePromptService
      const config = getConfig();
      
      // 验证配置
      if (!config.enhanceBaseUrl || !config.enhanceToken) {
        logger.error('Missing ENHANCE_BASE_URL or ENHANCE_TOKEN configuration');
        return res.status(500).json({ error: 'Server configuration error: missing ENHANCE_BASE_URL or ENHANCE_TOKEN' });
      }

      // 创建或复用全局实例
      if (!globalEnhancePromptService) {
        globalEnhancePromptService = new EnhancePromptService(
          config.enhanceBaseUrl, 
          config.enhanceToken, 
          config.customHeaders, 
          config.apiTimeout
        );
        logger.info('Created global EnhancePromptService instance');
      }
      
      const enhanceService = globalEnhancePromptService;

      // 确定最终使用的模型
      let finalModel: string;
      
      if (!model || model === 'default' || model === '') {
        // 优先使用 custom_model，其次使用 model
        if ((config as any).customModel && (config as any).customModel.trim()) {
          finalModel = (config as any).customModel;
          logger.info(`Using custom_model from config: ${finalModel}`);
        } else if ((config as any).model && (config as any).model.trim()) {
          finalModel = (config as any).model;
          logger.info(`Using model from config: ${finalModel}`);
        } else {
          // 尝试获取第一个可用模型
          try {
            const availableModels = await enhanceService.getAvailableModels();
            if (availableModels.length > 0) {
              finalModel = availableModels[0].id;
              logger.info(`Using first available model: ${finalModel}`);
            } else {
              finalModel = 'gpt-4';
              logger.info('No models available, using default: gpt-4');
            }
          } catch (modelError: any) {
            finalModel = 'gpt-4';
            logger.warning(`Failed to fetch models: ${modelError.message}, using default: gpt-4`);
          }
        }
      } else {
        // 用户指定了具体模型
        finalModel = model;
        logger.info(`Using user-specified model: ${finalModel}`);
      }

      // 调用服务
      const result = await enhanceService.enhancePrompt({
        projectPath: projectPath,
        originalMessage: finalMessage,
        model: finalModel,
        selectedFiles: selectedFiles,
        userGuidelines: userGuidelines,
        customGuidelinePath: customGuidelinePath,
        includeReadme: includeReadme,
      });

      const duration = Date.now() - startTime;
      logger.info(`Enhance prompt completed successfully in ${duration}ms, result length: ${result.enhancedPrompt.length} chars`);
      
      // 返回响应
      res.status(200).json({
        enhancedPrompt: result.enhancedPrompt,
        originalMessage: originalMessage,
        finalMessage: finalMessage,
        projectPath: result.projectPath,
        model: result.model,
        language: language,
        projectTree: result.projectTree || '',
        systemPrompt: result.systemPrompt || '',
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.exception(`Failed to enhance prompt after ${duration}ms`, error);
      
      // 脱敏错误消息
      let sanitizedMessage = 'Internal server error while enhancing prompt';
      
      if (error.message) {
        sanitizedMessage = error.message.replace(/Bearer\s+[^\s]+/gi, 'Bearer ***');
        sanitizedMessage = sanitizedMessage.replace(/https?:\/\/[^\s]+/gi, (url) => {
          try {
            const urlObj = new URL(url);
            return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
          } catch {
            return '[URL]';
          }
        });
        sanitizedMessage = sanitizedMessage.replace(/token[=:]\s*[^\s&]+/gi, 'token=***');
      }
      
      // 根据错误类型返回适当的状态码
      let statusCode = 500;
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
        logger.error(`Network error connecting to backend: ${error.code}`);
        sanitizedMessage = 'Failed to connect to backend service';
        statusCode = 503;
      } else if (error.response) {
        statusCode = error.response.status || 500;
        logger.error(`Backend API error: status=${statusCode}`);
        
        if (error.response.status >= 400 && error.response.status < 500) {
          sanitizedMessage = 'Invalid request to backend service';
        } else if (error.response.status >= 500) {
          sanitizedMessage = 'Backend service error';
        }
      }
      
      res.status(statusCode).json({ error: sanitizedMessage });
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
      
      // 定位项目根目录 (packages/prompt-enhance/)
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
      
      // 定位项目根目录 (packages/prompt-enhance/)
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
