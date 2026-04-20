import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { seafileRequest } from '../seafile.js';
import { loadConfig, PathSchema } from '../types.js';
import { validatePath } from '../utils/validation.js';
import { API_ENDPOINTS, buildEndpoint } from '../constants.js';

const BatchDeleteItemSchema = z.object({
  path: PathSchema,
  type: z.enum(['file', 'dir']).describe('Whether the item is a file or directory'),
});

interface BatchResult<T> {
  success: boolean;
  item: T;
  error?: string;
}

function getParentDir(path: string): string {
  if (path === '/') return '/';
  const segments = path.split('/').filter(Boolean);
  if (segments.length <= 1) return '/';
  return `/${segments.slice(0, -1).join('/')}`;
}

function getBaseName(path: string): string {
  return path.split('/').filter(Boolean).at(-1) ?? '';
}

export function registerBatchTools(server: McpServer) {
  const config = loadConfig();
  const isAccountToken = config.SEAFILE_AUTH_MODE === 'account-token';
  const repoId = config.SEAFILE_REPO_ID;

  server.registerTool(
    'batch_delete',
    {
      description:
        'Delete multiple files or folders from Seafile in a single operation. Uses Promise.allSettled to process all deletions and reports individual success/failure for each item.',
      inputSchema: {
        items: z
          .array(BatchDeleteItemSchema)
          .min(1)
          .max(50)
          .describe('Array of items to delete (max 50). Each item must have path and type.'),
      },
      annotations: { destructiveHint: true },
    },
    async ({ items }: { items: Array<{ path: string; type: 'file' | 'dir' }> }) => {
      const results = await Promise.allSettled(
        items.map(async item => {
          try {
            const validatedPath = validatePath(item.path);
            const endpoint =
              isAccountToken
                ? item.type === 'dir'
                  ? `${buildEndpoint(API_ENDPOINTS.ACCOUNT.DIR, { id: repoId! })}/?p=${encodeURIComponent(validatedPath)}`
                  : `${buildEndpoint(API_ENDPOINTS.ACCOUNT.FILE_OPERATIONS, { id: repoId! })}/?p=${encodeURIComponent(validatedPath)}`
                : item.type === 'dir'
                  ? `${API_ENDPOINTS.REPO_TOKEN.DIR}/?path=${encodeURIComponent(validatedPath)}`
                  : `${API_ENDPOINTS.REPO_TOKEN.FILE}/?path=${encodeURIComponent(validatedPath)}`;

            await seafileRequest(endpoint, { method: 'DELETE' });

            return {
              success: true,
              item: { path: validatedPath, type: item.type },
            } satisfies BatchResult<{ path: string; type: 'file' | 'dir' }>;
          } catch (error) {
            return {
              success: false,
              item,
              error: error instanceof Error ? error.message : String(error),
            } satisfies BatchResult<{ path: string; type: 'file' | 'dir' }>;
          }
        })
      );

      const processedResults: BatchResult<{ path: string; type: 'file' | 'dir' }>[] = results.map(
        result =>
          result.status === 'fulfilled'
            ? result.value
            : { success: false, item: { path: '', type: 'file' }, error: String(result.reason) }
      );

      const successCount = processedResults.filter(r => r.success).length;
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                summary: {
                  total: items.length,
                  successful: successCount,
                  failed: processedResults.length - successCount,
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

  if (!isAccountToken) {
    return;
  }

  const BatchMoveCopyItemSchema = z.object({
    src_path: PathSchema,
    dst_path: PathSchema,
  });

  async function runBatchOperation(
    endpoint: string,
    items: Array<{ src_path: string; dst_path: string }>
  ): Promise<BatchResult<{ src_path: string; dst_path: string }>[]> {
    const results = await Promise.allSettled(
      items.map(async item => {
        try {
          const validatedSrcPath = validatePath(item.src_path);
          const validatedDstPath = validatePath(item.dst_path);
          await seafileRequest(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              src_repo_id: repoId,
              src_parent_dir: getParentDir(validatedSrcPath),
              src_dirents: [getBaseName(validatedSrcPath)],
              dst_repo_id: repoId,
              dst_parent_dir: validatedDstPath,
            }),
          });
          return {
            success: true,
            item: { src_path: validatedSrcPath, dst_path: validatedDstPath },
          } satisfies BatchResult<{ src_path: string; dst_path: string }>;
        } catch (error) {
          return {
            success: false,
            item,
            error: error instanceof Error ? error.message : String(error),
          } satisfies BatchResult<{ src_path: string; dst_path: string }>;
        }
      })
    );

    return results.map(result =>
      result.status === 'fulfilled'
        ? result.value
        : { success: false, item: { src_path: '', dst_path: '' }, error: String(result.reason) }
    );
  }

  server.registerTool(
    'batch_copy',
    {
      description:
        'Copy multiple files or folders in Seafile in a single operation. Uses Promise.allSettled to process all copies and reports individual success/failure for each item.',
      inputSchema: {
        items: z
          .array(BatchMoveCopyItemSchema)
          .min(1)
          .max(50)
          .describe('Array of items to copy (max 50). Each item must have src_path and dst_path.'),
        type: z.enum(['file', 'dir']).describe('Whether the items are files or directories'),
      },
      annotations: { idempotentHint: false },
    },
    async ({ items }: { items: Array<{ src_path: string; dst_path: string }>; type: 'file' | 'dir' }) => {
      const processedResults = await runBatchOperation(API_ENDPOINTS.ACCOUNT.BATCH_COPY, items);
      const successCount = processedResults.filter(r => r.success).length;
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              summary: {
                total: items.length,
                successful: successCount,
                failed: processedResults.length - successCount,
              },
              results: processedResults,
            }, null, 2),
          },
        ],
      };
    }
  );

  server.registerTool(
    'batch_move',
    {
      description:
        'Move multiple files or folders in Seafile in a single operation. Uses Promise.allSettled to process all moves and reports individual success/failure for each item.',
      inputSchema: {
        items: z
          .array(BatchMoveCopyItemSchema)
          .min(1)
          .max(50)
          .describe('Array of items to move (max 50). Each item must have src_path and dst_path.'),
        type: z.enum(['file', 'dir']).describe('Whether the items are files or directories'),
      },
      annotations: { idempotentHint: false },
    },
    async ({ items }: { items: Array<{ src_path: string; dst_path: string }>; type: 'file' | 'dir' }) => {
      const processedResults = await runBatchOperation(API_ENDPOINTS.ACCOUNT.BATCH_MOVE, items);
      const successCount = processedResults.filter(r => r.success).length;
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              summary: {
                total: items.length,
                successful: successCount,
                failed: processedResults.length - successCount,
              },
              results: processedResults,
            }, null, 2),
          },
        ],
      };
    }
  );
}
