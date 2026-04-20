# Seafile MCP Skill

Procedural knowledge for working with Seafile via MCP.

## When to Use This Skill

Use this skill when the user wants to:

- Browse or navigate files in Seafile
- Upload, download, or delete files
- Organize files into folders, rename or move items
- Share files and folders via public links
- Get repository or server information

## Prerequisites

Before file operations, verify:

1. Seafile server URL is configured (`SEAFILE_URL`)
2. Repo API token is valid (`SEAFILE_TOKEN`)
3. User has access to the target repository bound to that token

Ask the user if not configured:

- Seafile server URL (e.g., `https://seafile.example.com`)
- API token (from Seafile web UI: Library menu → Advanced → API Token)

## Common Workflows

### 1. Browse Repository Structure

```typescript
// Step 1: Inspect the current repository
get_repo_info();

// Step 2: List files
list_files({ path: '/' });

// Step 3: Navigate subdirectories
list_files({ path: '/Documents' });
```

### 2. Upload a File

```typescript
// Step 1: Confirm destination path

// Step 2: Upload (plain text or base64: prefix for binary)
upload_file({
  path: '/Documents',
  filename: 'report.txt',
  content: 'File content here...',
});

// Step 3: Verify
list_files({ path: '/Documents' });
```

### 3. Download/Get File

```typescript
// Get download link
get_file({ path: '/Documents/report.txt' });
// Returns download link — provide to user
```

### 4. Create Folder Structure

```typescript
create_folder({ path: '/', name: 'Projects' });
create_folder({ path: '/Projects', name: '2026' });
```

### 5. Share a File or Folder

```typescript
// Create a public share link
create_share_link({
  path: '/Documents/report.txt',
  password: 'optional-password', // optional
  expire_days: 7, // optional
});
```

### 6. Move, Copy, Rename

```typescript
// Rename a file
rename_item({ path: '/old.txt', new_name: 'new.txt', type: 'file' });

// Move a file
move_item({ src_path: '/file.txt', dst_path: '/Archive', type: 'file' });

// Copy a file
copy_item({ src_path: '/file.txt', dst_path: '/Backup', type: 'file' });
```

## Tool Annotations

| Annotation              | Meaning                       | Tools                                                                                       |
| ----------------------- | ----------------------------- | ------------------------------------------------------------------------------------------- |
| `readOnlyHint: true`    | Safe, no side effects         | list_files, get_file, get_file_detail, get_repo_info, get_server_info                       |
| `destructiveHint: true` | Destructive, cannot be undone | delete_file, delete_folder, batch_delete                                                    |
| `idempotentHint: false` | Mutating operation            | upload_file, create_folder, move_item, copy_item, batch_move, batch_copy, create_share_link |

## Error Recovery

| Error                 | Cause                 | Recovery                                    |
| --------------------- | --------------------- | ------------------------------------------- |
| 401 Unauthorized      | Invalid/expired token | Ask user to regenerate token                |
| 404 Not Found         | Wrong path            | List files to verify                        |
| 403 Forbidden         | No permission         | Regenerate repo token or ask the repo owner |
| 400 Bad Request       | Invalid parameters    | Check API docs for format                   |
| 429 Too Many Requests | Rate limited          | Wait and retry with backoff                 |

## Tips

1. **Always confirm paths** before destructive operations (delete, move)
2. **Check file sizes** — Seafile may have upload limits
3. **Use descriptive paths** — `/Projects/2026/Q1-Report.pdf` better than `/file.pdf`
4. **Verify uploads** — List directory after upload to confirm
5. **Repo-token scope** — If the user needs another library, they need a different repo token
