# Seafile MCP Server — Claude Code

An MCP server for Seafile cloud storage integration. Works with Claude Code and OpenCode.

> **Note:** This project supports both Claude Code and OpenCode. For OpenCode-specific documentation, see [OPENCODE.md](./OPENCODE.md).

## Project Overview

- **Type:** MCP (Model Context Protocol) server
- **Purpose:** Exposes Seafile file operations, repository management, sharing, and account tools as MCP tools
- **Runtime:** Node.js 20+
- **Entry:** `dist/index.js`

## Available Tools (19 total)

| Category       | Tools                                                                                        |
| -------------- | -------------------------------------------------------------------------------------------- |
| **File**       | `list_files`, `get_file`, `get_file_detail`, `upload_file`, `delete_file`                    |
| **Directory**  | `create_folder`, `delete_folder`, `rename_item`, `move_item`, `copy_item`                    |
| **Repository** | `list_repos`, `get_repo_info`, `create_repo`, `delete_repo`                                  |
| **Search**     | `search_files`                                                                               |
| **Sharing**    | `create_share_link`, `list_share_links`, `delete_share_link`, `share_to_user`, `list_shared` |
| **Starred**    | `list_starred`, `star_item`, `unstar_item`                                                   |
| **Account**    | `get_server_info`, `get_account_info`                                                        |

### Resources

| URI               | Description                         |
| ----------------- | ----------------------------------- |
| `seafile://repos` | List of all accessible repositories |

## Configuration

### Claude Desktop Config

Add to your Claude Desktop configuration file:

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

### Environment Variables

| Variable        | Description                                                                |
| --------------- | -------------------------------------------------------------------------- |
| `SEAFILE_URL`   | Your Seafile server URL (e.g., `https://seafile.example.com`)              |
| `SEAFILE_TOKEN` | Your Seafile repo API token                                                |
| `LOG_LEVEL`     | Logging level: `debug`, `info`, `warn`, `error`, `fatal` (default: `info`) |

> **Note:** Unlike OpenCode, Claude Desktop uses direct values (not `{env:VAR}` syntax). The token will be stored in your config file.

### Getting Your Seafile Repo Token

Seafile uses repo-specific API tokens (not account tokens). To generate a repo token:

1. Log into your Seafile web interface
2. Navigate to the library you want to access
3. Right-click on the library name
4. Select **Advanced** → **API Token**
5. Generate and copy the token

> **Note:** This token only works for the specific library you generated it from. If you need to access a different library, generate a new token for that library.

## Installation

```bash
git clone https://github.com/user/seafile-mcp-server.git
cd seafile-mcp-server
npm install
npm run build
```

Or use the installer:

```bash
curl -fsSL https://raw.githubusercontent.com/user/seafile-mcp/main/install.sh | bash
```

## Development

| Command           | Description                    |
| ----------------- | ------------------------------ |
| `npm run build`   | Compile TypeScript to `dist/`  |
| `npm run dev`     | Dev mode with hot reload (tsx) |
| `npm run start`   | Run compiled server            |
| `npm run inspect` | Launch MCP Inspector           |
| `npm run test`    | Run tests                      |
| `npm run lint`    | Run ESLint                     |

## Project Structure

```
src/
├── index.ts           # Entry point, server init
├── seafile.ts        # HTTP client for Seafile API
├── config.ts         # Configuration loader
├── types.ts          # Zod schemas & TypeScript types
├── resources.ts     # MCP resources
├── prompts.ts       # MCP prompts
├── logger.ts        # Pino logger setup
└── tools/           # Tool implementations
    ├── account.ts
    ├── batch.ts
    ├── directories.ts
    ├── files.ts
    ├── repos.ts
    ├── search.ts
    ├── sharing.ts
    └── starred.ts
```

## See Also

- [OPENCODE.md](./OPENCODE.md) — OpenCode companion documentation
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Detailed deployment guide
- [docs/spec.md](./docs/spec.md) — Development specification
- [docs/seafile-api-reference.md](./docs/seafile-api-reference.md) — Seafile API reference
