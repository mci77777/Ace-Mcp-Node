/**
 * Enhance Prompt 服务
 * 调用后端 API 将简短消息转换为详细的增强消息
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '@codebase-mcp/shared';

/**
 * API 格式类型
 */
enum ApiFormat {
  AUGMENT = 'augment',
  OPENAI = 'openai',
}

/**
 * OpenAI 兼容消息格式
 */
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * OpenAI 兼容请求 Payload
 */
interface OpenAIRequestPayload {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

/**
 * OpenAI 兼容响应格式
 */
interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Enhance Prompt 请求接口
 */
export interface EnhancePromptRequest {
  projectPath: string;
  originalMessage: string;
  model?: string;
  // 高级选项
  selectedFiles?: string[];        // 用户选择的文件路径列表
  userGuidelines?: string;         // 用户指南选项: 'claude-agents' | 'custom' | 'none'
  customGuidelinePath?: string;    // 自定义指南文件路径
  includeReadme?: boolean;         // 是否包含 README.md
}

/**
 * Enhance Prompt 响应接口
 */
export interface EnhancePromptResponse {
  enhancedPrompt: string;
  originalMessage: string;
  projectPath: string;
  model: string;
  projectTree?: string;  // 项目树结构（可选）
  systemPrompt?: string; // 完整的系统提示词（发送给 API 的实际内容）
}

/**
 * 后端 API Payload 接口
 * 基于实际抓包数据的完整格式
 */
interface EnhancePromptApiPayload {
  model: string | null;
  path: string;
  prefix: string;
  selected_code: string;
  suffix: string | null;
  message: string;
  chat_history: any[];
  lang: string;
  blobs: {
    checkpoint_id: string | null;
    added_blobs: any[];
    deleted_blobs: any[];
  };
  user_guided_blobs: any[];
  context_code_exchange_request_id: string;
  external_source_ids: any[];
  disable_auto_external_sources: boolean | null;
  user_guidelines: string;
  workspace_guidelines: string;
  feature_detection_flags: {
    support_tool_use_start: boolean;
    support_parallel_tool_use: boolean;
  };
  tool_definitions: any[];
}

/**
 * 模型信息接口
 */
export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
}

/**
 * Enhance Prompt 服务类
 */
export class EnhancePromptService {
  private httpClient: AxiosInstance;
  private cachedModels: ModelInfo[] | null = null;
  private apiFormat: ApiFormat;
  private systemPrompt: string = '';
  private injectCode: string = '';
  private apiTimeout: number;

  /**
   * 构造函数
   * @param baseUrl - 后端 API 基础 URL
   * @param token - 认证 Token
   * @param customHeaders - 自定义请求头（可选）
   * @param apiTimeout - API 超时时间（毫秒）
   */
  constructor(baseUrl: string, token: string, customHeaders?: Record<string, string>, apiTimeout: number = 120000) {
    this.apiTimeout = apiTimeout;
    // 检测 API 格式
    this.apiFormat = this.detectApiFormat(baseUrl);
    
    // 构建默认请求头
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 只有在 token 存在时才添加 Authorization 头
    if (token && token.trim()) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    // 合并自定义请求头
    // 自定义请求头会覆盖默认请求头（包括 Authorization）
    const finalHeaders = {
      ...defaultHeaders,
      ...(customHeaders || {}),
    };

    // 记录最终使用的请求头（隐藏敏感信息）
    logger.info(`Initializing EnhancePromptService with ${Object.keys(finalHeaders).length} header(s):`);
    for (const key of Object.keys(finalHeaders)) {
      const value = finalHeaders[key];
      const maskedValue = key.toLowerCase().includes('auth') || 
                         key.toLowerCase().includes('key') || 
                         key.toLowerCase().includes('token')
        ? '***'
        : value.substring(0, 20) + (value.length > 20 ? '...' : '');
      logger.debug(`  ${key}: ${maskedValue}`);
    }
    
    // 初始化 axios httpClient
    this.httpClient = axios.create({
      baseURL: baseUrl,
      timeout: this.apiTimeout,
      headers: finalHeaders,
    });
    
    logger.info(`API timeout set to: ${this.apiTimeout}ms (${this.apiTimeout / 1000}s)`);

    logger.info(`EnhancePromptService initialized with baseUrl: ${baseUrl}, detected API format: ${this.apiFormat}`);
    
    // 异步加载提示词文件
    this.loadPromptFiles().catch(error => {
      logger.warning(`Failed to load prompt files during initialization: ${error instanceof Error ? error.message : 'unknown'}`);
    });
  }

  /**
   * 检测 API 格式
   * @param baseUrl - 后端 API 基础 URL
   * @returns API 格式类型
   */
  private detectApiFormat(baseUrl: string): ApiFormat {
    try {
      // 检查 URL 是否包含 "augment" 关键字
      const urlLower = baseUrl.toLowerCase();
      
      if (urlLower.includes('augment')) {
        logger.info(`Detected Augment API format from URL: ${baseUrl}`);
        return ApiFormat.AUGMENT;
      } else {
        logger.info(`Detected OpenAI-compatible API format from URL: ${baseUrl}`);
        return ApiFormat.OPENAI;
      }
    } catch (error) {
      // 异常 URL 格式的降级逻辑
      logger.warning(
        `Failed to detect API format from URL: ${baseUrl}, error: ${error instanceof Error ? error.message : 'unknown'}. Defaulting to OpenAI format.`
      );
      return ApiFormat.OPENAI;
    }
  }

  /**
   * 生成项目目录树
   * @param projectPath - 项目路径
   * @param maxDepth - 最大深度（默认 2）
   * @returns 目录树字符串
   */
  private async generateProjectTree(projectPath: string, maxDepth: number = 2): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const ignore = await import('ignore');
    
    logger.info(`Generating project tree for ${projectPath} with max depth ${maxDepth}`);
    
