/**
 * acemcp MCP 服务器的配置管理
 * 从 ~/.acemcp/settings.toml 读取配置
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import * as toml from '@iarna/toml';
import { logger } from './logger.js';

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
 */
export const USER_CONFIG_DIR = path.join(os.homedir(), '.acemcp');
export const USER_CONFIG_FILE = path.join(USER_CONFIG_DIR, 'settings.toml');
export const USER_DATA_DIR = path.join(USER_CONFIG_DIR, 'data');

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

  constructor(baseUrl?: string, token?: string, webPort?: number) {
    this.cliBaseUrl = baseUrl;
    this.cliToken = token;
    this.cliWebPort = webPort;

    // 确保配置文件存在
    ensureUserConfig();

    // 加载配置
    this.indexStoragePath = USER_DATA_DIR;
    const settings = this.loadSettings();

    this.batchSize = settings.BATCH_SIZE ?? DEFAULT_CONFIG.BATCH_SIZE;
    this.maxLinesPerBlob = settings.MAX_LINES_PER_BLOB ?? DEFAULT_CONFIG.MAX_LINES_PER_BLOB;
    this.baseUrl = baseUrl || settings.BASE_URL || DEFAULT_CONFIG.BASE_URL;
    this.token = token || settings.TOKEN || DEFAULT_CONFIG.TOKEN;
    this.enhanceBaseUrl = settings.ENHANCE_BASE_URL || DEFAULT_CONFIG.ENHANCE_BASE_URL;
    this.enhanceToken = settings.ENHANCE_TOKEN || DEFAULT_CONFIG.ENHANCE_TOKEN;
    this.model = settings.MODEL || '';
    this.customModel = settings.CUSTOM_MODEL || '';
    this.webPort = webPort ?? settings.WEB_PORT ?? DEFAULT_CONFIG.WEB_PORT;
    this.apiTimeout = settings.API_TIMEOUT ?? DEFAULT_CONFIG.API_TIMEOUT;
    this.customHeaders = this.loadAndValidateCustomHeaders(settings.CUSTOM_HEADERS);
    this.textExtensions = new Set(settings.TEXT_EXTENSIONS ?? DEFAULT_CONFIG.TEXT_EXTENSIONS);
    this.excludePatterns = settings.EXCLUDE_PATTERNS ?? DEFAULT_CONFIG.EXCLUDE_PATTERNS;
    
    // 记录配置来源
    this.logConfigSources(baseUrl, token, webPort, settings);
  }
  
  /**
   * 记录配置来源
   */
  private logConfigSources(
    cliBaseUrl?: string,
    cliToken?: string,
    cliWebPort?: number,
    settings?: any
  ): void {
    const sources: string[] = [];
    
    if (cliBaseUrl) {
      sources.push('BASE_URL (CLI override)');
    }
    if (cliToken) {
      sources.push('TOKEN (CLI override)');
    }
    if (cliWebPort !== undefined) {
      sources.push(`WEB_PORT (CLI override: ${cliWebPort})`);
    }
    
    if (sources.length > 0) {
      logger.info(`Configuration overrides: ${sources.join(', ')}`);
    }
    
    logger.info(`Configuration loaded from: ${USER_CONFIG_FILE}`);
  }

  /**
   * 从 TOML 文件加载设置
   */
  private loadSettings(): any {
    try {
      const content = fs.readFileSync(USER_CONFIG_FILE, 'utf-8');
      return toml.parse(content);
    } catch (error) {
      // 加载失败时使用默认值
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
      logger.warning('CUSTOM_HEADERS must be an object, ignoring invalid configuration');
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
          logger.warning(`Invalid header name: "${key}", skipping`);
        }
      } else {
        invalidCount++;
        logger.warning(`Invalid header format for "${key}": value must be a string, skipping`);
      }
    }

    // 记录加载的自定义请求头数量
    const validCount = Object.keys(validHeaders).length;
    if (validCount > 0) {
      logger.info(`Loaded ${validCount} custom header(s)`);
      
      // 记录请求头名称（隐藏敏感值）
      for (const key of Object.keys(validHeaders)) {
        const maskedValue = key.toLowerCase().includes('auth') || 
                           key.toLowerCase().includes('key') || 
                           key.toLowerCase().includes('token')
          ? '***'
          : validHeaders[key].substring(0, 10) + (validHeaders[key].length > 10 ? '...' : '');
        logger.debug(`  ${key}: ${maskedValue}`);
      }
    }

    if (invalidCount > 0) {
      logger.warning(`Skipped ${invalidCount} invalid custom header(s)`);
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
   */
  validate(): void {
    if (this.batchSize <= 0) {
      throw new Error('BATCH_SIZE must be positive');
    }
    if (this.maxLinesPerBlob <= 0) {
      throw new Error('MAX_LINES_PER_BLOB must be positive');
    }
    if (!this.baseUrl) {
      throw new Error('BASE_URL must be configured');
    }
    if (!this.token) {
      throw new Error('TOKEN must be configured');
    }
  }
}

/**
 * 全局配置实例
 */
let configInstance: Config | undefined;

/**
 * 获取全局配置实例
 */
export function getConfig(): Config {
  if (!configInstance) {
    configInstance = new Config();
  }
  return configInstance;
}

/**
 * 使用命令行参数初始化配置
 */
export function initConfig(baseUrl?: string, token?: string, webPort?: number): Config {
  configInstance = new Config(baseUrl, token, webPort);
  return configInstance;
}

