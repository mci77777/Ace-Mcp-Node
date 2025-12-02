/**
 * Codebase MCP 服务器的配置管理
 * 从 ~/.codebase-mcp/settings.toml 读取配置
 * 
 * 支持多种环境：
 * - 普通 Node.js 运行
 * - pkg 打包后的 exe
 * - Electron 应用
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import * as toml from '@iarna/toml';

/**
 * 获取用户主目录（兼容 pkg 打包环境）
 * 在 pkg 打包后，os.homedir() 可能返回错误的路径
 */
function getHomeDir(): string {
  // 优先使用环境变量（Windows）
  if (process.platform === 'win32') {
    // Windows 环境变量优先级：USERPROFILE > HOMEDRIVE+HOMEPATH > os.homedir()
    if (process.env.USERPROFILE && fs.existsSync(process.env.USERPROFILE)) {
      return process.env.USERPROFILE;
    }
    if (process.env.HOMEDRIVE && process.env.HOMEPATH) {
      const homePath = path.join(process.env.HOMEDRIVE, process.env.HOMEPATH);
      if (fs.existsSync(homePath)) {
        return homePath;
      }
    }
  } else {
    // Unix/Linux/macOS
    if (process.env.HOME && fs.existsSync(process.env.HOME)) {
      return process.env.HOME;
    }
  }
  
  // 回退到 os.homedir()
  return os.homedir();
}

/**
 * 配置选项接口
 */
export interface ConfigOptions {
  baseUrl?: string;
  token?: string;
  enhanceBaseUrl?: string;
  enhanceToken?: string;
  batchSize?: number;
  maxLinesPerBlob?: number;
  textExtensions?: Set<string>;
  excludePatterns?: string[];
  webPort?: number;
  apiTimeout?: number;
  customHeaders?: Record<string, string>;
  model?: string;
  customModel?: string;
}

/**
 * 默认配置值
 */
const DEFAULT_CONFIG = {
  BATCH_SIZE: 10,
  MAX_LINES_PER_BLOB: 800,
  BASE_URL: 'https://api.example.com',
  TOKEN: 'your-token-here',
  ENHANCE_BASE_URL: 'https://api.openai.com',
  ENHANCE_TOKEN: 'your-enhance-token-here',
  WEB_PORT: 8090,
  API_TIMEOUT: 120000, // 120 seconds
  CUSTOM_HEADERS: {},
  TEXT_EXTENSIONS: [
    '.py',
    '.js',
    '.ts',
    '.jsx',
    '.tsx',
    '.java',
    '.go',
    '.rs',
    '.cpp',
    '.c',
    '.h',
    '.hpp',
    '.cs',
    '.rb',
    '.php',
    '.md',
    '.txt',
    '.json',
    '.yaml',
    '.yml',
    '.toml',
    '.xml',
    '.html',
    '.css',
    '.scss',
    '.sql',
    '.sh',
    '.bash',
  ],
  EXCLUDE_PATTERNS: [
    '.venv',
    'venv',
    '.env',
    'env',
    'node_modules',
    '.git',
    '.svn',
    '.hg',
    '__pycache__',
    '.pytest_cache',
    '.mypy_cache',
    '.tox',
    '.eggs',
    '*.egg-info',
    'dist',
    'build',
    '.idea',
    '.vscode',
    '.DS_Store',
    '*.pyc',
    '*.pyo',
    '*.pyd',
    '.Python',
    'pip-log.txt',
    'pip-delete-this-directory.txt',
    '.coverage',
    'htmlcov',
    '.gradle',
    'target',
    'bin',
    'obj',
  ],
};

/**
 * 用户配置和数据路径
 * 使用 getHomeDir() 确保在 pkg 打包环境中也能正确获取路径
 */
const HOME_DIR = getHomeDir();
export const USER_CONFIG_DIR = path.join(HOME_DIR, '.codebase-mcp');
export const USER_CONFIG_FILE = path.join(USER_CONFIG_DIR, 'settings.toml');
export const USER_DATA_DIR = path.join(USER_CONFIG_DIR, 'data');

/**
 * 获取配置目录路径（用于调试）
 */
