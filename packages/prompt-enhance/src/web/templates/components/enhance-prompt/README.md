# Enhance Prompt Components

This directory contains the modular components for the Prompt Enhancement feature, implementing Task 4 of the web-ui-refactor spec.

## Components Overview

### 1. main-view.html
**Purpose**: Input/Output comparison layout with responsive design

**Features**:
- Left-right split layout on desktop (≥1024px)
- Top-bottom split layout on mobile (<1024px)
- Original message input area with character count
- Enhanced result display area with copy button
- Loading state with spinner animation
- Error display with retry button
- Empty state placeholder

**Requirements Implemented**: 3.1, 3.2, 3.3, 7.1

### 2. language-selector.html
**Purpose**: Language selection component for output language

**Features**:
- Chinese (🇨🇳) and English (🇺🇸) toggle buttons
- Visual feedback with gradient background for selected language
- Shows auto-appended language prompt
- Responsive design for mobile and desktop

**Language Prompts**:
- Chinese: "请用简体中文回应"
- English: "Please respond in English"

**Requirements Implemented**: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3

### 3. submit-button.html
**Purpose**: Prominent submit button with loading state and keyboard shortcut

**Features**:
- Large, gradient-styled button
- Disabled state when message is empty
- Loading animation during execution
- Keyboard shortcut hint (Ctrl+Enter)
- Validation error display
- Responsive sizing

**Requirements Implemented**: 5.2, 5.4, 5.5

## Backend Integration

### Language Prompt Logic (Task 4.6)

The language prompt logic is implemented in `src/web/app.ts` in the `/api/enhance-prompt` endpoint:

```typescript
// Extract language parameter (default: 'zh')
const { language = 'zh', ... } = req.body;

// Append language prompt before sending to API
if (language === 'zh') {
  fullMessage += '\n\n请用简体中文回应';
} else if (language === 'en') {
  fullMessage += '\n\nPlease respond in English';
}
```

**Requirements Implemented**: 6.1, 6.2, 6.3, 6.4, 6.5

## Usage

These components are designed to be included in the main enhance-prompt page. They use Alpine.js for reactivity and Tailwind CSS for styling.

### Example Integration

```html
<!-- In the enhance-prompt page -->
<div x-show="currentPage === 'enhance-prompt'">
    <!-- Main View (Input/Output Comparison) -->
    <div x-html="loadComponent('enhance-prompt/main-view')"></div>
    
    <!-- Language Selector -->
    <div x-html="loadComponent('enhance-prompt/language-selector')"></div>
    
    <!-- Submit Button -->
    <div x-html="loadComponent('enhance-prompt/submit-button')"></div>
</div>
```

## State Management

All components rely on the Alpine.js store (`Alpine.store('app')`) for state management:

### Required State Properties

```javascript
{
  enhanceForm: {
    originalMessage: '',      // User's input message
    language: 'zh',           // Selected language ('zh' | 'en')
  },
  enhanceResult: '',          // Enhanced prompt result
  enhanceExecuting: false,    // Loading state
  enhanceError: '',           // Error message
  formValidation: {
    messageError: ''          // Validation error for message
  }
}
```

### Required Methods

```javascript
{
  validateMessageInput(),     // Validate message input
  watchFormChanges(),         // Track form changes
  submitEnhancePrompt(),      // Submit enhancement request
  copyEnhancedPrompt(),       // Copy result to clipboard
  retryEnhancePrompt(),       // Retry after error
  clearEnhanceResult()        // Clear result display
}
```

## Responsive Design

All components follow mobile-first responsive design principles:

- **Mobile (<640px)**: Single column, stacked layout
- **Tablet (640px-1023px)**: Optimized spacing, larger touch targets
- **Desktop (≥1024px)**: Side-by-side layout for input/output

## Accessibility

- Semantic HTML structure
- ARIA labels for screen readers
- Keyboard navigation support (Ctrl+Enter shortcut)
- High contrast colors for readability
- Focus indicators for interactive elements

## Testing

To test these components:

1. Start the web server: `npm start:web`
2. Navigate to the Enhance Prompt page
3. Test input/output comparison layout
4. Test language selection
5. Test submit button with various states (empty, loading, error, success)
6. Test keyboard shortcut (Ctrl+Enter)
7. Test responsive design on different screen sizes

