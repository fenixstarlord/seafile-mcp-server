# Seafile MCP Server — Development Spec

## 1. Overview

An MCP (Model Context Protocol) server that exposes Seafile cloud storage as tools for LLMs. It targets both **personal file management** and **team/org collaboration** use cases equally.

**Authentication:** Account-Token only (Repo-Token support deferred to a future version).

**Transport:** Stdio (local MCP server).

**Runtime:** Node.js 20+, TypeScript, MCP TypeScript SDK.

---

## 2. Architecture

### 2.1 Module Structure

The current single-file `src/index.ts` will be split into modules as tools grow:

```
src/
├── index.ts              # Entry point, server init, transport
├── seafile.ts            # HTTP client (seafileRequest helpers)
├── tools/
│   ├── repos.ts          # list_repos, get_repo_info, create_repo, delete_repo
│   ├── files.ts          # list_files, get_file, upload_file, delete_file, get_file_detail
│   ├── directories.ts    # create_folder, delete_folder, rename_item, move_item, copy_item
│   ├── search.ts         # search_files
│   ├── sharing.ts        # create_share_link, list_share_links, delete_share_link, share_to_user
│   ├── starred.ts        # list_starred, star_item, unstar_item
│   └── account.ts        # get_server_info, get_account_info
├── resources.ts          # MCP resources (repos list, etc.)
└── types.ts              # Shared Zod schemas & TypeScript types
```

### 2.2 HTTP Client

`src/seafile.ts` centralizes all Seafile API communication:

- `seafileRequest<T>(endpoint, options)` — JSON responses
- `seafileRequestText(endpoint, options)` — Text responses (download links)
- `seafileRequestRaw(endpoint, options)` — Raw responses (future: file content download)
- All functions include the endpoint in error messages for actionable debugging
- Retry logic for 429 (Too Many Requests) with exponential backoff
- Configurable timeout (default 30s)

### 2.3 Error Handling Pattern

Every tool wraps its API call and produces an actionable error:

```typescript
throw new Error(
  `Failed to list files in repo ${repo_id} at path "${path}": ` +
  `${response.status} ${response.statusText}. ` +
  (response.status === 401 ? 'Check SEAFILE_TOKEN is valid.' :
   response.status === 404 ? 'Verify repo_id and path exist.' :
   response.status === 403 ? 'Token lacks permission for this repo.' :
   'Check the Seafile server URL and try again.')
);
```

Tools return errors as MCP error results (not thrown exceptions) when the failure is user-recoverable:

```typescript
return {
  content: [{ type: 'text', text: JSON.stringify({ error: message }, null, 2) }],
  isError: true,
};
```

### 2.4 Tool Annotations

All tools include appropriate annotations:

| Category | Annotations |
|----------|-------------|
| Read operations (list_*, get_*, search_*) | `{ readOnlyHint: true }` |
| Create operations (create_*, upload_*) | `{ idempotentHint: false }` |
| Delete operations (delete_*) | `{ destructiveHint: true }` |
| Move/copy (move_*, copy_*) | `{ idempotentHint: false }` |
| Share operations | `{ readOnlyHint: false }` |

---

## 3. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SEAFILE_URL` | Yes | Base URL of the Seafile server (e.g. `https://seafile.example.com`) |
| `SEAFILE_TOKEN` | Yes | Account-Token for API authentication |

---

## 4. Tool Inventory

### 4.1 Existing Tools — Fixes Required

| Tool | Issue | Fix |
|------|-------|-----|
| `list_repos` | Missing `readOnlyHint` annotation | Add annotation |
| `list_files` | Missing `readOnlyHint` annotation | Add annotation |
| `get_file` | Missing `readOnlyHint` annotation | Add annotation |
| `upload_file` | Missing `idempotentHint` annotation | Add annotation |
| `create_folder` | Missing annotation | Add `idempotentHint: false` |
| `get_repo_info` | Missing `readOnlyHint` annotation | Add annotation |
| All tools | Generic error messages | Update `seafileRequest` to include endpoint context |

### 4.2 New Tools — High Priority

#### `delete_file`
- **Endpoint:** `DELETE /api/v2.1/repos/{repo_id}/file/`
- **Params:** `repo_id` (string), `path` (string)
- **Annotation:** `{ destructiveHint: true }`
- **Behavior:** Delete a single file. Returns success confirmation.

#### `delete_folder`
- **Endpoint:** `DELETE /api2/repos/{repo_id}/dir/`
- **Params:** `repo_id` (string), `path` (string)
- **Annotation:** `{ destructiveHint: true }`
- **Behavior:** Delete a directory. Returns success confirmation.

#### `search_files`
- **Endpoint:** `GET /api/v2.1/search/file/`
- **Params:** `query` (string), `repo_id` (string, optional), `search_path` (string, optional)
- **Annotation:** `{ readOnlyHint: true }`
- **Behavior:** Search for files by name within a library. If `repo_id` is provided, scope to that library.

