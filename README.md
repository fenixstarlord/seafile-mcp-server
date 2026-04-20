# Seafile MCP Server

An MCP (Model Context Protocol) server for Seafile that is intentionally scoped to a single library.

The default mode uses a Seafile repo token. An optional account-token mode is also available for advanced operations that are not exposed through the validated repo-token API on Seafile 11.0.19.

## Documentation

- **[Deployment Guide](./DEPLOYMENT.md)** — Install and configure for OpenCode or Claude Code
- [OPENCODE.md](./OPENCODE.md) — OpenCode-specific setup and tool overview
- [CLAUDE.md](./CLAUDE.md) — Claude Code-specific setup and tool overview
- [Development Spec](./docs/spec.md) — Current runtime and implementation notes
- [Seafile API Reference](./docs/seafile-api-reference.md) — Bundled Seafile API reference

## Prerequisites

- Node.js 20+
- A running Seafile server instance
- A Seafile repo API token for the target library
- Optional: an account token plus a target repo ID for advanced operations

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your Seafile server URL and repo token
   ```

3. Build the server:

   ```bash
   npm run build
   ```

## Development

| Command             | Description                    |
| ------------------- | ------------------------------ |
| `npm run build`     | Compile TypeScript             |
| `npm run typecheck` | Type-check without emitting    |
| `npm run dev`       | Dev mode with hot reload (tsx) |
| `npm run start`     | Run compiled server            |
| `npm run inspect`   | Launch MCP Inspector           |
| `npm run test`      | Run tests                      |

## Auth Modes

### Repo-token Mode

- Default: `SEAFILE_AUTH_MODE=repo-token`
- Uses `SEAFILE_TOKEN` as a repo API token
- Best for the smallest and safest single-library tool surface

### Account-token Mode

- Set `SEAFILE_AUTH_MODE=account-token`
- Uses `SEAFILE_TOKEN` as an account token
- Requires `SEAFILE_REPO_ID` to keep the server scoped to one library
- Enables advanced operations like move, copy, batch move/copy, and share links

## Multiple Libraries

The recommended way to support multiple repo tokens and account-token scopes is to configure multiple named MCP server entries.

- One MCP entry per repo token
- One MCP entry per account-token plus `SEAFILE_REPO_ID` pair
- Keep each entry scoped to a single library

Example OpenCode naming scheme:

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
  }
}
```

Suggested shell env pattern:

```bash
export SEAFILE_VIBES_URL="https://seafile.example.com"
export SEAFILE_VIBES_TOKEN="repo-token-here"
export SEAFILE_VIBES_AUTH_MODE="repo-token"
export SEAFILE_VIBES_REPO_ID=""

export SEAFILE_ADMIN_VIBES_URL="https://seafile.example.com"
export SEAFILE_ADMIN_VIBES_TOKEN="account-token-here"
export SEAFILE_ADMIN_VIBES_AUTH_MODE="account-token"
export SEAFILE_ADMIN_VIBES_REPO_ID="550e8400-e29b-41d4-a716-446655440000"
```

## Available Tools

Core tools are available in both modes and operate on the scoped library.

### File Operations

| Tool              | Description                             | Annotations |
| ----------------- | --------------------------------------- | ----------- |
| `list_files`      | List files and directories in a path    | readOnly    |
| `get_file`        | Get a download link for a file          | readOnly    |
| `get_file_detail` | Get metadata for a file                 | readOnly    |
| `upload_file`     | Upload a file to the current repository | —           |
| `delete_file`     | Delete a file permanently               | destructive |

### Directory Operations

| Tool            | Description             | Annotations |
| --------------- | ----------------------- | ----------- |
| `create_folder` | Create a new directory  | —           |
| `delete_folder` | Delete a directory      | destructive |
| `rename_item`   | Rename a file or folder | —           |
| `move_item`     | Move a file or folder   | —           |
| `copy_item`     | Copy a file or folder   | —           |

`move_item` and `copy_item` are only registered in `account-token` mode.

### Batch Operations

| Tool           | Description                                  | Annotations |
| -------------- | -------------------------------------------- | ----------- |
| `batch_delete` | Delete multiple files or folders in one call | destructive |
| `batch_copy`   | Copy multiple files or folders in one call   | —           |
| `batch_move`   | Move multiple files or folders in one call   | —           |

`batch_copy` and `batch_move` are only registered in `account-token` mode.

### Repository and Sharing

| Tool                | Description                                     | Annotations |
| ------------------- | ----------------------------------------------- | ----------- |
| `get_repo_info`     | Get metadata for the current repository         | readOnly    |
| `create_share_link` | Create a public share link for a file or folder | —           |
| `get_server_info`   | Get Seafile server version and config           | readOnly    |

`create_share_link` is only registered in `account-token` mode.

## Project Structure

```text
src/
├── index.ts           # Entry point, server init
├── seafile.ts         # HTTP client
├── config.ts          # Environment validation
├── types.ts           # Shared Zod schemas & TypeScript types
├── resources.ts       # MCP resources (currently none registered)
└── tools/
    ├── account.ts
    ├── batch.ts
    ├── directories.ts
    ├── files.ts
    ├── repos.ts
    └── sharing.ts
```

## License

MIT
