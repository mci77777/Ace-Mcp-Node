/**
 * Internationalization (i18n) Module
 * Provides translation support for English and Simplified Chinese
 */

const translations = {
    en: {
        // General
        title: 'Acemcp Management',
        subtitle: 'MCP Server Management Interface',
        
        // Navigation
        nav_home: '🏠 Home',
        nav_enhance_prompt: '⚡ Enhance Prompt',
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
        
        // Enhance Prompt
        enhance_prompt: 'Enhance Prompt',
        original_message: 'Original Message',
        enhanced_result: 'Enhanced Result',
        language_chinese: '🇨🇳 Simplified Chinese',
        language_english: '🇺🇸 English',
        submit_button: '⚡ Enhance Prompt',
        copy_button: '📋 Copy',
        placeholder_message: 'Enter your prompt to enhance...',
        waiting_result: 'Waiting for enhancement...',
        character_count: 'Characters',
        keyboard_hint: '💡 Tip: Press Ctrl+Enter to submit',
        
        // Secondary Tabs
        tab_advanced: '⚙️ Advanced Options',
        tab_api_config: '🔧 API Configuration',
        tab_logs: '📋 Logs',
        
        // Advanced Options
        project_path_label: 'Project Path',
        load_file_tree: 'Load File Tree',
        loading_files: 'Loading...',
        selected_files: 'Selected Files',
        user_guidelines: 'User Guidelines',
        guideline_claude_agents: 'CLAUDE.md & AGENTS.md',
        guideline_custom: 'Custom',
        guideline_none: 'None',
        custom_guideline_path: 'Custom Guideline Path',
        include_readme: 'Include README.md',
        file_tree_title: 'File Tree',
        selected_files_count: 'Selected',
        files: 'files',
        no_files_loaded: 'No files loaded. Enter a project path and click "Load File Tree".',
        
        // Notifications
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        config_saved: 'Configuration saved successfully',
        config_save_failed: 'Failed to save configuration',
        project_added: 'Project added successfully',
        project_deleted: 'Project deleted successfully',
        prompt_enhanced: 'Prompt enhanced successfully',
        copied_to_clipboard: 'Copied to clipboard',
        
        // Errors
        error_network: 'Network error. Please check your connection.',
        error_server: 'Server error. Please try again later.',
        error_validation: 'Validation error. Please check your input.',
        error_empty_message: 'Please enter a message to enhance',
        error_invalid_path: 'Invalid project path',
        error_custom_guideline_required: 'Please specify a custom guideline path',
        enhance_error_title: 'Enhancement Failed',
        retry: 'Retry',
        enhancing: 'Enhancing...',
        waiting_for_enhancement: 'Waiting for enhancement',
        enter_message_and_submit: 'Enter a message and click the enhance button',
        original_message_placeholder: 'Enter your prompt to enhance...',
        original_message_hint: 'Enter the prompt you want to enhance with project context',
        copy_to_clipboard: 'Copy to clipboard',
        
        // Tool Debugger
        tool_debugger: 'Tool Debugger',
        select_tool: 'Select Tool',
        tool_arguments: 'Tool Arguments',
        execute_tool: 'Execute Tool',
        
        // Task 11.2: Keyboard Shortcuts
        keyboard_shortcuts: 'Keyboard Shortcuts',
        tool_result: 'Tool Result',
        export_markdown: 'Export as Markdown',
        export_json: 'Export as JSON',
        
        // Home Page - Status Cards
        status_server: 'Server Status',
        status_projects: 'Indexed Projects',
        status_storage: 'Storage Path',
        status_indexed: 'indexed',
        copy_path: 'Copy path',
        
        // Home Page - Config Panel
        config_title: 'Configuration',
        config_edit: 'Edit',
        config_cancel: 'Cancel',
        config_save: 'Save',
        config_base_url: 'Base URL',
        config_token: 'Token',
        config_batch_size: 'Batch Size',
        config_max_lines: 'Max Lines Per Blob',
        config_text_extensions: 'Text Extensions',
        config_exclude_patterns: 'Exclude Patterns',
        config_extensions_hint: 'Comma-separated list of file extensions',
        config_patterns_hint: 'Glob patterns for files to exclude',
        
        // Home Page - Logs Panel
        logs_title: 'Real-time Logs',
        logs_connected: 'Connected',
        logs_disconnected: 'Disconnected',
        logs_clear: 'Clear Logs',
        logs_empty: 'No logs yet. Logs will appear here in real-time.',
        logs_count: 'Log entries',
        logs_auto_scroll: 'Auto-scroll enabled',
        
        // Home Page - Projects List
        projects_title: 'Indexed Projects',
        projects_total: 'Total',
        projects_add: 'Add New Project',
        projects_path_placeholder: 'Enter project path (e.g., /path/to/project)',
        projects_add_button: 'Add',
        projects_empty: 'No projects indexed yet',
        projects_empty_hint: 'Add a project path above to start indexing',
        projects_files: 'files',
        projects_blobs: 'blobs',
        projects_details: 'View details',
        projects_reindex: 'Reindex',
        projects_delete: 'Delete',
        projects_details_title: 'Project Details',
        projects_path: 'Project Path',
        projects_stats: 'Statistics',
        projects_file_types: 'File Types',
        close: 'Close',
        
        // Home Page - Tool Debugger
        tools_title: 'Tool Debugger',
        tools_debugger: 'Debug MCP Tools',
        tools_select: 'Select Tool',
        tools_arguments: 'Tool Arguments',
        tools_execute: 'Execute Tool',
        tools_executing: 'Executing...',
        tools_result: 'Execution Result',
        tools_error: 'Execution Error',
        copy: 'Copy',
        tools_hint: 'Usage Tips:',
        tools_hint_1: 'Fill in all required arguments (marked with *)',
        tools_hint_2: 'Click Execute to run the tool',
        tools_hint_3: 'Export results as JSON or Markdown for documentation',
        
        // Prompt Editor
        edit_prompt_files: 'Edit Prompt Files',
        reset: 'Reset',
        saving: 'Saving...',
        prompt_files: 'Prompt Files',
        characters: 'characters',
        unsaved_changes: 'Unsaved changes',
        editor_tips: 'Editor Tips',
        
        // API Config in Header
        api_config_quick: 'API Configuration',
        index_service: 'Index Service',
        enhance_service: 'Enhance Service',
        save_configuration: 'Save Configuration',
        
        // Language Injection
        response_language: 'Response Language',
        auto_append_chinese: 'Will auto-append "请用简体中文回应"',
        auto_append_english: 'Will auto-append "Please respond in English"'
    },
    
    zh: {
        // General
        title: 'Acemcp 管理',
        subtitle: 'MCP 服务器管理界面',
        
        // Navigation
        nav_home: '🏠 主页',
        nav_enhance_prompt: '⚡ 提示词增强',
        nav_config: '⚙️ 配置',
        nav_logs: '📋 日志',
        
        // Status
        status: '状态',
        status_running: '运行中',
        status_loading: '加载中',
        indexed_projects: '已索引项目',
        storage_path: '存储路径',
        
        // Configuration
        configuration: '配置',
        edit: '编辑',
        cancel: '取消',
        save: '保存',
        base_url: '基础 URL',
        token: '令牌',
        batch_size: '批处理大小',
        max_lines_per_blob: '每个块最大行数',
        text_extensions: '文本扩展名',
        exclude_patterns: '排除模式',
        
        // Projects
        projects: '项目',
        project_path: '项目路径',
        blob_count: '块数量',
        file_count: '文件数量',
        actions: '操作',
        view_details: '查看详情',
        reindex: '重新索引',
        delete: '删除',
        check_project: '检查项目',
        add_project: '添加项目',
        
        // Logs
        logs: '日志',
        clear_logs: '清空日志',
        ws_connected: 'WebSocket 已连接',
        ws_disconnected: 'WebSocket 未连接',
        
        // Enhance Prompt
        enhance_prompt: '提示词增强',
        original_message: '原始提示词',
        enhanced_result: '增强后提示词',
        language_chinese: '🇨🇳 简体中文',
        language_english: '🇺🇸 英语',
        submit_button: '⚡ 增强提示词',
        copy_button: '📋 复制',
        placeholder_message: '输入您想要增强的提示词...',
        waiting_result: '等待增强...',
        character_count: '字符数',
        keyboard_hint: '💡 提示：按 Ctrl+Enter 快速提交',
        
        // Secondary Tabs
        tab_advanced: '⚙️ 高级选项',
        tab_api_config: '🔧 API 配置',
        tab_logs: '📋 日志',
        
        // Advanced Options
        project_path_label: '项目路径',
        load_file_tree: '加载文件树',
        loading_files: '加载中...',
        selected_files: '已选文件',
        user_guidelines: '用户指南',
        guideline_claude_agents: 'CLAUDE.md 和 AGENTS.md',
        guideline_custom: '自定义',
        guideline_none: '无',
        custom_guideline_path: '自定义指南路径',
        include_readme: '包含 README.md',
        file_tree_title: '文件树',
        selected_files_count: '已选',
        files: '个文件',
        no_files_loaded: '未加载文件。请输入项目路径并点击"加载文件树"。',
        
        // Notifications
        success: '成功',
        error: '错误',
        warning: '警告',
        config_saved: '配置保存成功',
        config_save_failed: '配置保存失败',
        project_added: '项目添加成功',
        project_deleted: '项目删除成功',
        prompt_enhanced: '提示词增强成功',
        copied_to_clipboard: '已复制到剪贴板',
        
        // Errors
        error_network: '网络错误，请检查您的连接。',
        error_server: '服务器错误，请稍后重试。',
        error_validation: '验证错误，请检查您的输入。',
        error_empty_message: '请输入要增强的消息',
        error_invalid_path: '无效的项目路径',
        error_custom_guideline_required: '请指定自定义指南路径',
        enhance_error_title: '增强失败',
        retry: '重试',
        enhancing: '增强中...',
        waiting_for_enhancement: '等待增强',
        enter_message_and_submit: '输入消息并点击增强按钮',
        original_message_placeholder: '输入您想要增强的提示词...',
        original_message_hint: '输入您想要使用项目上下文增强的提示词',
        copy_to_clipboard: '复制到剪贴板',
        
        // Tool Debugger
        tool_debugger: '工具调试器',
        select_tool: '选择工具',
        tool_arguments: '工具参数',
        execute_tool: '执行工具',
        
        // Task 11.2: Keyboard Shortcuts
        keyboard_shortcuts: '键盘快捷键',
        tool_result: '工具结果',
        export_markdown: '导出为 Markdown',
        export_json: '导出为 JSON',
        
        // Home Page - Status Cards
        status_server: '服务器状态',
        status_projects: '已索引项目',
        status_storage: '存储路径',
        status_indexed: '个已索引',
        copy_path: '复制路径',
        
        // Home Page - Config Panel
        config_title: '配置',
        config_edit: '编辑',
        config_cancel: '取消',
        config_save: '保存',
        config_base_url: '基础 URL',
        config_token: '令牌',
        config_batch_size: '批处理大小',
        config_max_lines: '每个块最大行数',
        config_text_extensions: '文本扩展名',
        config_exclude_patterns: '排除模式',
        config_extensions_hint: '逗号分隔的文件扩展名列表',
        config_patterns_hint: '要排除的文件的 Glob 模式',
        
        // Home Page - Logs Panel
        logs_title: '实时日志',
        logs_connected: '已连接',
        logs_disconnected: '未连接',
        logs_clear: '清空日志',
        logs_empty: '暂无日志。日志将实时显示在这里。',
        logs_count: '日志条目',
        logs_auto_scroll: '自动滚动已启用',
        
        // Home Page - Projects List
        projects_title: '已索引项目',
        projects_total: '总计',
        projects_add: '添加新项目',
        projects_path_placeholder: '输入项目路径（例如：/path/to/project）',
        projects_add_button: '添加',
        projects_empty: '尚未索引任何项目',
        projects_empty_hint: '在上方添加项目路径以开始索引',
        projects_files: '个文件',
        projects_blobs: '个块',
        projects_details: '查看详情',
        projects_reindex: '重新索引',
        projects_delete: '删除',
        projects_details_title: '项目详情',
        projects_path: '项目路径',
        projects_stats: '统计信息',
        projects_file_types: '文件类型',
        close: '关闭',
        
        // Home Page - Tool Debugger
        tools_title: '工具调试器',
        tools_debugger: '调试 MCP 工具',
        tools_select: '选择工具',
        tools_arguments: '工具参数',
        tools_execute: '执行工具',
        tools_executing: '执行中...',
        tools_result: '执行结果',
        tools_error: '执行错误',
        copy: '复制',
        tools_hint: '使用提示：',
        tools_hint_1: '填写所有必需参数（标有 * 的）',
        tools_hint_2: '点击执行按钮运行工具',
        tools_hint_3: '将结果导出为 JSON 或 Markdown 以便记录',
        
        // Prompt Editor
        edit_prompt_files: '编辑提示词文件',
        reset: '重置',
        saving: '保存中...',
        prompt_files: '提示词文件',
        characters: '字符',
        unsaved_changes: '未保存的更改',
        editor_tips: '编辑器提示',
        
        // API Config in Header
        api_config_quick: 'API 配置',
        index_service: '索引服务',
        enhance_service: '增强服务',
        save_configuration: '保存配置',
        
        // Language Injection
        response_language: '回复语言',
        auto_append_chinese: '将自动附加"请用简体中文回应"',
        auto_append_english: '将自动附加"Please respond in English"'
    }
};

/**
 * Translation function
 * @param {string} key - Translation key (e.g., 'nav_home')
 * @param {string} lang - Language code ('en' or 'zh')
 * @returns {string} Translated text
 */
function translate(key, lang = 'zh') {
    const langData = translations[lang] || translations.zh;
    return langData[key] || key;
}

/**
 * Global translation function for use in JavaScript code
 * @param {string} key - Translation key
 * @param {string} lang - Language code (optional, defaults to current store lang)
 * @returns {string} Translated text
 */
window.t = function(key, lang) {
    if (!lang && typeof Alpine !== 'undefined' && Alpine.store) {
        const store = Alpine.store('app');
        lang = store ? store.lang : 'zh';
    }
    return translate(key, lang || 'zh');
};

/**
 * Alpine.js magic helper for translations
 * Usage in templates: x-text="$t('key')"
 */
document.addEventListener('alpine:init', () => {
    Alpine.magic('t', () => {
        return (key) => {
            const store = Alpine.store('app');
            return translate(key, store.lang);
        };
    });
});