## Future Enhancements

- Add more language options
- Support custom language prompts
- Add prompt templates
- Implement prompt history
- Add export functionality (Markdown, JSON)


## Task 5: Secondary Tabs Components

### 5. secondary-tabs.html
**Purpose**: Collapsible tabs container for advanced options

**Features**:
- Expand/collapse functionality with smooth animations
- Three tabs: Advanced Options (⚙️), API Config (🔧), Logs (📋)
- Active tab highlighting with blue accent
- Default collapsed state to keep main view clean
- Responsive tab navigation

**Requirements Implemented**: 4.1, 4.2, 4.3, 4.4

### 6. advanced-options.html
**Purpose**: Advanced configuration options for prompt enhancement

**Features**:
- Project path input with validation
- File tree loading and display (max 3 levels deep)
- File selection with checkboxes (📁/📂/📄 icons)
- User guidelines selection (CLAUDE.md/AGENTS.md, Custom, None)
- Custom guideline path input (conditional display)
- README.md inclusion checkbox
- Selected files counter

**Requirements Implemented**: 4.1, 4.2, 4.5

### 7. api-config.html
**Purpose**: API configuration management

**Features**:
- View mode: Display current configuration (masked token)
- Edit mode: Form with validation
- Configuration fields:
  - 🌐 Base URL (required, URL validation)
  - 🔑 Token (required)
  - 📦 Batch Size (1-1000)
  - 📄 Max Lines Per Blob (100-10000)
  - 📝 Text Extensions (comma-separated)
  - 🚫 Exclude Patterns (glob patterns)
- Save/Cancel functionality
- Real-time validation feedback

**Requirements Implemented**: 4.1, 4.2, 4.5, 8.1, 8.2

### 8. logs.html
**Purpose**: Real-time log display (reuses home page logs panel)

**Features**:
- WebSocket connection status indicator
- Color-coded log levels (red=error, yellow=warning, green=success, blue=info)
- Auto-scroll to bottom
- Clear logs button
- Log counter (max 500 logs)
- Empty state message
- Timestamp display

**Requirements Implemented**: 4.1, 4.2, 4.5, 8.3

### 9. index.html
**Purpose**: Main page integration that loads all enhance-prompt components

**Features**:
- Loads all child components dynamically
- Provides page title and description
- Organizes layout structure
- Component loading with error handling

## Component Loading Flow

```
index.html (main page)
  └─> enhance-prompt/index.html
       ├─> main-view.html (input/output comparison)
       ├─> language-selector.html (language buttons)
       ├─> submit-button.html (submit button)
       └─> secondary-tabs.html (collapsible tabs)
            ├─> advanced-options.html (loaded into #advanced-options-content)
            ├─> api-config.html (loaded into #api-config-content)
            └─> logs.html (loaded into #logs-content)
```

## Component Loading Mechanism

Components are loaded using the `Utils.loadComponent()` function:

```javascript
// Load a component
const html = await Utils.loadComponent('enhance-prompt/main-view');
document.getElementById('container').innerHTML = html;

// Or inject directly
await Utils.injectComponent('enhance-prompt/main-view', 'container');
```

**Features**:
- Component caching for performance
- Lazy loading of secondary tabs
- Error handling with fallback messages
- Automatic HTML injection

## State Management

All components use `Alpine.store('app')` for centralized state management:

```javascript
// Enhance form state
$store.app.enhanceForm = {
    originalMessage: '',
    language: 'zh',
    projectPath: '',
    selectedFiles: [],
    userGuidelines: 'none',
    customGuidelinePath: '',
    includeReadme: false
}

// Results and status
$store.app.enhanceResult = ''
$store.app.enhanceExecuting = false
$store.app.enhanceError = ''

// Configuration
$store.app.config = {
    base_url: '',
    token: '',
    token_full: '',
    batch_size: 0,
    max_lines_per_blob: 0,
    text_extensions: [],
    exclude_patterns: []
}

// Logs
$store.app.logs = []
$store.app.wsConnected = false
```

## Styling Guidelines

