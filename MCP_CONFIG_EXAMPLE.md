# MCP Client Configuration Examples

## Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

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

## Cline (VS Code Extension)

Edit `.vscode/settings.json`:

```json
{
  "cline.mcpServers": {
    "codebase-mcp": {
      "command": "npx",
      "args": ["codebase-mcp"]
    }
  }
}
```

## Custom Web Port

If you need a different web port (default is 8090):

```json
{
  "mcpServers": {
    "codebase-mcp": {
      "command": "npx",
      "args": ["codebase-mcp", "--web-port", "9000"]
    }
  }
}
```

## Multiple Instances

Multiple MCP instances will share the same web interface (port 8090). If the port is already in use, subsequent instances will skip web server startup and only provide MCP tools.

```json
{
  "mcpServers": {
    "codebase-mcp-project1": {
      "command": "npx",
      "args": ["codebase-mcp"]
    },
    "codebase-mcp-project2": {
      "command": "npx",
      "args": ["codebase-mcp"]
    }
  }
}
```

## Local Development

For development, use the built version:

```json
{
  "mcpServers": {
    "codebase-mcp": {
      "command": "node",
      "args": ["/path/to/codebase-mcp/dist/index.js", "--web-port", "8090"]
    }
  }
}
```

## Configuration File

After first run, edit `~/.codebase-mcp/settings.toml`:

```toml
# Indexing service (for codebase-retrieval)
BASE_URL = "https://d6.api.augmentcode.com/"
TOKEN = "your-token-here"

# Prompt enhancement service
ENHANCE_BASE_URL = "https://api.x.ai"
ENHANCE_TOKEN = "your-xai-token-here"
MODEL = "grok-2-1212"
API_TIMEOUT = 120000

# Indexing settings
BATCH_SIZE = 10
MAX_LINES_PER_BLOB = 800

# File types to index
TEXT_EXTENSIONS = [
  ".py", ".js", ".ts", ".jsx", ".tsx",
  ".java", ".go", ".rs", ".cpp", ".c",
  ".md", ".txt", ".json", ".yaml", ".yml"
]

# Exclude patterns
EXCLUDE_PATTERNS = [
  "node_modules", ".git", "dist", "build",
  "__pycache__", ".venv", "venv"
]
```
