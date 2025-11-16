# Home Page Components

This directory contains all components for the home page of the Acemcp Web UI.

## Components Overview

### 1. Status Cards Component (`status-cards.html`)

Displays three key status indicators at the top of the home page.

**Features:**
- **Server Status Card**: Shows running/loading status with animated indicator
- **Project Count Card**: Displays number of indexed projects
- **Storage Path Card**: Shows storage location with copy-to-clipboard button

**Dependencies:**
- `$store.app.status` - Server status data
- `$t()` - Translation function
- `Utils.copyToClipboard()` - Clipboard utility

**Layout:**
- Responsive grid: 1 column (mobile) → 3 columns (desktop)
- Hover effects with shadow elevation
- Color-coded status indicators

---

### 2. Configuration Panel Component (`config-panel.html`)

Allows viewing and editing server configuration.

**Features:**
- **View Mode**: Display current configuration (read-only)
- **Edit Mode**: Enable editing with form validation
- **Save Functionality**: Persist changes to server
- **Form Fields**:
  - Base URL
  - Token (masked in view mode)
  - Batch Size (number input with min/max)
  - Max Lines Per Blob (number input)
  - Text Extensions (textarea)
  - Exclude Patterns (textarea)

**Dependencies:**
- `$store.app.config` - Configuration data
- `$store.app.editMode` - Edit mode toggle
- `mcpManager().saveConfig()` - Save handler
- `$t()` - Translation function

**Validation:**
- Number inputs have min/max constraints
- Required fields enforced
- Visual feedback for edit/view modes

---

### 3. Logs Panel Component (`logs-panel.html`)

Displays real-time logs from the server via WebSocket.

**Features:**
- **Real-time Updates**: WebSocket connection for live logs
- **Connection Status**: Visual indicator (green/red dot)
- **Auto-scroll**: Automatically scrolls to newest logs
- **Clear Logs**: Button to clear all logs
- **Log Stats**: Shows total log count

**Dependencies:**
- `$store.app.logs` - Log entries array
- `$store.app.wsConnected` - WebSocket connection status
- `mcpManager().clearLogs()` - Clear handler
- `$t()` - Translation function

**Technical Details:**
- Uses Alpine.js `$watch` to detect new logs
- Auto-scrolls using `$refs` and `$nextTick`
- Terminal-style display (monospace font, dark background)
- Keeps last 500 logs (managed in app.js)

---

### 4. Projects List Component (`projects-list.html`)

Manages indexed projects with CRUD operations.

**Features:**
- **Add Project**: Input field + button to add new projects
- **Project List**: Displays all indexed projects with stats
- **Project Actions**:
  - View Details (opens modal)
  - Reindex (re-scan project)
  - Delete (with confirmation)
- **Project Details Modal**:
  - Project path
  - File count and blob count
  - File type statistics
  - Loading state while fetching details

**Dependencies:**
- `$store.app.projects` - Projects array
- `mcpManager().checkProject()` - Add project
- `mcpManager().reindexProject()` - Reindex
- `mcpManager().deleteProject()` - Delete
- `API.getProjectDetails()` - Fetch details
- `$t()` - Translation function

**UI Elements:**
- Empty state with helpful message
- Hover effects on project cards
- Modal with backdrop and ESC key support
- Loading spinner in modal

---

### 5. Tool Debugger Component (`tool-debugger.html`)

Interactive tool for testing MCP tools.

**Features:**
- **Tool Selection**: Dropdown to select tool (currently: codebase-retrieval)
- **Dynamic Arguments**: Form fields based on selected tool
- **Execute Tool**: Button to run tool with validation
- **Result Display**: JSON output with syntax highlighting
- **Export Options**:
  - Copy to clipboard
  - Export as JSON file
  - Export as Markdown file
- **Error Handling**: Display execution errors

**Dependencies:**
- `API.executeTool()` - Execute tool
- `Utils.parseError()` - Error parsing
- `Utils.copyToClipboard()` - Clipboard utility
- `$t()` - Translation function

