import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { seafileRequest } from '../seafile.js';
import { loadConfig, PathSchema } from '../types.js';
import { validatePath } from '../utils/validation.js';
import { API_ENDPOINTS } from '../constants.js';

export function registerSharingTools(server: McpServer) {
  const config = loadConfig();

  if (config.SEAFILE_AUTH_MODE !== 'account-token') {
    return;
  }

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
          .describe('Optional number of days until the share link expires'),
      },
      annotations: { idempotentHint: false },
    },
    async ({ path, password, expire_days }: { path: string; password?: string; expire_days?: number }) => {
      const validatedPath = validatePath(path);
      const payload: Record<string, unknown> = {
        repo_id: config.SEAFILE_REPO_ID,
        path: validatedPath,
      };

      if (password) payload.password = password;
      if (expire_days !== undefined) payload.expire_days = String(expire_days);

      const result = await seafileRequest<Record<string, unknown>>(API_ENDPOINTS.ACCOUNT.SHARE_LINKS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
