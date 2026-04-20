import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { seafileRequest } from '../seafile.js';
import { PathSchema } from '../types.js';
import { validatePath } from '../utils/validation.js';
import { API_ENDPOINTS } from '../constants.js';

const BatchDeleteItemSchema = z.object({
  path: PathSchema,
  type: z.enum(['file', 'dir']).describe('Whether the item is a file or directory'),
});

const BatchMoveCopyItemSchema = z.object({
  src_path: PathSchema,
  dst_path: PathSchema,
});

interface BatchResult<T> {
  success: boolean;
  item: T;
  error?: string;
}

async function moveItem(srcPath: string, dstPath: string, type: 'file' | 'dir') {
  if (type === 'file') {
    await seafileRequest(`${API_ENDPOINTS.REPO_TOKEN.FILE}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        operation: 'move',
        src_path: srcPath,
        dst_path: dstPath,
      }).toString(),
    });
    return;
  }

  await seafileRequest(`${API_ENDPOINTS.REPO_TOKEN.MOVE_DIR}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ src_path: srcPath, dst_path: dstPath }).toString(),
  });
}

async function copyItem(srcPath: string, dstPath: string, type: 'file' | 'dir') {
  const endpoint = type === 'file' ? API_ENDPOINTS.REPO_TOKEN.FILE : API_ENDPOINTS.REPO_TOKEN.DIR;
  await seafileRequest(`${endpoint}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      operation: 'copy',
      src_path: srcPath,
      dst_path: dstPath,
    }).toString(),
  });
}

export function registerBatchTools(server: McpServer) {
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
            if (item.type === 'dir') {
              await seafileRequest(
                `${API_ENDPOINTS.REPO_TOKEN.DIR}/?p=${encodeURIComponent(validatedPath)}`,
                {
                  method: 'DELETE',
                }
              );
            } else {
              await seafileRequest(`${API_ENDPOINTS.REPO_TOKEN.FILE}/`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ p: validatedPath }).toString(),
              });
            }

            return { success: true, item: { path: validatedPath, type: item.type } };
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
    async ({
      items,
      type,
    }: {
      items: Array<{ src_path: string; dst_path: string }>;
      type: 'file' | 'dir';
    }) => {
      const results = await Promise.allSettled(
        items.map(async item => {
          try {
            const validatedSrcPath = validatePath(item.src_path);
            const validatedDstPath = validatePath(item.dst_path);
            await copyItem(validatedSrcPath, validatedDstPath, type);
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

      const processedResults: BatchResult<{ src_path: string; dst_path: string }>[] = results.map(
        result =>
          result.status === 'fulfilled'
            ? result.value
            : {
                success: false,
                item: { src_path: '', dst_path: '' },
                error: String(result.reason),
              }
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
    async ({
      items,
      type,
    }: {
      items: Array<{ src_path: string; dst_path: string }>;
      type: 'file' | 'dir';
    }) => {
      const results = await Promise.allSettled(
        items.map(async item => {
          try {
            const validatedSrcPath = validatePath(item.src_path);
            const validatedDstPath = validatePath(item.dst_path);
            await moveItem(validatedSrcPath, validatedDstPath, type);
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

      const processedResults: BatchResult<{ src_path: string; dst_path: string }>[] = results.map(
        result =>
          result.status === 'fulfilled'
            ? result.value
            : {
                success: false,
                item: { src_path: '', dst_path: '' },
                error: String(result.reason),
              }
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
}
