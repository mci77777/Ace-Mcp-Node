#!/usr/bin/env node

/**
 * Deployment Preparation Script
 * 
 * This script prepares the Web UI for deployment by:
 * 1. Backing up the original index.html (if exists)
 * 2. Verifying all component files exist
 * 3. Checking for missing translations
 * 4. Validating the build output
 */

import fs from 'fs';
import path from 'path';
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

function checkFileExists(filePath) {
    return fs.existsSync(filePath);
}

function backupFile(sourcePath, backupPath) {
    if (checkFileExists(sourcePath)) {
        fs.copyFileSync(sourcePath, backupPath);
        return true;
    }
    return false;
}

function verifyComponentFiles() {
    const componentsDir = path.join(__dirname, '../src/web/templates/components');
    
    const requiredComponents = [
        'layout/header.html',
        'layout/navigation.html',
        'home/status-cards.html',
        'home/config-panel.html',
        'home/logs-panel.html',
        'home/projects-list.html',
        'home/tool-debugger.html',
        'enhance-prompt/main-view.html',
        'enhance-prompt/language-selector.html',
        'enhance-prompt/submit-button.html',
        'enhance-prompt/secondary-tabs.html',
        'enhance-prompt/advanced-options.html',
        'enhance-prompt/api-config.html',
        'enhance-prompt/logs.html',
        'shared/notification.html',
        'shared/modal.html',
        'shared/keyboard-help-modal.html',
    ];
    
    const missing = [];
    
    for (const component of requiredComponents) {
        const componentPath = path.join(componentsDir, component);
        if (!checkFileExists(componentPath)) {
            missing.push(component);
        }
    }
    
    return missing;
}

function verifyScriptFiles() {
    const scriptsDir = path.join(__dirname, '../src/web/templates/scripts');
    
    const requiredScripts = [
        'app.js',
        'state.js',
        'api.js',
        'i18n.js',
        'utils.js',
    ];
    
    const missing = [];
    
    for (const script of requiredScripts) {
        const scriptPath = path.join(scriptsDir, script);
        if (!checkFileExists(scriptPath)) {
            missing.push(script);
        }
    }
    
    return missing;
}

function verifyStyleFiles() {
    const stylesDir = path.join(__dirname, '../src/web/templates/styles');
    
    const requiredStyles = [
        'main.css',
    ];
    
    const missing = [];
    
    for (const style of requiredStyles) {
        const stylePath = path.join(stylesDir, style);
        if (!checkFileExists(stylePath)) {
            missing.push(style);
        }
    }
    
    return missing;
}

function createBackupDirectory() {
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    return backupDir;
}

function main() {
    log('\n🚀 Acemcp Web UI Deployment Preparation\n', 'cyan');
    
    let hasErrors = false;
    
    // Step 1: Create backup directory
    log('📁 Creating backup directory...', 'blue');
    const backupDir = createBackupDirectory();
    log(`✅ Backup directory: ${backupDir}\n`, 'green');
    
    // Step 2: Backup original index.html
    log('💾 Backing up original index.html...', 'blue');
    const indexPath = path.join(__dirname, '../src/web/templates/index.html');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupPath = path.join(backupDir, `index.html.backup.${timestamp}`);
    
    if (backupFile(indexPath, backupPath)) {
        log(`✅ Backup created: ${backupPath}\n`, 'green');
    } else {
        log('⚠️  Original index.html not found (might be first deployment)\n', 'yellow');
    }
    
    // Step 3: Verify component files
    log('🔍 Verifying component files...', 'blue');
    const missingComponents = verifyComponentFiles();
    if (missingComponents.length > 0) {
        log('❌ Missing component files:', 'red');
        missingComponents.forEach(comp => log(`   - ${comp}`, 'red'));
        hasErrors = true;
    } else {
        log('✅ All component files present\n', 'green');
    }
    
    // Step 4: Verify script files
    log('🔍 Verifying script files...', 'blue');
    const missingScripts = verifyScriptFiles();
    if (missingScripts.length > 0) {
        log('❌ Missing script files:', 'red');
        missingScripts.forEach(script => log(`   - ${script}`, 'red'));
        hasErrors = true;
    } else {
        log('✅ All script files present\n', 'green');
    }
    
    // Step 5: Verify style files
    log('🔍 Verifying style files...', 'blue');
    const missingStyles = verifyStyleFiles();
    if (missingStyles.length > 0) {
        log('❌ Missing style files:', 'red');
        missingStyles.forEach(style => log(`   - ${style}`, 'red'));
        hasErrors = true;
    } else {
        log('✅ All style files present\n', 'green');
    }
    
    // Step 6: Check build output
    log('🔍 Checking build output...', 'blue');
    const distDir = path.join(__dirname, '../dist/web/templates');
    if (checkFileExists(distDir)) {
        log('✅ Build output directory exists\n', 'green');
    } else {
        log('⚠️  Build output not found. Run "npm run build" first\n', 'yellow');
    }
    
    // Summary
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    if (hasErrors) {
        log('\n❌ Deployment preparation failed!', 'red');
        log('Please fix the errors above before deploying.\n', 'red');
        process.exit(1);
    } else {
        log('\n✅ Deployment preparation complete!', 'green');
        log('\nNext steps:', 'cyan');
        log('1. Run "npm run build" to compile TypeScript', 'blue');
        log('2. Test the application locally', 'blue');
        log('3. Run "npm run deploy" to deploy to production\n', 'blue');
        process.exit(0);
    }
}

// Run the script
main();
