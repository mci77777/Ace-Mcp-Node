/**
 * Global State Management using Alpine.js Stores
 * Manages application state, UI state, and data persistence
 */

// Storage keys constants
const STORAGE_KEYS = {
    CURRENT_PAGE: 'codebase_mcp_currentPage',
    THEME: 'codebase_mcp_theme',
    LANG: 'codebase_mcp_lang',
    ENHANCE_MESSAGE: 'codebase_mcp_enhanceMessage',
    ENHANCE_LANGUAGE: 'codebase_mcp_enhanceLanguage',
    ENHANCE_PROJECT_PATH: 'codebase_mcp_enhanceProjectPath',
    ENHANCE_SELECTED_FILES: 'codebase_mcp_enhanceSelectedFiles',
    ENHANCE_USER_GUIDELINES: 'codebase_mcp_enhanceUserGuidelines',
    ENHANCE_CUSTOM_GUIDELINE_PATH: 'codebase_mcp_enhanceCustomGuidelinePath',
    ENHANCE_INCLUDE_README: 'codebase_mcp_enhanceReadme',
    ENHANCE_TREE_DEPTH: 'codebase_mcp_enhanceTreeDepth'
};

// Helper functions for localStorage operations
const Storage = {
    get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value !== null ? value : defaultValue;
        } catch (e) {
            console.error(`Error reading from localStorage: ${key}`, e);
            return defaultValue;
        }
    },
    
    getJSON(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            if (value === null || value === undefined || value === 'null' || value === 'undefined') {
                return defaultValue;
            }
            
            // 安全的 JSON 解析
            return JSON.parse(value, (k, v) => {
                // 处理特殊值
                if (v === null || v === undefined) {
                    return v;
                }
                return v;
            });
        } catch (e) {
            console.error(`Error parsing JSON from localStorage: ${key}`, e);
            console.error(`Problematic value: ${localStorage.getItem(key)?.substring(0, 100)}`);
            // 清除损坏的数据
            try {
                localStorage.removeItem(key);
            } catch (removeError) {
                console.error(`Failed to remove corrupted key: ${key}`, removeError);
            }
            return defaultValue;
        }
    },
    
    set(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.error(`Error writing to localStorage: ${key}`, e);
            return false;
        }
    },
    
    setJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error(`Error writing JSON to localStorage: ${key}`, e);
            return false;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error(`Error removing from localStorage: ${key}`, e);
            return false;
        }
    },
    
    clear() {
        try {
            // Only clear codebase-mcp-related keys
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            return true;
        } catch (e) {
            console.error('Error clearing localStorage', e);
            return false;
        }
    }
};

