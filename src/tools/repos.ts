import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { seafileRequest } from '../seafile.js';
import { loadConfig, type RepoInfo } from '../types.js';
import { API_ENDPOINTS, buildEndpoint } from '../constants.js';

/**
 * Registers repository-related tools with the MCP server
 *
 * Provides repo-token-safe repository tools:
 * - get_repo_info: Get information about the repository associated with the current token
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
  const config = loadConfig();
  /**
   * Tool: get_repo_info
   *
   * Gets detailed metadata for the repository bound to the current repo token including
   * name, description, owner, modification date, and size.
   * @returns RepoInfo object with repository details
   */
  server.registerTool(
    'get_repo_info',
    {
      description: 'Get detailed information about the current Seafile repository',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      const endpoint =
        config.SEAFILE_AUTH_MODE === 'account-token'
          ? `${buildEndpoint(API_ENDPOINTS.ACCOUNT.REPO_INFO, { id: config.SEAFILE_REPO_ID! })}/`
          : `${API_ENDPOINTS.REPO_TOKEN.REPO_INFO}/`;
      const info = await seafileRequest<RepoInfo>(endpoint);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(info, null, 2) }],
      };
    }
  );
}
