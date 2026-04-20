# Seafile MCP Server — Development Spec

## Overview

This server exposes a Seafile integration over MCP scoped to one library.

- **Authentication:** Repo token by default, optional account-token mode
- **Transport:** Stdio
- **Runtime:** Node.js 20+, TypeScript, MCP TypeScript SDK

## Runtime Modules

```text
src/
├── index.ts           # Entry point, startup, transport, health check
├── seafile.ts         # HTTP client, retries, timeout handling
├── config.ts          # Environment validation
├── resources.ts       # Resource registration (currently none)
├── prompts.ts         # Upload/share workflow prompts
└── tools/
    ├── account.ts     # get_server_info
    ├── batch.ts       # batch_delete, batch_copy, batch_move
    ├── directories.ts # create_folder, delete_folder, rename_item, move_item, copy_item
    ├── files.ts       # list_files, get_file, get_file_detail, upload_file, delete_file
    ├── repos.ts       # get_repo_info
    └── sharing.ts     # create_share_link
```

## Environment Variables

| Variable        | Required | Description                                                        |
| --------------- | -------- | ------------------------------------------------------------------ |
| `SEAFILE_URL` | Yes | Base URL of the Seafile server, e.g. `https://seafile.example.com` |
| `SEAFILE_TOKEN` | Yes | Repo API token by default, or account token in account-token mode |
| `SEAFILE_AUTH_MODE` | No | `repo-token` (default) or `account-token` |
| `SEAFILE_REPO_ID` | Conditional | Required when `SEAFILE_AUTH_MODE=account-token` |

## Tool Inventory

### File Tools

- `list_files(path='/', page=1, per_page=100)`
- `get_file(path)`
- `get_file_detail(path)`
- `upload_file(path, filename, content)`
- `delete_file(path)`

### Directory Tools

- `create_folder(path, name)`
- `delete_folder(path)`
- `rename_item(path, new_name, type)`
- `move_item(src_path, dst_path, type)` account-token mode only
- `copy_item(src_path, dst_path, type)` account-token mode only

### Batch Tools

- `batch_delete(items[{ path, type }])`
- `batch_copy(items[{ src_path, dst_path }], type)` account-token mode only
- `batch_move(items[{ src_path, dst_path }], type)` account-token mode only

### Repository and Sharing Tools

- `get_repo_info()`
- `create_share_link(path, password?, expire_days?)` account-token mode only
- `get_server_info()`

## Non-Goals

These account-scope tools are intentionally removed from the default repo-token runtime because they do not fit the validated repo-token API on this Seafile server:

- Repository listing and creation
- Account info
- Global search
- Share link listing/deletion
- User/group sharing management
- Shared-item listing
- Starred item management
- Repository list resources

Account-token mode restores the advanced operations implemented for that contract: move, copy, batch move/copy, and share-link creation.

## HTTP Client Requirements

`src/seafile.ts` is responsible for:

- Adding bearer auth headers
- Including endpoint context in error messages
- Retrying transient failures like `429`, `503`, `504`, and DNS/network issues
- Handling successful empty JSON responses without throwing parse errors

## Validation Requirements

- Paths are normalized and protected against traversal
- Repo IDs use UUID validation when present
- Upload sizes are bounded before building `FormData`
- Batch delete requires explicit item `type` so directory deletes do not rely on trailing slash heuristics

## Verification

Run all three before release:

```bash
npm run typecheck
npm run test
npm run build
```
