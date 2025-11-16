# Web UI Components

This directory contains modular, reusable components for the Acemcp Web UI.

## Directory Structure

```
components/
├── layout/              # Layout components
│   ├── header.html     # Header with title, theme toggle, language selector
│   └── navigation.html # Main tab navigation
└── shared/             # Shared utility components
    ├── notification.html  # Toast notifications
    ├── modal.html        # Modal dialogs
    └── loading.html      # Loading indicators
```

## Component Usage

### Layout Components

#### Header Component (`layout/header.html`)

Displays the application header with:
- Logo and title (internationalized)
- Language selector (Chinese/English)
- Theme toggle (Light/Dark mode)

**Features:**
- Sticky positioning at top of page
- Responsive design
- Smooth transitions
- Accessibility support (ARIA labels)

**Dependencies:**
- `$store.app.lang` - Current language
- `$store.app.theme` - Current theme
- `$store.app.setLanguage(lang)` - Language setter
- `$store.app.toggleTheme()` - Theme toggler
- `$t(key)` - Translation function

**Example:**
```html
<div id="header"></div>
<script>
  // Load component dynamically
  fetch('/static/components/layout/header.html')
    .then(r => r.text())
    .then(html => document.getElementById('header').innerHTML = html);
</script>
```

#### Navigation Component (`layout/navigation.html`)

Main tab navigation for switching between pages:
- Home
- Enhance Prompt
- Configuration
- Logs

**Features:**
- Active tab highlighting
- Smooth hover animations
- Scale effect on hover
- Keyboard navigation support
- ARIA current page indicator

**Dependencies:**
- `$store.app.currentPage` - Current active page
- `$store.app.setPage(page)` - Page setter
- `$t(key)` - Translation function

### Shared Components

#### Notification Component (`shared/notification.html`)

Toast-style notifications for user feedback.

**Types:**
- Success (green)
- Error (red)
- Warning (yellow)

**Features:**
- Auto-dismiss after 5 seconds
- Slide-in/out animations
- Manual close button
- Fixed positioning (top-right)

**Dependencies:**
- `$store.app.notification.show` - Visibility flag
- `$store.app.notification.type` - Notification type
- `$store.app.notification.message` - Message text
- `$store.app.showNotification(type, message)` - Helper method

**Usage:**
```javascript
// Show success notification
Alpine.store('app').showNotification('success', 'Operation completed!');

// Show error notification
Alpine.store('app').showNotification('error', 'Something went wrong!');

// Show warning notification
Alpine.store('app').showNotification('warning', 'Please check your input.');
```

#### Modal Component (`shared/modal.html`)

Reusable modal dialog with backdrop.

**Features:**
- Backdrop click to close
- ESC key to close
- Fade-in/scale-in animations
- Customizable header, body, and footer via slots
- Prevents body scroll when open

**Dependencies:**
- Local `x-data` with `open` property

**Usage:**
```html
<div x-data="{ modalOpen: false }">
  <button @click="modalOpen = true">Open Modal</button>
  
  <!-- Include modal component -->
  <div x-show="modalOpen" @click.away="modalOpen = false">
    <!-- Modal content here -->
  </div>
</div>
```

**Slots:**
- `title` - Modal header title
- `body` - Modal content
- `footer` - Modal footer (buttons)

#### Loading Component (`shared/loading.html`)

Spinning loading indicator.

**Sizes:**
- `sm` - Small (16px)
- `md` - Medium (32px, default)
- `lg` - Large (48px)

**Colors:**
- `blue` (default)
- `green`
- `red`
- `gray`

**Features:**
- Smooth rotation animation
- Optional text label
- Flexible sizing and coloring

**Usage:**
```html
<!-- Basic loading spinner -->
<div x-data="{ size: 'md', color: 'blue' }">
  <!-- Include loading component -->
</div>

<!-- With text -->
<div x-data="{ size: 'lg', color: 'green' }">
  <!-- Include loading component -->
  <span>Loading...</span>
</div>
```

## Integration Guide

### 1. Load Components Dynamically

```javascript
async function loadComponent(elementId, componentPath) {
  try {
    const response = await fetch(`/static/${componentPath}`);
    const html = await response.text();
    document.getElementById(elementId).innerHTML = html;
  } catch (error) {
    console.error(`Failed to load component ${componentPath}:`, error);
  }
}

// Usage
await loadComponent('header', 'components/layout/header.html');
await loadComponent('nav', 'components/layout/navigation.html');
```

### 2. Static Include (Server-Side)

If using a template engine, include components directly:

```html
<!-- Express with EJS -->
<%- include('components/layout/header') %>
<%- include('components/layout/navigation') %>

<!-- Other template engines -->
<!-- Adjust syntax accordingly -->
```

### 3. Build-Time Concatenation

For production, concatenate components into main HTML file during build.

## State Management

All components rely on Alpine.js stores defined in `scripts/state.js`:

```javascript
Alpine.store('app', {
  // UI State
  currentPage: 'home',
  theme: 'light',
  lang: 'zh',
  
  // Notification State
  notification: {
    show: false,
    type: 'success',
    message: ''
  },
  
  // Methods
  setPage(page) { /* ... */ },
  toggleTheme() { /* ... */ },
  setLanguage(lang) { /* ... */ },
  showNotification(type, message) { /* ... */ }
});
```

## Styling

Components use Tailwind CSS classes and custom styles from `styles/main.css`:

- `.btn-primary`, `.btn-secondary`, `.btn-danger` - Button styles
- `.nav-tab-active`, `.nav-tab-inactive` - Navigation tab styles
- `.notification-*` - Notification type styles
- `.modal-*` - Modal-related styles
- Animation classes for transitions

## Internationalization

All text content uses the `$t()` magic helper from `scripts/i18n.js`:

```javascript
// In templates
x-text="$t('nav_home')"
x-text="$t('title')"

// Translations defined in i18n.js
const translations = {
  en: { nav_home: 'Home', title: 'Acemcp Management' },
  zh: { nav_home: '主页', title: 'Acemcp 管理' }
};
```

## Testing

A test page is available at `test-components.html` to verify component functionality:

1. Start the server: `npm start:web`
2. Navigate to: `http://localhost:8090/test-components.html`
3. Test each component interactively

## Browser Compatibility

- Chrome/Edge: Latest + 2 previous major versions
- Firefox: Latest + 2 previous major versions
- Safari: Latest + 2 previous major versions
- Mobile: iOS Safari 14+, Chrome Mobile 90+

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation support
- Focus indicators
- Color contrast compliance
- Screen reader compatibility

## Performance

- Components are lightweight (< 5KB each)
- No external dependencies beyond Alpine.js and Tailwind
- Lazy loading supported
- Minimal DOM manipulation
- CSS animations (GPU-accelerated)

## Future Enhancements

- [ ] Add more component variants
- [ ] Implement component lazy loading
- [ ] Add unit tests for each component
- [ ] Create Storybook documentation
- [ ] Add TypeScript type definitions
