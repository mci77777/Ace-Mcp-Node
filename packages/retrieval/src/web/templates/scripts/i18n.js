/**
 * Internationalization (i18n) Module - Retrieval Module
 * Provides translation support for English and Simplified Chinese
 */

const translations = {
    en: {
        // General
        title: 'Codebase Retrieval',
        subtitle: 'MCP Server Management Interface',
        
        // Navigation
        nav_home: '🏠 Home',
        nav_config: '⚙️ Configuration',
        nav_logs: '📋 Logs',
        
        // Status
        status: 'Status',
        status_running: 'Running',
        status_loading: 'Loading',
        indexed_projects: 'Indexed Projects',
        storage_path: 'Storage Path',
        
        // Configuration
        configuration: 'Configuration',
        edit: 'Edit',
        cancel: 'Cancel',
        save: 'Save',
        base_url: 'Base URL',
        token: 'Token',
        batch_size: 'Batch Size',
        max_lines_per_blob: 'Max Lines Per Blob',
        text_extensions: 'Text Extensions',
        exclude_patterns: 'Exclude Patterns',
        api_timeout: 'API Timeout (ms)',
        web_port: 'Web Port',
        
        // Projects
        projects: 'Projects',
        project_path: 'Project Path',
        blob_count: 'Blob Count',
        file_count: 'File Count',
        actions: 'Actions',
        view_details: 'View Details',
        reindex: 'Reindex',
        delete: 'Delete',
        check_project: 'Check Project',
        add_project: 'Add Project',
        
        // Logs
        logs: 'Logs',
        clear_logs: 'Clear Logs',
        ws_connected: 'WebSocket Connected',
        ws_disconnected: 'WebSocket Disconnected',
        
        // Tool Debugger
        tool_debugger: 'Tool Debugger',
        test_tool: 'Test Tool',
        query: 'Query',
        placeholder_query: 'Enter search query...',
        placeholder_path: 'Enter project path...',
        
        // Language
        language_chinese: '🇨🇳 Simplified Chinese',
        language_english: '🇺🇸 English',
        
        // Keyboard Shortcuts
        keyboard_shortcuts: 'Keyboard Shortcuts',
        
        // Notifications
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        config_saved: 'Configuration saved successfully',
        config_save_failed: 'Failed to save configuration',
        project_added: 'Project added successfully',
        project_deleted: 'Project deleted successfully',
        copied_to_clipboard: 'Copied to clipboard',
        
        // Errors
        error_network: 'Network error. Please check your connection.',
        error_server: 'Server error. Please try again later.',
        error_invalid_path: 'Invalid project path',
        error_loading_failed: 'Failed to load data',
    },
    
    zh: {
        // 通用
        title: '代码库检索',
        subtitle: 'MCP 服务器管理界面',
        
        // 导航
        nav_home: '🏠 首页',
        nav_config: '⚙️ 配置',
        nav_logs: '📋 日志',
        
        // 状态
        status: '状态',
        status_running: '运行中',
        status_loading: '加载中',
        indexed_projects: '已索引项目',
        storage_path: '存储路径',
        
        // 配置
        configuration: '配置',
        edit: '编辑',
        cancel: '取消',
        save: '保存',
        base_url: '基础 URL',
        token: '令牌',
        batch_size: '批次大小',
        max_lines_per_blob: '每个 Blob 最大行数',
        text_extensions: '文本扩展名',
        exclude_patterns: '排除模式',
        api_timeout: 'API 超时时间 (毫秒)',
        web_port: 'Web 端口',
        
        // 项目
        projects: '项目',
        project_path: '项目路径',
        blob_count: 'Blob 数量',
        file_count: '文件数量',
        actions: '操作',
        view_details: '查看详情',
        reindex: '重新索引',
        delete: '删除',
        check_project: '检查项目',
        add_project: '添加项目',
        
        // 日志
        logs: '日志',
        clear_logs: '清空日志',
        ws_connected: 'WebSocket 已连接',
        ws_disconnected: 'WebSocket 已断开',
        
        // 工具调试器
        tool_debugger: '工具调试器',
        test_tool: '测试工具',
        query: '查询',
        placeholder_query: '输入搜索查询...',
        placeholder_path: '输入项目路径...',
        
        // 语言
        language_chinese: '🇨🇳 简体中文',
        language_english: '🇺🇸 English',
        
        // 键盘快捷键
        keyboard_shortcuts: '键盘快捷键',
        
        // 通知
        success: '成功',
        error: '错误',
        warning: '警告',
        config_saved: '配置保存成功',
        config_save_failed: '配置保存失败',
        project_added: '项目添加成功',
        project_deleted: '项目删除成功',
        copied_to_clipboard: '已复制到剪贴板',
        
        // 错误
        error_network: '网络错误，请检查您的连接。',
        error_server: '服务器错误，请稍后重试。',
        error_invalid_path: '无效的项目路径',
        error_loading_failed: '加载数据失败',
    }
};

// Translation function
function $t(key) {
    const store = Alpine.store('app');
    const lang = store?.lang || 'en';
    return translations[lang]?.[key] || key;
}

// Make $t available globally
window.$t = $t;