export function getConfigPaths(): { homeDir: string; configDir: string; configFile: string; dataDir: string } {
  return {
    homeDir: HOME_DIR,
    configDir: USER_CONFIG_DIR,
    configFile: USER_CONFIG_FILE,
    dataDir: USER_DATA_DIR,
  };
}

/**
 * 确保用户配置文件存在
 * @returns 配置文件路径
 */
function ensureUserConfig(): string {
  // 创建配置目录
  if (!fs.existsSync(USER_CONFIG_DIR)) {
    fs.mkdirSync(USER_CONFIG_DIR, { recursive: true });
  }

  // 创建数据目录
  if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  }

  // 如果不存在则创建配置文件
  if (!fs.existsSync(USER_CONFIG_FILE)) {
    const configContent = toml.stringify(DEFAULT_CONFIG as any);
    fs.writeFileSync(USER_CONFIG_FILE, configContent, 'utf-8');
  }

  return USER_CONFIG_FILE;
}

/**
 * 检查是否为首次运行
 * @returns 是否为首次运行
 */
export function isFirstRun(): boolean {
  const firstRunMarker = path.join(USER_CONFIG_DIR, '.first_run_completed');
  return !fs.existsSync(firstRunMarker);
}

/**
 * 标记首次运行已完成
 */
export function markFirstRunCompleted(): void {
  const firstRunMarker = path.join(USER_CONFIG_DIR, '.first_run_completed');
  fs.writeFileSync(firstRunMarker, new Date().toISOString(), 'utf-8');
}

/**
 * MCP 服务器配置类
 */
export class Config {
  private cliBaseUrl?: string;
  private cliToken?: string;
  private cliWebPort?: number;
  private logFunction: (message: string, level?: string) => void;

  indexStoragePath: string;
  batchSize: number;
  maxLinesPerBlob: number;
  baseUrl: string;
  token: string;
  enhanceBaseUrl: string;
  enhanceToken: string;
  model: string;
  customModel: string;
  webPort: number;
  apiTimeout: number;
  customHeaders: Record<string, string>;
  textExtensions: Set<string>;
  excludePatterns: string[];

  constructor(overrides?: Partial<ConfigOptions>) {
    // 设置日志函数（默认使用 console）
    this.logFunction = (message: string, level: string = 'info') => {
      if (level === 'warning') {
        console.warn(message);
      } else if (level === 'debug') {
        console.debug(message);
      } else {
        console.log(message);
      }
    };

    this.cliBaseUrl = overrides?.baseUrl;
    this.cliToken = overrides?.token;
    this.cliWebPort = overrides?.webPort;

    // 确保配置文件存在
    ensureUserConfig();

    // 加载配置
    this.indexStoragePath = USER_DATA_DIR;
    const settings = this.loadSettings();

    this.batchSize = overrides?.batchSize ?? settings.BATCH_SIZE ?? DEFAULT_CONFIG.BATCH_SIZE;
    this.maxLinesPerBlob = overrides?.maxLinesPerBlob ?? settings.MAX_LINES_PER_BLOB ?? DEFAULT_CONFIG.MAX_LINES_PER_BLOB;
    this.baseUrl = overrides?.baseUrl || settings.BASE_URL || DEFAULT_CONFIG.BASE_URL;
    this.token = overrides?.token || settings.TOKEN || DEFAULT_CONFIG.TOKEN;
    this.enhanceBaseUrl = overrides?.enhanceBaseUrl || settings.ENHANCE_BASE_URL || DEFAULT_CONFIG.ENHANCE_BASE_URL;
    this.enhanceToken = overrides?.enhanceToken || settings.ENHANCE_TOKEN || DEFAULT_CONFIG.ENHANCE_TOKEN;
    this.model = overrides?.model || settings.MODEL || '';
    this.customModel = overrides?.customModel || settings.CUSTOM_MODEL || '';
    this.webPort = overrides?.webPort ?? settings.WEB_PORT ?? DEFAULT_CONFIG.WEB_PORT;
    this.apiTimeout = overrides?.apiTimeout ?? settings.API_TIMEOUT ?? DEFAULT_CONFIG.API_TIMEOUT;
    this.customHeaders = overrides?.customHeaders ?? this.loadAndValidateCustomHeaders(settings.CUSTOM_HEADERS);
    this.textExtensions = overrides?.textExtensions ?? new Set(settings.TEXT_EXTENSIONS ?? DEFAULT_CONFIG.TEXT_EXTENSIONS);
    this.excludePatterns = overrides?.excludePatterns ?? settings.EXCLUDE_PATTERNS ?? DEFAULT_CONFIG.EXCLUDE_PATTERNS;
    
    // 记录配置来源
    this.logConfigSources(overrides, settings);
  }