All components follow consistent styling:
- **Tailwind CSS** utility classes
- **Dark mode** support (dark: variants)
- **Responsive design** (sm:, md:, lg: breakpoints)
- **Consistent spacing** (p-4, p-6, gap-4, gap-6)
- **Color scheme**:
  - Primary: blue-500
  - Success: green-500
  - Error: red-500
  - Warning: yellow-500
  - Gray scale for backgrounds
- **Icons**: Emojis for visual clarity
- **Shadows**: shadow-lg for cards
- **Borders**: rounded-lg for consistency

## Integration with Backend

### API Endpoints Used

```javascript
// Enhance prompt
POST /api/enhance-prompt
{
    message: string,
    language: 'zh' | 'en',
    project_path?: string,
    selected_files?: string[],
    user_guidelines?: 'claude-agents' | 'custom',
    custom_guideline_path?: string,
    include_readme?: boolean
}

// Load file tree
POST /api/files/list
{
    project_path: string,
    max_depth: number
}

// Update configuration
POST /api/config
{
    base_url: string,
    token_full: string,
    batch_size: number,
    max_lines_per_blob: number,
    text_extensions: string[],
    exclude_patterns: string[]
}

// Get logs (WebSocket)
WS /ws/logs
```

## Translations

All text uses the `t()` magic helper for internationalization:

```html
<span x-text="t('enhance_prompt')"></span>
<span x-text="t('tab_advanced')"></span>
<span x-text="t('load_file_tree')"></span>
```

Translations are defined in `scripts/i18n.js` for:
- English (en)
- Simplified Chinese (zh)

## Development Workflow

### Adding a New Component

1. Create component file in `components/enhance-prompt/`
2. Add component loading in parent component
3. Add translations in `i18n.js`
4. Test in browser
5. Update this README

### Modifying Existing Component

1. Edit component HTML file
2. Run `npm run build` to copy to dist/
3. Refresh browser to see changes
4. Update documentation if needed

### Testing

```bash
# Build project
npm run build

# Start server with web interface
npm start:web

# Open browser
http://localhost:8090

# Navigate to Enhance Prompt page
# Test all functionality
```

## Browser Compatibility

Tested and compatible with:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile 90+)

## Performance Optimizations

- **Component Caching**: Loaded components cached in memory
- **Lazy Loading**: Secondary tabs loaded only when page initializes
- **Efficient Rendering**: Alpine.js reactive updates
- **Minimal DOM**: Collapsed state reduces DOM nodes
- **Debounced Inputs**: Form inputs use debouncing where appropriate

## Accessibility

- Semantic HTML structure
- ARIA labels for screen readers
- Keyboard navigation support
- High contrast colors (WCAG AA compliant)
- Focus indicators
- Touch-friendly controls (44px minimum)

## Known Limitations

1. **File Tree API**: Requires `/api/files/list` endpoint implementation
2. **File Selection**: Selected files tracked in state but need backend support for content retrieval
3. **Custom Guidelines**: Client-side validation only; backend validation recommended
4. **Max Depth**: File tree limited to 3 levels for performance

## Future Enhancements

- [ ] File tree search/filter functionality
- [ ] Drag-and-drop file selection
- [ ] Guideline preview modal
- [ ] Configuration presets/templates
- [ ] Export/import settings
- [ ] Advanced log filtering and search
- [ ] File tree virtualization for large projects
- [ ] Syntax highlighting for guidelines preview

## Related Documentation

- `ARCHITECTURE.md` - Overall architecture and design decisions
- `INTEGRATION_GUIDE.md` - Integration instructions for developers
- `TASK_4_ENHANCE_PROMPT_MAIN_VIEW_COMPLETION.md` - Task 4 implementation details
- `TASK_5_SECONDARY_TABS_COMPLETION.md` - Task 5 implementation details
- `../../scripts/app.js` - Main application logic
- `../../scripts/state.js` - State management
- `../../scripts/utils.js` - Utility functions including component loading

## Support

For issues or questions:
1. Check the documentation files listed above
2. Review the implementation completion documents
3. Check console for error messages
4. Verify all components are loaded correctly
5. Test with browser developer tools

## Version History

- **v1.0** (Task 4): Initial components (main-view, language-selector, submit-button)
- **v1.1** (Task 5): Added secondary tabs (advanced-options, api-config, logs, secondary-tabs)
- **v1.2** (Task 5): Added index.html for complete page integration
