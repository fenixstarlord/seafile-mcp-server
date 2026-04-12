import { z } from 'zod';
import { seafileRequest } from '../seafile.js';
import { RepoIdSchema, type RepoInfo } from '../types.js';

export function registerRepoTools(server: any) {
  server.registerTool(
    'list_repos',
    {
      description: 'List all accessible Seafile repositories',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      const repos = await seafileRequest<RepoInfo[]>('/api2/repos/');
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(repos, null, 2) }],
      };
    },
  );

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
      const info = await seafileRequest<RepoInfo>(`/api2/repos/${repo_id}/`);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(info, null, 2) }],
      };
    },
  );

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
        '/api2/repos/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        },
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

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
      await seafileRequest(`/api2/repos/${repo_id}/`, { method: 'DELETE' });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ success: true, repo_id }) }],
      };
    },
  );
}