  /**
   * 设置日志函数（用于集成外部日志系统）
   */
  setLogger(logFunction: (message: string, level?: string) => void): void {
    this.logFunction = logFunction;
  }
  
  /**
   * 记录配置来源
   */
  private logConfigSources(
    overrides?: Partial<ConfigOptions>,
    settings?: any
  ): void {
    const sources: string[] = [];
    
    if (overrides?.baseUrl) {
      sources.push('BASE_URL (override)');
    }
    if (overrides?.token) {
      sources.push('TOKEN (override)');
    }
    if (overrides?.webPort !== undefined) {
      sources.push(`WEB_PORT (override: ${overrides.webPort})`);
    }
    
    if (sources.length > 0) {
      this.logFunction(`Configuration overrides: ${sources.join(', ')}`, 'info');
    }
    
    this.logFunction(`Configuration loaded from: ${USER_CONFIG_FILE}`, 'info');
  }

  /**
   * 从 TOML 文件加载设置
   */
  private loadSettings(): any {
    try {
      // 检查配置文件是否存在
      if (!fs.existsSync(USER_CONFIG_FILE)) {
        this.logFunction(`Configuration file not found: ${USER_CONFIG_FILE}`, 'warning');
        this.logFunction(`Home directory detected: ${HOME_DIR}`, 'info');
        this.logFunction(`Environment: USERPROFILE=${process.env.USERPROFILE}, HOME=${process.env.HOME}`, 'debug');
        return {};
      }
      
      const content = fs.readFileSync(USER_CONFIG_FILE, 'utf-8');
      const settings = toml.parse(content);
      // 移除重复的日志输出，配置加载信息由 logConfigSources() 统一输出
      return settings;
    } catch (error: any) {
      // 加载失败时记录详细错误
      this.logFunction(`Failed to load configuration: ${error.message}`, 'warning');
      this.logFunction(`Config file path: ${USER_CONFIG_FILE}`, 'warning');
      this.logFunction(`File exists: ${fs.existsSync(USER_CONFIG_FILE)}`, 'warning');
      return {};
    }
  }

  /**
   * 加载并验证自定义请求头
   */
  private loadAndValidateCustomHeaders(customHeaders?: any): Record<string, string> {
    // 如果没有配置自定义请求头，返回空对象
    if (!customHeaders) {
      return {};
    }

    // 验证是否为对象
    if (typeof customHeaders !== 'object' || Array.isArray(customHeaders)) {
      this.logFunction('CUSTOM_HEADERS must be an object, ignoring invalid configuration', 'warning');
      return {};
    }

    // 验证并过滤有效的请求头
    const validHeaders: Record<string, string> = {};
    let invalidCount = 0;

    for (const [key, value] of Object.entries(customHeaders)) {
      // 验证键和值都是字符串
      if (typeof key === 'string' && typeof value === 'string') {
        // 验证请求头名称格式（基本验证：非空且不包含非法字符）
        if (key.trim() && !key.includes('\n') && !key.includes('\r')) {
          validHeaders[key] = value;
        } else {
          invalidCount++;
          this.logFunction(`Invalid header name: "${key}", skipping`, 'warning');
        }
      } else {
        invalidCount++;
        this.logFunction(`Invalid header format for "${key}": value must be a string, skipping`, 'warning');
      }
    }

    // 记录加载的自定义请求头数量
    const validCount = Object.keys(validHeaders).length;
    if (validCount > 0) {
      this.logFunction(`Loaded ${validCount} custom header(s)`, 'info');
      
      // 记录请求头名称（隐藏敏感值）
      for (const key of Object.keys(validHeaders)) {
        const maskedValue = key.toLowerCase().includes('auth') || 
                           key.toLowerCase().includes('key') || 
                           key.toLowerCase().includes('token')
          ? '***'
          : validHeaders[key].substring(0, 10) + (validHeaders[key].length > 10 ? '...' : '');
        this.logFunction(`  ${key}: ${maskedValue}`, 'debug');
      }
    }

    if (invalidCount > 0) {
      this.logFunction(`Skipped ${invalidCount} invalid custom header(s)`, 'warning');
    }

    return validHeaders;
  }

