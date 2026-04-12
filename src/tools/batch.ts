import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { seafileRequest } from '../seafile.js';
import { RepoIdSchema, PathSchema } from '../types.js';
import { validatePath } from '../utils/validation.js';
import { API_ENDPOINTS, buildEndpoint } from '../constants.js';

/**
 * Schema for batch item
 * Defines the structure for repository and path combinations
 *
 * @property repo_id - Repository ID (UUID format)
 * @property path - File or directory path
 */
const BatchItemSchema = z.object({
  repo_id: RepoIdSchema,
  path: PathSchema,
});

/**
 * Schema for batch move/copy item with destination
 * Supports cross-library operations via target_repo_id
 *
 * @property repo_id - Source repository ID
 * @property src_path - Source path of the item
 * @property dst_path - Destination path for the item
 * @property target_repo_id - Optional target repository ID for cross-library operations
 */
const BatchMoveCopyItemSchema = z.object({
  repo_id: RepoIdSchema,
  src_path: PathSchema,
  dst_path: PathSchema,
  target_repo_id: RepoIdSchema.optional(),
});

/**
 * Result type for batch operations
 * Tracks success/failure status for each individual item
 *
 * @property success - Whether the operation succeeded for this item
 * @property item - The item that was processed
 * @property error - Error message if the operation failed
 */
interface BatchResult<T> {
  success: boolean;
  item: T;
  error?: string;
}

/**
 * Registers batch operation tools with the MCP server
 *
 * Provides tools for performing bulk operations on multiple items:
 * - batch_delete: Delete multiple files or folders
 * - batch_copy: Copy multiple items (supports cross-library)
 * - batch_move: Move multiple items (supports cross-library)
 *
 * All batch operations use Promise.allSettled to process items concurrently
 * and report individual success/failure for each item.
 *
 * @param server - The MCP server instance to register tools with
 *
 * @example
 * ```typescript
 * import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
 * import { registerBatchTools } from './tools/batch.js';
 *
 * const server = new McpServer({ name: 'seafile-mcp', version: '1.0.0' });
 * registerBatchTools(server);
 * ```
 */
