import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { seafileRequest } from '../seafile.js';
import { RepoIdSchema, type RepoInfo } from '../types.js';
import { API_ENDPOINTS, PAGINATION_DEFAULTS, buildEndpoint } from '../constants.js';

/**
 * Registers repository-related tools with the MCP server
 *
 * Provides tools for managing Seafile repositories (libraries):
 * - list_repos: List all accessible repositories with pagination
 * - get_repo_info: Get detailed information about a specific repository
 * - create_repo: Create a new library with optional description and password
 * - delete_repo: Delete a library permanently
 *
 * @param server - The MCP server instance to register tools with
 *
 * @example
 * ```typescript
 * import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
 * import { registerRepoTools } from './tools/repos.js';
 *
 * const server = new McpServer({ name: 'seafile-mcp', version: '1.0.0' });
 * registerRepoTools(server);
 * ```
 */
export function registerRepoTools(server: McpServer) {
  /**
   * Tool: list_repos
   *
   * Lists all Seafile repositories/libraries accessible to the authenticated user.
   * Supports pagination with page and per_page parameters.
   *
   * @param page - Page number (default: 1)
   * @param per_page - Items per page (default: 100, max: 1000)
   * @returns Array of RepoInfo objects
   */
  server.registerTool(
    'list_repos',
    {
      description: 'List all accessible Seafile repositories',
      inputSchema: {
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
      page = PAGINATION_DEFAULTS.PAGE,
      per_page = PAGINATION_DEFAULTS.PER_PAGE,
    }: {
      page: number;
      per_page: number;
    }) => {
      const repos = await seafileRequest<RepoInfo[]>(
        `${API_ENDPOINTS.V2.REPOS}/?page=${page}&per_page=${per_page}`
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(repos, null, 2) }],
      };
    }
  );

  /**
   * Tool: get_repo_info
   *
   * Gets detailed metadata for a specific repository including
   * name, description, owner, modification date, and size.
   *
   * @param repo_id - Repository ID (UUID format)
   * @returns RepoInfo object with repository details
   */
  server.registerTool(
    'get_repo_info',
    {
      description: 'Get detailed information about a Seafile repository',
      inputSchema: {
        repo_id: RepoIdSchema,
      },
      annotations: { readOnlyHint: true },
    },
    async ({ repo_id }: { repo_id: string }) => {
      const endpoint = buildEndpoint(API_ENDPOINTS.V2.REPOS, { id: repo_id });
      const info = await seafileRequest<RepoInfo>(`${endpoint}/`);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(info, null, 2) }],
      };
    }
  );

  /**
   * Tool: create_repo
   *
   * Creates a new Seafile library with the specified name.
   * Optionally supports description and password for encrypted libraries.
   *
   * @param name - Library name (required)
   * @param desc - Library description (optional)
   * @param password - Password for encrypted library (optional)
   * @returns Object containing repo_id, repo_name, and magic token
   */
  server.registerTool(
    'create_repo',
    {
      description: 'Create a new Seafile library',
      inputSchema: {
        name: z.string().describe('Name for the new library'),
        desc: z.string().optional().describe('Description for the library'),
        password: z.string().optional().describe('Password for encrypted library (optional)'),
      },
      annotations: { idempotentHint: false },
    },
    async ({ name, desc, password }: { name: string; desc?: string; password?: string }) => {
      const body = new URLSearchParams({ name });
      if (desc) body.set('desc', desc);
      if (password) body.set('passwd', password);

      const result = await seafileRequest<{ repo_id: string; repo_name: string; magic: string }>(
        `${API_ENDPOINTS.V2.REPOS}/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        }
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  /**
   * Tool: delete_repo
   *
   * Permanently deletes a Seafile library and all its contents.
   * WARNING: This operation cannot be undone.
   *
   * @param repo_id - Repository ID to delete (UUID format)
   * @returns Success confirmation with deleted repo_id
   */
  server.registerTool(
    'delete_repo',
    {
      description: 'Delete a Seafile library permanently',
      inputSchema: {
        repo_id: RepoIdSchema,
      },
      annotations: { destructiveHint: true },
    },
    async ({ repo_id }: { repo_id: string }) => {
      const endpoint = buildEndpoint(API_ENDPOINTS.V2.REPOS, { id: repo_id });
      await seafileRequest(`${endpoint}/`, { method: 'DELETE' });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ success: true, repo_id }) }],
      };
    }
  );
}
