/**
 * 详细日志工具 - 用于调试
 * 所有日志使用中文，并包含详细的上下文信息
 */

import { logger } from '../logger.js';

export class DetailedLogger {
  /**
   * 记录HTTP请求详情
   */
  static logHttpRequest(method: string, url: string, data?: any, headers?: any): void {
    logger.info(`🌐 ==================== HTTP 请求 ====================`);
    logger.info(`📝 请求方法: ${method}`);
    logger.info(`🔗 请求 URL: ${url}`);
    
    if (headers) {
      logger.debug(`📋 请求头:`);
      Object.entries(headers).forEach(([key, value]) => {
        // 隐藏敏感信息
        if (key.toLowerCase().includes('token') || key.toLowerCase().includes('authorization')) {
          logger.debug(`  ${key}: ${String(value).substring(0, 10)}...`);
        } else {
          logger.debug(`  ${key}: ${value}`);
        }
      });
    }
    
    if (data) {
      const dataStr = JSON.stringify(data);
      if (dataStr.length > 1000) {
        logger.debug(`📄 请求数据: ${dataStr.substring(0, 1000)}... (总长度: ${dataStr.length} 字节)`);
      } else {
        logger.debug(`📄 请求数据: ${dataStr}`);
      }
    }
    
    logger.info(`🌐 ====================================================`);
  }

  /**
   * 记录HTTP响应详情
   */
  static logHttpResponse(statusCode: number, data?: any, error?: any): void {
    logger.info(`📨 ==================== HTTP 响应 ====================`);
    logger.info(`📊 状态码: ${statusCode}`);
    
    if (error) {
      logger.error(`❌ 错误: ${error.message}`);
      if ((error as any).response) {
        logger.error(`📡 服务器响应: ${JSON.stringify((error as any).response.data)}`);
      }
      if ((error as any).request && !(error as any).response) {
        logger.error(`📡 请求已发送但未收到响应`);
      }
    } else if (data) {
      const dataStr = JSON.stringify(data);
      if (dataStr.length > 1000) {
        logger.debug(`📄 响应数据: ${dataStr.substring(0, 1000)}... (总长度: ${dataStr.length} 字节)`);
      } else {
        logger.debug(`📄 响应数据: ${dataStr}`);
      }
    }
    
    logger.info(`📨 ====================================================`);
  }

  /**
   * 记录批次上传详情
   */
  static logBatchUpload(batchNumber: number, totalBatches: number, blobCount: number, files: string[]): void {
    logger.info(`📦 ==================== 批次上传 ${batchNumber}/${totalBatches} ====================`);
    logger.info(`📊 本批次 blob 数量: ${blobCount}`);
    logger.info(`📁 本批次文件列表:`);
    files.forEach((file, index) => {
      logger.info(`  ${index + 1}. ${file}`);
    });
    logger.info(`📦 ===============================================================`);
  }

  /**
   * 记录索引进度
   */
  static logIndexProgress(
    projectPath: string,
    totalBlobs: number,
    existingBlobs: number,
    newBlobs: number
  ): void {
    logger.info(`📊 ==================== 索引统计 ====================`);
    logger.info(`📁 项目路径: ${projectPath}`);
    logger.info(`📈 总 blob 数: ${totalBlobs}`);
    logger.info(`✅ 已存在: ${existingBlobs} (${((existingBlobs / totalBlobs) * 100).toFixed(1)}%)`);
    logger.info(`🆕 新增: ${newBlobs} (${((newBlobs / totalBlobs) * 100).toFixed(1)}%)`);
    logger.info(`📊 ====================================================`);
  }

  /**
   * 记录搜索开始
   */
  static logSearchStart(projectPath: string, query: string): void {
    logger.info(`🔍 ==================== 开始搜索 ====================`);
    logger.info(`📁 项目路径: ${projectPath}`);
    logger.info(`🔎 搜索查询: ${query}`);
    logger.info(`⏰ 开始时间: ${new Date().toLocaleString('zh-CN')}`);
    logger.info(`🔍 ====================================================`);
  }

  /**
   * 记录搜索结果
   */
  static logSearchResult(resultCount: number, resultLength: number): void {
    logger.info(`✅ ==================== 搜索完成 ====================`);
    logger.info(`📊 结果数量: ${resultCount} 条`);
    logger.info(`📄 结果长度: ${resultLength} 字节`);
    logger.info(`⏰ 完成时间: ${new Date().toLocaleString('zh-CN')}`);
    logger.info(`✅ ====================================================`);
  }

  /**
   * 记录错误详情
   */
  static logError(context: string, error: Error | any): void {
    logger.error(`❌ ==================== 错误详情 ====================`);
    logger.error(`📍 错误上下文: ${context}`);
    logger.error(`💥 错误消息: ${error.message || String(error)}`);
    
    if (error.stack) {
      logger.debug(`🔍 错误堆栈:`);
      error.stack.split('\n').forEach((line: string) => {
        logger.debug(`  ${line}`);
      });
    }
    
    // Axios 错误
    if ((error as any).response) {
      logger.error(`📡 HTTP 状态码: ${(error as any).response.status}`);
      logger.error(`📄 响应数据: ${JSON.stringify((error as any).response.data)}`);
      logger.error(`🔧 请求URL: ${(error as any).config?.url}`);
    } else if ((error as any).request) {
      logger.error(`📡 请求已发送但未收到响应`);
    }
    
    logger.error(`❌ ====================================================`);
  }

  /**
   * 记录文件操作
   */
  static logFileOperation(operation: string, filePath: string, details?: string): void {
    logger.debug(`📁 文件操作: ${operation}`);
    logger.debug(`📄 文件路径: ${filePath}`);
    if (details) {
      logger.debug(`📝 操作详情: ${details}`);
    }
  }

  /**
   * 记录性能指标
   */
  static logPerformance(operation: string, duration: number): void {
    const durationStr = duration < 1000 ? `${duration.toFixed(0)}ms` : `${(duration / 1000).toFixed(2)}s`;
    logger.info(`⏱️ 性能统计: ${operation} 耗时 ${durationStr}`);
  }
}

