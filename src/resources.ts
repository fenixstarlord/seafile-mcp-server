import { seafileRequest } from './seafile.js';
import type { RepoInfo } from './types.js';

export function registerResources(server: any) {
  server.registerResource(
    'repos',
    'seafile://repos',
    {
      description: 'List of all accessible Seafile repositories',
      mimeType: 'application/json',
    },
    async () => {
      try {
        const repos = await seafileRequest<Pick<RepoInfo, 'id' | 'name' | 'owner'>[]>('/api2/repos/');
        return {
          contents: [{
            uri: 'seafile://repos',
            text: JSON.stringify(repos, null, 2),
          }],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to fetch repos resource:', errorMessage);
        return {
          contents: [{
            uri: 'seafile://repos',
            text: JSON.stringify({ error: 'Failed to fetch repositories', message: errorMessage }),
          }],
          isError: true,
        };
      }
    },
  );
}