import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { seafileRequest } from '../seafile.js';
import { RepoIdSchema, PathSchema } from '../types.js';
import { validatePath } from '../utils/validation.js';
import { API_ENDPOINTS } from '../constants.js';

/**
 * Registers starred items tools with the MCP server
 *
 * Provides tools for managing starred files and folders in Seafile:
 * - list_starred: List all starred items
 * - star_item: Star a file or folder
 * - unstar_item: Remove a star from a file or folder
 *
 * @param server - The MCP server instance to register tools with
 *
 * @example
 * ```typescript
 * import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
 * import { registerStarredTools } from './tools/starred.js';
 *
 * const server = new McpServer({ name: 'seafile-mcp', version: '1.0.0' });
 * registerStarredTools(server);
 * ```
 */
export function registerStarredTools(server: McpServer) {
  /**
   * Tool: list_starred
   *
   * Lists all starred items (files and folders) for the authenticated user.
   *
   * @returns Array of starred item objects with repo_id, path, and type
   */
  server.registerTool(
    'list_starred',
    {
      description: 'List all starred items in Seafile',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      const results = await seafileRequest<Record<string, unknown>[]>(
        `${API_ENDPOINTS.V2_1.STARRED}/`
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
      };
    }
  );

  /**
   * Tool: star_item
   *
   * Adds a star to a file or folder for quick access.
   *
   * @param repo_id - Repository ID containing the item
   * @param path - Path to the file or folder to star
   * @returns Success confirmation with starred item details
   */
  server.registerTool(
    'star_item',
    {
      description: 'Star a file or folder in Seafile',
      inputSchema: {
        repo_id: RepoIdSchema,
        path: PathSchema,
      },
      annotations: { idempotentHint: true },
    },
    async ({ repo_id, path }: { repo_id: string; path: string }) => {
      const validatedPath = validatePath(path);
      const body = new URLSearchParams({ repo_id, path: validatedPath });
      await seafileRequest(`${API_ENDPOINTS.V2_1.STARRED}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
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
   * Tool: unstar_item
   *
   * Removes a star from a file or folder.
   *
   * @param repo_id - Repository ID containing the item
   * @param path - Path to the file or folder to unstar
   * @returns Success confirmation with unstarred item details
   */
  server.registerTool(
    'unstar_item',
    {
      description: 'Remove a star from a file or folder in Seafile',
      inputSchema: {
        repo_id: RepoIdSchema,
        path: PathSchema,
      },
      annotations: { idempotentHint: true },
    },
    async ({ repo_id, path }: { repo_id: string; path: string }) => {
      const validatedPath = validatePath(path);
      const body = new URLSearchParams({ repo_id, path: validatedPath });
      await seafileRequest(`${API_ENDPOINTS.V2_1.STARRED}/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
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
}