document.addEventListener('alpine:init', () => {
    Alpine.store('app', {
        // UI State - restored from localStorage
        currentPage: Storage.get(STORAGE_KEYS.CURRENT_PAGE, 'home'),
        theme: Storage.get(STORAGE_KEYS.THEME, 'light'),
        lang: Storage.get(STORAGE_KEYS.LANG, 'zh'),
        
        // Server Status
        status: {
            status: 'loading',
            project_count: 0,
            storage_path: ''
        },
        
        // Configuration
        config: {
            base_url: '',
            token: '',
            enhance_base_url: '',
            enhance_token: '',
            batch_size: 0,
            max_lines_per_blob: 0,
            text_extensions: [],
            exclude_patterns: [],
            model: '',
            custom_model: '',
            custom_headers: '{}'
        },
        
        // Projects
        projects: [],
        
        // Logs
        logs: [],
        wsConnected: false,
        
        // Enhance Prompt State - restored from localStorage
        enhanceForm: {
            originalMessage: Storage.get(STORAGE_KEYS.ENHANCE_MESSAGE, ''),
            language: Storage.get(STORAGE_KEYS.ENHANCE_LANGUAGE, 'zh'),
            projectPath: Storage.get(STORAGE_KEYS.ENHANCE_PROJECT_PATH, ''),
            selectedFiles: Storage.getJSON(STORAGE_KEYS.ENHANCE_SELECTED_FILES, []),
            userGuidelines: Storage.get(STORAGE_KEYS.ENHANCE_USER_GUIDELINES, 'none'),
            customGuidelinePath: Storage.get(STORAGE_KEYS.ENHANCE_CUSTOM_GUIDELINE_PATH, ''),
            includeReadme: Storage.get(STORAGE_KEYS.ENHANCE_INCLUDE_README, 'false') === 'true',
            treeDepth: parseInt(Storage.get(STORAGE_KEYS.ENHANCE_TREE_DEPTH, '20'), 10)
        },
        enhanceResult: '',
        enhanceExecuting: false,
        enhanceError: '',
        rawRequest: null,  // 存储完整的请求体用于RAW预览
        projectTree: '',   // 存储项目树结构
        systemPrompt: '',  // 存储完整的系统提示词（实际发送给 API 的内容）
        systemPromptEdit: '',  // 可编辑的系统提示词（用于 Advanced Settings）
        resultViewMode: 'raw',  // 'raw' | 'markdown' - Enhanced Result 显示模式
        showRawMessage: false,  // 是否显示 RAW Message 面板
        
        // Form validation state - Task 10.2: Field-level error tracking
        formValidation: {
            messageError: '',
            pathError: '',
            guidelineError: '',
            filesError: '',
            hasErrors: false
        },
        
        // Validation methods
        validateField(fieldName) {
            switch (fieldName) {
                case 'message':
                    return this.validateMessage();
                case 'path':
                    return this.validatePath();
                case 'guideline':
                    return this.validateGuideline();
                default:
                    return true;
            }
        },
        
        validateMessage() {
            const message = this.enhanceForm.originalMessage?.trim() || '';
            if (!message) {
                this.formValidation.messageError = 'Message cannot be empty';
                return false;
            }
            if (message.length > 100000) {
                this.formValidation.messageError = 'Message is too long (max 100,000 characters)';
                return false;
            }
            this.formValidation.messageError = '';
            return true;
        },
        
        validatePath() {
            const path = this.enhanceForm.projectPath?.trim() || '';
            
            // Path is required for anti-block protection
            if (!path) {
                this.formValidation.pathError = 'Project path is required for anti-block protection';
                return false;
            }
            
            // Basic path validation - must be absolute path
            // Accept various path formats without checking if they exist
            const isValid = path.length > 0 && (
                path.startsWith('/') ||           // Unix absolute path
                path.startsWith('\\\\') ||        // UNC path (\\server\share or \\wsl$\...)
                /^[a-zA-Z]:[\\\/]/.test(path) ||  // Windows drive letter (C:\ or C:/)
                path.startsWith('~')              // Home directory
            );
            
            if (!isValid) {
                this.formValidation.pathError = 'Invalid path format. Must be an absolute path.';
                return false;
            }
            
            // Path format is valid, clear error
            this.formValidation.pathError = '';
            return true;
        },
        
        validateGuideline() {
            const userGuidelines = this.enhanceForm.userGuidelines;
            const customPath = this.enhanceForm.customGuidelinePath?.trim() || '';
            
            if (userGuidelines === 'custom' && !customPath) {
                this.formValidation.guidelineError = 'Custom guideline path is required';
                return false;
            }
            
            this.formValidation.guidelineError = '';
            return true;
        },
        
        validateAllFields() {
            const messageValid = this.validateMessage();
            const pathValid = this.validatePath();
            const guidelineValid = this.validateGuideline();
            
            this.formValidation.hasErrors = !messageValid || !pathValid || !guidelineValid;
            return !this.formValidation.hasErrors;
        },
        
        clearValidationErrors() {
            this.formValidation = {
                messageError: '',
                pathError: '',
                guidelineError: '',
                filesError: '',
                hasErrors: false
            };
        },
        
        // UI State
        editMode: false,
        showKeyboardHelp: false, // Task 11.2: Keyboard shortcuts help modal state
        notification: {
            show: false,
            type: 'success', // success, error, warning
            message: ''
        },
        
        // Methods
        setPage(page) {
            this.currentPage = page;
            Storage.set(STORAGE_KEYS.CURRENT_PAGE, page);
        },
        
        toggleTheme() {
            this.theme = this.theme === 'light' ? 'dark' : 'light';
            Storage.set(STORAGE_KEYS.THEME, this.theme);
            this.applyTheme();
        },
        
        setTheme(theme) {
            this.theme = theme;
            Storage.set(STORAGE_KEYS.THEME, theme);
            this.applyTheme();
        },
        
        applyTheme() {
            if (this.theme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        },
        
        setLanguage(lang) {
            this.lang = lang;
            Storage.set(STORAGE_KEYS.LANG, lang);
        },
        
        showNotification(type, message) {
            this.notification = { show: true, type, message };
            setTimeout(() => {
                this.notification.show = false;
            }, 5000);
        },
        
        hideNotification() {
            this.notification.show = false;
        },
        
        // Persist enhance form data - comprehensive version
        persistEnhanceForm() {
            Storage.set(STORAGE_KEYS.ENHANCE_MESSAGE, this.enhanceForm.originalMessage || '');
            Storage.set(STORAGE_KEYS.ENHANCE_LANGUAGE, this.enhanceForm.language || 'zh');
            Storage.set(STORAGE_KEYS.ENHANCE_PROJECT_PATH, this.enhanceForm.projectPath || '');
            Storage.setJSON(STORAGE_KEYS.ENHANCE_SELECTED_FILES, this.enhanceForm.selectedFiles || []);
            Storage.set(STORAGE_KEYS.ENHANCE_USER_GUIDELINES, this.enhanceForm.userGuidelines || 'none');
            Storage.set(STORAGE_KEYS.ENHANCE_CUSTOM_GUIDELINE_PATH, this.enhanceForm.customGuidelinePath || '');
            Storage.set(STORAGE_KEYS.ENHANCE_INCLUDE_README, String(this.enhanceForm.includeReadme ?? false));
            Storage.set(STORAGE_KEYS.ENHANCE_TREE_DEPTH, String(this.enhanceForm.treeDepth ?? 20));
        },
        
        // Restore enhance form data from localStorage
        restoreEnhanceForm() {
            this.enhanceForm = {
                originalMessage: Storage.get(STORAGE_KEYS.ENHANCE_MESSAGE, ''),
                language: Storage.get(STORAGE_KEYS.ENHANCE_LANGUAGE, 'zh'),
                projectPath: Storage.get(STORAGE_KEYS.ENHANCE_PROJECT_PATH, ''),
                selectedFiles: Storage.getJSON(STORAGE_KEYS.ENHANCE_SELECTED_FILES, []),
                userGuidelines: Storage.get(STORAGE_KEYS.ENHANCE_USER_GUIDELINES, 'none'),
                customGuidelinePath: Storage.get(STORAGE_KEYS.ENHANCE_CUSTOM_GUIDELINE_PATH, ''),
                includeReadme: Storage.get(STORAGE_KEYS.ENHANCE_INCLUDE_README, 'false') === 'true',
                treeDepth: parseInt(Storage.get(STORAGE_KEYS.ENHANCE_TREE_DEPTH, '20'), 10)
            };
        },
        
        // Clear enhance form data
        clearEnhanceForm() {
            this.enhanceForm = {
                originalMessage: '',
                language: 'zh',
                projectPath: '',
                selectedFiles: [],
                userGuidelines: 'none',
                customGuidelinePath: '',
                includeReadme: false,
                treeDepth: 20
            };
            this.persistEnhanceForm();
        },
        
        // Initialize all persisted state on page load
        initPersistedState() {
            // Apply theme
            this.applyTheme();
            
            // Restore enhance form if on enhance-prompt page
            if (this.currentPage === 'enhance-prompt') {
                this.restoreEnhanceForm();
            }
            
            console.log('Persisted state initialized:', {
                page: this.currentPage,
                theme: this.theme,
                lang: this.lang
            });
        },
        
        // Clear all persisted data (useful for debugging or reset)
        clearAllPersistedData() {
            Storage.clear();
            this.currentPage = 'home';
            this.theme = 'light';
            this.lang = 'zh';
            this.clearEnhanceForm();
            this.applyTheme();
            this.showNotification('success', '所有保存的数据已清除');
        }
    });
});
