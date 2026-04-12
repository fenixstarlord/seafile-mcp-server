import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { seafileRequest } from '../seafile.js';
import { RepoIdSchema, PathSchema } from '../types.js';
import { validatePath, validateEmail } from '../utils/validation.js';
import { API_ENDPOINTS, buildEndpoint } from '../constants.js';

/**
 * Registers sharing-related tools with the MCP server
 *
 * Provides tools for sharing files and folders in Seafile:
 * - create_share_link: Create a public share link
 * - list_share_links: List existing share links
 * - delete_share_link: Delete a share link
 * - share_to_user: Share with a specific user or group
 * - list_shared: List shared libraries and their recipients
 *
 * @param server - The MCP server instance to register tools with
 *
 * @example
 * ```typescript
 * import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
 * import { registerSharingTools } from './tools/sharing.js';
 *
 * const server = new McpServer({ name: 'seafile-mcp', version: '1.0.0' });
 * registerSharingTools(server);
 * ```
 */
export function registerSharingTools(server: McpServer) {
  /**
   * Tool: create_share_link
   *
   * Creates a public share link for a file or folder. Optionally supports
   * password protection and expiration date.
   *
   * @param repo_id - Repository ID containing the item
   * @param path - Path to the file or folder to share
   * @param password - Optional password for the share link
   * @param expire_days - Optional number of days until the link expires
   * @returns Share link details including the URL
   */
  server.registerTool(
    'create_share_link',
    {
      description: 'Create a public share link for a file or folder in Seafile',
      inputSchema: {
        repo_id: RepoIdSchema,
        path: PathSchema.describe('Path to the file or folder to share'),
        password: z.string().optional().describe('Optional password for the share link'),
        expire_days: z
          .number()
          .optional()
          .describe('Optional number of days until the link expires'),
      },
      annotations: { idempotentHint: false },
    },
    async ({
      repo_id,
      path,
      password,
      expire_days,
    }: {
      repo_id: string;
      path: string;
      password?: string;
      expire_days?: number;
    }) => {
      const validatedPath = validatePath(path);
      const body = new URLSearchParams({
        repo_id,
        path: validatedPath,
      });
      if (password) body.set('password', password);
      if (expire_days !== undefined) body.set('expire_days', String(expire_days));

      const result = await seafileRequest<Record<string, unknown>>(
        `${API_ENDPOINTS.V2_1.SHARE_LINKS}/`,
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
   * Tool: list_share_links
   *
   * Lists all share links for the authenticated user.
   * Optionally filtered by repository ID or specific path.
   *
   * @param repo_id - Optional repository ID to filter by library
   * @param path - Optional specific path to check for share links
   * @returns Array of share link objects
   */
  server.registerTool(
    'list_share_links',
    {
      description: 'List share links for a library, or for a specific path',
      inputSchema: {
        repo_id: RepoIdSchema.optional().describe('Repository ID (optional, filters by library)'),
        path: PathSchema.optional().describe('Specific path to check for share links'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ repo_id, path }: { repo_id?: string; path?: string }) => {
      const params = new URLSearchParams();
      if (repo_id) params.set('repo_id', repo_id);
      if (path) {
        const validatedPath = validatePath(path);
        params.set('path', validatedPath);
      }

      const results = await seafileRequest<Record<string, unknown>[]>(
        `${API_ENDPOINTS.V2_1.SHARE_LINKS}/?${params.toString()}`
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
      };
    }
  );

  /**
   * Tool: delete_share_link
   *
   * Deletes a share link by its token, revoking public access.
   *
   * @param token - The share link token to delete
   * @returns Success confirmation
   */
  server.registerTool(
    'delete_share_link',
    {
      description: 'Delete a share link by its token',
      inputSchema: {
        token: z.string().describe('The share link token to delete'),
      },
      annotations: { destructiveHint: true },
    },
    async ({ token }: { token: string }) => {
      await seafileRequest(`${API_ENDPOINTS.V2_1.SHARE_LINKS}/${token}/`, { method: 'DELETE' });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ success: true, token }) }],
      };
    }
  );

  /**
   * Tool: share_to_user
   *
   * Shares a library or folder with a specific user or group.
   * Supports read-only ('r') or read-write ('rw') permissions.
   *
   * @param repo_id - Repository ID to share
   * @param share_type - 'user' or 'group'
   * @param username - Email of the user (required if share_type='user')
   * @param group_id - Group ID (required if share_type='group')
   * @param permission - 'r' (read-only) or 'rw' (read-write)
   * @param path - Optional path for folder-level sharing
   * @returns Success confirmation
   */
  server.registerTool(
    'share_to_user',
    {
      description: 'Share a library or folder with a user or group in Seafile',
      inputSchema: z
        .object({
          repo_id: RepoIdSchema,
          share_type: z.enum(['user', 'group']).describe('Share to a user or group'),
          username: z
            .string()
            .optional()
            .describe('Email of the user to share with (required if share_type=user)'),
          group_id: z
            .number()
            .optional()
            .describe('Group ID to share with (required if share_type=group)'),
          permission: z
            .enum(['r', 'rw'])
            .default('r')
            .describe('Permission: r (read-only) or rw (read-write)'),
          path: PathSchema.optional().describe('Path to share (for folder sharing)'),
        })
        .refine(
          data => {
            if (data.share_type === 'user') return !!data.username;
            if (data.share_type === 'group') return !!data.group_id;
            return true;
          },
          { message: 'username is required for user share, group_id is required for group share' }
        ),
      annotations: { idempotentHint: false },
    },
    async ({
      repo_id,
      share_type,
      username,
      group_id,
      permission,
      path,
    }: {
      repo_id: string;
      share_type: 'user' | 'group';
      username?: string;
      group_id?: number;
      permission: string;
      path?: string;
    }) => {
      const body = new URLSearchParams({
        share_type,
        permission,
      });

      if (share_type === 'user' && username) {
        validateEmail(username);
        body.set('username', username);
      }
      if (share_type === 'group' && group_id !== undefined) {
        body.set('group_id', String(group_id));
      }

      let endpointPath: string;
      const sharedItemsEndpoint = buildEndpoint(API_ENDPOINTS.V2.SHARED_ITEMS, { id: repo_id });
      if (path) {
        const validatedPath = validatePath(path);
        endpointPath = `${sharedItemsEndpoint}/?p=${encodeURIComponent(validatedPath)}`;
      } else {
        endpointPath = `${sharedItemsEndpoint}/`;
      }

      await seafileRequest(endpointPath, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ success: true, repo_id, share_type, permission }),
          },
        ],
      };
    }
  );

  /**
   * Tool: list_shared
   *
   * Lists libraries shared to the authenticated user, or
   * shared users/groups of a specific library.
   *
   * @param repo_id - Optional repository ID to list shared users/groups
   * @param path - Optional path for folder-level sharing
   * @returns Array of shared items or sharing recipients
   */
  server.registerTool(
    'list_shared',
    {
      description:
        'List libraries shared to the authenticated user, or shared users/groups of a specific library',
      inputSchema: {
        repo_id: RepoIdSchema.optional().describe(
          'Repository ID to list shared users/groups (optional)'
        ),
        path: PathSchema.optional().describe(
          'Path within repo (optional, for folder-level sharing)'
        ),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ repo_id, path }: { repo_id?: string; path?: string }) => {
      if (repo_id) {
        let urlPath: string;
        const sharedItemsEndpoint = buildEndpoint(API_ENDPOINTS.V2.SHARED_ITEMS, { id: repo_id });
        if (path) {
          const validatedPath = validatePath(path);
          urlPath = `${sharedItemsEndpoint}/?p=${encodeURIComponent(validatedPath)}`;
        } else {
          urlPath = `${sharedItemsEndpoint}/`;
        }
        const results = await seafileRequest<Record<string, unknown>[]>(urlPath);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
        };
      }

      const results = await seafileRequest<Record<string, unknown>[]>(
        `${API_ENDPOINTS.V2.BESHARED_REPOS}/`
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
      };
    }
  );
}
