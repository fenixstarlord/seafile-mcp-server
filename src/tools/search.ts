import { z } from 'zod';
import { seafileRequest } from '../seafile.js';
import { RepoIdSchema } from '../types.js';
import { validatePath } from '../utils/validation.js';

export function registerSearchTools(server: any) {
  server.registerTool(
    'search_files',
    {
      description: 'Search for files by name in Seafile. Optionally scope to a specific library and path.',
      inputSchema: {
        query: z.string().describe('Search query (file name or keyword)'),
        repo_id: RepoIdSchema.optional().describe('Repository ID to scope search (optional)'),
        search_path: z.string().optional().describe('Path within the repo to scope search (optional)'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ query, repo_id, search_path }: { query: string; repo_id?: string; search_path?: string }) => {
      const params = new URLSearchParams({ q: query });
      if (repo_id) params.set('repo_id', repo_id);
      if (search_path) {
        const validatedPath = validatePath(search_path);
        params.set('search_path', validatedPath);
      }

      const results = await seafileRequest<Record<string, unknown>>(
        `/api/v2.1/search/file/?${params.toString()}`,
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
      };
    },
  );
}