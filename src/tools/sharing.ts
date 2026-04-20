import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { seafileRequest } from '../seafile.js';
import { PathSchema } from '../types.js';
import { validatePath } from '../utils/validation.js';
import { API_ENDPOINTS } from '../constants.js';

/**
 * Registers sharing-related tools with the MCP server
 *
 * Provides repo-token-safe sharing tools:
 * - create_share_link: Create a public share link
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
      path,
      password,
      expire_days,
    }: {
      path: string;
      password?: string;
      expire_days?: number;
    }) => {
      const validatedPath = validatePath(path);
      const body = new URLSearchParams({ path: validatedPath });
      if (password) body.set('password', password);
      if (expire_days !== undefined) body.set('expire_days', String(expire_days));

      const result = await seafileRequest<Record<string, unknown>>(
        `${API_ENDPOINTS.REPO_TOKEN.SHARE_LINKS}/`,
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
}
