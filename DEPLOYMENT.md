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
- Optional: an account token plus repo ID if you want advanced operations like move/copy/share links

## What the Installer Does

1. Checks prerequisites.
2. Installs the repo into the local application data directory.
3. Runs `npm install` and `npm run build`.
4. Prompts for a named MCP entry, auth mode, and credentials.
5. Writes a profile env file under `profiles/`.
6. Updates OpenCode and/or Claude Code configuration with that named entry.

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

The current runtime defaults to the repo-token-safe tool set. Account-token mode enables advanced operations for a single configured library. Re-run the installer to add additional named repo-token or account-token entries.

## Manual Configuration

### OpenCode

Edit `~/.config/opencode/opencode.jsonc` on macOS/Linux or `%APPDATA%\opencode\opencode.jsonc` on Windows:

```jsonc
{
  "mcp": {
    "seafile-vibes": {
      "type": "local",
      "command": ["node", "/path/to/seafile-mcp-server/dist/src/index.js"],
      "environment": {
        "SEAFILE_URL": "{env:SEAFILE_VIBES_URL}",
        "SEAFILE_TOKEN": "{env:SEAFILE_VIBES_TOKEN}",
        "SEAFILE_AUTH_MODE": "{env:SEAFILE_VIBES_AUTH_MODE}",
        "SEAFILE_REPO_ID": "{env:SEAFILE_VIBES_REPO_ID}"
      }
    }
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
    "seafile-vibes": {
      "command": "node",
      "args": ["/path/to/seafile-mcp-server/dist/src/index.js"],
      "env": {
        "SEAFILE_URL": "https://seafile.example.com",
        "SEAFILE_TOKEN": "your-repo-token-here",
        "SEAFILE_AUTH_MODE": "repo-token"
      }
    }
  }
}
```

To support multiple libraries or mixed auth modes, add more named entries like `seafile-design` or `seafile-admin-vibes`.

## Getting Your Seafile Repo Token

1. Log into your Seafile web interface.
2. Navigate to the library you want to access.
3. Right-click the library name.
4. Select **Advanced** -> **API Token**.
5. Generate and copy the token.

That token is library-specific. If you want to manage a different library, generate a different repo token and point a separate MCP configuration at it.

## Troubleshooting

### 401 Unauthorized

Verify that:

1. `SEAFILE_TOKEN` matches the configured auth mode.
2. In repo-token mode, the token belongs to the library you expect to manage.
3. In account-token mode, `SEAFILE_REPO_ID` is set correctly.
4. The server URL is correct and includes the protocol.

### OpenCode env vars

OpenCode reads `{env:VAR}` values from your shell environment, not from `.env`. If you used the installer, source the generated `.env` file from your shell profile.

### Config path

The compiled entry point is `dist/src/index.js`.

## Documentation

- [README.md](./README.md)
- [OPENCODE.md](./OPENCODE.md)
- [CLAUDE.md](./CLAUDE.md)
- [docs/spec.md](./docs/spec.md)
- [docs/seafile-api-reference.md](./docs/seafile-api-reference.md)
