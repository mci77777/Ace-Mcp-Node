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

// 处理打包后的路径
// 在不同环境下正确解析 __dirname
let __dirname: string;

if (typeof __filename !== 'undefined') {
  // CommonJS 环境（esbuild/pkg 打包后，或 Electron）
  __dirname = path.dirname(__filename);
} else {
  // ESM 环境（开发时）
  const __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
}

// 检测是否在 Electron 环境中
const isElectron = process.versions && process.versions.electron;

// 在 Electron 打包后，__dirname 会正确指向 app.asar/dist/web
// 所以模板路径应该是 __dirname/templates
logger.info(`Running in ${isElectron ? 'Electron' : 'Node.js'} environment`);
logger.info(`Current __dirname: ${__dirname}`);

/**
 * 配置更新接口
 */
interface ConfigUpdate {
  // Index Service (codebase-retrieval) 配置
  base_url?: string;
  token?: string;
  batch_size?: number;
  max_lines_per_blob?: number;
  text_extensions?: string[];
  exclude_patterns?: string[];
  // Enhance Service (prompt-enhance) 配置
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
  // 尝试多个可能的模板路径
  let templatesDir: string;
  
  // 获取 exe 所在目录（pkg 打包后）
  const exeDir = path.dirname(process.execPath);
  
  const possiblePaths = [
    path.join(exeDir, 'web', 'templates'),       // pkg 打包后: exe 同级目录
    path.join(__dirname, 'web', 'templates'),    // esbuild bundle: dist/bundle.cjs -> dist/web/templates
    path.join(__dirname, 'templates'),           // Electron asar: dist/web/templates
    path.join(__dirname, '..', 'web', 'templates'), // 从 dist/ 向上查找
    path.join(__dirname, '../..', 'web', 'templates'), // 开发环境
    path.join(process.cwd(), 'web', 'templates'), // 当前工作目录
  ];
  
  // 记录所有尝试的路径
  logger.info('Searching for templates directory...');
  possiblePaths.forEach((p, index) => {
    const exists = fs.existsSync(p);
    logger.info(`  [${index}] ${p} - ${exists ? '✓ EXISTS' : '✗ NOT FOUND'}`);
  });
  
