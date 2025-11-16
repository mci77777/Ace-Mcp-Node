# Codebase MCP

MCP server for codebase retrieval and prompt enhancement.

## Features

- 🔍 **Codebase Retrieval**: Semantic search across your codebase
- ✨ **Prompt Enhancement**: AI-powered prompt optimization with context
- 🌐 **Web UI**: Real-time management interface
- 🚀 **Multi-instance Safe**: Shared web port across multiple MCP instances

## Quick Start

### Installation

```bash
# Via npx (recommended)
npx codebase-mcp

# Or install globally
npm install -g codebase-mcp
codebase-mcp
```

### Configuration

1. Copy example config:
```bash
cp ~/.codebase-mcp/settings.toml.example ~/.codebase-mcp/settings.toml
```

2. Edit `~/.codebase-mcp/settings.toml`:
```toml
BASE_URL = "https://d6.api.augmentcode.com/"
TOKEN = "your-token-here"

ENHANCE_BASE_URL = "https://api.x.ai"
ENHANCE_TOKEN = "your-xai-token-here"
MODEL = "grok-2-1212"
```

### MCP Client Setup

Add to your MCP client config (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "codebase-mcp": {
      "command": "npx",
      "args": ["codebase-mcp"]
    }
  }
}
```

## Web Interface

Access the management UI at: `http://localhost:8090`

Features:
- Real-time logs
- Configuration editor
- Tool debugger
- Prompt enhancement UI

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in dev mode
npm run dev

# Start with web UI
npm start:web
```

## Tools

### 1. codebase-retrieval

Search your codebase semantically:

```typescript
{
  "project_root_path": "/path/to/project",
  "query": "authentication logic"
}
```

### 2. enhance_prompt

Enhance prompts with codebase context:

```typescript
{
  "projectPath": "/path/to/project",
  "originalMessage": "How to implement login?",
  "language": "zh" // or "en"
}
```

## License

ISC
