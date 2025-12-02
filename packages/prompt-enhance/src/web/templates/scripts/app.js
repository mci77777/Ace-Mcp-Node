/**
 * Main Application Logic
 * Initializes the Alpine.js application and provides core functionality
 */

/**
 * Task 7.2: File Tree Node Component
 * Creates a reactive component for each file tree node with expand/collapse state
 */
function fileTreeNode(item) {
    return {
        item: item,
        expanded: false, // Default collapsed state
        
        // Toggle expand/collapse
        toggle() {
            this.expanded = !this.expanded;
        },
        
        // Check if node has children
        hasChildren() {
            return this.item.type === 'directory' && 
                   this.item.children && 
                   this.item.children.length > 0;
        }
    };
}

function mcpManager() {
    return {
        // Initialization
        async init() {
            const store = Alpine.store('app');
            
            try {
                // Task 9.2: Initialize all persisted state (theme, language, form data)
                store.initPersistedState();
                
                // Task 10.3: Load initial data with error handling
                await Promise.allSettled([
                    this.loadStatus(),
                    this.loadConfig(),
                    this.loadProjects()
                ]);
                
                // Setup WebSocket for logs (non-critical, don't block on errors)
                try {
                    this.setupWebSocket();
                } catch (error) {
                    console.error('Failed to setup WebSocket:', error);
                    store.showNotification('warning', 'Real-time logs unavailable');
                }
                
                // Setup keyboard shortcuts
                this.setupKeyboardShortcuts();
                
                // Watch for page changes to load enhance-prompt page
                this.watchPageChanges();
                
                console.log('Application initialized successfully');
                
            } catch (error) {
                console.error('Critical error during initialization:', error);
                const errorInfo = Utils.formatError(error, 'Application initialization');
                store.showNotification('error', `Initialization failed: ${errorInfo.message}`);
            }
        },
        
        // Watch for page changes
        watchPageChanges() {
            // Watch the store's currentPage property
            Alpine.effect(() => {
                const store = Alpine.store('app');
                const currentPage = store.currentPage;
                
                if (currentPage === 'enhance-prompt') {
                    // Use nextTick to ensure DOM is ready
                    Alpine.nextTick(() => {
                        this.loadEnhancePromptPage();
                    });
                }
            });
        },
        
        // Load enhance-prompt page components
        async loadEnhancePromptPage() {
            try {
                console.log('Loading enhance-prompt page...');
                const html = await Utils.loadComponent('enhance-prompt/index');
                const container = document.getElementById('enhance-prompt-page-container');
                if (container) {
                    container.innerHTML = html;
                    console.log('✅ Enhance-prompt page loaded successfully (four-block layout)');
                    
                    // Load sub-components after main page is loaded
                    await this.loadEnhancePromptSubComponents();
                    
                    // Auto-load default prompt file
                    await this.loadPromptFile('prompt.txt');
                } else {
                    console.error('❌ Container #enhance-prompt-page-container not found');
                }
            } catch (error) {
                console.error('❌ Failed to load enhance-prompt page:', error);
                const container = document.getElementById('enhance-prompt-page-container');
                if (container) {
                    container.innerHTML = `
                        <div class="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                            <div class="text-4xl mb-3">❌</div>
                            <h3 class="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
                                Failed to load Enhance Prompt page
                            </h3>
                            <p class="text-sm text-red-700 dark:text-red-400 mb-4">
                                ${error.message}
                            </p>
                            <button 
                                onclick="location.reload()" 
                                class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                            >
                                🔄 Reload Page
                            </button>
                        </div>
                    `;
                }
            }
        },
        
        // Load enhance-prompt sub-components
        async loadEnhancePromptSubComponents() {
            try {
                console.log('Loading enhance-prompt sub-components...');
                
                // Load API Config Split component
                const apiConfigContainer = document.getElementById('api-config-split-content');
                if (apiConfigContainer) {
                    const apiConfigHtml = await Utils.loadComponent('enhance-prompt/api-config-split');
                    apiConfigContainer.innerHTML = apiConfigHtml;
                    console.log('✅ API Config Split component loaded');
                }
                
                // Load Prompt Editor component
                const promptEditorContainer = document.getElementById('prompt-editor-content');
                if (promptEditorContainer) {
                    const promptEditorHtml = await Utils.loadComponent('enhance-prompt/prompt-editor');
                    promptEditorContainer.innerHTML = promptEditorHtml;
                    console.log('✅ Prompt Editor component loaded');
                }
                
                console.log('✅ All enhance-prompt sub-components loaded successfully');
            } catch (error) {
                console.error('❌ Failed to load enhance-prompt sub-components:', error);
            }
        },
        
        // Status & Config
        async loadStatus() {
            const store = Alpine.store('app');
            try {
                const data = await API.getStatus();
                store.status = data;
            } catch (error) {
                console.error('Failed to load status:', error);
                const errorInfo = Utils.formatError(error, 'Loading server status');
                store.showNotification(errorInfo.severity, errorInfo.message);
            }
        },
        
        async loadConfig() {
            const store = Alpine.store('app');
            try {
                const data = await API.getConfig();
                store.config = data;
            } catch (error) {
                console.error('Failed to load config:', error);
                const errorInfo = Utils.formatError(error, 'Loading configuration');
                store.showNotification(errorInfo.severity, errorInfo.message);
            }
        },
        
        async saveConfig() {
            const store = Alpine.store('app');
            try {
                await API.updateConfig(store.config);
                store.editMode = false;
                store.showNotification('success', this.$t('config_saved'));
            } catch (error) {
                console.error('Failed to save config:', error);
                const errorInfo = Utils.formatError(error, 'Saving configuration');
                store.showNotification(errorInfo.severity, errorInfo.message);
            }
        },
        
        // Projects
        async loadProjects() {
            const store = Alpine.store('app');
            try {
                const data = await API.getProjects();
                store.projects = data.projects || [];
            } catch (error) {
                console.error('Failed to load projects:', error);
                // Don't show notification for initial load failure
            }
        },
        
        async checkProject(path) {
            const store = Alpine.store('app');
            if (!path || !path.trim()) {
                store.showNotification('warning', 'Please enter a project path');
                return;
            }
            
            try {
                const data = await API.checkProject(path.trim());
                
                if (data.indexed) {
                    store.showNotification('info', `Project already indexed with ${data.blob_count} blobs`);
                } else {
                    // Auto-reindex if not indexed
                    store.showNotification('info', 'Project not indexed, starting indexing...');
                    await this.reindexProject(path.trim());
                }
                
                // Reload projects list
                await this.loadProjects();
            } catch (error) {
                console.error('Failed to check project:', error);
                const errorInfo = Utils.formatError(error, 'Checking project');
                store.showNotification(errorInfo.severity, errorInfo.message);
            }
        },
        
        async reindexProject(path) {
            const store = Alpine.store('app');
            try {
                store.showNotification('info', 'Indexing project, please wait...');
                const data = await API.reindexProject(path);
                
                if (data.success) {
                    store.showNotification('success', data.result?.message || 'Project indexed successfully');
                } else {
                    store.showNotification('error', data.message || 'Failed to index project');
                }
                
                // Reload projects list
                await this.loadProjects();
            } catch (error) {
                console.error('Failed to reindex project:', error);
                const errorInfo = Utils.formatError(error, 'Reindexing project');
                store.showNotification(errorInfo.severity, errorInfo.message);
            }
        },
        
        async deleteProject(path) {
            const store = Alpine.store('app');
            
            if (!confirm('Are you sure you want to delete this project index?')) {
                return;
            }
            
            try {
                await API.deleteProject(path);
                store.showNotification('success', 'Project index deleted');
                
                // Reload projects list
                await this.loadProjects();
            } catch (error) {
                console.error('Failed to delete project:', error);
                const errorInfo = Utils.formatError(error, 'Deleting project');
                store.showNotification(errorInfo.severity, errorInfo.message);
            }
        },
        
        // WebSocket instance reference
        _ws: null,
        _wsReconnectTimer: null,
        
        // WebSocket for logs
        setupWebSocket() {
            const store = Alpine.store('app');
            
            // 清除重连定时器
            if (this._wsReconnectTimer) {
                clearTimeout(this._wsReconnectTimer);
                this._wsReconnectTimer = null;
            }
            
            // 关闭现有连接
            if (this._ws) {
                console.log('Closing existing WebSocket connection');
                this._ws.onclose = null; // 防止触发重连
                this._ws.close();
                this._ws = null;
            }
            
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            this._ws = new WebSocket(`${protocol}//${window.location.host}/ws/logs`);
            const ws = this._ws;
            
            ws.onopen = () => {
                store.wsConnected = true;
                console.log('WebSocket connected');
            };
            
            ws.onmessage = (event) => {
                try {
                    // Try to parse as JSON first
                    const log = JSON.parse(event.data);
                    // Ensure log has required fields
                    if (log && typeof log === 'object') {
                        store.logs.push({
                            timestamp: log.timestamp || new Date().toISOString(),
                            level: log.level || 'INFO',
                            message: log.message || ''
                        });
                    }
                } catch (error) {
                    // If not JSON, treat as plain text log message
                    if (typeof event.data === 'string' && event.data.trim()) {
                        // Parse plain text log format: "2025-11-15 18:58:50 | INFO | Message"
                        const match = event.data.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \| (\w+)\s+\| (.+)$/);
                        if (match) {
                            store.logs.push({
                                timestamp: match[1],
                                level: match[2] || 'INFO',
                                message: match[3] || ''
                            });
                        } else {
                            // Fallback: just add as a simple log entry
                            store.logs.push({
                                timestamp: new Date().toISOString(),
                                level: 'INFO',
                                message: event.data || ''
                            });
                        }
                    }
                }
                
                // Keep only last 500 logs
                if (store.logs.length > 500) {
                    store.logs = store.logs.slice(-500);
                }
            };
            
            ws.onclose = () => {
                store.wsConnected = false;
                console.log('WebSocket disconnected');
                this._ws = null;
                
                // Attempt to reconnect after 5 seconds
                this._wsReconnectTimer = setTimeout(() => this.setupWebSocket(), 5000);
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        },
        
        clearLogs() {
            Alpine.store('app').logs = [];
        },
        
        // Task 11.1: Global keyboard shortcuts
        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                const store = Alpine.store('app');
                
                // Ctrl+Enter: Submit enhance prompt
                if (e.ctrlKey && e.key === 'Enter') {
                    // Only trigger on enhance-prompt page with valid input
                    if (store.currentPage === 'enhance-prompt' && 
                        store.enhanceForm.originalMessage && 
                        !store.enhanceExecuting) {
                        e.preventDefault(); // Prevent default behavior
                        this.submitEnhancePrompt();
                        console.log('Keyboard shortcut: Ctrl+Enter - Enhance prompt submitted');
                    }
                }
                
                // ESC: Close modals and notifications
                if (e.key === 'Escape') {
                    // Close notification if visible
                    if (store.notification.visible) {
                        store.hideNotification();
                        console.log('Keyboard shortcut: ESC - Notification closed');
                    }
                    
                    // Close project details modal if open
                    const projectDetailsModal = document.querySelector('[x-data*="projectDetailsModal"]');
                    if (projectDetailsModal && projectDetailsModal.__x) {
                        const modalData = projectDetailsModal.__x.$data;
                        if (modalData && modalData.open) {
                            modalData.open = false;
                            console.log('Keyboard shortcut: ESC - Modal closed');
                        }
                    }
                }
            });
            
            console.log('Keyboard shortcuts initialized: Ctrl+Enter (enhance), ESC (close)');
        },
        
        // Enhance Prompt - Task 6.1: Form Data Collection
        async submitEnhancePrompt() {
            const store = Alpine.store('app');
            
            // Task 10.2: Comprehensive form validation with field-level errors
            const isValid = store.validateAllFields();
            
            if (!isValid) {
                // Show first error found
                if (store.formValidation.messageError) {
                    store.showNotification('error', store.formValidation.messageError);
                } else if (store.formValidation.pathError) {
                    store.showNotification('error', store.formValidation.pathError);
                } else if (store.formValidation.guidelineError) {
                    store.showNotification('error', store.formValidation.guidelineError);
                }
                return;
            }
            
            store.enhanceExecuting = true;
            store.enhanceError = '';
            store.enhanceResult = '';
            
            try {
                // Task 6.1: Collect form data
                // Collect original message
                const originalMessage = store.enhanceForm.originalMessage.trim();
                
                // Collect language selection
                const language = store.enhanceForm.language || 'zh';
                
                // Collect project path
                const projectPath = store.enhanceForm.projectPath?.trim() || '';
                
                // Collect selected files
                const selectedFiles = store.enhanceForm.selectedFiles || [];
                
                // Collect user guidelines option
                const userGuidelines = store.enhanceForm.userGuidelines || 'none';
                
                // Collect custom guideline path
                const customGuidelinePath = store.enhanceForm.customGuidelinePath?.trim() || '';
                
                // Collect workspace guideline option (README)
                const includeReadme = store.enhanceForm.includeReadme || false;
                
                // Task 6.3: Build request data for API call
                const requestData = {
                    projectPath: projectPath || undefined,
                    originalMessage: originalMessage,
                    language: language,
                    contextFiles: selectedFiles.length > 0 ? selectedFiles : undefined,
                    userGuidelines: userGuidelines !== 'none' ? userGuidelines : undefined,
                    customGuidelinePath: customGuidelinePath || undefined,
                    includeReadme: includeReadme || undefined
                };
                
                // Remove undefined values to keep request clean
                Object.keys(requestData).forEach(key => {
                    if (requestData[key] === undefined) {
                        delete requestData[key];
                    }
                });
                
                // Task 6.3: Call API endpoint with configured timeout
                // 从配置中读取 api_timeout，如果没有则使用默认值
                const apiTimeout = store.config?.api_timeout || 120000;
                const result = await API.enhancePrompt(requestData, apiTimeout);
                
                // Task 6.4: Display enhanced result
                store.enhanceResult = result.enhancedPrompt || result.enhanced_prompt || '';
                
                // 保存 RAW 请求数据、项目树和系统提示词
                store.rawRequest = result.rawRequest || requestData;
                store.projectTree = result.projectTree || '';
                store.systemPrompt = result.systemPrompt || '';
                
                // 自动显示 RAW Message 面板
                store.showRawMessage = true;
                
                store.showNotification('success', this.$t('prompt_enhanced'));
                
                // Persist form data to localStorage
                store.persistEnhanceForm();
            } catch (error) {
                console.error('Failed to enhance prompt:', error);
                
                // Task 10.1: Enhanced error handling with categorization
                const errorInfo = Utils.formatError(error, 'Enhancing prompt');
                store.enhanceError = errorInfo.message;
                
                // Show notification with appropriate severity
                store.showNotification(errorInfo.severity, errorInfo.message);
                
                // If error is retryable, show retry option in UI
                if (errorInfo.canRetry) {
                    console.log('Error is retryable - user can try again');
                }
            } finally {
                store.enhanceExecuting = false;
            }
        },
        
        // Task 6.4: Retry functionality
        async retryEnhancePrompt() {
            await this.submitEnhancePrompt();
        },
        
        async copyEnhancedPrompt() {
            const store = Alpine.store('app');
            if (!store.enhanceResult) return;
            
            const success = await Utils.copyToClipboard(store.enhanceResult);
            if (success) {
                store.showNotification('success', this.$t('copied_to_clipboard'));
            } else {
                store.showNotification('error', 'Failed to copy');
            }
        },
        
        // File tree - REMOVED: File tree functionality not needed for prompt-enhance
        // The backend handles file scanning internally during prompt enhancement
        
        // Task 10.3: Component loading for secondary tabs with error handling
        async loadSecondaryTabComponents() {
            const store = Alpine.store('app');
            
            try {
                // Load all secondary tab components with error handling
                const results = await Promise.allSettled([
                    Utils.injectComponent('enhance-prompt/advanced-options', 'advanced-options-content'),
                    Utils.injectComponent('enhance-prompt/logs', 'logs-content'),
                    Utils.injectComponent('enhance-prompt/prompt-editor', 'prompt-editor-content')
                ]);
                
                // Check for failures
                const failed = results.filter(r => r.status === 'rejected');
                if (failed.length > 0) {
                    console.warn(`${failed.length} secondary tab components failed to load`);
                    store.showNotification('warning', 'Some components failed to load');
                }
            } catch (error) {
                console.error('Error loading secondary tab components:', error);
                const errorInfo = Utils.formatError(error, 'Loading components');
                store.showNotification('error', errorInfo.message);
            }
        },
        
        // Task 10.2: Enhanced form validation methods with real-time feedback
        validateMessageInput() {
            const store = Alpine.store('app');
            store.validateMessage();
        },
        
        validateProjectPath() {
            const store = Alpine.store('app');
            store.validatePath();
        },
        
        validateCustomGuideline() {
            const store = Alpine.store('app');
            store.validateGuideline();
        },
        
        // Watch for form changes to trigger validation and persistence
        watchFormChanges() {
            const store = Alpine.store('app');
            
            // Task 10.2: Validate form fields in real-time
            store.validatePath();
            store.validateGuideline();
            
            // Task 9.1: Persist form data to localStorage on every change
            store.persistEnhanceForm();
        },
        
        // Submit enhance prompt with anti-block logic
        async submitEnhancePrompt() {
            const store = Alpine.store('app');
            
            // Validate all fields before submission
            if (!store.validateAllFields()) {
                store.showNotification('error', 'Please fix validation errors before submitting');
                return;
            }
            
            // Set executing state
            store.enhanceExecuting = true;
            store.enhanceError = '';
            store.enhanceResult = '';
            
            try {
                console.log('Submitting enhance prompt with anti-block logic...');
                console.log('Form data:', {
                    projectPath: store.enhanceForm.projectPath,
                    messageLength: store.enhanceForm.originalMessage.length,
                    selectedFiles: store.enhanceForm.selectedFiles.length,
                    userGuidelines: store.enhanceForm.userGuidelines,
                    includeReadme: store.enhanceForm.includeReadme
                });
                
                // Call API with complete form data (including anti-block measures)
                // 从配置中读取 api_timeout，如果没有则使用默认值
                const apiTimeout = store.config?.api_timeout || 120000;
                const result = await API.enhancePrompt({
                    projectPath: store.enhanceForm.projectPath,
                    originalMessage: store.enhanceForm.originalMessage,
                    language: store.enhanceForm.language || 'zh',  // 添加语言参数
                    model: 'default', // TODO: Add model selection UI
                    selectedFiles: store.enhanceForm.selectedFiles,
                    userGuidelines: store.enhanceForm.userGuidelines,
                    customGuidelinePath: store.enhanceForm.customGuidelinePath,
                    includeReadme: store.enhanceForm.includeReadme
                }, apiTimeout);
                
                // Store result, raw request, and system prompt
                store.enhanceResult = result.enhancedPrompt;
                store.rawRequest = result.rawRequest || null;  // 存储RAW请求体
                store.projectTree = result.projectTree || '';
                store.systemPrompt = result.systemPrompt || '';
                
                console.log('✅ Enhance prompt completed successfully');
                console.log('Result length:', result.enhancedPrompt.length, 'chars');
                console.log('Language:', result.language || 'zh');
                
                store.showNotification('success', 'Prompt enhanced successfully!');
                
            } catch (error) {
                console.error('❌ Failed to enhance prompt:', error);
                
                // Format error message
                const errorInfo = Utils.formatError(error, 'Enhancing prompt');
                store.enhanceError = errorInfo.message;
                
                // Show notification
                store.showNotification('error', `Enhancement failed: ${errorInfo.message}`);
            } finally {
                store.enhanceExecuting = false;
            }
        },
        
        // Retry enhance prompt (after error)
        async retryEnhancePrompt() {
            await this.submitEnhancePrompt();
        },
        
        // Copy enhanced prompt to clipboard
        async copyEnhancedPrompt() {
            const store = Alpine.store('app');
            
            if (!store.enhanceResult) {
                store.showNotification('warning', 'No result to copy');
                return;
            }
            
            try {
                await navigator.clipboard.writeText(store.enhanceResult);
                store.showNotification('success', 'Copied to clipboard!');
            } catch (error) {
                console.error('Failed to copy to clipboard:', error);
                store.showNotification('error', 'Failed to copy to clipboard');
            }
        },
        
        // Generate project tree - REMOVED: Not needed for prompt-enhance
        // The backend generates project tree automatically during prompt enhancement
        // and returns it in the API response
        
        // File tree conversion helpers - REMOVED: Not needed for prompt-enhance
        // The backend handles all file tree generation
        
        // Load prompt file
        async loadPromptFile(filename) {
            const store = Alpine.store('app');
            
            try {
                const data = await API.getPromptFile(filename);
                store.systemPromptEdit = data.content || '';
                store.systemPrompt = data.content || ''; // 同时更新 systemPrompt 以实时显示
                store.showNotification('success', `Loaded ${filename}`);
            } catch (error) {
                console.error('Failed to load prompt file:', error);
                const errorInfo = Utils.formatError(error, 'Loading prompt file');
                store.showNotification(errorInfo.severity, errorInfo.message);
            }
        },
        
        // Save prompt file
        async savePromptFile(filename, content) {
            const store = Alpine.store('app');
            
            try {
                await API.updatePromptFile(filename, content);
                store.showNotification('success', `Saved ${filename}`);
            } catch (error) {
                console.error('Failed to save prompt file:', error);
                const errorInfo = Utils.formatError(error, 'Saving prompt file');
                store.showNotification(errorInfo.severity, errorInfo.message);
            }
        }
    };
}
