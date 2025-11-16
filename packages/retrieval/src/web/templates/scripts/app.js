/**
 * Main Application Logic - Retrieval Module
 * Initializes the Alpine.js application for codebase retrieval management
 */

/**
 * File Tree Node Component
 * Creates a reactive component for each file tree node with expand/collapse state
 */
function fileTreeNode(item) {
    return {
        item: item,
        expanded: false,
        
        toggle() {
            this.expanded = !this.expanded;
        },
        
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
                // Initialize all persisted state (theme, language)
                store.initPersistedState();
                
                // Load initial data with error handling
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
                
                console.log('Application initialized successfully');
                
            } catch (error) {
                console.error('Critical error during initialization:', error);
                const errorInfo = Utils.formatError(error, 'Application initialization');
                store.showNotification('error', `Initialization failed: ${errorInfo.message}`);
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
                store.showNotification('success', 'Configuration saved');
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
                store.showNotification('success', 'Project added successfully');
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
                store.showNotification('success', 'Project reindexed successfully');
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
                store.showNotification('success', 'Project deleted successfully');
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
                        const match = event.data.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \| (\w+)\s+\| (.+)$/);
                        if (match) {
                            store.logs.push({
                                timestamp: match[1],
                                level: match[2] || 'INFO',
                                message: match[3] || ''
                            });
                        } else {
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
        
        // Global keyboard shortcuts
        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                const store = Alpine.store('app');
                
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
            
            console.log('Keyboard shortcuts initialized: ESC (close)');
        }
    };
}