export function registerBatchTools(server: McpServer) {
  /**
   * Tool: batch_delete
   *
   * Deletes multiple files or folders in a single operation.
   * Uses Promise.allSettled to process all deletions concurrently
   * and reports individual success/failure for each item.
   *
   * Maximum 50 items per batch.
   *
   * @param items - Array of items to delete, each with repo_id and path
   * @returns Summary with total/successful/failed counts and detailed results
   *
   * @example
   * ```typescript
   * batch_delete({
   *   items: [
   *     { repo_id: '550e8400-e29b-41d4-a716-446655440000', path: '/file1.txt' },
   *     { repo_id: '550e8400-e29b-41d4-a716-446655440000', path: '/file2.txt' }
   *   ]
   * });
   * ```
   */
  server.registerTool(
    'batch_delete',
    {
      description:
        'Delete multiple files or folders from Seafile in a single operation. Uses Promise.allSettled to process all deletions and reports individual success/failure for each item.',
      inputSchema: {
        items: z
          .array(BatchItemSchema)
          .min(1)
          .max(50)
          .describe('Array of items to delete (max 50). Each item must have repo_id and path.'),
      },
      annotations: { destructiveHint: true },
    },
    async ({ items }: { items: Array<{ repo_id: string; path: string }> }) => {
      const results = await Promise.allSettled(
        items.map(async (item): Promise<BatchResult<{ repo_id: string; path: string }>> => {
          try {
            const validatedPath = validatePath(item.path);

            // Determine if it's a file or directory based on path (no trailing slash)
            const isDirectory = validatedPath.endsWith('/');

            if (isDirectory) {
              const dirEndpoint = buildEndpoint(API_ENDPOINTS.V2.DIR, { id: item.repo_id });
              await seafileRequest(`${dirEndpoint}/?p=${encodeURIComponent(validatedPath)}`, {
                method: 'DELETE',
              });
            } else {
              const fileEndpoint = buildEndpoint(API_ENDPOINTS.V2_1.FILE_OPERATIONS, {
                id: item.repo_id,
              });
              await seafileRequest(fileEndpoint, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ p: validatedPath }).toString(),
              });
            }

            return { success: true, item: { repo_id: item.repo_id, path: validatedPath } };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
              success: false,
              item,
              error: errorMessage,
            };
          }
        })
      );

      const processedResults: BatchResult<{ repo_id: string; path: string }>[] = results.map(
        result =>
          result.status === 'fulfilled'
            ? result.value
            : { success: false, item: { repo_id: '', path: '' }, error: result.reason }
      );

      const successCount = processedResults.filter(r => r.success).length;
      const failureCount = processedResults.length - successCount;

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                summary: {
                  total: items.length,
                  successful: successCount,
                  failed: failureCount,
                },
                results: processedResults,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  /**
   * Tool: batch_copy
   *
   * Copies multiple files or folders in a single operation.
   * Supports cross-library copying when target_repo_id is specified.
   * Uses Promise.allSettled for concurrent processing.
   *
   * Maximum 50 items per batch.
   *
   * @param items - Array of items to copy with source and destination paths
   * @param type - Item type: 'file' or 'dir'
   * @returns Summary with total/successful/failed counts and detailed results
   *
   * @example
   * ```typescript
   * batch_copy({
   *   items: [
   *     {
   *       repo_id: '550e8400-e29b-41d4-a716-446655440000',
   *       src_path: '/Documents/file.txt',
   *       dst_path: '/Backup/'
   *     }
   *   ],
   *   type: 'file'
   * });
   * ```
   */
  server.registerTool(
    'batch_copy',
    {
      description:
        'Copy multiple files or folders in Seafile in a single operation. Uses Promise.allSettled to process all copies and reports individual success/failure for each item. Supports cross-library copying.',
      inputSchema: {
        items: z
          .array(BatchMoveCopyItemSchema)
          .min(1)
          .max(50)
          .describe(
            'Array of items to copy (max 50). Each item must have repo_id, src_path, and dst_path.'
          ),
        type: z.enum(['file', 'dir']).describe('Whether the items are files or directories'),
      },
      annotations: { idempotentHint: false },
    },
    async ({
      items,
      type,
    }: {
      items: Array<{
        repo_id: string;
        src_path: string;
        dst_path: string;
        target_repo_id?: string;
      }>;
      type: 'file' | 'dir';
    }) => {
      const results = await Promise.allSettled(
        items.map(
          async (
            item
          ): Promise<BatchResult<{ repo_id: string; src_path: string; dst_path: string }>> => {
            try {
              const validatedSrcPath = validatePath(item.src_path);
              const validatedDstPath = validatePath(item.dst_path);

              const params = new URLSearchParams({
                operation: 'copy',
                src_path: validatedSrcPath,
                dst_path: validatedDstPath,
              });
              if (item.target_repo_id) params.set('dst_repo', item.target_repo_id);

              const endpoint =
                type === 'file'
                  ? buildEndpoint(API_ENDPOINTS.V2_1.FILE_OPERATIONS, { id: item.repo_id })
                  : buildEndpoint(API_ENDPOINTS.V2.DIR, { id: item.repo_id });

              await seafileRequest(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString(),
              });

              return {
                success: true,
                item: {
                  repo_id: item.repo_id,
                  src_path: validatedSrcPath,
                  dst_path: validatedDstPath,
                },
              };
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              return {
                success: false,
                item: { repo_id: item.repo_id, src_path: item.src_path, dst_path: item.dst_path },
                error: errorMessage,
              };
            }
          }
        )
      );

      const processedResults: BatchResult<{
        repo_id: string;
        src_path: string;
        dst_path: string;
      }>[] = results.map(result =>
        result.status === 'fulfilled'
          ? result.value
          : {
              success: false,
              item: { repo_id: '', src_path: '', dst_path: '' },
              error: result.reason,
            }
      );

      const successCount = processedResults.filter(r => r.success).length;
      const failureCount = processedResults.length - successCount;

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                summary: {
                  total: items.length,
                  successful: successCount,
                  failed: failureCount,
                },
                results: processedResults,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  /**
   * Tool: batch_move
   *
   * Moves multiple files or folders in a single operation.
   * Supports cross-library moving when target_repo_id is specified.
   * Uses Promise.allSettled for concurrent processing.
   *
   * Maximum 50 items per batch.
   *
   * @param items - Array of items to move with source and destination paths
   * @param type - Item type: 'file' or 'dir'
   * @returns Summary with total/successful/failed counts and detailed results
   *
   * @example
   * ```typescript
   * batch_move({
   *   items: [
   *     {
   *       repo_id: '550e8400-e29b-41d4-a716-446655440000',
   *       src_path: '/Documents/file.txt',
   *       dst_path: '/Archive/',
   *       target_repo_id: '660e8400-e29b-41d4-a716-446655440001' // Optional cross-library
   *     }
   *   ],
   *   type: 'file'
   * });
   * ```
   */
  server.registerTool(
    'batch_move',
    {
      description:
        'Move multiple files or folders in Seafile in a single operation. Uses Promise.allSettled to process all moves and reports individual success/failure for each item. Supports cross-library moving.',
      inputSchema: {
        items: z
          .array(BatchMoveCopyItemSchema)
          .min(1)
          .max(50)
          .describe(
            'Array of items to move (max 50). Each item must have repo_id, src_path, and dst_path.'
          ),
        type: z.enum(['file', 'dir']).describe('Whether the items are files or directories'),
      },
      annotations: { idempotentHint: false },
    },
    async ({
      items,
      type,
    }: {
      items: Array<{
        repo_id: string;
        src_path: string;
        dst_path: string;
        target_repo_id?: string;
      }>;
      type: 'file' | 'dir';
    }) => {
      const results = await Promise.allSettled(
        items.map(
          async (
            item
          ): Promise<BatchResult<{ repo_id: string; src_path: string; dst_path: string }>> => {
            try {
              const validatedSrcPath = validatePath(item.src_path);
              const validatedDstPath = validatePath(item.dst_path);

              const params = new URLSearchParams({
                operation: 'move',
                src_path: validatedSrcPath,
                dst_path: validatedDstPath,
              });
              if (item.target_repo_id) params.set('dst_repo', item.target_repo_id);

              const endpoint =
                type === 'file'
                  ? buildEndpoint(API_ENDPOINTS.V2_1.FILE_OPERATIONS, { id: item.repo_id })
                  : buildEndpoint(API_ENDPOINTS.V2.DIR, { id: item.repo_id });

              await seafileRequest(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString(),
              });

              return {
                success: true,
                item: {
                  repo_id: item.repo_id,
                  src_path: validatedSrcPath,
                  dst_path: validatedDstPath,
                },
              };
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              return {
                success: false,
                item: { repo_id: item.repo_id, src_path: item.src_path, dst_path: item.dst_path },
                error: errorMessage,
              };
            }
          }
        )
      );

      const processedResults: BatchResult<{
        repo_id: string;
        src_path: string;
        dst_path: string;
      }>[] = results.map(result =>
        result.status === 'fulfilled'
          ? result.value
          : {
              success: false,
              item: { repo_id: '', src_path: '', dst_path: '' },
              error: result.reason,
            }
      );

      const successCount = processedResults.filter(r => r.success).length;
      const failureCount = processedResults.length - successCount;

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                summary: {
                  total: items.length,
                  successful: successCount,
                  failed: failureCount,
                },
                results: processedResults,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
