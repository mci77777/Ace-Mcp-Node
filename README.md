# Codebase MCP Monorepo

A modular MCP (Model Context Protocol) server ecosystem for codebase retrieval and prompt enhancement, built as a monorepo with three independent packages.

## 📦 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Applications                        │
├──────────────────────────┬──────────────────────────────────┤
│  Prompt Enhance Desktop  │  MCP Client (Claude/GPT)         │
│  (Standalone exe)        │  (stdio transport)               │
└──────────┬───────────────┴──────────────┬───────────────────┘
           │                               │
           ▼                               ▼
┌──────────────────────────┐   ┌──────────────────────────────┐
│ @codebase-mcp/           │   │ @codebase-mcp/               │
│ prompt-enhance           │   │ retrieval                    │
│                          │   │                              │
│ - Express Web Server     │   │ - MCP Server (stdio)         │
│ - EnhancePromptService   │   │ - IndexManager               │
│ - Web UI (templates)     │   │ - codebaseRetrievalTool      │
│ - Prompt Editor          │   │ - Web Management UI          │
└──────────┬───────────────┘   └──────────┬───────────────────┘
           │                               │
           └───────────┬───────────────────┘
                       ▼
            ┌──────────────────────────┐
            │ @codebase-mcp/shared     │
            │                          │
            │ - Config (settings.toml) │
            │ - Logger (file + WS)     │
            │ - PathUtils (WSL)        │
            │ - FileScanner (.gitignore)│
            │ - Encoding Detection     │
            └──────────────────────────┘
```

## 🎯 Packages

### [@codebase-mcp/shared](packages/shared/)
Core utilities shared across all modules:
- Configuration management (TOML)
- Logging system with file rotation and WebSocket broadcasting
- Cross-platform path utilities (Windows, WSL, Unix)
- File scanning with .gitignore support
- Multi-encoding detection (UTF-8, GBK, GB2312, Latin-1)

### [@codebase-mcp/prompt-enhance](packages/prompt-enhance/)
Standalone desktop application for prompt enhancement:
- Web-based prompt editor
- AI-powered prompt optimization
- Project context integration
- Packagable as Windows exe (via pkg)

### [@codebase-mcp/retrieval](packages/retrieval/)
MCP server for semantic codebase search:
- Incremental indexing with SHA-256 deduplication
- Semantic search via MCP protocol
- Web management interface
- Real-time log broadcasting

## 🚀 Quick Start

### For End Users

**Prompt Enhance (Desktop App)**
```bash
# Download the latest release
# https://github.com/your-repo/releases

# Run the exe (Windows)
prompt-enhance-win-x64.exe

# Or via npm
npx @codebase-mcp/prompt-enhance
```

**Codebase Retrieval (MCP Server)**
```bash
# Via npx
npx @codebase-mcp/retrieval

# Or install globally
npm install -g @codebase-mcp/retrieval
codebase-retrieval
```

### For Developers

```bash
# Clone the repository
git clone https://github.com/your-repo/codebase-mcp.git
cd codebase-mcp

# Install dependencies (uses npm workspaces)
npm install

# Build all packages
npm run build

# Or build specific packages
npm run build:shared
npm run build:prompt-enhance
npm run build:retrieval
```

## 🛠️ Development

### Monorepo Structure

```
codebase-mcp-monorepo/
├── packages/
│   ├── shared/              # Core utilities
│   ├── prompt-enhance/      # Desktop app
│   └── retrieval/           # MCP server
├── package.json             # Root workspace config
├── tsconfig.base.json       # Shared TypeScript config
└── .github/workflows/       # CI/CD automation
```

### Development Commands

```bash
# Development mode with hot reload
npm run dev:prompt-enhance
npm run dev:retrieval

# Build all packages
npm run build

# Build specific package
npm run build:shared
npm run build:prompt-enhance
npm run build:retrieval

# Run tests
npm test
npm run test:retrieval

# Clean build artifacts
npm run clean

