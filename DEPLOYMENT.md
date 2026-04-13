# Seafile MCP Server — Deployment Guide

This guide covers installing and configuring the Seafile MCP Server for both OpenCode and Claude Code MCP clients.

## Quick Start

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/user/seafile-mcp/main/install.sh | bash
```

### Windows

```powershell
# Run in PowerShell (5.1 or 7+)
irm https://raw.githubusercontent.com/user/seafile-mcp/main/install.ps1 | iex
```

## Prerequisites

- **Node.js 20+** — [Download from nodejs.org](https://nodejs.org/)
- **Git** — For cloning the repository
- **Seafile server** — A running Seafile instance with API access

## What the Installer Does

1. **Checks prerequisites** — Verifies Node.js 20+, npm, and git are installed
2. **Installs to XDG location** — `~/.local/share/seafile-mcp-server` (macOS/Linux) or `%LOCALAPPDATA%\seafile-mcp-server` (Windows)
3. **Builds the server** — Runs `npm install && npm run build`
4. **Prompts for configuration** — Asks for your Seafile server URL and API token
5. **Creates `.env` file** — Stores your configuration securely
6. **Configures MCP clients** — Select OpenCode, Claude Code, or Both
7. **Backups existing configs** — Before modifying any client configuration files

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

This launches the MCP Inspector UI where you can browse and test all 19 available tools.

### Restart Your MCP Client

After installation, **restart** OpenCode or Claude Desktop for the new MCP server to be recognized.

## Manual Configuration

If automatic configuration fails, you can manually add the Seafile MCP server to your clients.

### OpenCode

Edit `~/.config/opencode/opencode.jsonc` (macOS/Linux) or `%APPDATA%\opencode\opencode.jsonc` (Windows):

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
        "SEAFILE_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

## Getting Your Seafile Repo Token

Seafile uses repo-specific API tokens (not account tokens). To generate a repo token:

1. Log into your Seafile web interface
2. Navigate to the library you want to access
3. Right-click on the library name
4. Select **Advanced** → **API Token**
5. Generate and copy the token

> **Note:** This token only works for the specific library you generated it from. If you need to access a different library, generate a new token for that library.

## Troubleshooting

### Installation Fails

1. **Check Node.js version**: `node --version` should be 20+
2. **Check permissions**: Ensure you have write access to `~/.local/share`
3. **Try manual installation**: Clone the repo and run `npm install && npm run build`

### MCP Client Doesn't Recognize Server

1. **Restart the client**: Both OpenCode and Claude Desktop require a restart
2. **Check config syntax**: Validate JSON with `python -m json.tool < config.json`
3. **Check file paths**: Ensure the path to `dist/src/index.js` is correct
4. **Check environment variables**: For OpenCode, ensure SEAFILE_URL and SEAFILE_TOKEN are set in your shell

### OpenCode MCP not picking up env vars

OpenCode's `{env:VAR}` syntax reads from your shell environment, not from the `.env` file. After installation:

```bash
# Add to ~/.zshrc (or your shell's profile)
source ~/.local/share/seafile-mcp-server/.env
```

Then restart OpenCode or run `source ~/.zshrc` before starting OpenCode.

### Connection Errors

1. **Verify Seafile URL**: Should be the full URL including protocol (https://)
2. **Verify API token**: Token should not have expired
3. **Check firewall**: Ensure your machine can reach the Seafile server
4. **Check server logs**: Look for authentication errors in Seafile logs

### Config Backup Location

If the installer modified your config and you need to restore:

- **macOS/Linux**: `~/.local/share/seafile-mcp-server/backups/`
- **Windows**: `%LOCALAPPDATA%\seafile-mcp-server\backups\`

## Uninstalling

To remove the Seafile MCP server:

```bash
# macOS / Linux
rm -rf ~/.local/share/seafile-mcp-server

# Windows
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\seafile-mcp-server"
```

Then remove the seafile entry from your MCP client configuration files.

## Documentation

For detailed documentation, see:

| Document                                                         | Description                         |
| ---------------------------------------------------------------- | ----------------------------------- |
| [OPENCODE.md](./OPENCODE.md)                                     | OpenCode companion documentation    |
| [CLAUDE.md](./CLAUDE.md)                                         | Claude Code companion documentation |
| [docs/seafile-api-reference.md](./docs/seafile-api-reference.md) | Seafile API reference               |
| [docs/spec.md](./docs/spec.md)                                   | Development specification           |

## License

MIT
