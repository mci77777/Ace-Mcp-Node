/**
 * 复制 vendor 库到 static 目录
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const vendorFiles = [
  {
    src: '../../node_modules/alpinejs/dist/cdn.min.js',
    dest: 'dist/web/templates/vendor/alpine.min.js'
  }
];

console.log('Copying vendor files...');

vendorFiles.forEach(({ src, dest }) => {
  const srcPath = path.join(__dirname, '..', src);
  const destPath = path.join(__dirname, '..', dest);
  
  // 确保目标目录存在
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  // 复制文件
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`✓ Copied: ${src} -> ${dest}`);
  } else {
    console.warn(`✗ Source not found: ${src}`);
  }
});

console.log('Vendor files copied successfully!');
