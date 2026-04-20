# Seafile MCP Server

An MCP (Model Context Protocol) server for Seafile that is intentionally scoped to a single library via a Seafile repo API token.

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

## Available Tools

This server is repo-token-only. Tools operate on the library bound to `SEAFILE_TOKEN`, so most operations do not require `repo_id`.

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

### Batch Operations

| Tool           | Description                                  | Annotations |
| -------------- | -------------------------------------------- | ----------- |
| `batch_delete` | Delete multiple files or folders in one call | destructive |
| `batch_copy`   | Copy multiple files or folders in one call   | —           |
| `batch_move`   | Move multiple files or folders in one call   | —           |

### Repository and Sharing

| Tool                | Description                                     | Annotations |
| ------------------- | ----------------------------------------------- | ----------- |
| `get_repo_info`     | Get metadata for the current repository         | readOnly    |
| `create_share_link` | Create a public share link for a file or folder | —           |
| `get_server_info`   | Get Seafile server version and config           | readOnly    |

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
