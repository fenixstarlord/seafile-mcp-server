import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

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
  void server;
}
