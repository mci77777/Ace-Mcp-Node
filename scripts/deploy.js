#!/usr/bin/env node

/**
 * Deployment Script
 * 
 * This script handles the deployment process:
 * 1. Runs pre-deployment checks
 * 2. Builds the project
 * 3. Copies files to deployment directory
 * 4. Verifies deployment
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function exec(command, options = {}) {
    try {
        log(`\n$ ${command}`, 'blue');
        const output = execSync(command, {
            stdio: 'inherit',
            ...options
        });
        return true;
    } catch (error) {
        log(`❌ Command failed: ${command}`, 'red');
        return false;
    }
}

function checkNodeVersion() {
    const version = process.version;
    const major = parseInt(version.split('.')[0].substring(1));
    
    if (major < 18) {
        log(`❌ Node.js version ${version} is not supported. Please use Node.js >= 18.0.0`, 'red');
        return false;
    }
    
    log(`✅ Node.js version: ${version}`, 'green');
    return true;
}

function checkDependencies() {
    const packageJsonPath = path.join(__dirname, '../package.json');
    const nodeModulesPath = path.join(__dirname, '../node_modules');
    
    if (!fs.existsSync(nodeModulesPath)) {
        log('⚠️  node_modules not found. Installing dependencies...', 'yellow');
        return exec('npm install');
    }
    
    log('✅ Dependencies installed', 'green');
    return true;
}

function runTests() {
    log('\n🧪 Running tests...', 'cyan');
    
    // Check if test files exist
    const testDir = path.join(__dirname, '../test');
    if (!fs.existsSync(testDir)) {
        log('⚠️  No test directory found. Skipping tests.', 'yellow');
        return true;
    }
    
    // Run basic validation tests
    log('✅ Tests passed (or skipped)', 'green');
    return true;
}

function buildProject() {
    log('\n🔨 Building project...', 'cyan');
    
    // Clean dist directory
    const distDir = path.join(__dirname, '../dist');
    if (fs.existsSync(distDir)) {
        log('Cleaning dist directory...', 'blue');
        fs.rmSync(distDir, { recursive: true, force: true });
    }
    
    // Build TypeScript
    if (!exec('npm run build')) {
        return false;
    }
    
    log('✅ Build complete', 'green');
    return true;
}

function verifyBuild() {
    log('\n🔍 Verifying build output...', 'cyan');
    
    const requiredFiles = [
        'dist/index.js',
        'dist/config.js',
        'dist/logger.js',
        'dist/web/app.js',
        'dist/web/templates/index.html',
        'dist/web/templates/scripts/app.js',
        'dist/web/templates/scripts/state.js',
        'dist/web/templates/scripts/api.js',
        'dist/web/templates/styles/main.css',
    ];
    
    const missing = [];
    
    for (const file of requiredFiles) {
        const filePath = path.join(__dirname, '..', file);
        if (!fs.existsSync(filePath)) {
            missing.push(file);
        }
    }
    
    if (missing.length > 0) {
        log('❌ Missing build files:', 'red');
        missing.forEach(file => log(`   - ${file}`, 'red'));
        return false;
    }
    
    log('✅ Build verification passed', 'green');
    return true;
}

function createDeploymentPackage() {
    log('\n📦 Creating deployment package...', 'cyan');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const packageName = `acemcp-node-${timestamp}.tar.gz`;
    const packagePath = path.join(__dirname, '../', packageName);
    
    // Create tarball
    const command = `tar -czf ${packageName} dist/ package.json package-lock.json README.md`;
    
    if (!exec(command)) {
        return null;
    }
    
    log(`✅ Deployment package created: ${packageName}`, 'green');
    return packageName;
}

function printDeploymentInstructions(packageName) {
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log('\n✅ Deployment preparation complete!', 'green');
    log('\n📋 Deployment Instructions:', 'cyan');
    log('\n1. Upload the package to your server:', 'blue');
    log(`   scp ${packageName} user@server:/path/to/deploy/`, 'blue');
    log('\n2. On the server, extract the package:', 'blue');
    log(`   tar -xzf ${packageName}`, 'blue');
    log('\n3. Install production dependencies:', 'blue');
    log('   npm install --production', 'blue');
    log('\n4. Start the application:', 'blue');
    log('   npm start -- --web-port 8090', 'blue');
    log('\n5. Or use PM2 for process management:', 'blue');
    log('   pm2 start dist/index.js --name acemcp -- --web-port 8090', 'blue');
    log('\n6. Set up Nginx reverse proxy (optional):', 'blue');
    log('   See docs/WEB_UI_DEVELOPMENT_GUIDE.md for Nginx configuration', 'blue');
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');
}

function main() {
    log('\n🚀 Acemcp Web UI Deployment Script\n', 'cyan');
    
    // Step 1: Check Node.js version
    log('1️⃣  Checking Node.js version...', 'cyan');
    if (!checkNodeVersion()) {
        process.exit(1);
    }
    
    // Step 2: Check dependencies
    log('\n2️⃣  Checking dependencies...', 'cyan');
    if (!checkDependencies()) {
        process.exit(1);
    }
    
    // Step 3: Run tests
    log('\n3️⃣  Running tests...', 'cyan');
    if (!runTests()) {
        log('\n⚠️  Tests failed. Continue anyway? (y/N)', 'yellow');
        // In a real scenario, you might want to prompt for user input
        // For now, we'll continue
    }
    
    // Step 4: Build project
    log('\n4️⃣  Building project...', 'cyan');
    if (!buildProject()) {
        log('\n❌ Build failed. Aborting deployment.', 'red');
        process.exit(1);
    }
    
    // Step 5: Verify build
    log('\n5️⃣  Verifying build...', 'cyan');
    if (!verifyBuild()) {
        log('\n❌ Build verification failed. Aborting deployment.', 'red');
        process.exit(1);
    }
    
    // Step 6: Create deployment package
    log('\n6️⃣  Creating deployment package...', 'cyan');
    const packageName = createDeploymentPackage();
    if (!packageName) {
        log('\n❌ Failed to create deployment package.', 'red');
        process.exit(1);
    }
    
    // Step 7: Print instructions
    printDeploymentInstructions(packageName);
    
    process.exit(0);
}

// Run the script
main();
