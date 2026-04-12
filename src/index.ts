import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerRepoTools } from './tools/repos.js';
import { registerFileTools } from './tools/files.js';
import { registerDirectoryTools } from './tools/directories.js';
import { registerSearchTools } from './tools/search.js';
import { registerSharingTools } from './tools/sharing.js';
import { registerStarredTools } from './tools/starred.js';
import { registerAccountTools } from './tools/account.js';
import { registerResources } from './resources.js';

const server = new McpServer({
  name: 'seafile-mcp',
  version: '1.0.0',
});

registerRepoTools(server);
registerFileTools(server);
registerDirectoryTools(server);
registerSearchTools(server);
registerSharingTools(server);
registerStarredTools(server);
registerAccountTools(server);
registerResources(server);

async function main() {
  console.error('Starting Seafile MCP server...');

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Seafile MCP server connected and ready');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});