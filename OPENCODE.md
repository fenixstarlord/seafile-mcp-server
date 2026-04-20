# Seafile MCP Server — OpenCode

An MCP server for Seafile that works with OpenCode and is scoped to a single Seafile library.

> **Note:** For Claude Code setup, see [CLAUDE.md](./CLAUDE.md).

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

Add one or more named entries to your OpenCode config file (`~/.config/opencode/opencode.jsonc` on macOS/Linux, `%APPDATA%\opencode\opencode.jsonc` on Windows):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
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
    },
    "seafile-admin-vibes": {
      "type": "local",
      "command": ["node", "/path/to/seafile-mcp-server/dist/src/index.js"],
      "environment": {
        "SEAFILE_URL": "{env:SEAFILE_ADMIN_VIBES_URL}",
        "SEAFILE_TOKEN": "{env:SEAFILE_ADMIN_VIBES_TOKEN}",
        "SEAFILE_AUTH_MODE": "{env:SEAFILE_ADMIN_VIBES_AUTH_MODE}",
        "SEAFILE_REPO_ID": "{env:SEAFILE_ADMIN_VIBES_REPO_ID}"
      }
    }
  },
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

OpenCode reads `{env:VAR}` values from your shell environment. If you installed with the included installer, load the generated `.env` file from your shell profile.

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

- [CLAUDE.md](./CLAUDE.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [docs/spec.md](./docs/spec.md)
- [docs/seafile-api-reference.md](./docs/seafile-api-reference.md)
