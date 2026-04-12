import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { seafileRequest } from './seafile.js';
import { logger } from './logger.js';
import type { RepoInfo } from './types.js';

/**
 * Registers MCP resources with the server
 *
 * Resources provide a way to expose data through URI-based access patterns.
 * This allows clients to read specific data resources as needed.
 *
 * Currently registered resources:
 * - seafile://repos - List of all accessible repositories
 *
 * @param server - The MCP server instance to register resources with
 *
 * @example
 * ```typescript
 * import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
 * import { registerResources } from './resources.js';
 *
 * const server = new McpServer({ name: 'seafile-mcp', version: '1.0.0' });
 * registerResources(server);
 * ```
 */
export function registerResources(server: McpServer) {
  /**
   * Resource: seafile://repos
   *
   * Provides a JSON list of all Seafile repositories accessible to the
   * authenticated user. Returns basic repository information including
   * id, name, and owner.
   *
   * URI: seafile://repos
   * MIME Type: application/json
   *
   * Response format:
   * ```json
   * [
   *   { "id": "...", "name": "My Library", "owner": "user@example.com" }
   * ]
   * ```
   *
   * If an error occurs, returns an error object with isError flag set.
   */
  server.registerResource(
    'repos',
    'seafile://repos',
    {
      description: 'List of all accessible Seafile repositories',
      mimeType: 'application/json',
    },
    async () => {
      try {
        const repos =
          await seafileRequest<Pick<RepoInfo, 'id' | 'name' | 'owner'>[]>('/api2/repos/');
        return {
          contents: [
            {
              uri: 'seafile://repos',
              text: JSON.stringify(repos, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ error: errorMessage }, 'Failed to fetch repos resource');
        return {
          contents: [
            {
              uri: 'seafile://repos',
              text: JSON.stringify({
                error: 'Failed to fetch repositories',
                message: errorMessage,
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