**Technical Details:**
- Local Alpine.js state for tool execution
- Dynamic form based on `selectedTool`
- File download using Blob API
- Validation for required fields

---

### 6. Home Index Component (`index.html`)

Main home page component that loads and integrates all sub-components.

**Features:**
- Dynamically loads all home sub-components
- Provides container structure
- Handles component loading errors

**Component Loading Order:**
1. Status Cards
2. Configuration Panel
3. Projects List
4. Logs Panel
5. Tool Debugger

**Technical Details:**
- Uses `fetch()` to load component HTML
- Injects HTML into designated containers
- Error handling for failed loads

---

## Integration

### Loading Home Page

In the main application, load the home page when `currentPage === 'home'`:

```html
<div x-show="$store.app.currentPage === 'home'">
    <div id="home-page"></div>
</div>

<script>
    // Load home page component
    fetch('/static/components/home/index.html')
        .then(r => r.text())
        .then(html => document.getElementById('home-page').innerHTML = html);
</script>
```

### State Management

All components rely on the global Alpine.js store:

```javascript
Alpine.store('app', {
    // Status
    status: { status: 'running', project_count: 0, storage_path: '' },
    
    // Config
    config: { base_url: '', token: '', ... },
    editMode: false,
    
    // Projects
    projects: [],
    
    // Logs
    logs: [],
    wsConnected: false,
    
    // Methods
    setPage(page),
    showNotification(type, message)
});
```

### API Calls

Components use the `API` module for backend communication:

```javascript
// Status & Config
API.getStatus()
API.getConfig()
API.updateConfig(data)

// Projects
API.getProjects()
API.checkProject(path)
API.reindexProject(path)
API.deleteProject(path)
API.getProjectDetails(path)

// Tools
API.executeTool(toolName, args)
```

---

## Styling

All components use Tailwind CSS classes and custom styles from `styles/main.css`:

- **Cards**: `bg-white dark:bg-gray-800 rounded-lg shadow-md`
- **Buttons**: `.btn-primary`, `.btn-secondary`, `.btn-danger`
- **Inputs**: `border border-gray-300 dark:border-gray-600 rounded-md`
- **Animations**: `transition-all duration-200 hover:shadow-lg`

---

## Internationalization

All text uses the `$t()` magic helper:

```html
<h2 x-text="$t('projects_title')"></h2>
<button x-text="$t('projects_add_button')"></button>
```

Translation keys are defined in `scripts/i18n.js`:

```javascript
translations = {
    en: { projects_title: 'Indexed Projects', ... },
    zh: { projects_title: '已索引项目', ... }
}
```

---

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Focus indicators
- Color contrast compliance
- Screen reader compatibility

---

## Performance

- Components are lazy-loaded on demand
- WebSocket logs limited to 500 entries
- Auto-scroll uses `$nextTick` for optimal timing
- Hover effects use CSS transitions (GPU-accelerated)

---

## Browser Compatibility

- Chrome/Edge: Latest + 2 previous major versions
- Firefox: Latest + 2 previous major versions
- Safari: Latest + 2 previous major versions
- Mobile: iOS Safari 14+, Chrome Mobile 90+

---

## Testing

Test all components using the main application:

1. Start server: `npm start:web`
2. Navigate to: `http://localhost:8090`
3. Click "Home" tab
4. Verify all components load and function correctly

### Test Checklist

- [ ] Status cards display correct data
- [ ] Configuration can be edited and saved
- [ ] Projects can be added, reindexed, and deleted
- [ ] Project details modal opens and displays data
- [ ] Logs display in real-time
- [ ] WebSocket connection indicator works
- [ ] Tool debugger executes tools
- [ ] Export functions work (JSON, Markdown)
- [ ] All translations work (EN/ZH)
- [ ] Responsive layout works on mobile

---

## Future Enhancements

- [ ] Add more MCP tools to debugger
- [ ] Implement project search/filter
- [ ] Add log filtering and search
- [ ] Export logs to file
- [ ] Add configuration import/export
- [ ] Implement project grouping/tagging
- [ ] Add performance metrics dashboard
- [ ] Implement batch project operations

