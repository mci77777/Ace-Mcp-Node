#!/usr/bin/env node
/**
 * 测试配置文件读取
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const toml = require('@iarna/toml');

const USER_CONFIG_DIR = path.join(os.homedir(), '.codebase-mcp');
const USER_CONFIG_FILE = path.join(USER_CONFIG_DIR, 'settings.toml');

console.log('=== 配置文件诊断 ===\n');

// 1. 检查配置目录
console.log('[1] 检查配置目录');
console.log(`  路径: ${USER_CONFIG_DIR}`);
console.log(`  存在: ${fs.existsSync(USER_CONFIG_DIR) ? '✓' : '✗'}`);
console.log('');

// 2. 检查配置文件
console.log('[2] 检查配置文件');
console.log(`  路径: ${USER_CONFIG_FILE}`);
console.log(`  存在: ${fs.existsSync(USER_CONFIG_FILE) ? '✓' : '✗'}`);
console.log('');

if (!fs.existsSync(USER_CONFIG_FILE)) {
  console.log('✗ 配置文件不存在！');
  process.exit(1);
}

// 3. 读取配置文件
console.log('[3] 读取配置文件');
try {
  const content = fs.readFileSync(USER_CONFIG_FILE, 'utf-8');
  console.log(`  文件大小: ${content.length} 字节`);
  console.log('  ✓ 文件读取成功');
  console.log('');
  
  // 4. 解析 TOML
  console.log('[4] 解析 TOML');
  try {
    const settings = toml.parse(content);
    console.log('  ✓ TOML 解析成功');
    console.log('');
    
    // 5. 检查关键字段
    console.log('[5] 检查关键字段');
    
    const fields = [
      'BASE_URL',
      'TOKEN',
      'ENHANCE_BASE_URL',
      'ENHANCE_TOKEN',
      'MODEL',
      'WEB_PORT',
      'API_TIMEOUT'
    ];
    
    for (const field of fields) {
      const value = settings[field];
      const exists = value !== undefined && value !== null;
      const masked = field.includes('TOKEN') 
        ? (value ? value.substring(0, 10) + '...' : 'undefined')
        : value;
      
      console.log(`  ${field}: ${exists ? '✓' : '✗'} ${masked}`);
    }
    console.log('');
    
    // 6. 显示完整配置（脱敏）
    console.log('[6] 完整配置（脱敏）');
    const maskedSettings = { ...settings };
    if (maskedSettings.TOKEN) {
      maskedSettings.TOKEN = maskedSettings.TOKEN.substring(0, 10) + '...';
    }
    if (maskedSettings.ENHANCE_TOKEN) {
      maskedSettings.ENHANCE_TOKEN = maskedSettings.ENHANCE_TOKEN.substring(0, 10) + '...';
    }
    console.log(JSON.stringify(maskedSettings, null, 2));
    console.log('');
    
    // 7. 验证必填字段
    console.log('[7] 验证必填字段');
    const errors = [];
    
    if (!settings.BASE_URL || settings.BASE_URL === 'https://api.example.com') {
      errors.push('BASE_URL 未配置或使用默认值');
    }
    if (!settings.TOKEN || settings.TOKEN === 'your-token-here') {
      errors.push('TOKEN 未配置或使用默认值');
    }
    if (!settings.ENHANCE_BASE_URL || settings.ENHANCE_BASE_URL === 'https://api.openai.com') {
      errors.push('ENHANCE_BASE_URL 未配置或使用默认值');
    }
    if (!settings.ENHANCE_TOKEN || settings.ENHANCE_TOKEN === 'your-enhance-token-here') {
      errors.push('ENHANCE_TOKEN 未配置或使用默认值');
    }
    
    if (errors.length > 0) {
      console.log('  ✗ 发现问题:');
      errors.forEach(err => console.log(`    - ${err}`));
    } else {
      console.log('  ✓ 所有必填字段已配置');
    }
    console.log('');
    
    // 8. 测试 Config 类
    console.log('[8] 测试 Config 类');
    try {
      // 动态导入编译后的 config 模块
      const configPath = path.join(__dirname, '../packages/shared/dist/config.js');
      if (fs.existsSync(configPath)) {
        const { Config } = require(configPath);
        const config = new Config();
        
        console.log('  ✓ Config 实例创建成功');
        console.log(`  BASE_URL: ${config.baseUrl}`);
        console.log(`  TOKEN: ${config.token ? config.token.substring(0, 10) + '...' : 'undefined'}`);
        console.log(`  ENHANCE_BASE_URL: ${config.enhanceBaseUrl}`);
        console.log(`  ENHANCE_TOKEN: ${config.enhanceToken ? config.enhanceToken.substring(0, 10) + '...' : 'undefined'}`);
        console.log(`  MODEL: ${config.model || '(empty)'}`);
        console.log(`  WEB_PORT: ${config.webPort}`);
      } else {
        console.log('  ℹ shared 包未编译，跳过 Config 类测试');
        console.log(`  提示: 运行 npm run build -w @codebase-mcp/shared`);
      }
    } catch (error) {
      console.log(`  ✗ Config 类测试失败: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`  ✗ TOML 解析失败: ${error.message}`);
    console.log('');
    console.log('原始内容（前 500 字符）:');
    console.log(content.substring(0, 500));
    process.exit(1);
  }
  
} catch (error) {
  console.log(`  ✗ 文件读取失败: ${error.message}`);
  process.exit(1);
}

console.log('=== 诊断完成 ===');
