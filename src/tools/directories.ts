import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { seafileRequest } from '../seafile.js';
import { PathSchema } from '../types.js';
import { validatePath } from '../utils/validation.js';
import { API_ENDPOINTS } from '../constants.js';

function joinPath(parent: string, child: string): string {
  return parent === '/' ? `/${child}` : `${parent}/${child}`;
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
      await seafileRequest(
        `${API_ENDPOINTS.REPO_TOKEN.DIR}/?p=${encodeURIComponent(validatedPath)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ operation: 'mkdir', name }).toString(),
        }
      );
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ success: true, path: joinPath(validatedPath, name) }),
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
        `${API_ENDPOINTS.REPO_TOKEN.DIR}/?p=${encodeURIComponent(validatedPath)}`,
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
      const endpoint =
        type === 'file' ? API_ENDPOINTS.REPO_TOKEN.FILE : API_ENDPOINTS.REPO_TOKEN.DIR;

      await seafileRequest(`${endpoint}/?p=${encodeURIComponent(validatedPath)}`, {
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

  /**
   * Tool: move_item
   *
   * Moves a file or folder to a new location. Supports both intra-library
   * and cross-library moves (when target_repo_id is specified).
   *
   * @param src_path - Source path of the item
   * @param dst_path - Destination directory path
   * @param type - Item type: 'file' or 'dir'
   * @returns Success confirmation with move details
   */
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
    async ({
      src_path,
      dst_path,
      type,
    }: {
      src_path: string;
      dst_path: string;
      type: 'file' | 'dir';
    }) => {
      const validatedSrcPath = validatePath(src_path);
      const validatedDstPath = validatePath(dst_path);
      if (type === 'file') {
        await seafileRequest(`${API_ENDPOINTS.REPO_TOKEN.FILE}/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            operation: 'move',
            src_path: validatedSrcPath,
            dst_path: validatedDstPath,
          }).toString(),
        });
      } else {
        await seafileRequest(`${API_ENDPOINTS.REPO_TOKEN.MOVE_DIR}/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            src_path: validatedSrcPath,
            dst_path: validatedDstPath,
          }).toString(),
        });
      }
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              src_path: validatedSrcPath,
              dst_path: validatedDstPath,
            }),
          },
        ],
      };
    }
  );

  /**
   * Tool: copy_item
   *
   * Copies a file or folder to a new location. Supports both intra-library
   * and cross-library copies (when target_repo_id is specified).
   *
   * @param src_path - Source path of the item
   * @param dst_path - Destination directory path
   * @param type - Item type: 'file' or 'dir'
   * @returns Success confirmation with copy details
   */
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
    async ({
      src_path,
      dst_path,
      type,
    }: {
      src_path: string;
      dst_path: string;
      type: 'file' | 'dir';
    }) => {
      const validatedSrcPath = validatePath(src_path);
      const validatedDstPath = validatePath(dst_path);
      const endpoint =
        type === 'file' ? API_ENDPOINTS.REPO_TOKEN.FILE : API_ENDPOINTS.REPO_TOKEN.DIR;
      await seafileRequest(`${endpoint}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          operation: 'copy',
          src_path: validatedSrcPath,
          dst_path: validatedDstPath,
        }).toString(),
      });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              src_path: validatedSrcPath,
              dst_path: validatedDstPath,
            }),
          },
        ],
      };
    }
  );
}
