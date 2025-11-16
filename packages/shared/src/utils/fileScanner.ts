/**
 * 文件扫描工具
 * 提供递归目录扫描、.gitignore 解析和文件过滤功能
 */

import fs from 'fs';
import path from 'path';
import ignore, { Ignore } from 'ignore';
import { logger } from '../logger.js';

/**
 * 文件节点接口
 */
export interface FileNode {
  name: string;           // 文件/目录名
  path: string;           // 相对路径
  type: 'file' | 'directory';
  size?: number;          // 文件大小（字节）
  extension?: string;     // 文件扩展名
  children?: FileNode[];  // 子节点（仅目录）
}

/**
 * 扫描选项接口
 */
export interface ScanOptions {
  maxDepth?: number;                // 最大递归深度
  textExtensions?: Set<string>;     // 文本文件扩展名集合
  excludePatterns?: string[];       // 排除模式列表
  followSymlinks?: boolean;         // 是否跟随符号链接
  buildTree?: boolean;              // 是否构建文件树结构
}

/**
 * 扫描结果接口
 */
export interface ScanResult {
  files: string[];        // 文件路径列表（相对路径）
  tree?: FileNode;        // 文件树（如果 buildTree=true）
  stats: {
    totalFiles: number;
    totalDirs: number;
    excludedCount: number;
  };
}

/**
 * 加载 .gitignore 文件
 * @param rootPath 项目根目录
 * @returns Ignore 实例或 null
 */
export function loadGitignore(rootPath: string): Ignore | null {
  const gitignorePath = path.join(rootPath, '.gitignore');
  
  if (!fs.existsSync(gitignorePath)) {
    logger.debug(`No .gitignore found at ${gitignorePath}`);
    return null;
  }

  try {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    const patterns = content.split('\n');
    const ig = ignore().add(patterns);
    logger.info(`Loaded .gitignore with ${patterns.length} patterns from ${gitignorePath}`);
    return ig;
  } catch (error) {
    logger.warning(`Failed to load .gitignore from ${gitignorePath}: ${error}`);
    return null;
  }
}

/**
 * 检查路径是否应该被排除
 * @param filePath 文件完整路径
 * @param rootPath 项目根目录
 * @param gitignoreSpec .gitignore 规则
 * @param excludePatterns 额外的排除模式
 * @returns 是否应该排除
 */
