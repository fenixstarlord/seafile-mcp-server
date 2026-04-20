# Seafile MCP Server — Deployment Guide

This guide covers installing and configuring the Seafile MCP Server for OpenCode and Claude Code.

## Quick Start

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/user/seafile-mcp/main/install.sh | bash
```

### Windows

```powershell
irm https://raw.githubusercontent.com/user/seafile-mcp/main/install.ps1 | iex
```

## Prerequisites

- Node.js 20+
- Git
- A running Seafile instance
- A repo API token for the specific Seafile library you want this MCP server to manage

## What the Installer Does

1. Checks prerequisites.
2. Installs the repo into the local application data directory.
3. Runs `npm install` and `npm run build`.
4. Prompts for `SEAFILE_URL` and `SEAFILE_TOKEN`.
5. Writes a `.env` file.
6. Updates OpenCode and/or Claude Code configuration.

## Post-Installation

### Start the Server

```bash
# macOS / Linux
cd ~/.local/share/seafile-mcp-server && npm run start

# Windows
cd $env:LOCALAPPDATA\seafile-mcp-server ; npm run start
```

### Test with MCP Inspector

```bash
cd ~/.local/share/seafile-mcp-server
npm run inspect
```

The current runtime exposes 16 repo-token-safe tools.

## Manual Configuration

### OpenCode

Edit `~/.config/opencode/opencode.jsonc` on macOS/Linux or `%APPDATA%\opencode\opencode.jsonc` on Windows:

```jsonc
{
  "mcp": {
    "seafile": {
      "type": "local",
      "command": ["node", "/path/to/seafile-mcp-server/dist/index.js"],
      "environment": {
        "SEAFILE_URL": "{env:SEAFILE_URL}",
        "SEAFILE_TOKEN": "{env:SEAFILE_TOKEN}",
      },
    },
  },
}
```

### Claude Code

Edit your Claude Desktop config file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "seafile": {
      "command": "node",
      "args": ["/path/to/seafile-mcp-server/dist/index.js"],
      "env": {
        "SEAFILE_URL": "https://seafile.example.com",
        "SEAFILE_TOKEN": "your-repo-token-here"
      }
    }
  }
}
```

## Getting Your Seafile Repo Token

1. Log into your Seafile web interface.
2. Navigate to the library you want to access.
3. Right-click the library name.
4. Select **Advanced** -> **API Token**.
5. Generate and copy the token.

That token is library-specific. If you want to manage a different library, generate a different repo token and point a separate MCP configuration at it.

## Troubleshooting

### 401 Unauthorized

This server is repo-token-only. A valid account token will not work. Verify that:

1. `SEAFILE_TOKEN` is a repo API token, not an account token.
2. The token belongs to the library you expect to manage.
3. The server URL is correct and includes the protocol.

### OpenCode env vars

OpenCode reads `{env:VAR}` values from your shell environment, not from `.env`. If you used the installer, source the generated `.env` file from your shell profile.

### Config path

The compiled entry point is `dist/index.js`.

## Documentation

- [README.md](./README.md)
- [OPENCODE.md](./OPENCODE.md)
- [CLAUDE.md](./CLAUDE.md)
- [docs/spec.md](./docs/spec.md)
- [docs/seafile-api-reference.md](./docs/seafile-api-reference.md)
