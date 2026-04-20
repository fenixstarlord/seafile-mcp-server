# Seafile MCP Server — Claude Code

An MCP server for Seafile that works with Claude Code and is scoped to a single Seafile library via repo API token.

> **Note:** For OpenCode setup, see [OPENCODE.md](./OPENCODE.md).

## Project Overview

- **Type:** MCP server
- **Auth model:** Repo-token only
- **Runtime:** Node.js 20+
- **Entry:** `dist/index.js`

## Available Tools (16 total)

| Category       | Tools                                                                     |
| -------------- | ------------------------------------------------------------------------- |
| **File**       | `list_files`, `get_file`, `get_file_detail`, `upload_file`, `delete_file` |
| **Directory**  | `create_folder`, `delete_folder`, `rename_item`, `move_item`, `copy_item` |
| **Batch**      | `batch_delete`, `batch_copy`, `batch_move`                                |
| **Repository** | `get_repo_info`                                                           |
| **Sharing**    | `create_share_link`                                                       |
| **Server**     | `get_server_info`                                                         |

Most tools no longer take `repo_id`. The active repository is selected by `SEAFILE_TOKEN`.

## Configuration

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
        "SEAFILE_TOKEN": "your-repo-token-here"
      }
    }
  }
}
```

## Environment Variables

| Variable        | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| `SEAFILE_URL`   | Your Seafile server URL, e.g. `https://seafile.example.com`  |
| `SEAFILE_TOKEN` | Repo API token for the single library this server should use |
| `LOG_LEVEL`     | Logging level: `debug`, `info`, `warn`, `error`, `fatal`     |

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
