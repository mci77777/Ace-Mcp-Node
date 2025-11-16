/**
 * 编码检测和转换工具
 * 支持多种编码格式：UTF-8、GBK、GB2312、Latin-1
 */

import iconv from 'iconv-lite';

/**
 * 支持的编码列表（按优先级排序）
 */
const SUPPORTED_ENCODINGS = ['utf-8', 'gbk', 'gb2312', 'latin1'] as const;

/**
 * 二进制文件的常见特征字节
 * 包含 NULL 字节和其他控制字符
 */
const BINARY_INDICATORS = new Set([
  0x00, // NULL
  0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, // 控制字符
  0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f,
]);

/**
 * 检测 Buffer 是否为二进制文件
 * 
 * 策略：
 * 1. 检查前 8KB 字节（或全部内容如果更小）
 * 2. 如果包含 NULL 字节或过多控制字符，判定为二进制
 * 3. 阈值：超过 30% 的字节为二进制指示符
 * 
 * @param buffer - 要检测的 Buffer
 * @returns true 如果是二进制文件，否则 false
 */
export function isBinaryFile(buffer: Buffer): boolean {
  if (buffer.length === 0) {
    return false;
  }

  // 检查前 8KB 或全部内容
  const sampleSize = Math.min(buffer.length, 8192);
  let binaryCount = 0;

  for (let i = 0; i < sampleSize; i++) {
    const byte = buffer[i];
    
    // NULL 字节是二进制文件的强指示符
    if (byte === 0x00) {
      return true;
    }
    
    // 统计二进制指示符
    if (BINARY_INDICATORS.has(byte)) {
      binaryCount++;
    }
  }

  // 如果超过 30% 的字节是二进制指示符，判定为二进制
  const binaryRatio = binaryCount / sampleSize;
  return binaryRatio > 0.3;
}

/**
 * 检测 Buffer 的最佳编码
 * 
 * 策略：
 * 1. 尝试每种支持的编码进行解码
 * 2. 检查解码结果中的替换字符（U+FFFD）数量
 * 3. 选择替换字符最少的编码
 * 4. 如果所有编码都有大量替换字符，返回 'utf-8' 作为默认值
 * 
 * @param buffer - 要检测的 Buffer
 * @returns 检测到的编码名称
 */
export function detectEncoding(buffer: Buffer): string {
  if (buffer.length === 0) {
    return 'utf-8';
  }

  // 检查是否为二进制文件
  if (isBinaryFile(buffer)) {
    return 'binary';
  }

  let bestEncoding = 'utf-8';
  let minReplacements = Infinity;

  for (const encoding of SUPPORTED_ENCODINGS) {
    try {
      const decoded = iconv.decode(buffer, encoding);
      
      // 统计替换字符（U+FFFD）的数量
      const replacementCount = (decoded.match(/\uFFFD/g) || []).length;
      
      // 如果没有替换字符，这就是正确的编码
      if (replacementCount === 0) {
        return encoding;
      }
      
      // 记录替换字符最少的编码
      if (replacementCount < minReplacements) {
        minReplacements = replacementCount;
        bestEncoding = encoding;
      }
    } catch (error) {
      // 解码失败，跳过此编码
      continue;
    }
  }

  // 如果替换字符过多（超过 5%），可能是二进制文件
  if (minReplacements > buffer.length * 0.05) {
    return 'binary';
  }

  return bestEncoding;
}

/**
 * 使用指定或自动检测的编码解码 Buffer
 * 
 * @param buffer - 要解码的 Buffer
 * @param encoding - 可选的编码名称，如果未指定则自动检测
 * @returns 解码后的字符串
 * @throws 如果是二进制文件或解码失败
 */
export function decodeText(buffer: Buffer, encoding?: string): string {
  if (buffer.length === 0) {
    return '';
  }

  // 如果未指定编码，自动检测
  const targetEncoding = encoding || detectEncoding(buffer);

  // 如果检测为二进制文件，抛出错误
  if (targetEncoding === 'binary') {
    throw new Error('Cannot decode binary file as text');
  }

  try {
    const decoded = iconv.decode(buffer, targetEncoding);
    
    // 验证解码质量
    const replacementCount = (decoded.match(/\uFFFD/g) || []).length;
    
    // 使用智能阈值：短文件用绝对值，长文件用比例
    if (decoded.length > 0) {
      if (decoded.length < 100) {
        // 短文件：超过 5 个替换字符可能有问题
        if (replacementCount > 5) {
          throw new Error(`Decoding with ${targetEncoding} produced ${replacementCount} replacement characters`);
        }
      } else {
        // 长文件：超过 5% 的替换字符可能有问题
        if (replacementCount / decoded.length > 0.05) {
          throw new Error(`Decoding with ${targetEncoding} produced ${replacementCount} replacement characters (${(replacementCount / decoded.length * 100).toFixed(2)}%)`);
        }
      }
    }
    
    return decoded;
  } catch (error) {
    if (error instanceof Error && error.message.includes('replacement characters')) {
      throw error;
    }
    throw new Error(`Failed to decode buffer with encoding ${targetEncoding}: ${error}`);
  }
}

/**
 * 尝试使用多种编码读取 Buffer，返回最佳结果
 * 
 * 这是一个便捷函数，结合了编码检测和解码，并提供回退机制
 * 
 * @param buffer - 要解码的 Buffer
 * @returns 解码后的字符串
 * @throws 如果是二进制文件或所有编码都失败
 */
export function decodeTextWithFallback(buffer: Buffer): string {
  if (buffer.length === 0) {
    return '';
  }

  // 检查是否为二进制文件
  if (isBinaryFile(buffer)) {
    throw new Error('Cannot decode binary file as text');
  }

  // 尝试每种编码，选择替换字符最少的
  let bestResult = '';
  let minReplacements = Infinity;
  let bestEncoding = 'utf-8';

  for (const encoding of SUPPORTED_ENCODINGS) {
    try {
      const decoded = iconv.decode(buffer, encoding);
      const replacementCount = (decoded.match(/\uFFFD/g) || []).length;
      
      // 如果没有替换字符，直接返回
      if (replacementCount === 0) {
        return decoded;
      }
      
      // 记录最佳结果
      if (replacementCount < minReplacements) {
        minReplacements = replacementCount;
        bestResult = decoded;
        bestEncoding = encoding;
      }
    } catch (error) {
      continue;
    }
  }

  // 如果所有编码都有大量替换字符，可能是二进制文件
  if (minReplacements > buffer.length * 0.05) {
    throw new Error('File appears to be binary or uses unsupported encoding');
  }

  return bestResult;
}
