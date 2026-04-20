# Seafile MCP for OpenWork

This document contains gathered documentation for building a Seafile MCP server to integrate with OpenWork/OpenCode.

---

## Table of Contents

1. [OpenWork MCP Server Configuration](#openwork-mcp-server-configuration)
2. [MCP Protocol Overview](#mcp-protocol-overview)
3. [MCP Server SDKs](#mcp-server-sdks)
4. [Seafile API Reference](#seafile-api-reference)
5. [Implementation Plan](#implementation-plan)

---

## OpenWork MCP Server Configuration

### Overview

OpenWork supports MCP servers through its configuration system. MCP servers are added to `opencode.json` under the `mcp` key.

**Reference**: [OpenCode MCP Servers Documentation](https://opencode.ai/docs/mcp-servers/)

### Configuration Structure

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "seafile-vibes": {
      "type": "local", // or "remote" for HTTP servers
      "command": ["npx", "-y", "seafile-mcp-server"],
      "enabled": true,
      "environment": {
        "SEAFILE_URL": "{env:SEAFILE_VIBES_URL}",
        "SEAFILE_TOKEN": "{env:SEAFILE_VIBES_TOKEN}",
        "SEAFILE_AUTH_MODE": "{env:SEAFILE_VIBES_AUTH_MODE}",
        "SEAFILE_REPO_ID": "{env:SEAFILE_VIBES_REPO_ID}"
      },
      "timeout": 5000,
    },
  },
}
```

### MCP Server Options

| Option        | Type    | Required     | Description                                 |
| ------------- | ------- | ------------ | ------------------------------------------- |
| `type`        | String  | Yes          | `"local"` or `"remote"`                     |
| `command`     | Array   | Yes (local)  | Command and arguments to run the MCP server |
| `url`         | String  | Yes (remote) | URL of the remote MCP server                |
| `enabled`     | Boolean | No           | Enable/disable on startup                   |
| `environment` | Object  | No           | Environment variables for local servers     |
| `headers`     | Object  | No           | Headers for remote servers                  |
| `oauth`       | Object  | No           | OAuth configuration                         |
| `timeout`     | Number  | No           | Timeout in ms (default: 5000)               |

### OpenWork Plugin System (Advanced)

> **Note:** MCP servers are the recommended way to integrate Seafile with OpenWork. The plugin system is only needed for advanced use cases like reacting to events, custom UI, or hooks that run outside of LLM tool calls. For most Seafile integrations, the MCP server alone is sufficient.

For advanced integrations beyond MCP tools, OpenWork plugins can be used to extend functionality:

**Reference**: [OpenCode Plugins Documentation](https://opencode.ai/docs/plugins/)

```javascript
// .opencode/plugins/seafile-plugin.js (OPTIONAL - only if you need hooks/events)
export const SeafilePlugin = async ({ project, client, $, directory, worktree }) => {
  return {
    // Hook implementations for event-driven behavior
    tool: {
      // Custom tools can be added here
    },
  };
};
```

---

## MCP Protocol Overview

### What is MCP?

The Model Context Protocol (MCP) is an open standard developed by Anthropic that standardizes how applications provide context to LLMs. Think of it like USB-C for AI accessories - a standardized way to connect AI models to different data sources and tools.

**Reference**: [MCP Specification](https://modelcontextprotocol.io/)

### MCP Primitives

MCP servers can provide three main types of capabilities:

1. **Tools**: Functions that can be called by the LLM (with user approval)
2. **Resources**: File-like data that can be read by clients (like API responses)
3. **Prompts**: Pre-written templates that help users accomplish specific tasks

### Transport Methods

| Transport           | Use Case       | Description                         |
| ------------------- | -------------- | ----------------------------------- |
| **Stdio**           | Local servers  | Standard input/output communication |
| **Streamable HTTP** | Remote servers | HTTP-based with streaming support   |
| **SSE**             | Legacy         | Server-Sent Events (deprecated)     |

For OpenWork, both local (stdio) and remote (HTTP) servers are supported.

---

## MCP Server SDKs

### TypeScript SDK (Recommended)

**Reference**: [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

#### Installation

```bash
npm install @modelcontextprotocol/sdk zod
# or
bun add @modelcontextprotocol/sdk zod
```

#### Basic Server Structure

```typescript
import { McpServer, StdioServerTransport } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'seafile-mcp',
  version: '1.0.0',
});

// Register a tool
server.registerTool(
  'list_files',
  {
    description: 'List files in a Seafile directory',
    inputSchema: {
      path: z.string().optional().default('/'),
    },
  },
  async ({ path }) => {
    // Tool implementation
    return { content: [{ type: 'text', text: JSON.stringify(files) }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

#### Streamable HTTP Server

For remote MCP servers, use Streamable HTTP:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamable-http/index.js';

const server = new McpServer({ name: 'seafile-mcp', version: '1.0.0' });

const transport = new StreamableHTTPServerTransport({
  port: 3000,
  onSessionEnd: session => {
    /* cleanup */
  },
});

await server.connect(transport);
await transport.waitForReady();
```

### Python SDK

**Reference**: [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk/)

#### Installation

```bash
pip install "mcp[cli]"
# or with uv
uv add "mcp[cli]"
```

#### Basic Server Structure

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Seafile MCP")

@mcp.tool()
async def list_files(repo_id: str, path: str = "/") -> str:
    """List files in a Seafile directory"""
    # Tool implementation
    return json.dumps(files)

@mcp.prompt()
def file_search(query: str) -> str:
    """Generate a prompt for file search"""
    return f"Search for files matching: {query}"

if __name__ == "__main__":
    mcp.run(transport="streamable-http")
```

### Testing with MCP Inspector

```bash
# TypeScript
npx @modelcontextprotocol/inspector node build/index.js

# Python
npx @modelcontextprotocol/inspector python server.py
```

---

## Seafile API Reference

For the complete Seafile API documentation, see: [Seafile API Reference](./seafile-api-reference.md)

This comprehensive reference includes:

- **Authentication** - Account-Token and Repo-Token authentication
- **User Operations** - Account, Files, Directories, Search, Sharing, Groups
- **Admin Operations** - User management, Organizations, Logs
- **Metadata Operations** - Tags, Records, Views, OCR, Face Recognition
- **Quick Reference** - Common curl examples for all operations

---

## Implementation Plan

### Option 1: TypeScript Server (Recommended)

**Pros:**

- Native MCP SDK with full feature support
- Type-safe implementation
- Works well with OpenWork's Node.js ecosystem

**Steps:**

1. Create project with `npx @agentailor/create-mcp-server --name=seafile-mcp`
2. Implement Seafile API client
3. Register tools for common operations
4. Add configuration for server URL and auth token
5. Build and test with MCP Inspector

### Option 2: Python Server

**Pros:**

- Simpler code for rapid prototyping
- Good for data-focused tools
- FastMCP provides quick setup

**Steps:**

1. Create project with `uv init seafile-mcp`
2. Install dependencies with `uv add "mcp[cli] httpx"`
3. Implement FastMCP server
4. Add Seafile API integration
5. Test and deploy

### Recommended Tools for Seafile MCP

Based on Seafile API capabilities:

1. **get_repo_info** - Get the current repo-token repository metadata
2. **list_files** - List files in a directory
3. **get_file** - Get a download link for a file
4. **upload_file** - Upload a file
5. **create_folder** - Create a new directory
6. **get_file_detail** - Get file metadata
7. **create_share_link** - Account-token mode only
8. **batch_move / batch_copy / batch_delete** - Batch delete in repo-token mode, full set in account-token mode

### Environment Variables

```bash
SEAFILE_URL=https://your-seafile-server.com
SEAFILE_TOKEN=your_repo_api_token
SEAFILE_AUTH_MODE=repo-token
SEAFILE_REPO_ID=
```

### Configuration in OpenWork

```jsonc
{
  "mcp": {
    "seafile-vibes": {
      "type": "local",
      "command": ["npx", "seafile-mcp-server"],
      "environment": {
        "SEAFILE_URL": "{env:SEAFILE_VIBES_URL}",
        "SEAFILE_TOKEN": "{env:SEAFILE_VIBES_TOKEN}",
        "SEAFILE_AUTH_MODE": "{env:SEAFILE_VIBES_AUTH_MODE}",
        "SEAFILE_REPO_ID": "{env:SEAFILE_VIBES_REPO_ID}"
      },
    },
  },
}
```

Or for a remote server:

```jsonc
{
  "mcp": {
    "seafile": {
      "type": "remote",
      "url": "https://your-seafile-mcp-server.com/mcp",
      "headers": {
        "Authorization": "Bearer {env:SEAFILE_MCP_TOKEN}",
      },
    },
  },
}
```

---

## Resources

### Local Documentation

- [Seafile API Reference](./seafile-api-reference.md) - Complete Seafile API v13.0 documentation

### External References

- [OpenWork/OpenCode Documentation](https://opencode.ai/docs/)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk/)
- [MCP Server Examples](https://github.com/modelcontextprotocol/servers)
- [Awesome MCP Servers](https://github.com/wong2/awesome-mcp-servers)
