# Seafile MCP Server — Deployment Guide

This guide covers installing and configuring the Seafile MCP Server for both OpenCode and Claude Code MCP clients.

## Prerequisites

- **Node.js 20+** — [Download from nodejs.org](https://nodejs.org/)
- **Git** — For cloning the repository
- **Seafile server** — A running Seafile instance with API access

## Quick Start

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/user/seafile-mcp/main/install.sh | bash
```

Or manually:

```bash
git clone https://github.com/user/seafile-mcp-server.git
cd seafile-mcp-server
./install.sh
```

### Windows

```powershell
# Run in PowerShell (5.1 or 7+)
irm https://raw.githubusercontent.com/user/seafile-mcp/main/install.ps1 | iex
```

Or manually:

```powershell
git clone https://github.com/user/seafile-mcp-server.git
cd seafile-mcp-server
.\install.ps1
```

## What the Installer Does

1. **Checks prerequisites** — Verifies Node.js 20+, npm, and git are installed
2. **Installs to XDG location** — `~/.local/share/seafile-mcp-server` (macOS/Linux) or `%LOCALAPPDATA%\seafile-mcp-server` (Windows)
3. **Builds the server** — Runs `npm install && npm run build`
4. **Prompts for configuration** — Asks for your Seafile server URL and API token
5. **Creates `.env` file** — Stores your configuration securely
6. **Configures MCP clients** — Optionally sets up OpenCode and/or Claude Code
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

Edit your OpenCode configuration file:

- **macOS**: `~/.config/opencode/opencode.jsonc`
- **Linux**: `~/.config/opencode/opencode.jsonc`
- **Windows**: `%APPDATA%\opencode\opencode.jsonc`

Add the following (adjust path to your install directory):

```jsonc
{
  "mcp": {
    "seafile": {
      "type": "local",
      "command": ["node", "/home/username/.local/share/seafile-mcp-server/dist/index.js"],
      "environment": {
        "SEAFILE_URL": "{env:SEAFILE_URL}",
        "SEAFILE_TOKEN": "{env:SEAFILE_TOKEN}",
      },
    },
  },
}
```

> **Note**: The `{env:...}` syntax tells OpenCode to read these values from environment variables.

### Claude Code

Edit your Claude Desktop configuration file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the following (replace values with your actual credentials):

```json
{
  "mcpServers": {
    "seafile": {
      "command": "node",
      "args": ["/home/username/.local/share/seafile-mcp-server/dist/index.js"],
      "env": {
        "SEAFILE_URL": "https://seafile.example.com",
        "SEAFILE_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

## Getting Your Seafile API Token

1. Log into your Seafile web interface
2. Click on your profile (top right)
3. Go to **Settings** → **API Token** (or **Advanced** → **API Token** in older versions)
4. Generate a new token
5. Copy the token value

## Available Tools

After installation, the following MCP tools are available:

### File Operations

- `list_files` — List files in a directory
- `get_file` — Get file download link
- `get_file_detail` — Get file metadata
- `upload_file` — Upload a file
- `delete_file` — Delete a file (destructive)

### Directory Operations

- `create_folder` — Create a new directory
- `delete_folder` — Delete a directory (destructive)
- `rename_item` — Rename a file or folder
- `move_item` — Move a file or folder
- `copy_item` — Copy a file or folder

### Repository Operations

- `list_repos` — List all accessible repositories
- `get_repo_info` — Get repository information
- `create_repo` — Create a new library
- `delete_repo` — Delete a library (destructive)

### Search

- `search_files` — Search for files by name

### Sharing

- `create_share_link` — Create a public share link
- `list_share_links` — List share links
- `delete_share_link` — Delete a share link (destructive)
- `share_to_user` — Share a library/folder with a user or group
- `list_shared` — List shared items

### Starred Items

- `list_starred` — List all starred items
- `star_item` — Star a file or folder
- `unstar_item` — Remove a star

### Account

- `get_server_info` — Get Seafile server info
- `get_account_info` — Get authenticated user info

## Troubleshooting

### Installation Fails

1. **Check Node.js version**: `node --version` should be 20+
2. **Check permissions**: Ensure you have write access to `~/.local/share`
3. **Try manual installation**: Clone the repo and run `npm install && npm run build`

### MCP Client Doesn't Recognize Server

1. **Restart the client**: Both OpenCode and Claude Desktop require a restart
2. **Check config syntax**: Validate JSON with `python -m json.tool < config.json`
3. **Check file paths**: Ensure the path to `dist/index.js` is correct
4. **Check environment variables**: For OpenCode, ensure SEAFILE_URL and SEAFILE_TOKEN are set

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

## Project Structure

```
~/.local/share/seafile-mcp-server/
├── .env                    # Your credentials (never commit this)
├── dist/                   # Compiled JavaScript
├── src/                    # Source TypeScript
│   ├── tools/              # Tool implementations
│   ├── seafile.ts          # HTTP client
│   ├── types.ts            # Shared types
│   └── ...
├── backups/                # Config backups
└── package.json
```

## Support

- **API Reference**: See `docs/seafile-api-reference.md`
- **Development Spec**: See `docs/spec.md`
- **MCP Documentation**: See `docs/MCP-DOCUMENTATION.md`

## License

MIT
