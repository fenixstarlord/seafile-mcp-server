# Seafile MCP Server

An MCP (Model Context Protocol) server for integrating Seafile cloud storage with OpenWork.

## Documentation

- **[Deployment Guide](./DEPLOYMENT.md)** — Install and configure for OpenCode/Claude Code
- [Development Spec](./docs/spec.md) — Full development specification
- [MCP Documentation](./docs/MCP-DOCUMENTATION.md) — OpenWork MCP setup guide
- [Seafile API Reference](./docs/seafile-api-reference.md) — Complete Seafile API v13.0 reference

## Prerequisites

- Node.js 20+
- A running Seafile server instance
- Seafile API token

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your Seafile server URL and API token
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

## OpenWork Configuration

Add to your `opencode.json`:

```jsonc
{
  "mcp": {
    "seafile": {
      "type": "local",
      "command": ["node", "path/to/seafile-mcp-server/dist/index.js"],
      "environment": {
        "SEAFILE_URL": "{env:SEAFILE_URL}",
        "SEAFILE_TOKEN": "{env:SEAFILE_TOKEN}",
      },
    },
  },
}
```

## Available Tools

### File Operations

| Tool              | Description               | Annotations |
| ----------------- | ------------------------- | ----------- |
| `list_files`      | List files in a directory | readOnly    |
| `get_file`        | Get file download link    | readOnly    |
| `get_file_detail` | Get file metadata         | readOnly    |
| `upload_file`     | Upload a file             | —           |
| `delete_file`     | Delete a file             | destructive |

### Directory Operations

| Tool            | Description             | Annotations |
| --------------- | ----------------------- | ----------- |
| `create_folder` | Create a new directory  | —           |
| `delete_folder` | Delete a directory      | destructive |
| `rename_item`   | Rename a file or folder | —           |
| `move_item`     | Move a file or folder   | —           |
| `copy_item`     | Copy a file or folder   | —           |

### Repository Operations

| Tool            | Description                      | Annotations |
| --------------- | -------------------------------- | ----------- |
| `list_repos`    | List all accessible repositories | readOnly    |
| `get_repo_info` | Get repository information       | readOnly    |
| `create_repo`   | Create a new library             | —           |
| `delete_repo`   | Delete a library                 | destructive |

### Search

| Tool           | Description              | Annotations |
| -------------- | ------------------------ | ----------- |
| `search_files` | Search for files by name | readOnly    |

### Sharing

| Tool                | Description                                 | Annotations |
| ------------------- | ------------------------------------------- | ----------- |
| `create_share_link` | Create a public share link                  | —           |
| `list_share_links`  | List share links                            | readOnly    |
| `delete_share_link` | Delete a share link                         | destructive |
| `share_to_user`     | Share a library/folder with a user or group | —           |
| `list_shared`       | List shared items                           | readOnly    |

### Starred Items

| Tool           | Description                         | Annotations |
| -------------- | ----------------------------------- | ----------- |
| `list_starred` | List all starred items              | readOnly    |
| `star_item`    | Star a file or folder               | idempotent  |
| `unstar_item`  | Remove a star from a file or folder | idempotent  |

### Account

| Tool               | Description                           | Annotations |
| ------------------ | ------------------------------------- | ----------- |
| `get_server_info`  | Get Seafile server version and config | readOnly    |
| `get_account_info` | Get authenticated user info           | readOnly    |

### Resources

| URI               | Description                         |
| ----------------- | ----------------------------------- |
| `seafile://repos` | List of all accessible repositories |

## Project Structure

```
src/
├── index.ts              # Entry point, server init
├── seafile.ts            # HTTP client
├── types.ts              # Shared Zod schemas & TypeScript types
├── resources.ts          # MCP resources
└── tools/
    ├── repos.ts          # Repository tools
    ├── files.ts          # File tools
    ├── directories.ts    # Directory tools
    ├── search.ts         # Search tools
    ├── sharing.ts        # Sharing tools
    ├── starred.ts        # Starred item tools
    └── account.ts        # Account/server info tools
```

## License

MIT