  templatesDir = possiblePaths.find(p => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  }) || possiblePaths[0];
  
  logger.info(`Selected templates directory: ${templatesDir}`);
  
  // 验证关键文件是否存在
  const indexHtml = path.join(templatesDir, 'index.html');
  const appJs = path.join(templatesDir, 'scripts', 'app.js');
  logger.info(`  index.html exists: ${fs.existsSync(indexHtml)}`);
  logger.info(`  scripts/app.js exists: ${fs.existsSync(appJs)}`);
  
  app.use('/static', express.static(templatesDir));
  logger.info(`Static files middleware configured for /static -> ${templatesDir}`);

  // ============ 路由注册 ============

  /**
   * GET / - 提供主管理页面
   */
  app.get('/', (req: Request, res: Response) => {
    try {
      const htmlFile = path.join(templatesDir, 'index.html');
      
      logger.info(`Serving index.html from: ${htmlFile}`);
      
      if (fs.existsSync(htmlFile)) {
        res.sendFile(htmlFile);
      } else {
        logger.error(`index.html not found at: ${htmlFile}`);
        
        // 列出 templatesDir 的内容以便调试
        let dirContents = 'Directory not accessible';
        try {
          if (fs.existsSync(templatesDir)) {
            dirContents = fs.readdirSync(templatesDir).join(', ');
          }
        } catch (e: any) {
          dirContents = `Error reading directory: ${e.message}`;
        }
        
        res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Prompt Enhance - Template Not Found</title>
            <style>
              body { font-family: monospace; padding: 20px; background: #f5f5f5; }
              .error { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              h1 { color: #e53e3e; }
              .info { margin: 10px 0; padding: 10px; background: #f7fafc; border-left: 4px solid #4299e1; }
              .label { font-weight: bold; color: #2d3748; }
            </style>
          </head>
          <body>
            <div class="error">
              <h1>⚠️ Prompt Enhance - Template Not Found</h1>
              <div class="info">
                <div class="label">Looking for:</div>
                <div>${htmlFile}</div>
              </div>
              <div class="info">
                <div class="label">Current __dirname:</div>
                <div>${__dirname}</div>
              </div>
              <div class="info">
                <div class="label">Templates directory:</div>
                <div>${templatesDir}</div>
              </div>
              <div class="info">
                <div class="label">Directory exists:</div>
                <div>${fs.existsSync(templatesDir) ? 'Yes' : 'No'}</div>
              </div>
              <div class="info">
                <div class="label">Directory contents:</div>
                <div>${dirContents}</div>
              </div>
              <div class="info">
                <div class="label">Environment:</div>
                <div>${isElectron ? 'Electron' : 'Node.js'}</div>
              </div>
              <div class="info">
                <div class="label">Process versions:</div>
                <div>${JSON.stringify(process.versions, null, 2)}</div>
              </div>
            </div>
          </body>
          </html>
        `);
      }
    } catch (error: any) {
      logger.exception('Error serving index.html', error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Error</title></head>
        <body>
          <h1>Error</h1>
          <p>${error.message}</p>
          <pre>${error.stack}</pre>
        </body>
        </html>
      `);
    }
  });

  /**
   * GET /debug - 调试页面
   */
  app.get('/debug', (req: Request, res: Response) => {
    try {
      const debugHtmlFile = path.join(templatesDir, 'debug.html');
      
      if (fs.existsSync(debugHtmlFile)) {
        res.sendFile(debugHtmlFile);
      } else {
        res.status(404).send('<h1>Debug page not found</h1><p>debug.html is missing from templates directory</p>');
      }
    } catch (error: any) {
      logger.exception('Error serving debug.html', error);
      res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
    }
  });

  /**
   * GET /api/debug - 诊断信息（用于调试路径问题）
   */
  app.get('/api/debug', (req: Request, res: Response) => {
    try {
      const debugInfo = {
        environment: isElectron ? 'Electron' : 'Node.js',
        __dirname: __dirname,
        templatesDir: templatesDir,
        templatesDirExists: fs.existsSync(templatesDir),
        indexHtmlExists: fs.existsSync(path.join(templatesDir, 'index.html')),
        processVersions: process.versions,
        cwd: process.cwd(),
        execPath: process.execPath,
        argv: process.argv,
        templatesDirContents: fs.existsSync(templatesDir) 
          ? fs.readdirSync(templatesDir) 
          : 'Directory not found',
        possiblePaths: possiblePaths.map(p => ({
          path: p,
          exists: fs.existsSync(p)
        }))
      };
      
      res.json(debugInfo);
    } catch (error: any) {
      logger.exception('Error getting debug info', error);
      res.status(500).json({ error: error.message });
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
        // Index Service (codebase-retrieval) 配置
        base_url: config.baseUrl,
        token: config.token,
        batch_size: config.batchSize,
        max_lines_per_blob: config.maxLinesPerBlob,
        text_extensions: Array.from(config.textExtensions),
        exclude_patterns: config.excludePatterns,
        // Enhance Service (prompt-enhance) 配置
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

      // 更新 Index Service (codebase-retrieval) 配置
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
      
      // 更新 Enhance Service (prompt-enhance) 配置
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
      
      // 定位 prompt 文件
      // 在打包后，prompt 文件应该在 exe 所在目录或其子目录
      const exeDir = path.dirname(process.execPath);
      const possiblePaths = [
        path.join(exeDir, 'prompt', filename),               // pkg 打包后: exe 同级目录
        path.join(__dirname, '../..', 'prompt', filename),   // 开发环境
        path.join(__dirname, 'prompt', filename),            // 其他打包方式
        path.join(process.cwd(), 'prompt', filename),        // 当前工作目录
      ];
      
      const filePath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
      
      logger.info(`Reading prompt file: ${filePath} (exeDir: ${exeDir})`);
      
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
      
      // 定位 prompt 文件
      // 在打包后，prompt 文件应该在 exe 所在目录或其子目录
      const exeDir = path.dirname(process.execPath);
      const possiblePaths = [
        path.join(exeDir, 'prompt', filename),               // pkg 打包后: exe 同级目录
        path.join(__dirname, '../..', 'prompt', filename),   // 开发环境
        path.join(__dirname, 'prompt', filename),            // 其他打包方式
        path.join(process.cwd(), 'prompt', filename),        // 当前工作目录
      ];
      
      const filePath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
      
      logger.info(`Updating prompt file: ${filePath} (${content.length} chars, exeDir: ${exeDir})`);
      
      // 确保 prompt 目录存在
      const promptDir = path.dirname(filePath);
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

  // ============ 项目管理 API（代理到 retrieval 服务或本地实现） ============

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
      
      // 规范化路径
      const normalizedPath = project_path.replace(/\\/g, '/');
      
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
   * 注意：这需要 retrieval 服务的 IndexManager，这里提供一个简化实现
   */
  app.post('/api/projects/reindex', async (req: Request, res: Response) => {
    try {
      const { project_path } = req.body;
      
      if (!project_path) {
        return res.status(400).json({ error: 'project_path is required' });
      }
      
      logger.info(`Reindex request for project: ${project_path}`);
      
      // 动态导入 IndexManager（如果可用）
      try {
        const { IndexManager } = await import('@codebase-mcp/retrieval/dist/index/manager.js');
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
        
        const result = await indexManager.indexProject(project_path);
        
        res.json({
          success: result.status !== 'error',
          message: 'Project reindexed',
          result,
        });
      } catch (importError: any) {
        // 如果无法导入 IndexManager，返回提示信息
        logger.warning(`IndexManager not available: ${importError.message}`);
        res.status(501).json({
          error: 'Indexing service not available. Please use the retrieval service for project indexing.',
          hint: 'Start the retrieval service with: npm run dev:retrieval -- --web-port 8091'
        });
      }
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
      
      // 规范化路径
      const normalizedPath = project_path.replace(/\\/g, '/');
      
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
      
      // 规范化路径
      const normalizedPath = project_path.replace(/\\/g, '/');
      
      if (!fs.existsSync(projectsFile)) {
        return res.status(404).json({ error: 'No indexed projects found' });
      }
      
      const content = fs.readFileSync(projectsFile, 'utf-8');
      const projects = JSON.parse(content);
      
      if (!projects[normalizedPath]) {
        return res.status(404).json({ error: 'Project not found in index' });
      }
      
      const blobNames = projects[normalizedPath];
      
      // 统计文件类型分布
      const fileTypeStats: Record<string, number> = {};
      let totalFiles = 0;
      
      if (fs.existsSync(normalizedPath) && fs.statSync(normalizedPath).isDirectory()) {
        const scanDir = (dir: string) => {
          try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
              const fullPath = path.join(dir, entry.name);
              
              if (entry.isDirectory()) {
                const shouldExclude = config.excludePatterns.some((pattern: string) => 
                  entry.name === pattern || entry.name.match(new RegExp(pattern))
                );
                
                if (!shouldExclude && !entry.name.startsWith('.')) {
                  scanDir(fullPath);
                }
              } else if (entry.isFile()) {
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
   * POST /api/tools/execute - 执行 MCP 工具
   * 注意：这需要 retrieval 服务的 codebaseRetrievalTool
   */
  app.post('/api/tools/execute', async (req: Request, res: Response) => {
    try {
      const { tool, arguments: args } = req.body;
      
      if (!tool) {
        return res.status(400).json({ error: 'tool is required' });
      }
      
      logger.info(`Tool execution request: ${tool}`);
      
      if (tool === 'codebase-retrieval') {
        // 动态导入 codebaseRetrievalTool
        try {
          const { codebaseRetrievalTool } = await import('@codebase-mcp/retrieval/dist/tools/codebaseRetrieval.js');
          
          const result = await codebaseRetrievalTool(args);
          
          res.json({
            status: 'success',
            result: result.text,
          });
        } catch (importError: any) {
          logger.warning(`codebaseRetrievalTool not available: ${importError.message}`);
          res.status(501).json({
            status: 'error',
            message: 'Retrieval tool not available. Please use the retrieval service.',
            hint: 'Start the retrieval service with: npm run dev:retrieval -- --web-port 8091'
          });
        }
      } else {
        res.status(400).json({
          status: 'error',
          message: `Unknown tool: ${tool}`,
        });
      }
    } catch (error: any) {
      logger.exception(`Failed to execute tool: ${error.message}`, error);
      res.status(500).json({
        status: 'error',
        message: error.message,
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

  wss.on('error', (error: any) => {
    logger.error(`WebSocket server error: ${error.message}`);
  });

  wss.on('connection', (ws: WebSocket) => {
    logBroadcaster.addClient(ws);
  });

  logger.info('WebSocket server setup completed');
}
