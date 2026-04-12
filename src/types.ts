/**
 * Type definitions for Seafile MCP Server
 *
 * This module re-exports types and schemas from config.ts for backward compatibility,
 * and provides the McpServer type for tool registration.
 *
 * @module
 * @example
 * ```typescript
 * import { RepoInfo, DirEntry, McpServer } from './types.js';
 *
 * const repo: RepoInfo = {
 *   id: '550e8400-e29b-41d4-a716-446655440000',
 *   name: 'My Library',
 *   desc: 'Description',
 *   owner: 'user@example.com',
 *   modified: '2024-01-15T10:30:00Z',
 *   size: 1024000
 * };
 * ```
 */

/**
 * Re-exported Zod schemas for input validation
 *
 * - RepoIdSchema: Validates repository UUID format
 * - PathSchema: Validates file/directory paths
 * - ParentPathSchema: Validates parent directory paths (defaults to '/')
 * - FilenameSchema: Validates filename strings
 */
export {
  RepoIdSchema,
  PathSchema,
  ParentPathSchema,
  FilenameSchema,
  type RepoInfo,
  type DirEntry,
  type FileDetail,
} from './config.js';

/**
 * Re-exported configuration types and functions
 *
 * - loadConfig: Loads and validates environment configuration
 * - ConfigError: Error class for configuration failures
 * - Config: Type for the validated configuration object
 */
export { loadConfig, ConfigError, type Config } from './config.js';

/**
 * MCP Server type for tool registration
 *
 * Imported from @modelcontextprotocol/sdk for use in tool registration functions.
 * This type represents the MCP server instance that tools are registered with.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
export type { McpServer };