    try {
      // 读取 .gitignore
      let ig = ignore.default();
      
      // 始终添加默认排除规则
      const defaultExcludes = ['.git/', '.git', 'node_modules/', 'node_modules', 'dist/', 'dist', 'build/', 'build'];
      ig.add(defaultExcludes);
      
      try {
        const gitignorePath = path.join(projectPath, '.gitignore');
        const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
        ig.add(gitignoreContent);
        logger.info(`Loaded .gitignore rules from ${gitignorePath} and applied default excludes`);
      } catch (error) {
        logger.info('No .gitignore found, using default exclude rules: .git, node_modules, dist, build');
      }
      
      // 递归遍历目录
      async function traverse(dir: string, depth: number, prefix: string = ''): Promise<string[]> {
        if (depth > maxDepth) {
          return [];
        }
        
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          const lines: string[] = [];
          
          // 过滤并排序条目
          const filteredEntries = [];
          for (const entry of entries) {
            const relativePath = path.relative(projectPath, path.join(dir, entry.name));
            
            // 使用 .gitignore 规则过滤
            // 对于目录，需要同时检查带和不带尾部斜杠的路径
            const pathToCheck = entry.isDirectory() ? relativePath + '/' : relativePath;
            if (ig.ignores(pathToCheck) || ig.ignores(relativePath)) {
              continue;
            }
            
            filteredEntries.push(entry);
          }
          
          // 排序：目录在前，文件在后，同类按字母顺序
          filteredEntries.sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory()) return -1;
            if (!a.isDirectory() && b.isDirectory()) return 1;
            return a.name.localeCompare(b.name);
          });
          
          for (let i = 0; i < filteredEntries.length; i++) {
            const entry = filteredEntries[i];
            const isLast = i === filteredEntries.length - 1;
            const connector = isLast ? '└── ' : '├── ';
            
            if (entry.isDirectory()) {
              lines.push(`${prefix}${connector}${entry.name}/`);
              
              if (depth < maxDepth) {
                const subPrefix = prefix + (isLast ? '    ' : '│   ');
                const subLines = await traverse(
                  path.join(dir, entry.name),
                  depth + 1,
                  subPrefix
                );
                lines.push(...subLines);
              }
            } else {
              lines.push(`${prefix}${connector}${entry.name}`);
            }
          }
          
          return lines;
        } catch (error) {
          logger.warning(`Failed to read directory ${dir}: ${error instanceof Error ? error.message : 'unknown'}`);
          return [];
        }
      }
      
      const tree = await traverse(projectPath, 0);
      const treeString = tree.join('\n');
      
      logger.info(`Generated project tree with ${tree.length} lines`);
      
      return treeString;
    } catch (error) {
      logger.exception('Failed to generate project tree', error as Error);
      return ''; // 降级处理：返回空字符串
    }
  }

  /**
   * 重新加载提示词文件（公共方法）
   * 用于在文件更新后重新加载最新内容
   */
  async reloadPromptFiles(): Promise<void> {
    logger.info('Reloading prompt files...');
    await this.loadPromptFiles();
    logger.info('Prompt files reloaded successfully');
  }

  /**
   * 加载提示词文件
   * 读取 prompt/prompt.txt 和 prompt/inject-code.txt
   * 如果文件不存在，使用空字符串作为降级处理
   */
  private async loadPromptFiles(): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    try {
      // 定位项目根目录
      // 当前文件是 packages/prompt-enhance/src/services/enhancePrompt.ts
      // 编译后是 packages/prompt-enhance/dist/services/enhancePrompt.js
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const projectRoot = path.join(__dirname, '../..');
      
      logger.info(`Loading prompt files from project root: ${projectRoot}`);
      
      // 读取 prompt/prompt.txt
      const promptPath = path.join(projectRoot, 'prompt/prompt.txt');
      try {
        this.systemPrompt = await fs.readFile(promptPath, 'utf-8');
        logger.info(`Loaded system prompt from ${promptPath} (${this.systemPrompt.length} chars)`);
      } catch (error) {
        logger.warning(`Failed to read prompt/prompt.txt: ${error instanceof Error ? error.message : 'unknown'}. Using empty string.`);
        this.systemPrompt = '';
      }
      
      // 读取 prompt/inject-code.txt
      const injectCodePath = path.join(projectRoot, 'prompt/inject-code.txt');
      try {
        this.injectCode = await fs.readFile(injectCodePath, 'utf-8');
        logger.info(`Loaded inject code from ${injectCodePath} (${this.injectCode.length} chars)`);
      } catch (error) {
        logger.info(`prompt/inject-code.txt not found or cannot be read: ${error instanceof Error ? error.message : 'unknown'}. Using empty string.`);
        this.injectCode = '';
      }
      
      logger.info(`Prompt files loaded successfully: systemPrompt=${this.systemPrompt.length} chars, injectCode=${this.injectCode.length} chars`);
    } catch (error) {
      logger.exception('Unexpected error loading prompt files', error as Error);
      // 降级处理：使用空字符串
      this.systemPrompt = '';
      this.injectCode = '';
    }
  }

  /**
   * 获取可用的模型列表
   * @returns 模型列表
   */
  async getAvailableModels(): Promise<ModelInfo[]> {
    // 如果有缓存，直接返回
    if (this.cachedModels) {
      logger.info('Returning cached models list');
      return this.cachedModels;
    }

    logger.info('Fetching available models from API');

    try {
      // 尝试多个可能的端点
      const possibleEndpoints = ['/v1/models', '/models', '/agents/models', '/api/models'];
      let lastError: Error | null = null;

      for (const endpoint of possibleEndpoints) {
        try {
          logger.info(`Trying models endpoint: ${endpoint}`);
          
          const response = await this.httpClient.get(endpoint, {
            timeout: 5000, // 5 second timeout for models endpoint
          });

          if (response.status === 200 && response.data) {
            logger.info(`Successfully fetched models from ${endpoint}`);

            // 解析响应数据
            let models: ModelInfo[] = [];

            if (Array.isArray(response.data)) {
              // 直接是数组
              models = response.data.map((item: any) => ({
                id: item.id || item.model_id || item.name || 'unknown',
                name: item.name || item.display_name || item.id || 'Unknown Model',
                description: item.description || item.desc || '',
              }));
            } else if (response.data.models && Array.isArray(response.data.models)) {
              // 嵌套在 models 字段中
              models = response.data.models.map((item: any) => ({
                id: item.id || item.model_id || item.name || 'unknown',
                name: item.name || item.display_name || item.id || 'Unknown Model',
                description: item.description || item.desc || '',
              }));
            } else if (response.data.data && Array.isArray(response.data.data)) {
              // OpenAI/X.AI 格式: { data: [...] }
              models = response.data.data.map((item: any) => ({
                id: item.id || item.model_id || item.name || 'unknown',
                name: item.name || item.display_name || item.id || 'Unknown Model',
                description: item.description || item.desc || '',
              }));
            } else {
              logger.warning(`Unexpected response format from ${endpoint}`);
              continue;
            }

            // 过滤掉无效的模型
            models = models.filter(m => m.id && m.id !== 'unknown');

            if (models.length === 0) {
              logger.warning(`No valid models found in response from ${endpoint}`);
              continue;
            }

            // 缓存结果
            this.cachedModels = models;
            logger.info(`Cached ${models.length} models from ${endpoint}`);

            return models;
          }
        } catch (error) {
          lastError = error as Error;
          
          // 继续尝试下一个端点
          if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const code = error.code;
            
            if (status === 404) {
              logger.info(`Endpoint ${endpoint} not found (404), trying next...`);
              continue;
            } else if (code === 'ETIMEDOUT') {
              logger.warning(`Endpoint ${endpoint} timeout, trying next...`);
              continue;
            } else if (code === 'ECONNREFUSED') {
              logger.warning(`Cannot connect to ${endpoint}, trying next...`);
              continue;
            } else {
              logger.warning(`Error fetching from ${endpoint}: ${error.message}, trying next...`);
              continue;
            }
          }
          
          logger.warning(`Unexpected error fetching from ${endpoint}: ${error instanceof Error ? error.message : 'unknown'}, trying next...`);
          continue;
        }
      }

      // 所有端点都失败，返回空列表
      logger.warning(`No models endpoint found after trying ${possibleEndpoints.length} endpoints, returning empty list`);
      
      if (lastError) {
        logger.warning(`Last error: ${lastError.message}`);
      }
      
      this.cachedModels = [];
      return [];
    } catch (error) {
      logger.exception('Unexpected error fetching available models', error as Error);
      // 返回空列表而不是抛出错误
      this.cachedModels = [];
      return [];
    }
  }

  /**
   * 调用 Augment API
   * @param request - Enhance Prompt 请求
   * @returns 增强后的消息响应
   */
  private async callAugmentApi(request: EnhancePromptRequest): Promise<EnhancePromptResponse> {
    const { 
      projectPath, 
      originalMessage, 
      model = 'default',
      selectedFiles = [],
      userGuidelines = 'none',
      customGuidelinePath,
      includeReadme = false
    } = request;
    const startTime = Date.now();

    logger.info(
      `Calling Augment API: projectPath=${projectPath}, model=${model}, messageLength=${originalMessage.length}, selectedFiles=${selectedFiles.length}, userGuidelines=${userGuidelines}, includeReadme=${includeReadme}`
    );

    try {
      // 构建防封 payload - 读取文件内容和指南
      const selectedCode = await this.buildSelectedCode(projectPath, selectedFiles);
      const userGuidelinesContent = await this.buildUserGuidelines(projectPath, userGuidelines, customGuidelinePath);
      const workspaceGuidelinesContent = await this.buildWorkspaceGuidelines(projectPath, includeReadme);
      const userGuidedBlobs = this.buildUserGuidedBlobs(selectedFiles);
      
      logger.info(`Built payload components: selectedCode=${selectedCode.length} chars, userGuidelines=${userGuidelinesContent.length} chars, workspaceGuidelines=${workspaceGuidelinesContent.length} chars, userGuidedBlobs=${userGuidedBlobs.length} items`);
      
      // 使用重试机制调用 API
      const response = await this.retryRequest(async () => {
        // 构建完整的防封 API payload
        const payload: EnhancePromptApiPayload = {
          model: model === 'default' ? null : model,
          path: '',  // 可以为空
          prefix: `Project: ${projectPath}\n\n`,
          selected_code: selectedCode,  // 填充选中的文件内容
          suffix: null,
          message: originalMessage,
          chat_history: [],
          lang: 'markdown',
          // 防封关键：清空 blobs 的 added_blobs 和 deleted_blobs
          blobs: {
            checkpoint_id: null,
            added_blobs: [],  // 必须为空，避免被检测为批量操作
            deleted_blobs: [], // 必须为空
          },
          user_guided_blobs: userGuidedBlobs,  // 填充用户选择的文件路径
          context_code_exchange_request_id: 'new',
          external_source_ids: [],
          disable_auto_external_sources: null,
          user_guidelines: userGuidelinesContent,  // 填充用户指南
          workspace_guidelines: workspaceGuidelinesContent,  // 填充工作区指南
          feature_detection_flags: {
            support_tool_use_start: true,
            support_parallel_tool_use: true,
          },
          tool_definitions: [],
        };

        logger.info(`Calling Augment API endpoint: /chat-stream`);
        logger.info(`Payload size: ${JSON.stringify(payload).length} bytes`);
        logger.info(`Anti-block measures applied: blobs cleared, ${userGuidedBlobs.length} guided blobs, ${userGuidelinesContent.length} user guidelines chars, ${workspaceGuidelinesContent.length} workspace guidelines chars`);

        // 调用后端 API - 使用 responseType: 'text' 获取原始文本
        return await this.httpClient.post('/chat-stream', payload, {
          responseType: 'text',
        });
      }, 3, 1000);

      // 记录响应状态
      logger.info(`Augment API response status: ${response.status} ${response.statusText}`);
      logger.info(`Response data length: ${response.data?.length || 0} chars`);
      
      // 解析流式响应（NDJSON 格式）
      const enhancedPrompt = this.parseStreamingResponse(response.data);

      if (!enhancedPrompt) {
        logger.error('Failed to parse enhanced prompt from streaming response');
        logger.error(`Raw response data: ${response.data?.substring(0, 500)}`);
        throw new Error('Failed to parse enhanced prompt from streaming response');
      }

      if (enhancedPrompt.trim() === '') {
        logger.error('Received empty enhanced prompt from API');
        logger.error(`Raw response data: ${response.data?.substring(0, 500)}`);
        throw new Error('Received empty enhanced prompt from API');
      }

      const duration = Date.now() - startTime;
      logger.info(`Augment API call completed successfully in ${duration}ms, enhanced length=${enhancedPrompt.length}`);

      // 生成项目树用于前端预览
      let projectTree = '';
      try {
        projectTree = await this.generateProjectTree(projectPath, 2);
      } catch (error: any) {
        logger.warning(`Failed to generate project tree for response: ${error.message}`);
      }

      // 构建完整的系统提示词（用于前端显示）
      const systemPromptParts: string[] = [];
      
      // 1. 基础系统提示词
      if (this.systemPrompt && this.systemPrompt.trim()) {
        systemPromptParts.push(this.systemPrompt);
        logger.info(`Added system prompt to response (${this.systemPrompt.length} chars)`);
      }
      
      // 2. 项目上下文
      systemPromptParts.push('\n---\n');
      systemPromptParts.push(`Project: ${projectPath}`);
      
      // 3. 项目树
      if (projectTree && projectTree.trim()) {
        systemPromptParts.push('\n\nProject Structure:');
        systemPromptParts.push('```');
        systemPromptParts.push(projectTree);
        systemPromptParts.push('```');
        logger.info(`Added project tree to response (${projectTree.split('\n').length} lines)`);
      }
      
      // 4. 附加信息
      if (this.injectCode && this.injectCode.trim()) {
        systemPromptParts.push('\n---\n');
        systemPromptParts.push(this.injectCode);
        logger.info(`Added inject code to response (${this.injectCode.length} chars)`);
      }
      
      // 5. 用户指南（CLAUDE.md / AGENTS.md / Custom）
      if (userGuidelinesContent && userGuidelinesContent.trim()) {
        systemPromptParts.push('\n---\n');
        systemPromptParts.push('User Guidelines:');
        systemPromptParts.push(userGuidelinesContent);
        logger.info(`Added user guidelines to response (${userGuidelinesContent.length} chars)`);
      }
      
      // 6. 工作区指南（README）
      if (workspaceGuidelinesContent && workspaceGuidelinesContent.trim()) {
        systemPromptParts.push('\n---\n');
        systemPromptParts.push('Workspace Guidelines (README):');
        systemPromptParts.push(workspaceGuidelinesContent);
        logger.info(`Added workspace guidelines (README) to response (${workspaceGuidelinesContent.length} chars)`);
      }
      
      // 7. 选中文件内容
      if (selectedCode && selectedCode.trim()) {
        systemPromptParts.push('\n---\n');
        systemPromptParts.push('Selected Files Content:');
        systemPromptParts.push(selectedCode);
        logger.info(`Added selected files content to response (${selectedFiles.length} files, ${selectedCode.length} chars)`);
      }
      
      const systemPromptContent = systemPromptParts.join('\n').trim();

      // 返回标准化结果
      return {
        enhancedPrompt,
        originalMessage,
        projectPath,
        model,
        projectTree,
        systemPrompt: systemPromptContent, // 返回完整的系统提示词
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;
        const statusText = axiosError.response?.statusText;
        const message = axiosError.message;
        const code = axiosError.code;

        // 详细的错误日志
        logger.exception(
          `Failed to call Augment API after ${duration}ms: ${message} (status: ${status || 'unknown'}, code: ${code || 'unknown'})`,
          error as Error
        );

        // 根据错误类型提供更具体的错误消息
        if (code === 'ECONNREFUSED') {
          throw new Error('Failed to connect to Augment API: Connection refused');
        } else if (code === 'ETIMEDOUT') {
          throw new Error('Failed to connect to Augment API: Connection timeout');
        } else if (code === 'ENOTFOUND') {
          throw new Error('Failed to connect to Augment API: Host not found');
        } else if (status === 401) {
          throw new Error('Authentication failed: Invalid or expired token');
        } else if (status === 403) {
          throw new Error('Access forbidden: Insufficient permissions');
        } else if (status === 404) {
          throw new Error('API endpoint not found: /chat-stream');
        } else if (status === 429) {
          throw new Error('Rate limit exceeded: Too many requests');
        } else if (status && status >= 500) {
          throw new Error(`Augment API error: ${statusText || 'Internal server error'} (HTTP ${status})`);
        } else {
          throw new Error(
            `Failed to call Augment API: ${message}${status ? ` (HTTP ${status})` : ''}`
          );
        }
      }

      logger.exception(`Unexpected error calling Augment API after ${duration}ms`, error as Error);
      throw error;
    }
  }

  /**
   * 增强用户消息
   * @param request - Enhance Prompt 请求
   * @returns 增强后的消息响应
   */
  async enhancePrompt(request: EnhancePromptRequest): Promise<EnhancePromptResponse> {
    const { projectPath, originalMessage, model = 'default' } = request;

    logger.info(
      `Enhance prompt request: projectPath=${projectPath}, model=${model}, messageLength=${originalMessage.length}, apiFormat=${this.apiFormat}`
    );

    // 根据 API 格式调用对应的方法
    if (this.apiFormat === ApiFormat.AUGMENT) {
      logger.info('Using Augment API format');
      return await this.callAugmentApi(request);
    } else {
      logger.info('Using OpenAI-compatible API format');
      return await this.callOpenAIApi(request);
    }
  }

  /**
   * 解析流式响应（NDJSON 格式）
   * 每行是一个 JSON 对象，包含 text 字段
   * @param responseText - 原始响应文本
   * @returns 拼接后的完整文本
   */
  private parseStreamingResponse(responseText: string): string {
    if (!responseText || responseText.trim() === '') {
      logger.error('Received empty response text');
      return '';
    }

    const lines = responseText.split('\n').filter((line) => line.trim());
    let fullText = '';
    let parsedLines = 0;
    let failedLines = 0;

    logger.info(`Parsing streaming response: ${lines.length} lines`);
    
    // 记录原始响应的前 500 字符用于调试
    logger.info(`Raw response preview (first 500 chars): ${responseText.substring(0, 500)}`);

    for (const line of lines) {
      try {
        // 安全的 JSON 解析 - 使用 reviver 函数处理特殊值
        const json = JSON.parse(line, (key, value) => {
          // 处理 null 和 undefined
          if (value === null || value === undefined) {
            return value;
          }
          // 处理可能导致 __decimal 错误的数字字符串
          if (typeof value === 'string' && /^\d+\.\d+$/.test(value)) {
            return value; // 保持为字符串，不转换为数字
          }
          return value;
        });
        
        // 记录每行的 JSON 结构（仅记录前几行）
        if (parsedLines + failedLines < 3) {
          try {
            logger.info(`Line ${parsedLines + failedLines + 1} JSON structure: ${JSON.stringify(json).substring(0, 200)}`);
          } catch (e) {
            logger.warning(`Line ${parsedLines + failedLines + 1} JSON structure cannot be stringified`);
          }
        }
        
        // 检查错误类型
        if (json && json.type === 'error') {
          logger.error(`Stream error: ${json.message || 'Unknown error'}`);
          throw new Error(json.message || 'Unknown error from stream');
        }
        
        // 提取文本内容 - 使用安全的属性访问
        if (json && typeof json.text === 'string') {
          fullText += json.text;
          parsedLines++;
        } else if (json && json.type === 'text' && json.text === '') {
          // 空文本块，跳过
          parsedLines++;
        } else if (json && json.nodes && Array.isArray(json.nodes) && json.nodes.length > 0) {
          // 检查是否有 nodes 字段包含完整内容
          // 查找 type=0 的节点（通常包含完整响应）
          const contentNode = json.nodes.find((node: any) => {
            return node && typeof node === 'object' && node.type === 0 && typeof node.content === 'string';
          });
          
          if (contentNode && contentNode.content) {
            // 如果找到完整内容节点，使用它替换累积的文本
            logger.info(`Found complete content in nodes[${json.nodes.indexOf(contentNode)}], length: ${contentNode.content.length} chars`);
            fullText = contentNode.content;
            parsedLines++;
          } else {
            try {
              logger.warning(`Line ${parsedLines + failedLines + 1} has nodes but no content node, JSON: ${JSON.stringify(json).substring(0, 200)}`);
            } catch (e) {
              logger.warning(`Line ${parsedLines + failedLines + 1} has nodes but no content node (cannot stringify)`);
            }
          }
        } else {
          // 记录没有 text 字段的行
          try {
            logger.warning(`Line ${parsedLines + failedLines + 1} has no text field, JSON: ${JSON.stringify(json).substring(0, 200)}`);
          } catch (e) {
            logger.warning(`Line ${parsedLines + failedLines + 1} has no text field (cannot stringify)`);
          }
        }
      } catch (error) {
        failedLines++;
        
        if (error instanceof Error && error.message.includes('error from stream')) {
          // 重新抛出流错误
          throw error;
        }
        
        // 记录解析失败但继续处理
        const errorMsg = error instanceof Error ? error.message : 'unknown';
        const lineSample = line.length > 100 ? line.substring(0, 100) + '...' : line;
        logger.warning(`Failed to parse streaming response line (${failedLines}/${lines.length}): ${lineSample}, error: ${errorMsg}`);
        
        // 如果是 JSON 解析错误，尝试提取可能的文本内容
        if (errorMsg.includes('JSON') || errorMsg.includes('parse')) {
          // 尝试从原始行中提取文本（可能是纯文本响应）
          if (line.length > 0 && !line.startsWith('{')) {
            logger.info(`Treating line as plain text: ${lineSample}`);
            fullText += line + '\n';
          }
        }
      }
    }

    logger.info(`Parsed ${parsedLines} lines successfully, ${failedLines} lines failed, result length: ${fullText.length}`);
    
    // 如果结果太短，记录警告
    if (fullText.length < 500) {
      logger.warning(`Enhanced prompt result is suspiciously short (${fullText.length} chars): ${fullText.substring(0, 200)}`);
      
      // 检查是否是账号暂停消息
      if (fullText.includes('suspended') || fullText.includes('purchase a subscription')) {
        logger.error('Account suspended! Please purchase a subscription at https://app.augmentcode.com/account');
        throw new Error('Account suspended. Please purchase a subscription to continue using the service.');
      }
    }

    return fullText;
  }

  /**
   * 重试请求（带指数退避）
   * @param fn - 要执行的异步函数
   * @param maxRetries - 最大重试次数
   * @param retryDelay - 初始重试延迟（毫秒）
   * @returns 函数执行结果
   */
  private async retryRequest<T>(
    fn: () => Promise<T>,
    maxRetries: number,
    retryDelay: number
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // 检查是否为可重试错误
        const isRetryable = this.isRetryableError(error);

        if (!isRetryable || attempt === maxRetries) {
          // 不可重试或已达最大重试次数
          throw error;
        }

        // 计算指数退避延迟
        const delay = retryDelay * Math.pow(2, attempt);

        logger.warning(
          `Request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms: ${
            lastError.message
          }`
        );

        // 等待后重试
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // 理论上不会到达这里，但为了类型安全
    throw lastError || new Error('Request failed after retries');
  }

  /**
   * 判断错误是否可重试
   * @param error - 错误对象
   * @returns 是否可重试
   */
  private isRetryableError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // 检查网络错误
      if (axiosError.code === 'ECONNREFUSED' || 
          axiosError.code === 'ETIMEDOUT' || 
          axiosError.code === 'ENOTFOUND') {
        return true;
      }

      // 检查 HTTP 5xx 错误
      const status = axiosError.response?.status;
      if (status && status >= 500 && status < 600) {
        return true;
      }
    }

    return false;
  }

  /**
   * 构建选中文件的代码内容
   * @param projectPath - 项目路径
   * @param selectedFiles - 选中的文件路径列表
   * @returns 拼接后的代码内容
   */
  private async buildSelectedCode(projectPath: string, selectedFiles: string[]): Promise<string> {
    if (!selectedFiles || selectedFiles.length === 0) {
      return '';
    }

    const fs = await import('fs/promises');
    const path = await import('path');
    const codes: string[] = [];

    for (const filePath of selectedFiles) {
      try {
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(projectPath, filePath);
        const content = await fs.readFile(fullPath, 'utf-8');
        codes.push(`// File: ${filePath}\n${content}\n`);
        logger.info(`Read file for selected_code: ${filePath} (${content.length} chars)`);
      } catch (error) {
        logger.warning(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : 'unknown'}`);
        // 继续处理其他文件
      }
    }

    return codes.join('\n---\n\n');
  }

  /**
   * 构建用户指南内容
   * @param projectPath - 项目路径
   * @param userGuidelines - 用户指南选项
   * @param customGuidelinePath - 自定义指南路径
   * @returns 用户指南内容
   */
  private async buildUserGuidelines(
    projectPath: string,
    userGuidelines: string,
    customGuidelinePath?: string
  ): Promise<string> {
    if (userGuidelines === 'none') {
      return '';
    }

    const fs = await import('fs/promises');
    const path = await import('path');
    const guidelines: string[] = [];

    if (userGuidelines === 'claude-agents') {
      // 读取 CLAUDE.md 和 AGENTS.md
      const files = ['CLAUDE.md', 'AGENTS.md', '.claude.md', '.agents.md'];
      for (const file of files) {
        try {
          const fullPath = path.join(projectPath, file);
          const content = await fs.readFile(fullPath, 'utf-8');
          guidelines.push(`// ${file}\n${content}\n`);
          logger.info(`Read guideline file: ${file} (${content.length} chars)`);
        } catch (error) {
          // 文件不存在，跳过
          logger.info(`Guideline file not found: ${file}`);
        }
      }
    } else if (userGuidelines === 'custom' && customGuidelinePath) {
      // 读取自定义指南文件
      try {
        const fullPath = path.isAbsolute(customGuidelinePath) 
          ? customGuidelinePath 
          : path.join(projectPath, customGuidelinePath);
        const content = await fs.readFile(fullPath, 'utf-8');
        guidelines.push(content);
        logger.info(`Read custom guideline: ${customGuidelinePath} (${content.length} chars)`);
      } catch (error) {
        logger.warning(`Failed to read custom guideline ${customGuidelinePath}: ${error instanceof Error ? error.message : 'unknown'}`);
      }
    }

    return guidelines.join('\n---\n\n');
  }

  /**
   * 构建工作区指南内容
   * @param projectPath - 项目路径
   * @param includeReadme - 是否包含 README
   * @returns 工作区指南内容
   */
  private async buildWorkspaceGuidelines(projectPath: string, includeReadme: boolean): Promise<string> {
    if (!includeReadme) {
      return '';
    }

    const fs = await import('fs/promises');
    const path = await import('path');
    const guidelines: string[] = [];

    // 读取 README.md
    const readmeFiles = ['README.md', 'readme.md', 'Readme.md', 'README.MD'];
    for (const file of readmeFiles) {
      try {
        const fullPath = path.join(projectPath, file);
        const content = await fs.readFile(fullPath, 'utf-8');
        guidelines.push(content);
        logger.info(`Read README: ${file} (${content.length} chars)`);
        break; // 只读取第一个找到的 README
      } catch (error) {
        // 文件不存在，尝试下一个
      }
    }

    return guidelines.join('\n');
  }

  /**
   * 构建用户引导的 blobs 列表
   * @param selectedFiles - 选中的文件路径列表
   * @returns blobs 列表
   */
  private buildUserGuidedBlobs(selectedFiles: string[]): any[] {
    if (!selectedFiles || selectedFiles.length === 0) {
      return [];
    }

    return selectedFiles.map(filePath => ({
      path: filePath,
      type: 'file',
      // 可以添加其他元数据
    }));
  }

  /**
   * 构建 OpenAI 格式的请求 Payload
   * @param request - Enhance Prompt 请求
   * @returns OpenAI 请求 Payload
   */
  private async buildOpenAIPayload(request: EnhancePromptRequest): Promise<OpenAIRequestPayload> {
    const {
      projectPath,
      originalMessage,
      model = 'gpt-4',
      selectedFiles = [],
      userGuidelines = 'none',
      customGuidelinePath,
      includeReadme = false
    } = request;

    logger.info(`Building OpenAI payload for project: ${projectPath}`);

    // 生成项目目录树（最大深度 2 级）
    const projectTree = await this.generateProjectTree(projectPath, 2);
    const treeLines = projectTree ? projectTree.split('\n').length : 0;

    // 构建系统消息的各个部分
    const systemMessageParts: string[] = [];

    // 1. 系统提示词
    if (this.systemPrompt && this.systemPrompt.trim()) {
      systemMessageParts.push(this.systemPrompt);
      logger.info(`Added system prompt to context (${this.systemPrompt.length} chars)`);
    }

    // 2. 项目上下文
    systemMessageParts.push('---\n');
    systemMessageParts.push('Project Context:');
    systemMessageParts.push(`- Project Path: ${projectPath}`);
    
    if (selectedFiles.length > 0) {
      systemMessageParts.push(`- Selected Files: ${selectedFiles.join(', ')}`);
    }

    // 3. 项目目录树
    if (projectTree && projectTree.trim()) {
      systemMessageParts.push('\nProject Structure (2 levels):');
      systemMessageParts.push('```');
      systemMessageParts.push(projectTree);
      systemMessageParts.push('```');
      logger.info(`Added project tree to context (${projectTree.split('\n').length} lines)`);
    }

    // 4. 附加信息（inject code）
    if (this.injectCode && this.injectCode.trim()) {
      systemMessageParts.push('\n---\n');
      systemMessageParts.push(this.injectCode);
      logger.info(`Added inject code to context (${this.injectCode.length} chars)`);
    }

    // 5. 用户指南（CLAUDE.md / AGENTS.md / Custom）
    const userGuidelinesContent = await this.buildUserGuidelines(projectPath, userGuidelines, customGuidelinePath);
    if (userGuidelinesContent && userGuidelinesContent.trim()) {
      systemMessageParts.push('\n---\n');
      systemMessageParts.push('User Guidelines:');
      systemMessageParts.push(userGuidelinesContent);
      logger.info(`Added user guidelines to context (${userGuidelinesContent.length} chars, option: ${userGuidelines})`);
    } else {
      logger.info(`No user guidelines added (option: ${userGuidelines})`);
    }

    // 6. 工作区指南（README）
    const workspaceGuidelinesContent = await this.buildWorkspaceGuidelines(projectPath, includeReadme);
    if (workspaceGuidelinesContent && workspaceGuidelinesContent.trim()) {
      systemMessageParts.push('\n---\n');
      systemMessageParts.push('Workspace Guidelines (README):');
      systemMessageParts.push(workspaceGuidelinesContent);
      logger.info(`Added workspace guidelines (README) to context (${workspaceGuidelinesContent.length} chars)`);
    } else {
      logger.info(`No workspace guidelines (README) added (includeReadme: ${includeReadme})`);
    }

    // 7. 选中文件内容
    const selectedCode = await this.buildSelectedCode(projectPath, selectedFiles);
    if (selectedCode && selectedCode.trim()) {
      systemMessageParts.push('\n---\n');
      systemMessageParts.push('Selected Files Content:');
      systemMessageParts.push(selectedCode);
      logger.info(`Added selected files content to context (${selectedFiles.length} files, ${selectedCode.length} chars)`);
    } else {
      logger.info(`No selected files content added (${selectedFiles.length} files selected)`);
    }

    // 拼接系统消息
    const systemMessageContent = systemMessageParts.join('\n').trim();

    // 构建消息数组
    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: systemMessageContent
      },
      {
        role: 'user',
        content: originalMessage
      }
    ];

    // 计算统计信息
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    const messageCount = messages.length;

    // 记录 payload 构建日志
    logger.info(`OpenAI payload built successfully:`);
    logger.info(`  - Messages: ${messageCount}`);
    logger.info(`  - Total characters: ${totalChars}`);
    logger.info(`  - Project tree lines: ${treeLines}`);
    logger.info(`  - System message length: ${systemMessageContent.length} chars`);
    logger.info(`  - User message length: ${originalMessage.length} chars`);
    logger.info(`  - Selected files: ${selectedFiles.length}`);
    logger.info(`  - User guidelines: ${userGuidelinesContent.length} chars`);
    logger.info(`  - Workspace guidelines: ${workspaceGuidelinesContent.length} chars`);

    // 构建完整的 payload
    const payload: OpenAIRequestPayload = {
      model,
      messages,
      temperature: 0.7,
      stream: false
    };

    return payload;
  }

  /**
   * 调用 OpenAI 兼容 API
   * @param request - Enhance Prompt 请求
   * @returns 增强后的消息响应
   */
  private async callOpenAIApi(request: EnhancePromptRequest): Promise<EnhancePromptResponse> {
    const { projectPath, originalMessage, model = 'gpt-4' } = request;
    const startTime = Date.now();

    logger.info(`Calling OpenAI-compatible API for project: ${projectPath}, model: ${model}`);

    try {
      // 构建 OpenAI 格式的 payload
      const payload = await this.buildOpenAIPayload(request);

      // 自动补全 /v1/chat/completions 端点路径
      let endpoint = '/v1/chat/completions';
      const baseUrl = this.httpClient.defaults.baseURL || '';
      
      // 检查 baseURL 是否已经包含 /v1/chat/completions 路径
      if (baseUrl.includes('/v1/chat/completions')) {
        // 如果已包含，使用空路径（避免重复）
        endpoint = '';
        logger.info(`Base URL already contains /v1/chat/completions, using empty endpoint`);
      } else if (baseUrl.includes('/chat/completions')) {
        // 如果包含 /chat/completions 但没有 /v1，补全 /v1
        endpoint = '/v1/chat/completions';
        logger.info(`Base URL contains /chat/completions, using full endpoint: ${endpoint}`);
      } else {
        logger.info(`Auto-completing endpoint path: ${endpoint}`);
      }

      // 记录 API 调用信息
      logger.info(`OpenAI API call details:`);
      logger.info(`  - Endpoint: ${baseUrl}${endpoint}`);
      logger.info(`  - Model: ${payload.model}`);
      logger.info(`  - Messages: ${payload.messages.length}`);
      logger.info(`  - Temperature: ${payload.temperature}`);
      logger.info(`  - Stream: ${payload.stream}`);

      // 记录请求头（隐藏敏感信息）
      const headers = this.httpClient.defaults.headers;
      const headerKeys = Object.keys(headers);
      logger.info(`  - Request headers: ${headerKeys.length} header(s)`);
      for (const key of headerKeys) {
        const value = headers[key];
        const maskedValue = key.toLowerCase().includes('auth') || 
                           key.toLowerCase().includes('key') || 
                           key.toLowerCase().includes('token')
          ? '***'
          : String(value).substring(0, 20) + (String(value).length > 20 ? '...' : '');
        logger.debug(`    ${key}: ${maskedValue}`);
      }

      // 使用重试机制调用 API
      const response = await this.retryRequest(async () => {
        return await this.httpClient.post(endpoint, payload, {
          timeout: this.apiTimeout, // 使用配置的超时时间
        });
      }, 3, 1000);

      // 记录响应状态
      logger.info(`OpenAI API response received:`);
      logger.info(`  - Status: ${response.status} ${response.statusText}`);
      logger.info(`  - Response data type: ${typeof response.data}`);

      // 解析响应
      const enhancedPrompt = this.parseOpenAIResponse(response.data);

      const duration = Date.now() - startTime;
      logger.info(`OpenAI API call completed successfully in ${duration}ms, enhanced length=${enhancedPrompt.length}`);

      // 生成项目树用于前端预览
      let projectTree = '';
      try {
        projectTree = await this.generateProjectTree(projectPath, 2);
      } catch (error: any) {
        logger.warning(`Failed to generate project tree for response: ${error.message}`);
      }

      // 返回标准化结果
      return {
        enhancedPrompt,
        originalMessage,
        projectPath,
        model: payload.model,
        projectTree,
        systemPrompt: payload.messages[0].content, // 返回完整的系统提示词
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;
        const statusText = axiosError.response?.statusText;
        const message = axiosError.message;
        const code = axiosError.code;

        // 详细的错误日志
        logger.exception(
          `Failed to call OpenAI API after ${duration}ms: ${message} (status: ${status || 'unknown'}, code: ${code || 'unknown'})`,
          error as Error
        );

        // 记录响应数据（如果有）
        if (axiosError.response?.data) {
          const errorData = axiosError.response.data;
          logger.error(`Error response data: ${JSON.stringify(errorData).substring(0, 500)}`);
        }

        // 根据错误类型提供更具体的错误消息
        if (code === 'ECONNREFUSED') {
          throw new Error('Failed to connect to OpenAI-compatible API: Connection refused');
        } else if (code === 'ETIMEDOUT') {
          throw new Error('Failed to connect to OpenAI-compatible API: Connection timeout');
        } else if (code === 'ENOTFOUND') {
          throw new Error('Failed to connect to OpenAI-compatible API: Host not found');
        } else if (status === 401) {
          throw new Error('Authentication failed: Invalid or expired API key');
        } else if (status === 403) {
          throw new Error('Access forbidden: Insufficient permissions');
        } else if (status === 404) {
          throw new Error('API endpoint not found: /v1/chat/completions');
        } else if (status === 429) {
          throw new Error('Rate limit exceeded: Too many requests');
        } else if (status && status >= 500) {
          throw new Error(`OpenAI API error: ${statusText || 'Internal server error'} (HTTP ${status})`);
        } else {
          throw new Error(
            `Failed to call OpenAI API: ${message}${status ? ` (HTTP ${status})` : ''}`
          );
        }
      }

      logger.exception(`Unexpected error calling OpenAI API after ${duration}ms`, error as Error);
      throw error;
    }
  }

  /**
   * 解析 OpenAI 格式的响应
   * @param response - OpenAI API 响应
   * @returns 增强后的提示词内容
   */
  private parseOpenAIResponse(response: any): string {
    logger.info('Parsing OpenAI response');

    try {
      // 验证响应对象存在
      if (!response) {
        logger.error('OpenAI response is null or undefined');
        throw new Error('Invalid OpenAI response: response is null or undefined');
      }

      // 检查是否有错误响应
      if (response.error) {
        const errorMessage = response.error.message || response.error.code || 'Unknown error';
        logger.error(`OpenAI API returned error: ${errorMessage}`);
        throw new Error(`OpenAI API error: ${errorMessage}`);
      }

      // 验证 choices 数组存在且有效
      if (!response.choices) {
        logger.error('OpenAI response missing choices field');
        logger.error(`Response structure: ${JSON.stringify(response).substring(0, 500)}`);
        throw new Error('Invalid OpenAI response: missing choices array');
      }

      if (!Array.isArray(response.choices)) {
        logger.error(`OpenAI response choices is not an array: ${typeof response.choices}`);
        logger.error(`Response structure: ${JSON.stringify(response).substring(0, 500)}`);
        throw new Error('Invalid OpenAI response: choices is not an array');
      }

      if (response.choices.length === 0) {
        logger.error('OpenAI response choices array is empty');
        logger.error(`Response structure: ${JSON.stringify(response).substring(0, 500)}`);
        throw new Error('Invalid OpenAI response: choices array is empty');
      }

      // 提取第一个 choice 的消息内容
      const firstChoice = response.choices[0];
      
      if (!firstChoice) {
        logger.error('First choice is null or undefined');
        throw new Error('Invalid OpenAI response: first choice is null');
      }

      if (!firstChoice.message) {
        logger.error('First choice missing message field');
        logger.error(`Choice structure: ${JSON.stringify(firstChoice).substring(0, 500)}`);
        throw new Error('Invalid OpenAI response: choice missing message field');
      }

      const content = firstChoice.message.content;

      // 验证内容存在且非空
      if (content === null || content === undefined) {
        logger.error('Message content is null or undefined');
        logger.error(`Message structure: ${JSON.stringify(firstChoice.message).substring(0, 500)}`);
        throw new Error('Invalid OpenAI response: message content is null or undefined');
      }

      if (typeof content !== 'string') {
        logger.error(`Message content is not a string: ${typeof content}`);
        throw new Error(`Invalid OpenAI response: message content is not a string (type: ${typeof content})`);
      }

      if (content.trim() === '') {
        logger.error('Message content is empty string');
        throw new Error('Empty content in OpenAI response');
      }

      // 记录成功解析的日志
      logger.info(`Successfully parsed OpenAI response:`);
      logger.info(`  - Content length: ${content.length} chars`);
      logger.info(`  - Choice index: ${firstChoice.index ?? 0}`);
      logger.info(`  - Finish reason: ${firstChoice.finish_reason || 'unknown'}`);
      
      // 如果有 usage 信息，记录 token 使用情况
      if (response.usage) {
        logger.info(`  - Token usage: prompt=${response.usage.prompt_tokens || 0}, completion=${response.usage.completion_tokens || 0}, total=${response.usage.total_tokens || 0}`);
      }

      // 记录内容预览（前 200 字符）
      const preview = content.length > 200 ? content.substring(0, 200) + '...' : content;
      logger.info(`  - Content preview: ${preview}`);

      return content;
    } catch (error) {
      // 如果是我们抛出的错误，直接重新抛出
      if (error instanceof Error && (error.message.startsWith('Invalid OpenAI response') || error.message.startsWith('Empty content') || error.message.startsWith('OpenAI API error'))) {
        throw error;
      }

      // 其他未预期的错误
      logger.exception('Unexpected error parsing OpenAI response', error as Error);
      throw new Error(`Failed to parse OpenAI response: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }
}
