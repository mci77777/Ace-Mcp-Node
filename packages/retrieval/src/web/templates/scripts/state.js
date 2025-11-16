/**
 * Global State Management using Alpine.js Stores - Retrieval Module
 * Manages application state, UI state, and data persistence
 */

// Storage keys constants
const STORAGE_KEYS = {
    CURRENT_PAGE: 'retrieval_currentPage',
    THEME: 'retrieval_theme',
    LANG: 'retrieval_lang'
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
            return JSON.parse(value);
        } catch (e) {
            console.error(`Error parsing JSON from localStorage: ${key}`, e);
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
            batch_size: 0,
            max_lines_per_blob: 0,
            text_extensions: [],
            exclude_patterns: [],
            api_timeout: 120000,
            web_port: 8090
        },
        
        // Projects
        projects: [],
        
        // Logs
        logs: [],
        wsConnected: false,
        
        // Edit Mode
        editMode: false,
        
        // Notification State
        notification: {
            visible: false,
            type: 'info',
            message: ''
        },
        
        // Keyboard Help Modal
        showKeyboardHelp: false,
        
        // Methods
        
        // Initialize persisted state
        initPersistedState() {
            // Apply theme
            if (this.theme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            
            console.log('Persisted state initialized:', {
                currentPage: this.currentPage,
                theme: this.theme,
                lang: this.lang
            });
        },
        
        // Page navigation
        setPage(page) {
            this.currentPage = page;
            Storage.set(STORAGE_KEYS.CURRENT_PAGE, page);
            console.log('Page changed to:', page);
        },
        
        // Theme toggle
        toggleTheme() {
            this.theme = this.theme === 'light' ? 'dark' : 'light';
            Storage.set(STORAGE_KEYS.THEME, this.theme);
            
            if (this.theme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            
            console.log('Theme changed to:', this.theme);
        },
        
        // Language selection
        setLanguage(lang) {
            this.lang = lang;
            Storage.set(STORAGE_KEYS.LANG, lang);
            console.log('Language changed to:', lang);
        },
        
        // Notification methods
        showNotification(type, message) {
            this.notification = {
                visible: true,
                type: type,
                message: message
            };
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                this.hideNotification();
            }, 5000);
        },
        
        hideNotification() {
            this.notification.visible = false;
        },
        
        // Translation helper
        $t(key) {
            return window.$t ? window.$t(key) : key;
        }
    });
});
