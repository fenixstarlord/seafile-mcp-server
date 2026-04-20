# Seafile MCP Server — Claude Code

An MCP server for Seafile that works with Claude Code and is scoped to a single Seafile library.

> **Note:** For OpenCode setup, see [OPENCODE.md](./OPENCODE.md).

## Project Overview

- **Type:** MCP server
- **Auth model:** Repo-token by default, optional account-token mode
- **Runtime:** Node.js 20+
- **Entry:** `dist/src/index.js`

## Available Tools

| Category       | Tools                                                                     |
| -------------- | ------------------------------------------------------------------------- |
| **File**       | `list_files`, `get_file`, `get_file_detail`, `upload_file`, `delete_file` |
| **Directory**  | `create_folder`, `delete_folder`, `rename_item`                           |
| **Batch**      | `batch_delete`                                                            |
| **Repository** | `get_repo_info`                                                           |
| **Server**     | `get_server_info`                                                         |

Repo-token mode is the default and recommended mode. In optional account-token mode, the server also registers `move_item`, `copy_item`, `batch_copy`, `batch_move`, and `create_share_link`.

## Configuration

Add one or more named entries to your Claude Desktop configuration file:

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
    },
    "seafile-admin-vibes": {
      "command": "node",
      "args": ["/path/to/seafile-mcp-server/dist/src/index.js"],
      "env": {
        "SEAFILE_URL": "https://seafile.example.com",
        "SEAFILE_TOKEN": "your-account-token-here",
        "SEAFILE_AUTH_MODE": "account-token",
        "SEAFILE_REPO_ID": "550e8400-e29b-41d4-a716-446655440000"
      }
    }
  }
}
```

The installer can add multiple named entries by re-running it for each scope you want to register.

## Environment Variables

| Variable | Description |
| -------- | ----------- |
| `SEAFILE_URL` | Your Seafile server URL, e.g. `https://seafile.example.com` |
| `SEAFILE_TOKEN` | Repo API token by default, or account token in account-token mode |
| `SEAFILE_AUTH_MODE` | Optional: `repo-token` (default) or `account-token` |
| `SEAFILE_REPO_ID` | Required only in account-token mode to scope the server to one library |
| `LOG_LEVEL` | Logging level: `debug`, `info`, `warn`, `error`, `fatal` |

## Getting Your Seafile Repo Token

1. Log into the Seafile web interface.
2. Open the target library.
3. Right-click the library name.
4. Select **Advanced** -> **API Token**.
5. Generate and copy the token.

That token only works for the specific library it was created for.

## Development

| Command           | Description                    |
| ----------------- | ------------------------------ |
| `npm run build`   | Compile TypeScript to `dist/`  |
| `npm run dev`     | Dev mode with hot reload (tsx) |
| `npm run start`   | Run compiled server            |
| `npm run inspect` | Launch MCP Inspector           |
| `npm run test`    | Run tests                      |
| `npm run lint`    | Run ESLint                     |

## See Also

- [OPENCODE.md](./OPENCODE.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [docs/spec.md](./docs/spec.md)
- [docs/seafile-api-reference.md](./docs/seafile-api-reference.md)
