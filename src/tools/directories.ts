import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { seafileRequest } from '../seafile.js';
import { loadConfig, PathSchema } from '../types.js';
import { validatePath } from '../utils/validation.js';
import { API_ENDPOINTS, buildEndpoint } from '../constants.js';

function joinPath(parent: string, child: string): string {
  return parent === '/' ? `/${child}` : `${parent}/${child}`;
}

function targetPath(parent: string, name: string): string {
  return joinPath(parent, name);
}

function getParentDir(path: string): string {
  if (path === '/') return '/';
  const segments = path.split('/').filter(Boolean);
  if (segments.length <= 1) return '/';
  return `/${segments.slice(0, -1).join('/')}`;
}

function getBaseName(path: string): string {
  return path.split('/').filter(Boolean).at(-1) ?? '';
}

/**
 * Registers directory-related tools with the MCP server
 *
 * Provides tools for managing directories in Seafile:
 * - create_folder: Create a new directory
 * - delete_folder: Delete a directory permanently
 * - rename_item: Rename a file or folder
 * - move_item: Move a file or folder to a new location
 * - copy_item: Copy a file or folder
 *
 * @param server - The MCP server instance to register tools with
 *
 * @example
 * ```typescript
 * import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
 * import { registerDirectoryTools } from './tools/directories.js';
 *
 * const server = new McpServer({ name: 'seafile-mcp', version: '1.0.0' });
 * registerDirectoryTools(server);
 * ```
 */