export function shouldExclude(
  filePath: string,
  rootPath: string,
  gitignoreSpec: Ignore | null,
  excludePatterns: string[] = []
): boolean {
  try {
    const relativePath = path.relative(rootPath, filePath);
    const pathStr = relativePath.replace(/\\/g, '/');

    // 检查 .gitignore 模式
    if (gitignoreSpec) {
      const isDir = fs.statSync(filePath).isDirectory();
      const testPath = isDir ? pathStr + '/' : pathStr;
      if (gitignoreSpec.ignores(testPath)) {
        logger.debug(`Excluded by .gitignore: ${testPath}`);
        return true;
      }
    }

    // 检查排除模式
    const pathParts = pathStr.split('/');
    for (const pattern of excludePatterns) {
      // 检查路径的每个部分
      for (const part of pathParts) {
        if (matchPattern(part, pattern)) {
          return true;
        }
      }
      // 检查完整路径
      if (matchPattern(pathStr, pattern)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    return false;
  }
}

/**
 * 简单的模式匹配（支持 * 通配符）
 * @param str 待匹配字符串
 * @param pattern 模式字符串
 * @returns 是否匹配
 */
function matchPattern(str: string, pattern: string): boolean {
  const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(str);
}

/**
 * 递归扫描目录
 * @param rootPath 项目根目录
 * @param options 扫描选项
 * @returns 扫描结果
 */
export async function scanDirectory(
  rootPath: string,
  options: ScanOptions = {}
): Promise<ScanResult> {
  const {
    maxDepth = 30,
    textExtensions = new Set(),
    excludePatterns = [],
    followSymlinks = false,
    buildTree = false,
  } = options;

  // 规范化路径
  let normalizedRoot = rootPath;
  if (normalizedRoot.endsWith('/') && normalizedRoot.length > 1) {
    normalizedRoot = normalizedRoot.slice(0, -1);
  }
  if (normalizedRoot.endsWith('\\') && normalizedRoot.length > 3) {
    normalizedRoot = normalizedRoot.slice(0, -1);
  }

  // 检查路径是否存在
  if (!fs.existsSync(normalizedRoot)) {
    throw new Error(`Path does not exist: ${rootPath}`);
  }

  // 检查是否为目录
  const stats = fs.statSync(normalizedRoot);
  if (!stats.isDirectory()) {
    throw new Error(`Path is not a directory: ${rootPath}`);
  }

  // 加载 .gitignore
  const gitignoreSpec = loadGitignore(normalizedRoot);

  // 统计信息
  const scanStats = {
    totalFiles: 0,
    totalDirs: 0,
    excludedCount: 0,
  };

  const files: string[] = [];
  let rootNode: FileNode | undefined;

  if (buildTree) {
    rootNode = {
      name: path.basename(normalizedRoot),
      path: '',
      type: 'directory',
      children: [],
    };
  }

  /**
   * 递归遍历目录
   */
  const walkDir = async (
    dirPath: string,
    currentDepth: number,
    parentNode?: FileNode
  ): Promise<void> => {
    // 检查深度限制
    if (currentDepth > maxDepth) {
      logger.debug(`Max depth ${maxDepth} reached at ${dirPath}`);
      return;
    }

    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(normalizedRoot, fullPath);

      // 处理符号链接
      if (entry.isSymbolicLink()) {
        if (!followSymlinks) {
          logger.debug(`Skipping symlink: ${relativePath}`);
          continue;
        }
        // 如果跟随符号链接，需要重新获取真实类型
        try {
          const realStats = fs.statSync(fullPath);
          entry.isDirectory = () => realStats.isDirectory();
          entry.isFile = () => realStats.isFile();
        } catch (error) {
          logger.warning(`Failed to resolve symlink: ${relativePath}`);
          continue;
        }
      }

      if (entry.isDirectory()) {
        scanStats.totalDirs++;

        // 检查目录是否应该排除
        if (shouldExclude(fullPath, normalizedRoot, gitignoreSpec, excludePatterns)) {
          scanStats.excludedCount++;
          logger.debug(`Excluded directory: ${relativePath}`);
          continue;
        }

        // 构建树节点
        let dirNode: FileNode | undefined;
        if (buildTree && parentNode) {
          dirNode = {
            name: entry.name,
            path: relativePath,
            type: 'directory',
            children: [],
          };
          parentNode.children!.push(dirNode);
        }

        // 递归遍历子目录
        await walkDir(fullPath, currentDepth + 1, dirNode);
      } else if (entry.isFile()) {
        // 检查文件是否应该排除
        if (shouldExclude(fullPath, normalizedRoot, gitignoreSpec, excludePatterns)) {
          scanStats.excludedCount++;
          logger.debug(`Excluded file: ${relativePath}`);
          continue;
        }

        // 检查文件扩展名（如果指定了）
        const ext = path.extname(entry.name).toLowerCase();
        if (textExtensions.size > 0 && !textExtensions.has(ext)) {
          continue;
        }

        scanStats.totalFiles++;
        files.push(relativePath);

        // 构建树节点
        if (buildTree && parentNode) {
          try {
            const fileStats = fs.statSync(fullPath);
            const fileNode: FileNode = {
              name: entry.name,
              path: relativePath,
              type: 'file',
              size: fileStats.size,
              extension: ext || undefined,
            };
            parentNode.children!.push(fileNode);
          } catch (error) {
            logger.warning(`Failed to stat file: ${relativePath}`);
          }
        }

        logger.debug(`Collected file: ${relativePath}`);
      }
    }
  };

  // 开始扫描
  await walkDir(normalizedRoot, 0, rootNode);

  logger.info(
    `Scan completed: ${scanStats.totalFiles} files, ${scanStats.totalDirs} directories, ${scanStats.excludedCount} excluded`
  );

  return {
    files,
    tree: rootNode,
    stats: scanStats,
  };
}
