# Seafile MCP Skill

Procedural knowledge for working with Seafile via MCP.

## When to Use This Skill

Use this skill when the user wants to:

- Browse or navigate files in Seafile
- Upload, download, or delete files
- Organize files into folders, rename or move items
- Share files and folders with users or via public links
- Search for specific files
- Manage repositories (create, delete, get info)
- Star/unstar items for quick access
- Get server or account information

## Prerequisites

Before file operations, verify:

1. Seafile server URL is configured (`SEAFILE_URL`)
2. API token is valid (`SEAFILE_TOKEN`)
3. User has access to the target repository

Ask the user if not configured:

- Seafile server URL (e.g., `https://seafile.example.com`)
- API token (from Seafile web UI: Library menu → Advanced → API Token)

## Common Workflows

### 1. Browse Repository Structure

```typescript
// Step 1: List all repositories
list_repos();

// Step 2: For a specific repo, list files
list_files({ repo_id: 'uuid-here', path: '/' });

// Step 3: Navigate subdirectories
list_files({ repo_id: 'uuid-here', path: '/Documents' });
```

### 2. Upload a File

```typescript
// Step 1: Confirm destination
// Ask: "Which repo and path should I upload to?"

// Step 2: Upload (plain text or base64: prefix for binary)
upload_file({
  repo_id: 'uuid-here',
  path: '/Documents',
  filename: 'report.txt',
  content: 'File content here...',
});

// Step 3: Verify
list_files({ repo_id: 'uuid-here', path: '/Documents' });
```

### 3. Download/Get File

```typescript
// Get download link
get_file({ repo_id: 'uuid-here', path: '/Documents/report.txt' });
// Returns download link — provide to user
```

### 4. Create Folder Structure

```typescript
create_folder({ repo_id: 'uuid-here', path: '/', name: 'Projects' });
create_folder({ repo_id: 'uuid-here', path: '/Projects', name: '2026' });
```

### 5. Share a File or Folder

```typescript
// Create a public share link
create_share_link({
  repo_id: 'uuid-here',
  path: '/Documents/report.txt',
  password: 'optional-password', // optional
  expire_days: 7, // optional
});

// Share with a specific user
share_to_user({
  repo_id: 'uuid-here',
  share_type: 'user',
  username: 'colleague@example.com',
  permission: 'rw',
});
```

### 6. Search for Files

```typescript
// Search across all repos
search_files({ query: 'report' });

// Search within a specific repo
search_files({ query: 'report', repo_id: 'uuid-here' });
```

### 7. Move, Copy, Rename

```typescript
// Rename a file
rename_item({ repo_id: 'uuid-here', path: '/old.txt', new_name: 'new.txt', type: 'file' });

// Move a file
move_item({ repo_id: 'uuid-here', src_path: '/file.txt', dst_path: '/Archive/', type: 'file' });

// Copy a file
copy_item({ repo_id: 'uuid-here', src_path: '/file.txt', dst_path: '/Backup/', type: 'file' });
```

## Tool Annotations

| Annotation              | Meaning                       | Tools                                                      |
| ----------------------- | ----------------------------- | ---------------------------------------------------------- |
| `readOnlyHint: true`    | Safe, no side effects         | list*\*, get*\*, search_files                              |
| `destructiveHint: true` | Destructive, cannot be undone | delete_file, delete_folder, delete_repo, delete_share_link |
| `idempotentHint: true`  | Safe to retry                 | star_item, unstar_item                                     |

## Error Recovery

| Error                 | Cause                 | Recovery                       |
| --------------------- | --------------------- | ------------------------------ |
| 401 Unauthorized      | Invalid/expired token | Ask user to regenerate token   |
| 404 Not Found         | Wrong path or repo_id | List repos/files to verify     |
| 403 Forbidden         | No permission         | Request access from repo owner |
| 400 Bad Request       | Invalid parameters    | Check API docs for format      |
| 429 Too Many Requests | Rate limited          | Wait and retry with backoff    |

## Tips

1. **Always confirm paths** before destructive operations (delete, move)
2. **Check file sizes** — Seafile may have upload limits
3. **Use descriptive paths** — `/Projects/2026/Q1-Report.pdf` better than `/file.pdf`
4. **Verify uploads** — List directory after upload to confirm
5. **Team sharing** — Get username/email from team directory first