#### `create_share_link`
- **Endpoint:** `POST /api/v2.1/share-links/`
- **Params:** `repo_id` (string), `path` (string), `password` (string, optional), `expire_days` (number, optional)
- **Annotation:** `{ idempotentHint: false }`
- **Behavior:** Create a public share link for a file or folder. Returns the link URL.

### 4.3 New Tools — Medium Priority

#### `move_file`
- **Endpoint:** `POST /api/v2.1/repos/{repo_id}/file/` (operation=move)
- **Params:** `repo_id` (string), `path` (string), `destination_path` (string), `target_repo_id` (string, optional)
- **Annotation:** `{ idempotentHint: false }`

#### `copy_file`
- **Endpoint:** `POST /api/v2.1/repos/{repo_id}/file/` (operation=copy)
- **Params:** `repo_id` (string), `path` (string), `destination_path` (string), `target_repo_id` (string, optional)
- **Annotation:** `{ idempotentHint: false }`

#### `rename_item`
- **Endpoint:** `POST /api/v2.1/repos/{repo_id}/file/` or `POST /api2/repos/{repo_id}/dir/` (operation=rename)
- **Params:** `repo_id` (string), `path` (string), `new_name` (string), `type` (enum: `file` | `dir`)
- **Annotation:** `{ idempotentHint: false }`

#### `list_shared`
- **Endpoint:** `GET /api2/beshared-repos/` (shared to me) + `GET /api/v2.1/shared-folders/` (shared folders)
- **Params:** `repo_id` (string, optional), `path` (string, optional)
- **Annotation:** `{ readOnlyHint: true }`

### 4.4 New Tools — Lower Priority

| Tool | Endpoint | Description |
|------|----------|-------------|
| `get_file_detail` | `GET /api2/repos/{repo_id}/file/detail/` | Get file metadata (size, last modified) |
| `get_file_history` | `GET /api/v2.1/repos/{repo_id}/file/history/` | Get file revision history |
| `lock_file` | `PUT /api/v2.1/repos/{repo_id}/file/` | Lock/unlock file for editing |
| `star_item` | `POST /api/v2.1/starred-items/` | Star a file/folder |
| `unstar_item` | `DELETE /api/v2.1/starred-items/` | Unstar a file/folder |
| `list_starred` | `GET /api/v2.1/starred-items/` | List starred items |
| `get_server_info` | `GET /api2/server-info/` | Get Seafile server info |
| `get_account_info` | `GET /api2/account/info/` | Get authenticated user info |
| `create_repo` | `POST /api2/repos/` | Create a new library |
| `delete_repo` | `DELETE /api2/repos/{repo_id}/` | Delete a library |

---

## 5. Resources

### 5.1 Existing

- `seafile://repos` — List of all accessible repositories (JSON)

### 5.2 Planned

- `seafile://server-info` — Server version and configuration
- `seafile://account` — Authenticated user profile

---

## 6. MCP Prompts

No prompts are currently registered. Future candidates:

- `seafile-upload-workflow` — Guided prompt for uploading files
- `seafile-search` — Guided prompt for finding files

(Deferred — not required for initial release.)

---

## 7. Build & Development

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run dev` | Run with tsx (hot reload) |
| `npm run start` | Run compiled server |
| `npm run inspect` | Launch MCP Inspector |

### Missing Scripts (to add)

| Command | Description |
|---------|-------------|
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm run lint` | Run eslint |

---

## 8. Quality Checklist

- [ ] `.gitignore` — Exclude `node_modules/`, `dist/`, `.env`, `.DS_Store`
- [ ] `.env.example` — Document required env vars (`SEAFILE_URL`, `SEAFILE_TOKEN`)
- [ ] All tools have proper Zod schemas with `.describe()` on every field
- [ ] All tools have appropriate `annotations`
- [ ] All tools return actionable error messages (endpoint + status + remediation)
- [ ] `seafileRequest` includes endpoint context in error messages
- [ ] No credentials or tokens committed
- [ ] README "Planned" table matches the tool backlog in openwork.md
- [ ] SKILL.md workflows updated for new tools

---

## 9. Implementation Order

1. **Refactor** — Split `src/index.ts` into modules; move HTTP client to `seafile.ts`
2. **Fix** — Add annotations to existing tools; improve error messages
3. **Add** — High-priority tools: `delete_file`, `delete_folder`, `search_files`, `create_share_link`
4. **Add** — Medium-priority tools: `move_file`, `copy_file`, `rename_item`, `list_shared`
5. **Add** — Lower-priority tools as needed
6. **Add** — `.gitignore`, `.env.example`, `typecheck`/`lint` scripts
7. **Update** — README, SKILL.md, openwork.md to reflect final state