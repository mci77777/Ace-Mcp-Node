/**
 * Utility Functions
 * Common helper functions used across the application
 */

const Utils = {
    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise<boolean>} Success status
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            // Fallback method
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            return success;
        }
    },
    
    /**
     * Format file size
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },
    
    /**
     * Format timestamp
     * @param {string|Date} timestamp - Timestamp to format
     * @returns {string} Formatted timestamp
     */
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString();
    },
    
    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * Throttle function
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    /**
     * Validate project path
     * @param {string} path - Path to validate
     * @returns {boolean} Is valid
     */
    isValidPath(path) {
        if (!path || typeof path !== 'string') return false;
        // Basic path validation - allow absolute paths
        return path.length > 0 && (
            path.startsWith('/') || 
            path.startsWith('\\') || 
            /^[a-zA-Z]:/.test(path) || // Windows drive letter
            path.startsWith('~')
        );
    },
    
    /**
     * Normalize path for display
     * @param {string} path - Path to normalize
     * @returns {string} Normalized path
     */
    normalizePath(path) {
        if (!path) return '';
        return path.replace(/\\/g, '/');
    },
    
    /**
     * Get file extension
     * @param {string} filename - Filename
     * @returns {string} Extension
     */
    getFileExtension(filename) {
        const parts = filename.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    },
    
    /**
     * Get file icon based on extension
     * @param {string} filename - Filename
     * @param {boolean} isDirectory - Is directory
     * @returns {string} Icon emoji
     */
    getFileIcon(filename, isDirectory = false) {
        if (isDirectory) return '📁';
        
        const ext = this.getFileExtension(filename);
        const iconMap = {
            // Code
            'js': '📜', 'ts': '📘', 'jsx': '⚛️', 'tsx': '⚛️',
            'py': '🐍', 'java': '☕', 'cpp': '⚙️', 'c': '⚙️',
            'go': '🔷', 'rs': '🦀', 'php': '🐘',
            
            // Web
            'html': '🌐', 'css': '🎨', 'scss': '🎨', 'sass': '🎨',
            
            // Data
            'json': '📋', 'xml': '📋', 'yaml': '📋', 'yml': '📋',
            'toml': '📋', 'ini': '📋', 'csv': '📊',
            
            // Docs
            'md': '📝', 'txt': '📄', 'pdf': '📕',
            
            // Config
            'env': '🔧', 'config': '🔧', 'conf': '🔧',
            
            // Images
            'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️', 'svg': '🖼️',
            
            // Archives
            'zip': '📦', 'tar': '📦', 'gz': '📦', 'rar': '📦'
        };
        
        return iconMap[ext] || '📄';
    },
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Parse error message with enhanced categorization
     * @param {Error|string} error - Error object or message
     * @returns {string} User-friendly error message
     */
    parseError(error) {
        if (typeof error === 'string') return error;
        
        // If error has enhanced type from API module
        if (error.type) {
            return error.message;
        }
        
        // Network errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return 'Network error: Unable to connect to server';
        }
        
        // Timeout errors
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
            return 'Request timeout: Server took too long to respond';
        }
        
        // Generic error with message
        if (error.message) {
            // Clean up technical error messages
            let message = error.message;
            
            // Remove stack traces
            if (message.includes('\n')) {
                message = message.split('\n')[0];
            }
            
            // Remove technical prefixes
            message = message.replace(/^Error:\s*/i, '');
            message = message.replace(/^TypeError:\s*/i, '');
            
            return message;
        }
        
        return 'An unexpected error occurred';
    },
    
    /**
     * Get error severity level
     * @param {Error} error - Error object
     * @returns {string} Severity level: 'error', 'warning', 'info'
     */
    getErrorSeverity(error) {
        if (!error) return 'info';
        
        // Network errors are critical
        if (error.type === 'network' || error.type === 'server') {
            return 'error';
        }
        
        // Client errors might be warnings (validation issues)
        if (error.type === 'client' || error.type === 'validation') {
            return 'warning';
        }
        
        // Timeout is a warning (can retry)
        if (error.type === 'timeout') {
            return 'warning';
        }
        
        return 'error';
    },
    
    /**
     * Format error for display with context
     * @param {Error} error - Error object
     * @param {string} context - Context where error occurred
     * @returns {Object} Formatted error object
     */
    formatError(error, context = '') {
        const message = this.parseError(error);
        const severity = this.getErrorSeverity(error);
        
        return {
            message: message,
            severity: severity,
            context: context,
            timestamp: new Date().toISOString(),
            canRetry: error.type === 'timeout' || error.type === 'network'
        };
    },
    
    /**
     * Component cache for loaded HTML components
     */
    componentCache: {},
    
    /**
     * Component loading error tracking
     */
    componentErrors: {},
    
    /**
     * Task 10.3: Load HTML component with comprehensive error handling
     * @param {string} componentPath - Path to component (e.g., 'enhance-prompt/advanced-options')
     * @param {Object} options - Loading options
     * @returns {Promise<string>} Component HTML
     */
    async loadComponent(componentPath, options = {}) {
        const { 
            useCache = true, 
            timeout = 10000,
            fallbackUI = null 
        } = options;
        
        // Check cache first
        if (useCache && this.componentCache[componentPath]) {
            console.log(`Component loaded from cache: ${componentPath}`);
            return this.componentCache[componentPath];
        }
        
        // Check if component previously failed
        if (this.componentErrors[componentPath]) {
            const error = this.componentErrors[componentPath];
            console.warn(`Component previously failed to load: ${componentPath}`, error);
            
            // Return fallback UI if provided
            if (fallbackUI) {
                return fallbackUI;
            }
        }
        
        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(`/static/components/${componentPath}.html`, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const html = await response.text();
            
            // Validate HTML content
            if (!html || html.trim().length === 0) {
                throw new Error('Component returned empty content');
            }
            
            // Cache the component
            this.componentCache[componentPath] = html;
            
            // Clear any previous errors
            delete this.componentErrors[componentPath];
            
            console.log(`Component loaded successfully: ${componentPath}`);
            return html;
            
        } catch (error) {
            // Task 10.3: Log error for debugging
            console.error(`Error loading component ${componentPath}:`, error);
            
            // Track the error
            this.componentErrors[componentPath] = {
                message: error.message,
                timestamp: new Date().toISOString(),
                type: error.name
            };
            
            // Return fallback UI
            if (fallbackUI) {
                return fallbackUI;
            }
            
            // Task 10.3: Return degraded UI with error information
            return this.getComponentErrorUI(componentPath, error);
        }
    },
    
    /**
     * Task 10.3: Generate error UI for failed component loads
     * @param {string} componentPath - Component path that failed
     * @param {Error} error - Error object
     * @returns {string} Error UI HTML
     */
    getComponentErrorUI(componentPath, error) {
        const isTimeout = error.name === 'AbortError';
        const isNetworkError = error.message.includes('fetch') || error.message.includes('network');
        
        let errorMessage = 'Failed to load component';
        let errorIcon = '❌';
        let canRetry = true;
        
        if (isTimeout) {
            errorMessage = 'Component loading timed out';
            errorIcon = '⏱️';
        } else if (isNetworkError) {
            errorMessage = 'Network error loading component';
            errorIcon = '🌐';
        } else if (error.message.includes('404')) {
            errorMessage = 'Component not found';
            errorIcon = '🔍';
            canRetry = false;
        }
        
        return `
            <div class="component-error-ui bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                <div class="text-4xl mb-3">${errorIcon}</div>
                <h3 class="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
                    ${errorMessage}
                </h3>
                <p class="text-sm text-red-700 dark:text-red-400 mb-1">
                    Component: <code class="bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded">${this.escapeHtml(componentPath)}</code>
                </p>
                <p class="text-xs text-red-600 dark:text-red-500 mb-4">
                    ${this.escapeHtml(error.message)}
                </p>
                ${canRetry ? `
                    <button 
                        onclick="location.reload()" 
                        class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                    >
                        🔄 Reload Page
                    </button>
                ` : ''}
                <div class="mt-4 text-xs text-gray-500 dark:text-gray-400">
                    The application will continue to work with reduced functionality.
                </div>
            </div>
        `;
    },
    
    /**
     * Task 10.3: Load and inject component with error handling
     * @param {string} componentPath - Path to component
     * @param {string} targetId - Target element ID
     * @param {Object} options - Loading options
     */
    async injectComponent(componentPath, targetId, options = {}) {
        const target = document.getElementById(targetId);
        
        if (!target) {
            console.error(`Target element not found: ${targetId}`);
            return false;
        }
        
        // Show loading state
        target.innerHTML = `
            <div class="flex items-center justify-center p-8">
                <svg class="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="ml-3 text-gray-600 dark:text-gray-400">Loading component...</span>
            </div>
        `;
        
        try {
            const html = await this.loadComponent(componentPath, options);
            target.innerHTML = html;
            return true;
        } catch (error) {
            console.error(`Failed to inject component ${componentPath}:`, error);
            target.innerHTML = this.getComponentErrorUI(componentPath, error);
            return false;
        }
    },
    
    /**
     * Task 10.3: Preload critical components
     * @param {Array<string>} componentPaths - Array of component paths to preload
     */
    async preloadComponents(componentPaths) {
        console.log(`Preloading ${componentPaths.length} components...`);
        
        const results = await Promise.allSettled(
            componentPaths.map(path => this.loadComponent(path))
        );
        
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        console.log(`Component preload complete: ${successful} successful, ${failed} failed`);
        
        return {
            successful,
            failed,
            total: componentPaths.length
        };
    },
    
    /**
     * Task 10.3: Clear component cache (useful for development/debugging)
     */
    clearComponentCache() {
        this.componentCache = {};
        this.componentErrors = {};
        console.log('Component cache cleared');
    },
    
    /**
     * Render Markdown to HTML (simple implementation)
     * @param {string} markdown - Markdown text
     * @returns {string} HTML string
     */
    renderMarkdown(markdown) {
        if (!markdown) return '';
        
        let html = markdown;
        
        // Escape HTML tags first
        html = html.replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;');
        
        // Headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
        
        // Italic
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/_(.*?)_/g, '<em>$1</em>');
        
        // Code blocks
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        
        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Lists
        html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
        html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // Line breaks
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';
        
        // Clean up empty paragraphs
        html = html.replace(/<p><\/p>/g, '');
        html = html.replace(/<p>\s*<\/p>/g, '');
        
        return html;
    }
};
