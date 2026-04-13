# Seafile MCP Server — OpenCode

An MCP server for Seafile cloud storage integration. Works with OpenCode and Claude Code.

> **Note:** This project supports both OpenCode and Claude Code. For Claude Code-specific documentation, see [CLAUDE.md](./CLAUDE.md).

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

### OpenCode MCP Server Config

Add to your OpenCode config file (`~/.config/opencode/opencode.jsonc` on macOS/Linux, `%APPDATA%\opencode\opencode.jsonc` on Windows):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
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

> **Note:** The `{env:VAR_NAME}` syntax tells OpenCode to read these values from environment variables. Ensure `SEAFILE_URL` and `SEAFILE_TOKEN` are set in your shell profile before running OpenCode.

### Environment Variables

| Variable        | Description                                                                |
| --------------- | -------------------------------------------------------------------------- |
| `SEAFILE_URL`   | Your Seafile server URL (e.g., `https://seafile.example.com`)              |
| `SEAFILE_TOKEN` | Your Seafile repo API token                                                |
| `LOG_LEVEL`     | Logging level: `debug`, `info`, `warn`, `error`, `fatal` (default: `info`) |

> **Important:** OpenCode reads env vars from your shell, not from the `.env` file. After installation, add this to your shell profile (e.g., `~/.zshrc`):
>
> ```bash
> source ~/.local/share/seafile-mcp-server/.env
> ```
>
> Then restart OpenCode or run `source ~/.zshrc` before starting OpenCode.

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
├── resources.ts      # MCP resources
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

- [CLAUDE.md](./CLAUDE.md) — Claude Code companion documentation
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Detailed deployment guide
- [docs/spec.md](./docs/spec.md) — Development specification
- [docs/seafile-api-reference.md](./docs/seafile-api-reference.md) — Seafile API reference
