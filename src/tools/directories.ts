import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { seafileRequest } from '../seafile.js';
import { RepoIdSchema, PathSchema } from '../types.js';
import { validatePath } from '../utils/validation.js';
import { API_ENDPOINTS, buildEndpoint } from '../constants.js';

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
   * @param repo_id - Repository ID where the folder should be created
   * @param path - Parent directory path
   * @param name - Name for the new folder
   * @returns Success confirmation with the created folder path
   */
  server.registerTool(
    'create_folder',
    {
      description: 'Create a new directory in Seafile',
      inputSchema: {
        repo_id: RepoIdSchema,
        path: PathSchema.describe('Parent directory path'),
        name: z.string().describe('New folder name'),
      },
      annotations: { idempotentHint: false },
    },
    async ({ repo_id, path, name }: { repo_id: string; path: string; name: string }) => {
      const validatedPath = validatePath(path);
      const endpoint = buildEndpoint(API_ENDPOINTS.V2.DIR, { id: repo_id });
      await seafileRequest(`${endpoint}/?p=${encodeURIComponent(validatedPath)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ operation: 'mkdir', name }).toString(),
      });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ success: true, path: `${validatedPath}/${name}` }),
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
   * @param repo_id - Repository ID containing the directory
   * @param path - Directory path to delete
   * @returns Success confirmation with deleted folder details
   */
  server.registerTool(
    'delete_folder',
    {
      description: 'Delete a directory from Seafile permanently',
      inputSchema: {
        repo_id: RepoIdSchema,
        path: PathSchema.describe('Directory path to delete'),
      },
      annotations: { destructiveHint: true },
    },
    async ({ repo_id, path }: { repo_id: string; path: string }) => {
      const validatedPath = validatePath(path);
      const endpoint = buildEndpoint(API_ENDPOINTS.V2.DIR, { id: repo_id });
      await seafileRequest(`${endpoint}/?p=${encodeURIComponent(validatedPath)}`, {
        method: 'DELETE',
      });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ success: true, repo_id, path: validatedPath }),
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
   * @param repo_id - Repository ID containing the item
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
        repo_id: RepoIdSchema,
        path: PathSchema.describe('Current path of the item'),
        new_name: z.string().describe('New name for the item'),
        type: z.enum(['file', 'dir']).describe('Whether the item is a file or directory'),
      },
      annotations: { idempotentHint: false },
    },
    async ({
      repo_id,
      path,
      new_name,
      type,
    }: {
      repo_id: string;
      path: string;
      new_name: string;
      type: 'file' | 'dir';
    }) => {
      const validatedPath = validatePath(path);
      const endpoint =
        type === 'file'
          ? buildEndpoint(API_ENDPOINTS.V2_1.FILE_OPERATIONS, { id: repo_id })
          : buildEndpoint(API_ENDPOINTS.V2.DIR, { id: repo_id });

      await seafileRequest(`${endpoint}/?p=${encodeURIComponent(validatedPath)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ operation: 'rename', newname: new_name }).toString(),
      });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ success: true, repo_id, path: validatedPath, new_name }),
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
   * @param repo_id - Source repository ID
   * @param src_path - Source path of the item
   * @param dst_path - Destination directory path
   * @param type - Item type: 'file' or 'dir'
   * @param target_repo_id - Target repo ID for cross-library move (optional)
   * @returns Success confirmation with move details
   */
  server.registerTool(
    'move_item',
    {
      description: 'Move a file or folder to a new location in Seafile',
      inputSchema: {
        repo_id: RepoIdSchema,
        src_path: PathSchema.describe('Source path of the item'),
        dst_path: PathSchema.describe('Destination directory path'),
        type: z.enum(['file', 'dir']).describe('Whether the item is a file or directory'),
        target_repo_id: RepoIdSchema.optional().describe('Target repo ID for cross-library move'),
      },
      annotations: { idempotentHint: false },
    },
    async ({
      repo_id,
      src_path,
      dst_path,
      type,
      target_repo_id,
    }: {
      repo_id: string;
      src_path: string;
      dst_path: string;
      type: 'file' | 'dir';
      target_repo_id?: string;
    }) => {
      const validatedSrcPath = validatePath(src_path);
      const validatedDstPath = validatePath(dst_path);

      const params = new URLSearchParams({
        operation: 'move',
        src_path: validatedSrcPath,
        dst_path: validatedDstPath,
      });
      if (target_repo_id) params.set('dst_repo', target_repo_id);

      const endpoint =
        type === 'file'
          ? buildEndpoint(API_ENDPOINTS.V2_1.FILE_OPERATIONS, { id: repo_id })
          : buildEndpoint(API_ENDPOINTS.V2.DIR, { id: repo_id });

      await seafileRequest(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              repo_id,
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
   * @param repo_id - Source repository ID
   * @param src_path - Source path of the item
   * @param dst_path - Destination directory path
   * @param type - Item type: 'file' or 'dir'
   * @param target_repo_id - Target repo ID for cross-library copy (optional)
   * @returns Success confirmation with copy details
   */
  server.registerTool(
    'copy_item',
    {
      description: 'Copy a file or folder in Seafile',
      inputSchema: {
        repo_id: RepoIdSchema,
        src_path: PathSchema.describe('Source path of the item'),
        dst_path: PathSchema.describe('Destination directory path'),
        type: z.enum(['file', 'dir']).describe('Whether the item is a file or directory'),
        target_repo_id: RepoIdSchema.optional().describe('Target repo ID for cross-library copy'),
      },
      annotations: { idempotentHint: false },
    },
    async ({
      repo_id,
      src_path,
      dst_path,
      type,
      target_repo_id,
    }: {
      repo_id: string;
      src_path: string;
      dst_path: string;
      type: 'file' | 'dir';
      target_repo_id?: string;
    }) => {
      const validatedSrcPath = validatePath(src_path);
      const validatedDstPath = validatePath(dst_path);

      const params = new URLSearchParams({
        operation: 'copy',
        src_path: validatedSrcPath,
        dst_path: validatedDstPath,
      });
      if (target_repo_id) params.set('dst_repo', target_repo_id);

      const endpoint =
        type === 'file'
          ? buildEndpoint(API_ENDPOINTS.V2_1.FILE_OPERATIONS, { id: repo_id })
          : buildEndpoint(API_ENDPOINTS.V2.DIR, { id: repo_id });

      await seafileRequest(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              repo_id,
              src_path: validatedSrcPath,
              dst_path: validatedDstPath,
            }),
          },
        ],
      };
    }
  );
}