export function registerDirectoryTools(server: McpServer) {
  const config = loadConfig();
  const isAccountToken = config.SEAFILE_AUTH_MODE === 'account-token';
  const repoId = config.SEAFILE_REPO_ID;

  /**
   * Tool: create_folder
   *
   * Creates a new directory (folder) in the specified parent path.
   *
   * @param path - Parent directory path
   * @param name - Name for the new folder
   * @returns Success confirmation with the created folder path
   */
  server.registerTool(
    'create_folder',
    {
      description: 'Create a new directory in Seafile',
      inputSchema: {
        path: PathSchema.describe('Parent directory path'),
        name: z.string().describe('New folder name'),
      },
      annotations: { idempotentHint: false },
    },
    async ({ path, name }: { path: string; name: string }) => {
      const validatedPath = validatePath(path);
      const validatedTargetPath = targetPath(validatedPath, name);
      await seafileRequest(
        isAccountToken
          ? `${buildEndpoint(API_ENDPOINTS.ACCOUNT.DIR, { id: repoId! })}/?p=${encodeURIComponent(validatedPath)}`
          : `${API_ENDPOINTS.REPO_TOKEN.DIR}/?path=${encodeURIComponent(validatedTargetPath)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: isAccountToken
            ? new URLSearchParams({ operation: 'mkdir', name }).toString()
            : new URLSearchParams({ operation: 'mkdir' }).toString(),
        }
      );
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ success: true, path: validatedTargetPath }),
          },
        ],
      };
    }
  );

  /**
   * Tool: delete_folder
   *
   * Permanently deletes a directory and all its contents.
   * WARNING: This operation cannot be undone.
   *
   * @param path - Directory path to delete
   * @returns Success confirmation with deleted folder details
   */
  server.registerTool(
    'delete_folder',
    {
      description: 'Delete a directory from Seafile permanently',
      inputSchema: {
        path: PathSchema.describe('Directory path to delete'),
      },
      annotations: { destructiveHint: true },
    },
    async ({ path }: { path: string }) => {
      const validatedPath = validatePath(path);
      await seafileRequest(
        isAccountToken
          ? `${buildEndpoint(API_ENDPOINTS.ACCOUNT.DIR, { id: repoId! })}/?p=${encodeURIComponent(validatedPath)}`
          : `${API_ENDPOINTS.REPO_TOKEN.DIR}/?path=${encodeURIComponent(validatedPath)}`,
        {
          method: 'DELETE',
        }
      );
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ success: true, path: validatedPath }),
          },
        ],
      };
    }
  );

  /**
   * Tool: rename_item
   *
   * Renames a file or folder to a new name within the same parent directory.
   *
   * @param path - Current path of the item
   * @param new_name - New name for the item
   * @param type - Item type: 'file' or 'dir'
   * @returns Success confirmation with rename details
   */
  server.registerTool(
    'rename_item',
    {
      description: 'Rename a file or folder in Seafile',
      inputSchema: {
        path: PathSchema.describe('Current path of the item'),
        new_name: z.string().describe('New name for the item'),
        type: z.enum(['file', 'dir']).describe('Whether the item is a file or directory'),
      },
      annotations: { idempotentHint: false },
    },
    async ({ path, new_name, type }: { path: string; new_name: string; type: 'file' | 'dir' }) => {
      const validatedPath = validatePath(path);
      const endpoint = isAccountToken
        ? type === 'file'
          ? buildEndpoint(API_ENDPOINTS.ACCOUNT.FILE_OPERATIONS, { id: repoId! })
          : buildEndpoint(API_ENDPOINTS.ACCOUNT.DIR, { id: repoId! })
        : type === 'file'
          ? API_ENDPOINTS.REPO_TOKEN.FILE
          : API_ENDPOINTS.REPO_TOKEN.DIR;
      const queryParam = isAccountToken ? 'p' : 'path';

      await seafileRequest(`${endpoint}/?${queryParam}=${encodeURIComponent(validatedPath)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ operation: 'rename', newname: new_name }).toString(),
      });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ success: true, path: validatedPath, new_name }),
          },
        ],
      };
    }
  );

  if (!isAccountToken) {
    return;
  }

  server.registerTool(
    'move_item',
    {
      description: 'Move a file or folder to a new location in Seafile',
      inputSchema: {
        src_path: PathSchema.describe('Source path of the item'),
        dst_path: PathSchema.describe('Destination directory path'),
        type: z.enum(['file', 'dir']).describe('Whether the item is a file or directory'),
      },
      annotations: { idempotentHint: false },
    },
    async ({ src_path, dst_path }: { src_path: string; dst_path: string; type: 'file' | 'dir' }) => {
      const validatedSrcPath = validatePath(src_path);
      const validatedDstPath = validatePath(dst_path);
      const srcParentDir = getParentDir(validatedSrcPath);
      const srcName = getBaseName(validatedSrcPath);

      await seafileRequest(API_ENDPOINTS.ACCOUNT.BATCH_MOVE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          src_repo_id: repoId,
          src_parent_dir: srcParentDir,
          src_dirents: [srcName],
          dst_repo_id: repoId,
          dst_parent_dir: validatedDstPath,
        }),
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ success: true, src_path: validatedSrcPath, dst_path: validatedDstPath }),
          },
        ],
      };
    }
  );

  server.registerTool(
    'copy_item',
    {
      description: 'Copy a file or folder in Seafile',
      inputSchema: {
        src_path: PathSchema.describe('Source path of the item'),
        dst_path: PathSchema.describe('Destination directory path'),
        type: z.enum(['file', 'dir']).describe('Whether the item is a file or directory'),
      },
      annotations: { idempotentHint: false },
    },
    async ({ src_path, dst_path }: { src_path: string; dst_path: string; type: 'file' | 'dir' }) => {
      const validatedSrcPath = validatePath(src_path);
      const validatedDstPath = validatePath(dst_path);
      const srcParentDir = getParentDir(validatedSrcPath);
      const srcName = getBaseName(validatedSrcPath);

      await seafileRequest(API_ENDPOINTS.ACCOUNT.BATCH_COPY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          src_repo_id: repoId,
          src_parent_dir: srcParentDir,
          src_dirents: [srcName],
          dst_repo_id: repoId,
          dst_parent_dir: validatedDstPath,
        }),
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ success: true, src_path: validatedSrcPath, dst_path: validatedDstPath }),
          },
        ],
      };
    }
  );

}
