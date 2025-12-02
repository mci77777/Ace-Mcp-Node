/**
 * @codebase-mcp/shared - 共享核心模块
 * 
 * 提供配置管理、日志系统、路径工具、文件扫描和编码检测等核心功能
 */

// ============================================================================
// 配置管理
// ============================================================================
export {
  Config,
  ConfigOptions,
  USER_CONFIG_DIR,
  USER_CONFIG_FILE,
  USER_DATA_DIR,
  getConfig,
  initConfig,
  isFirstRun,
  markFirstRunCompleted,
  getConfigPaths,
} from './config.js';

// ============================================================================
// 日志系统
// ============================================================================
export {
  Logger,
  LoggerOptions,
  LogLevel,
  logger,
  setupLogging,
} from './logger.js';

// ============================================================================
// 日志广播器（WebSocket）
// ============================================================================
export {
  LogBroadcaster,
  getLogBroadcaster,
} from './logBroadcaster.js';

// ============================================================================
// 路径工具
// ============================================================================
export {
  normalizeProjectPath,
  isWSLPath,
  convertWSLToWindows,
  convertWindowsToWSL,
  validateProjectPath,
  isValidProjectPath,
} from './utils/pathUtils.js';

// ============================================================================
// 文件扫描
// ============================================================================
export {
  FileNode,
  ScanOptions,
  ScanResult,
  loadGitignore,
  shouldExclude,
  scanDirectory,
} from './utils/fileScanner.js';

// ============================================================================
// 编码检测和转换
// ============================================================================
export {
  isBinaryFile,
  detectEncoding,
  decodeText,
  decodeTextWithFallback,
} from './utils/encoding.js';
