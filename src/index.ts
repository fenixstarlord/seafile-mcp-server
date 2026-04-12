import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerRepoTools } from './tools/repos.js';
import { registerFileTools } from './tools/files.js';
import { registerDirectoryTools } from './tools/directories.js';
import { registerSearchTools } from './tools/search.js';
import { registerSharingTools } from './tools/sharing.js';
import { registerStarredTools } from './tools/starred.js';
import { registerAccountTools } from './tools/account.js';
import { registerBatchTools } from './tools/batch.js';
import { registerPrompts } from './prompts.js';
import { registerResources } from './resources.js';
import { seafileRequest } from './seafile.js';
import { logger } from './logger.js';

/**
 * Seafile MCP Server
 *
 * This is the main entry point for the Seafile MCP (Model Context Protocol) server.
 * It initializes an MCP server with tools, prompts, and resources for interacting
 * with a Seafile file synchronization and sharing platform.
 *
 * Environment Variables Required:
 * - SEAFILE_URL: The URL of the Seafile server (e.g., https://seafile.example.com)
 * - SEAFILE_TOKEN: The authentication token for Seafile API access
 *
 * Environment Variables Optional:
 * - LOG_LEVEL: Logging level (debug, info, warn, error, fatal) - defaults to 'info'
 *
 * @module
 * @example
 * ```bash
 * SEAFILE_URL=https://seafile.example.com SEAFILE_TOKEN=your_token npm start
 * ```
 */

/**
 * MCP Server instance configured for Seafile integration
 *
 * Server capabilities:
 * - Repository management (list, create, delete libraries)
 * - File operations (upload, download, delete, get details)
 * - Directory operations (create, delete, rename, move, copy)
 * - Search functionality
 * - Sharing capabilities (links, user/group shares)
 * - Starred items management
 * - Account information
 * - Batch operations for bulk actions
 * - Interactive prompts for common workflows
 * - Resource access to repository listings
 */
const server = new McpServer({
  name: 'seafile-mcp',
  version: '1.0.0',
});

// Register all tool modules
registerRepoTools(server);
registerFileTools(server);
registerDirectoryTools(server);
registerSearchTools(server);
registerSharingTools(server);
registerStarredTools(server);
registerAccountTools(server);
registerBatchTools(server);

// Register prompts and resources
registerPrompts(server);
registerResources(server);

/**
 * Performs a health check by attempting to connect to the Seafile server
 *
 * This function tests connectivity by calling the server-info API endpoint.
 * It's used during startup to verify configuration and warn if the server
 * is unreachable.
 *
 * @returns Promise resolving to true if the server is reachable, false otherwise
 *
 * @example
 * ```typescript
 * const isHealthy = await healthCheck();
 * if (!isHealthy) {
 *   console.warn('Seafile server is not responding');
 * }
 * ```
 */
async function healthCheck(): Promise<boolean> {
  try {
    await seafileRequest('/api2/server-info/');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Main entry point for the Seafile MCP server
 *
 * Initializes the server by:
 * 1. Logging startup message
 * 2. Performing health check on Seafile server
 * 3. Setting up stdio transport
 * 4. Connecting to the transport and starting the server
 *
 * If the health check fails, the server continues but warns about potential
 * connectivity issues.
 *
 * @throws Will exit the process with code 1 on fatal errors
 */
async function main() {
  logger.info('Starting Seafile MCP server...');

  // Perform health check
  const isHealthy = await healthCheck();
  if (!isHealthy) {
    logger.warn('Cannot connect to Seafile server. Tools may fail.');
    logger.warn('Check your SEAFILE_URL and SEAFILE_TOKEN environment variables.');
  } else {
    logger.info('Successfully connected to Seafile server.');
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('Seafile MCP server connected and ready');
}

// Start the server and handle fatal errors
main().catch(error => {
  logger.fatal({ error }, 'Fatal error');
  process.exit(1);
});
