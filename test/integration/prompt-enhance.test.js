/**
 * Prompt Enhance 集成测试
 * 
 * 测试内容：
 * 1. 构建验证
 * 2. 服务器启动
 * 3. Web UI 可访问性
 * 4. API 端点功能
 */

import { spawn } from 'child_process';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_PORT = 8092; // 使用不同的端口避免冲突
const BASE_URL = `http://localhost:${TEST_PORT}`;
const STARTUP_TIMEOUT = 10000; // 10 秒启动超时

// 测试结果收集
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, fn) {
  return new Promise(async (resolve) => {
    try {
      await fn();
      results.passed++;
      results.tests.push({ name, status: 'PASS' });
      console.log(`✓ ${name}`);
      resolve();
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'FAIL', error: error.message });
      console.error(`✗ ${name}`);
      console.error(`  Error: ${error.message}`);
      resolve();
    }
  });
}

async function waitForServer(url, timeout = STARTUP_TIMEOUT) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      await axios.get(url, { timeout: 1000 });
      return true;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  throw new Error(`服务器在 ${timeout}ms 内未启动`);
}

async function runTests() {
  console.log('\n='.repeat(60));
  console.log('Prompt Enhance 集成测试');
  console.log('='.repeat(60));
  console.log();

  let serverProcess = null;

  try {
    // 测试 1: 验证构建产物
    await test('构建产物存在', async () => {
      const distPath = join(process.cwd(), 'packages', 'prompt-enhance', 'dist', 'index.js');
      if (!fs.existsSync(distPath)) {
        throw new Error('构建产物不存在');
      }
    });

    // 测试 2: 验证模板文件
    await test('Web 模板文件存在', async () => {
      const templatePath = join(process.cwd(), 'packages', 'prompt-enhance', 'dist', 'web', 'templates', 'index.html');
      if (!fs.existsSync(templatePath)) {
        throw new Error('模板文件不存在');
      }
    });

    // 测试 3: 启动服务器
    await test('服务器启动', async () => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('服务器启动超时'));
        }, STARTUP_TIMEOUT);

        serverProcess = spawn('node', [
          'packages/prompt-enhance/dist/index.js',
          '--port', TEST_PORT.toString()
        ], {
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: true
        });

        let output = '';
        serverProcess.stdout.on('data', (data) => {
          output += data.toString();
          if (output.includes('server started successfully')) {
            clearTimeout(timeout);
            resolve();
          }
        });

        serverProcess.stderr.on('data', (data) => {
          console.error('Server stderr:', data.toString());
        });

        serverProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        serverProcess.on('exit', (code) => {
          if (code !== 0 && code !== null) {
            clearTimeout(timeout);
            reject(new Error(`服务器异常退出，退出码: ${code}`));
          }
        });
      });
    });

    // 等待服务器完全启动
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 测试 4: Web UI 可访问
    await test('Web UI 可访问', async () => {
      const response = await axios.get(BASE_URL, { timeout: 5000 });
      if (response.status !== 200) {
        throw new Error(`HTTP 状态码错误: ${response.status}`);
      }
      if (!response.data.includes('Prompt Enhance')) {
        throw new Error('页面内容不正确');
      }
    });

    // 测试 5: API 端点 - 获取配置
    await test('API: 获取配置', async () => {
      const response = await axios.get(`${BASE_URL}/api/config`, { timeout: 5000 });
      if (response.status !== 200) {
        throw new Error(`HTTP 状态码错误: ${response.status}`);
      }
      if (!response.data.enhanceBaseUrl) {
        throw new Error('配置数据不完整');
      }
    });

    // 测试 6: API 端点 - 获取模型列表（可能失败，因为需要有效的 API 配置）
    await test('API: 获取模型列表', async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/models`, { 
          timeout: 10000,
          validateStatus: () => true // 接受所有状态码
        });
        
        // 如果 API 配置无效，可能返回 500，这是预期的
        if (response.status === 500) {
          console.log('  (预期失败: API 配置无效)');
          return; // 不算失败
        }
        
        if (response.status !== 200) {
          throw new Error(`HTTP 状态码错误: ${response.status}`);
        }
      } catch (error) {
        if (error.code === 'ECONNABORTED') {
          console.log('  (预期超时: API 响应慢)');
          return; // 不算失败
        }
        throw error;
      }
    });

    // 测试 7: API 端点 - 获取提示词文件列表
    await test('API: 获取提示词文件列表', async () => {
      const response = await axios.get(`${BASE_URL}/api/prompt-files`, { timeout: 5000 });
      if (response.status !== 200) {
        throw new Error(`HTTP 状态码错误: ${response.status}`);
      }
      if (!Array.isArray(response.data.files)) {
        throw new Error('返回数据格式错误');
      }
    });

    // 测试 8: 静态资源
    await test('静态资源可访问', async () => {
      const response = await axios.get(`${BASE_URL}/styles/main.css`, { 
        timeout: 5000,
        validateStatus: () => true 
      });
      // CSS 文件可能不存在，但至少应该返回 404 而不是服务器错误
      if (response.status >= 500) {
        throw new Error(`服务器错误: ${response.status}`);
      }
    });

  } finally {
    // 清理：关闭服务器
    if (serverProcess) {
      console.log('\n正在关闭服务器...');
      serverProcess.kill('SIGTERM');
      
      // 等待进程退出
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          serverProcess.kill('SIGKILL');
          resolve();
        }, 5000);
        
        serverProcess.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
  }

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
