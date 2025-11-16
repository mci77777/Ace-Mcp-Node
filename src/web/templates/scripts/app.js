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
                const html = await Utils.loadComponent('enhance-prompt/index-v4');
                const container = document.getElementById('enhance-prompt-page-container');
                if (container) {
                    container.innerHTML = html;
                    console.log('✅ Enhance-prompt page V4 loaded successfully (four-block layout)');
                    
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
                const errorInfo = Utils.formatError(error, 'Loading projects');
                store.showNotification(errorInfo.severity, errorInfo.message);
            }
        },
        
        async checkProject(path) {
            const store = Alpine.store('app');
            try {
                await API.checkProject(path);
                await this.loadProjects();
                store.showNotification('success', this.$t('project_added'));
            } catch (error) {
                console.error('Failed to check project:', error);
                const errorInfo = Utils.formatError(error, 'Adding project');
                store.showNotification(errorInfo.severity, errorInfo.message);
            }
        },
        
        async reindexProject(path) {
            const store = Alpine.store('app');
            try {
                await API.reindexProject(path);
                await this.loadProjects();
                store.showNotification('success', 'Project reindexed');
            } catch (error) {
                console.error('Failed to reindex project:', error);
                const errorInfo = Utils.formatError(error, 'Reindexing project');
                store.showNotification(errorInfo.severity, errorInfo.message);
            }
        },
        
        async deleteProject(path) {
            if (!confirm('Are you sure you want to delete this project?')) return;
            
            const store = Alpine.store('app');
            try {
                await API.deleteProject(path);
                await this.loadProjects();
                store.showNotification('success', this.$t('project_deleted'));
            } catch (error) {
                console.error('Failed to delete project:', error);
                const errorInfo = Utils.formatError(error, 'Deleting project');
                store.showNotification(errorInfo.severity, errorInfo.message);
            }
        },
        
        // WebSocket for logs
        setupWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const ws = new WebSocket(`${protocol}//${window.location.host}/ws/logs`);
            const store = Alpine.store('app');
            
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
                
                // Attempt to reconnect after 5 seconds
                setTimeout(() => this.setupWebSocket(), 5000);
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
        
        // File tree - Task 7: File Tree Functionality
        fileTree: null,
        fileTreeLoading: false,
        
        // Task 7.1: Load file tree from API
        async loadFileTree() {
            const store = Alpine.store('app');
            const projectPath = store.enhanceForm.projectPath;
            
            // Validate project path
            if (!projectPath || !projectPath.trim()) {
                store.showNotification('error', this.$t('error_invalid_path'));
                return;
            }
            
            this.fileTreeLoading = true;
            this.fileTree = null; // Clear previous tree
            
            try {
                // Call API with user-configured depth (default 20)
                const depth = store.enhanceForm.treeDepth || 20;
                console.log(`Loading file tree with depth: ${depth}`);
                const result = await API.listFiles(projectPath.trim(), depth);
                
                // Task 7.1: Build tree structure (already done by backend)
                this.fileTree = result.files || [];
                
                // Log success
                console.log(`Loaded file tree: ${this.countTreeFiles(this.fileTree)} files`);
                
                // Show success notification if files found
                if (this.fileTree.length > 0) {
                    const fileCount = this.countTreeFiles(this.fileTree);
                    store.showNotification('success', `Loaded ${fileCount} files from project`);
                } else {
                    store.showNotification('warning', 'No files found in project directory');
                }
            } catch (error) {
                console.error('Failed to load file tree:', error);
                this.fileTree = null;
                
                // Task 10.1: Enhanced error handling for file tree loading
                const errorInfo = Utils.formatError(error, 'Loading file tree');
                
                // Provide specific error messages based on error type
                let errorMessage = errorInfo.message;
                if (error.message) {
                    if (error.message.includes('does not exist')) {
                        errorMessage = 'Project path does not exist';
                    } else if (error.message.includes('not a directory')) {
                        errorMessage = 'Project path is not a directory';
                    } else if (error.message.includes('Permission denied')) {
                        errorMessage = 'Permission denied accessing project directory';
                    }
                }
                
                store.showNotification(errorInfo.severity, errorMessage);
            } finally {
                this.fileTreeLoading = false;
            }
        },
        
        // Task 7.3: Toggle file selection
        toggleFileSelection(filePath) {
            const store = Alpine.store('app');
            const index = store.enhanceForm.selectedFiles.indexOf(filePath);
            
            if (index > -1) {
                // Remove from selection
                store.enhanceForm.selectedFiles.splice(index, 1);
            } else {
                // Add to selection
                store.enhanceForm.selectedFiles.push(filePath);
            }
            
            // Persist selection to localStorage
            store.persistEnhanceForm();
            
            console.log(`File selection toggled: ${filePath}, total selected: ${store.enhanceForm.selectedFiles.length}`);
        },
        
        // Task 7.3: Check if file is selected
        isFileSelected(filePath) {
            const store = Alpine.store('app');
            return store.enhanceForm.selectedFiles.includes(filePath);
        },
        
        // Helper: Count total files in tree (recursive)
        countTreeFiles(nodes) {
            if (!nodes || !Array.isArray(nodes)) return 0;
            
            let count = 0;
            for (const node of nodes) {
                if (node.type === 'file') {
                    count++;
                } else if (node.type === 'directory' && node.children) {
                    count += this.countTreeFiles(node.children);
                }
            }
            return count;
        },
        
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
        
        // Generate project tree
        // 注意：这个方法生成的树可能不完全遵守 .gitignore
        // 完整的 .gitignore 支持在 enhance 时由后端处理
        async generateProjectTree(filesData = null) {
            const store = Alpine.store('app');
            const projectPath = store.enhanceForm.projectPath;
            
            if (!projectPath) {
                store.showNotification('warning', 'Please enter a project path first');
                return;
            }
            
            try {
                let data;
                
                // 如果提供了 filesData，直接使用；否则调用 API
                if (filesData) {
                    data = { files: filesData };
                    console.log('Using provided files data for project tree');
                } else {
                    // 调用后端 API 生成项目树（使用用户设置的深度）
                    const depth = store.enhanceForm.treeDepth || 20;
                    console.log(`Generating project tree with depth: ${depth}`);
                    const response = await fetch('/api/files/list', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            project_path: projectPath,
                            max_depth: depth
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    data = await response.json();
                }
                
                // 调试：打印返回的数据
                console.log('Files list response:', data);
                console.log('Files array:', data.files);
                console.log('Files count:', data.files ? data.files.length : 0);
                
                if (data.files && data.files.length > 0) {
                    console.log('First file:', data.files[0]);
                    console.log('First file children:', data.files[0].children ? data.files[0].children.length : 0);
                }
                
                // 将文件树转换为文本格式
                let treeText = '';
                if (data.files && data.files.length > 0) {
                    // 如果只有一个根节点，直接展开它的子节点
                    if (data.files.length === 1 && data.files[0].type === 'directory') {
                        const root = data.files[0];
                        treeText = root.name + '/\n';
                        if (root.children && root.children.length > 0) {
                            treeText += this.convertFileTreeToText(root.children);
                        }
                    } else {
                        treeText = this.convertFileTreeToText(data.files);
                    }
                }
                
                store.projectTree = treeText;
                
                console.log('Generated tree text:', treeText);
                console.log('Tree text length:', treeText.length);
                console.log('Tree lines:', treeText.split('\n').length);
                
                const fileCount = this.countFiles(data.files);
                store.showNotification('success', `Project tree generated (${fileCount} files)`);
            } catch (error) {
                console.error('Failed to generate project tree:', error);
                const errorInfo = Utils.formatError(error, 'Generating project tree');
                store.showNotification(errorInfo.severity, errorInfo.message);
            }
        },
        
        // Convert file tree to text format (directories only, whitelist mode)
        convertFileTreeToText(files, prefix = '', isLast = true) {
            if (!files || files.length === 0) return '';
            
            let result = '';
            
            // Whitelist: only include source code directories
            const sourceCodeDirs = [
                'src', 'app', 'lib', 'core', 'features', 'modules', 'components',
                'services', 'utils', 'helpers', 'models', 'views', 'controllers',
                'api', 'routes', 'middleware', 'config', 'database', 'migrations',
                'tests', 'test', '__tests__', 'specs', 'e2e',
                'public', 'assets', 'resources', 'static',
                'packages', 'libs', 'shared', 'common'
            ];
            
            // Filter to only include directories
            let directories = files.filter(file => file.type === 'directory');
            
            // Apply whitelist filter only at top level
            if (prefix === '') {
                directories = directories.filter(dir => {
                    const lowerName = dir.name.toLowerCase();
                    return sourceCodeDirs.some(allowed => lowerName.includes(allowed));
                });
                console.log(`Converting ${directories.length} whitelisted top-level directories to text`);
            }
            
            directories.forEach((file, index) => {
                const isLastItem = index === directories.length - 1;
                const connector = isLastItem ? '└── ' : '├── ';
                const newPrefix = prefix + (isLastItem ? '    ' : '│   ');
                
                result += prefix + connector + file.name + '/\n';
                if (file.children && file.children.length > 0) {
                    result += this.convertFileTreeToText(file.children, newPrefix, isLastItem);
                }
            });
            
            return result;
        },
        
        // Count total files in tree
        countFiles(files) {
            if (!files || files.length === 0) return 0;
            
            let count = 0;
            files.forEach(file => {
                if (file.type === 'file') {
                    count++;
                } else if (file.type === 'directory' && file.children) {
                    count += this.countFiles(file.children);
                }
            });
            
            return count;
        },
        
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
