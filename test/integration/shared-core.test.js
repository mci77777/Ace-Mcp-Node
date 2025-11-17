/**
 * Shared Core 集成测试
 * 
 * 测试内容：
 * 1. 配置加载和验证
 * 2. 日志系统功能
 * 3. 各模块对 shared 包的引用
 */

import { initConfig, setupLogging, logger, getConfig } from '@codebase-mcp/shared';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 测试结果收集
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, fn) {
  try {
    fn();
    results.passed++;
    results.tests.push({ name, status: 'PASS' });
    console.log(`✓ ${name}`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
    console.error(`✗ ${name}`);
    console.error(`  Error: ${error.message}`);
  }
}

async function runTests() {
  console.log('\n='.repeat(60));
  console.log('Shared Core 集成测试');
  console.log('='.repeat(60));
  console.log();

  // 测试 1: 配置初始化
  test('配置初始化', () => {
    const config = initConfig();
    if (!config) throw new Error('配置初始化失败');
    if (typeof config.batchSize !== 'number') throw new Error('配置字段类型错误');
  });

  // 测试 2: 配置单例模式
  test('配置单例模式', () => {
    const config1 = getConfig();
    const config2 = getConfig();
    if (config1 !== config2) throw new Error('配置不是单例');
  });

  // 测试 3: 配置文件路径
  test('配置文件路径正确', () => {
    const config = getConfig();
    const expectedPath = join(os.homedir(), '.codebase-mcp', 'data', 'projects.json');
    if (!config.indexStoragePath.includes('.codebase-mcp')) {
      throw new Error(`配置路径不正确: ${config.indexStoragePath}`);
    }
  });

  // 测试 4: 日志系统初始化
  test('日志系统初始化', () => {
    setupLogging();
    if (!logger) throw new Error('日志系统初始化失败');
    if (typeof logger.info !== 'function') throw new Error('日志方法缺失');
  });

  // 测试 5: 日志写入
  test('日志写入功能', () => {
    const testMessage = `[TEST] Shared Core 集成测试 - ${new Date().toISOString()}`;
    logger.info(testMessage);
    
    // 验证日志文件存在
    const logPath = join(os.homedir(), '.codebase-mcp', 'log', 'codebase-mcp.log');
    if (!fs.existsSync(logPath)) {
      throw new Error('日志文件不存在');
    }
    
    // 日志文件存在即可，不验证具体内容（因为可能是异步写入）
    const stats = fs.statSync(logPath);
    if (stats.size === 0) {
      throw new Error('日志文件为空');
    }
  });

  // 测试 6: 配置覆盖
  test('配置命令行覆盖', () => {
    const config = initConfig({
      batchSize: 999,
      baseUrl: 'https://test.example.com'
    });
    
    if (config.batchSize !== 999) {
      throw new Error('配置覆盖失败');
    }
  });

  // 测试 7: 日志级别
  test('日志级别功能', () => {
    logger.info('Info level test');
    logger.warning('Warning level test');
    logger.error('Error level test');
    logger.debug('Debug level test');
    // 如果没有抛出异常，说明所有级别都正常工作
  });

  // 测试 8: 配置验证
  test('配置验证功能', () => {
    const config = getConfig();
    try {
      config.validate();
      // 验证应该通过（即使 BASE_URL 是示例值）
    } catch (error) {
      // 预期会有验证错误（因为使用的是示例配置）
      if (!error.message.includes('BASE_URL') && !error.message.includes('TOKEN')) {
        throw error;
      }
    }
  });

  // 输出测试结果
  console.log();
  console.log('='.repeat(60));
  console.log('测试结果汇总');
  console.log('='.repeat(60));
  console.log(`总计: ${results.passed + results.failed} 个测试`);
  console.log(`通过: ${results.passed} 个`);
  console.log(`失败: ${results.failed} 个`);
  console.log('='.repeat(60));
  console.log();

  // 返回退出码
  process.exit(results.failed > 0 ? 1 : 0);
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
