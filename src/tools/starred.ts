import { z } from 'zod';
import { seafileRequest } from '../seafile.js';
import { RepoIdSchema, PathSchema } from '../types.js';
import { validatePath } from '../utils/validation.js';

export function registerStarredTools(server: any) {
  server.registerTool(
    'list_starred',
    {
      description: 'List all starred items in Seafile',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      const results = await seafileRequest<Record<string, unknown>[]>('/api/v2.1/starred-items/');
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
      };
    },
  );

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
      await seafileRequest('/api/v2.1/starred-items/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ success: true, repo_id, path: validatedPath }) }],
      };
    },
  );

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
      await seafileRequest('/api/v2.1/starred-items/', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ success: true, repo_id, path: validatedPath }) }],
      };
    },
  );
}