# Package Prompt Enhance as exe
npm run package:prompt-enhance
```

### TypeScript Project References

This monorepo uses TypeScript project references for efficient builds:
- Each package has its own `tsconfig.json`
- Shared base configuration in `tsconfig.base.json`
- Automatic dependency resolution via `references` field

### Adding Dependencies

```bash
# Add to specific package
npm install <package> -w @codebase-mcp/shared
npm install <package> -w @codebase-mcp/prompt-enhance
npm install <package> -w @codebase-mcp/retrieval

# Add to root (dev dependencies)
npm install <package> -D
```

## ⚙️ Configuration

All modules share a unified configuration file:

**Location**: `~/.codebase-mcp/settings.toml`

**Example**:
```toml
# Codebase Retrieval API
BASE_URL = "https://d6.api.augmentcode.com/"
TOKEN = "your-token-here"

# Prompt Enhance API
ENHANCE_BASE_URL = "https://api.x.ai"
ENHANCE_TOKEN = "your-xai-token-here"
MODEL = "grok-2-1212"

# Web Server
WEB_PORT = 8090

# Indexing
BATCH_SIZE = 10
MAX_LINES_PER_BLOB = 800

# File Extensions
TEXT_EXTENSIONS = [".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".rs"]

# Exclude Patterns
EXCLUDE_PATTERNS = [".venv", "node_modules", ".git", "__pycache__", "dist"]
```

Configuration is auto-generated on first run with sensible defaults.

## 🔧 MCP Client Setup

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "codebase-retrieval": {
      "command": "npx",
      "args": ["@codebase-mcp/retrieval"]
    }
  }
}
```

### Other MCP Clients

Use stdio transport with the retrieval package:
```bash
npx @codebase-mcp/retrieval
```

## 🌐 Web Interfaces

### Prompt Enhance
- **URL**: `http://localhost:8090` (default)
- **Features**: Prompt editor, model selection, project tree, real-time logs

### Retrieval Management
- **URL**: `http://localhost:8090` (when started with `--web-port`)
- **Features**: Project management, indexing status, configuration editor, logs

## 📦 Building & Packaging

### Building for Production

```bash
# Build all packages
npm run build

# Verify builds
ls packages/shared/dist
ls packages/prompt-enhance/dist
ls packages/retrieval/dist
```

### Packaging Prompt Enhance

```bash
# Package as Windows exe
npm run package:prompt-enhance

# Output: packages/prompt-enhance/build/prompt-enhance-win-x64.exe
```

The exe includes:
- Node.js runtime (embedded)
- All dependencies
- Web templates
- Prompt files

### GitHub Actions

Automated builds are triggered by tags:

```bash
# Trigger Prompt Enhance build
git tag prompt-enhance-v1.0.0
git push origin prompt-enhance-v1.0.0

# Trigger Retrieval build
git tag retrieval-v1.0.0
git push origin retrieval-v1.0.0
```

See [.github/workflows/](.github/workflows/) for workflow details.

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific package tests
npm run test:retrieval

# Run in watch mode (during development)
cd packages/retrieval
npm run test:watch
```

## 📚 Documentation

- [Shared Package API](packages/shared/README.md)
- [Prompt Enhance Guide](packages/prompt-enhance/README.md)
- [Retrieval Guide](packages/retrieval/README.md)
- [Contributing Guidelines](CONTRIBUTING.md)
- [Development Setup](DEVELOPMENT.md)

## 🔄 Migration from v0.x

The monorepo architecture maintains backward compatibility:
- Configuration file location unchanged (`~/.codebase-mcp/settings.toml`)
- Index data format unchanged (`~/.codebase-mcp/data/projects.json`)
- MCP tool interface unchanged
- Web API endpoints unchanged

Existing configurations and indexed data work without modification.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Code style guidelines
- Development workflow
- Pull request process
- Testing requirements

## 📄 License

ISC

## 🔗 Links

- [GitHub Repository](https://github.com/your-repo/codebase-mcp)
- [Issue Tracker](https://github.com/your-repo/codebase-mcp/issues)
- [Releases](https://github.com/your-repo/codebase-mcp/releases)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
