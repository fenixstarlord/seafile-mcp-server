import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { seafileRequest } from '../seafile.js';
import { API_ENDPOINTS } from '../constants.js';

/**
 * Registers account-related tools with the MCP server
 *
 * Provides tools for retrieving public server information.
 *
 * @param server - The MCP server instance to register tools with
 *
 * @example
 * ```typescript
 * import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
 * import { registerAccountTools } from './tools/account.js';
 *
 * const server = new McpServer({ name: 'seafile-mcp', version: '1.0.0' });
 * registerAccountTools(server);
 * ```
 */
export function registerAccountTools(server: McpServer) {
  /**
   * Tool: get_server_info
   *
   * Retrieves Seafile server version and configuration information.
   * This endpoint does not require authentication.
   *
   * @returns Object containing server version, features, and configuration
   */
  server.registerTool(
    'get_server_info',
    {
      description: 'Get Seafile server version and configuration info',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      const info = await seafileRequest<Record<string, unknown>>(
        `${API_ENDPOINTS.PUBLIC.SERVER_INFO}/`
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(info, null, 2) }],
      };
    }
  );
}
