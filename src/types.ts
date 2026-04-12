// Re-export from config for backward compatibility
export {
  RepoIdSchema,
  PathSchema,
  ParentPathSchema,
  FilenameSchema,
  type RepoInfo,
  type DirEntry,
  type FileDetail,
} from './config.js';

// Also export config types
export { loadConfig, ConfigError, type Config } from './config.js';

// MCP Server type for tool registration
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
export type { McpServer };
