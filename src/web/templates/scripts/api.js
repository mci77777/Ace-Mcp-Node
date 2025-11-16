/**
 * API Client Module
 * Encapsulates all backend API calls with unified error handling
 */

const API = {
    baseURL: window.location.origin,
    
    /**
     * Error types for categorization
     */
    ErrorType: {
        NETWORK: 'network',
        CLIENT: 'client',
        SERVER: 'server',
        TIMEOUT: 'timeout',
        VALIDATION: 'validation'
    },
    
    /**
     * Parse and categorize errors
     */
    parseError(error, response = null) {
        // Network errors (no response)
        if (!response && (error.name === 'TypeError' || error.message.includes('Failed to fetch'))) {
            return {
                type: this.ErrorType.NETWORK,
                message: 'Network error: Unable to connect to server. Please check your connection.',
                originalError: error
            };
        }
        
        // Timeout errors
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
            return {
                type: this.ErrorType.TIMEOUT,
                message: 'Request timeout: The server took too long to respond. Please try again.',
                originalError: error
            };
        }
        
        // HTTP errors with response
        if (response) {
            const status = response.status;
            
            // 4xx Client errors
            if (status >= 400 && status < 500) {
                return {
                    type: this.ErrorType.CLIENT,
                    status: status,
                    message: this.getClientErrorMessage(status, error.message),
                    originalError: error
                };
            }
            
            // 5xx Server errors
            if (status >= 500) {
                return {
                    type: this.ErrorType.SERVER,
                    status: status,
                    message: this.getServerErrorMessage(status, error.message),
                    originalError: error
                };
            }
        }
        
        // Generic error
        return {
            type: this.ErrorType.VALIDATION,
            message: error.message || 'An unexpected error occurred',
            originalError: error
        };
    },
    
    /**
     * Get user-friendly message for client errors (4xx)
     */
    getClientErrorMessage(status, originalMessage) {
        const messages = {
            400: 'Invalid request: Please check your input and try again.',
            401: 'Authentication required: Please check your API credentials.',
            403: 'Access denied: You do not have permission to perform this action.',
            404: 'Not found: The requested resource does not exist.',
            413: 'Request too large: The data you are trying to send is too large.',
            429: 'Too many requests: Please wait a moment before trying again.'
        };
        
        // Use specific message if available, otherwise use original or generic
        const baseMessage = messages[status] || `Client error (${status})`;
        
        // Append original message if it provides additional context
        if (originalMessage && !originalMessage.includes('HTTP')) {
            return `${baseMessage} ${originalMessage}`;
        }
        
        return baseMessage;
    },
    
    /**
     * Get user-friendly message for server errors (5xx)
     */
    getServerErrorMessage(status, originalMessage) {
        const messages = {
            500: 'Server error: An internal error occurred. Please try again later.',
            502: 'Bad gateway: The server is temporarily unavailable.',
            503: 'Service unavailable: The server is currently under maintenance.',
            504: 'Gateway timeout: The server took too long to respond.'
        };
        
        return messages[status] || `Server error (${status}): Please try again later.`;
    },
    
    /**
     * Generic fetch wrapper with comprehensive error handling
     */
    async request(endpoint, options = {}) {
        const controller = new AbortController();
        const timeout = options.timeout || 30000; // Default 30s timeout
        
        // Setup timeout
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                signal: controller.signal,
                ...options
            });
            
            clearTimeout(timeoutId);
            
            // Handle non-OK responses
            if (!response.ok) {
                let errorData = {};
                try {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        errorData = await response.json();
                    } else {
                        // Non-JSON response, read as text
                        const text = await response.text();
                        errorData = { error: text || response.statusText };
                    }
                } catch (e) {
                    // Response body parsing failed
                    console.warn('Failed to parse error response:', e);
                    errorData = { error: response.statusText };
                }
                
                const error = new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                const parsedError = this.parseError(error, response);
                
                // Log detailed error for debugging
                console.error(`API Error [${endpoint}]:`, {
                    status: response.status,
                    statusText: response.statusText,
                    error: parsedError,
                    endpoint: endpoint
                });
                
                // Throw enhanced error
                const enhancedError = new Error(parsedError.message);
                enhancedError.type = parsedError.type;
                enhancedError.status = parsedError.status;
                enhancedError.originalError = parsedError.originalError;
                throw enhancedError;
            }
            
            // Parse successful response
            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return await response.json();
                } else {
                    // Non-JSON response, return as text wrapped in object
                    const text = await response.text();
                    return { data: text };
                }
            } catch (e) {
                console.error('Failed to parse response:', e);
                throw new Error('Failed to parse server response');
            }
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            // If error is already enhanced, re-throw it
            if (error.type) {
                throw error;
            }
            
            // Parse and enhance the error
            const parsedError = this.parseError(error);
            
            console.error(`API Error [${endpoint}]:`, parsedError);
            
            // Create enhanced error
            const enhancedError = new Error(parsedError.message);
            enhancedError.type = parsedError.type;
            enhancedError.status = parsedError.status;
            enhancedError.originalError = parsedError.originalError;
            throw enhancedError;
        }
    },
    
    // Status & Config
    async getStatus() {
        return this.request('/api/status');
    },
    
    async getConfig() {
        return this.request('/api/config');
    },
    
    async updateConfig(data) {
        return this.request('/api/config', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    // Projects
    async getProjects() {
        return this.request('/api/projects');
    },
    
    async checkProject(path) {
        return this.request('/api/projects/check', {
            method: 'POST',
            body: JSON.stringify({ project_path: path })
        });
    },
    
    async reindexProject(path) {
        return this.request('/api/projects/reindex', {
            method: 'POST',
            body: JSON.stringify({ project_path: path })
        });
    },
    
    async deleteProject(path) {
        return this.request('/api/projects/delete', {
            method: 'POST',
            body: JSON.stringify({ project_path: path })
        });
    },
    
    async getProjectDetails(path) {
        return this.request('/api/projects/details', {
            method: 'POST',
            body: JSON.stringify({ project_path: path })
        });
    },
    
    // Files
    async listFiles(projectPath, maxDepth = 20) {
        return this.request('/api/files/list', {
            method: 'POST',
            body: JSON.stringify({ 
                project_path: projectPath,
                max_depth: maxDepth
            })
        });
    },
    
    // Tools
    async executeTool(toolName, args) {
        return this.request('/api/tools/execute', {
            method: 'POST',
            body: JSON.stringify({ 
                tool_name: toolName,
                arguments: args
            })
        });
    },
    
    // Enhance Prompt
    async enhancePrompt(data, timeout = null) {
        // 如果没有指定 timeout，使用默认值 120000ms（120秒）
        // 前端可以通过 getConfig() 获取后端配置的 api_timeout 并传入
        const requestTimeout = timeout || 120000;
        
        return this.request('/api/enhance-prompt', {
            method: 'POST',
            body: JSON.stringify(data),
            timeout: requestTimeout
        });
    },
    
    async getModels() {
        return this.request('/api/models');
    },
    
    // Logs
    async getLogs() {
        return this.request('/api/logs');
    },
    
    // Prompt Files
    async getPromptFiles() {
        return this.request('/api/prompt-files');
    },
    
    async getPromptFile(filename) {
        return this.request(`/api/prompt-files/${encodeURIComponent(filename)}`);
    },
    
    async updatePromptFile(filename, content) {
        return this.request(`/api/prompt-files/${encodeURIComponent(filename)}`, {
            method: 'PUT',
            body: JSON.stringify({ content })
        });
    }
};
