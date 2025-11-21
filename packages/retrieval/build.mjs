import * as esbuild from 'esbuild';
import { copyFileSync, cpSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function build() {
  try {
    console.log('Building Retrieval with esbuild...');
    
    // Bundle the application into a single CommonJS file
    await esbuild.build({
      entryPoints: ['src/index.ts'],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      outfile: 'dist/bundle.cjs',
      banner: {
        js: `
// Polyfill for import.meta in CommonJS
const __importMetaUrl = require('url').pathToFileURL(__filename).href;
// Polyfill for process.pkg (used by pkg)
if (typeof process.pkg === 'undefined') {
  process.pkg = undefined;
}
`.trim()
      },
      define: {
        'import.meta.url': '__importMetaUrl'
      },
      external: [
        // Don't bundle node built-ins
        'fs', 'path', 'os', 'http', 'https', 'net', 'tls', 'crypto',
        'stream', 'util', 'events', 'buffer', 'url', 'querystring',
        'zlib', 'child_process'
      ],
      sourcemap: false,
      minify: false,
      keepNames: true,
      logLevel: 'info',
      // Ensure all dependencies are bundled
      packages: 'bundle'
    });
    
    console.log('✓ Bundle created: dist/bundle.cjs');
    
    // Copy templates (for optional web UI)
    if (existsSync('src/web/templates')) {
      if (!existsSync('dist/web')) {
        mkdirSync('dist/web', { recursive: true });
      }
      cpSync('src/web/templates', 'dist/web/templates', { recursive: true });
      console.log('✓ Templates copied');
    }
    
    console.log('Build complete!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
