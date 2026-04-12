import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { seafileRequest } from '../seafile.js';
import { RepoIdSchema } from '../types.js';
import { validatePath } from '../utils/validation.js';
import { API_ENDPOINTS, PAGINATION_DEFAULTS } from '../constants.js';

/**
 * Registers search-related tools with the MCP server
 *
 * Provides tools for searching files in Seafile:
 * - search_files: Search for files by name or keyword
 *
 * @param server - The MCP server instance to register tools with
 *
 * @example
 * ```typescript
 * import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
 * import { registerSearchTools } from './tools/search.js';
 *
 * const server = new McpServer({ name: 'seafile-mcp', version: '1.0.0' });
 * registerSearchTools(server);
 * ```
 */
export function registerSearchTools(server: McpServer) {
  /**
   * Tool: search_files
   *
   * Searches for files by name or keyword across all accessible libraries
   * or within a specific library and path. Supports pagination for large result sets.
   *
   * @param query - Search query (file name or keyword)
   * @param repo_id - Optional repository ID to scope search to a specific library
   * @param search_path - Optional path within the repo to scope search
   * @param page - Page number for pagination (default: 1)
   * @param per_page - Items per page (default: 100, max: 1000)
   * @returns Search results with matching files
   *
   * @example
   * ```typescript
   * // Search across all libraries
   * search_files({ query: 'report' });
   *
   * // Search within specific library
   * search_files({
   *   query: 'budget',
   *   repo_id: '550e8400-e29b-41d4-a716-446655440000'
   * });
   *
   * // Search within specific folder
   * search_files({
   *   query: 'meeting',
   *   repo_id: '550e8400-e29b-41d4-a716-446655440000',
   *   search_path: '/Documents/Notes'
   * });
   * ```
   */
  server.registerTool(
    'search_files',
    {
      description:
        'Search for files by name in Seafile. Optionally scope to a specific library and path.',
      inputSchema: {
        query: z.string().describe('Search query (file name or keyword)'),
        repo_id: RepoIdSchema.optional().describe('Repository ID to scope search (optional)'),
        search_path: z
          .string()
          .optional()
          .describe('Path within the repo to scope search (optional)'),
        page: z
          .number()
          .int()
          .min(1)
          .optional()
          .default(PAGINATION_DEFAULTS.PAGE)
          .describe(`Page number (default: ${PAGINATION_DEFAULTS.PAGE})`),
        per_page: z
          .number()
          .int()
          .min(1)
          .max(PAGINATION_DEFAULTS.MAX_PER_PAGE)
          .optional()
          .default(PAGINATION_DEFAULTS.PER_PAGE)
          .describe(
            `Items per page (default: ${PAGINATION_DEFAULTS.PER_PAGE}, max: ${PAGINATION_DEFAULTS.MAX_PER_PAGE})`
          ),
      },
      annotations: { readOnlyHint: true },
    },
    async ({
      query,
      repo_id,
      search_path,
      page = PAGINATION_DEFAULTS.PAGE,
      per_page = PAGINATION_DEFAULTS.PER_PAGE,
    }: {
      query: string;
      repo_id?: string;
      search_path?: string;
      page: number;
      per_page: number;
    }) => {
      const params = new URLSearchParams({
        q: query,
        page: String(page),
        per_page: String(per_page),
      });
      if (repo_id) params.set('repo_id', repo_id);
      if (search_path) {
        const validatedPath = validatePath(search_path);
        params.set('search_path', validatedPath);
      }

      const results = await seafileRequest<Record<string, unknown>>(
        `${API_ENDPOINTS.V2_1.SEARCH}/?${params.toString()}`
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
      };
    }
  );
}