  /**
   * 从文件重新加载配置
   */
  reload(): void {
    const settings = this.loadSettings();

    this.indexStoragePath = USER_DATA_DIR;
    this.batchSize = settings.BATCH_SIZE ?? DEFAULT_CONFIG.BATCH_SIZE;
    this.maxLinesPerBlob = settings.MAX_LINES_PER_BLOB ?? DEFAULT_CONFIG.MAX_LINES_PER_BLOB;
    this.baseUrl = this.cliBaseUrl || settings.BASE_URL || DEFAULT_CONFIG.BASE_URL;
    this.token = this.cliToken || settings.TOKEN || DEFAULT_CONFIG.TOKEN;
    this.enhanceBaseUrl = settings.ENHANCE_BASE_URL || DEFAULT_CONFIG.ENHANCE_BASE_URL;
    this.enhanceToken = settings.ENHANCE_TOKEN || DEFAULT_CONFIG.ENHANCE_TOKEN;
    this.model = settings.MODEL || '';
    this.customModel = settings.CUSTOM_MODEL || '';
    this.webPort = this.cliWebPort ?? settings.WEB_PORT ?? DEFAULT_CONFIG.WEB_PORT;
    this.apiTimeout = settings.API_TIMEOUT ?? DEFAULT_CONFIG.API_TIMEOUT;
    this.customHeaders = this.loadAndValidateCustomHeaders(settings.CUSTOM_HEADERS);
    this.textExtensions = new Set(settings.TEXT_EXTENSIONS ?? DEFAULT_CONFIG.TEXT_EXTENSIONS);
    this.excludePatterns = settings.EXCLUDE_PATTERNS ?? DEFAULT_CONFIG.EXCLUDE_PATTERNS;
  }

  /**
   * 验证配置
   * @throws {Error} 如果配置无效
   */
  validate(): void {
    const errors: string[] = [];

    // 验证必填字段
    if (!this.baseUrl || this.baseUrl === DEFAULT_CONFIG.BASE_URL) {
      errors.push('BASE_URL must be configured (current value is default placeholder)');
    }
    if (!this.token || this.token === DEFAULT_CONFIG.TOKEN) {
      errors.push('TOKEN must be configured (current value is default placeholder)');
    }

    // 验证字段类型和范围
    if (typeof this.batchSize !== 'number' || this.batchSize <= 0) {
      errors.push('BATCH_SIZE must be a positive number');
    }
    if (typeof this.maxLinesPerBlob !== 'number' || this.maxLinesPerBlob <= 0) {
      errors.push('MAX_LINES_PER_BLOB must be a positive number');
    }
    if (typeof this.webPort !== 'number' || this.webPort < 1 || this.webPort > 65535) {
      errors.push('WEB_PORT must be a number between 1 and 65535');
    }
    if (typeof this.apiTimeout !== 'number' || this.apiTimeout <= 0) {
      errors.push('API_TIMEOUT must be a positive number');
    }

    // 验证 URL 格式
    try {
      new URL(this.baseUrl);
    } catch {
      errors.push('BASE_URL must be a valid URL');
    }

    try {
      new URL(this.enhanceBaseUrl);
    } catch {
      errors.push('ENHANCE_BASE_URL must be a valid URL');
    }

    // 如果有错误，抛出异常
    if (errors.length > 0) {
      throw new Error(
        `Configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}\n\n` +
        `Please check your configuration file at: ${USER_CONFIG_FILE}`
      );
    }
  }
}

/**
 * 全局配置实例
 */
let configInstance: Config | undefined;

/**
 * 获取全局配置实例
 * @returns 配置实例
 */
export function getConfig(): Config {
  if (!configInstance) {
    configInstance = new Config();
  }
  return configInstance;
}

/**
 * 使用选项初始化配置
 * @param overrides 配置覆盖选项
 * @returns 配置实例
 */
export function initConfig(overrides?: Partial<ConfigOptions>): Config {
  configInstance = new Config(overrides);
  return configInstance;
}
