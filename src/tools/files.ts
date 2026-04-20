import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { seafileRequest, seafileRequestText } from '../seafile.js';
import { PathSchema, ParentPathSchema, FilenameSchema, type DirEntry } from '../types.js';
import { validatePath, validateContentSize } from '../utils/validation.js';
import { loadConfig } from '../config.js';
import { API_ENDPOINTS, PAGINATION_DEFAULTS, buildEndpoint } from '../constants.js';

function parseQuotedText(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return JSON.parse(trimmed) as string;
  }
  return trimmed;
}

/** Maximum upload size in bytes (100MB) */
const MAX_UPLOAD_SIZE = 100 * 1024 * 1024;

/** Upload timeout in milliseconds (5 minutes) */
const UPLOAD_TIMEOUT = 5 * 60 * 1000;

/**
 * Registers file-related tools with the MCP server
 *
 * Provides tools for managing files in Seafile:
 * - list_files: List files and directories with pagination
 * - get_file: Get a download link for a file
 * - get_file_detail: Get detailed metadata for a file
 * - upload_file: Upload a file (text or base64 encoded binary)
 * - delete_file: Delete a file permanently
 *
 * @param server - The MCP server instance to register tools with
 *
 * @example
 * ```typescript
 * import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
 * import { registerFileTools } from './tools/files.js';
 *
 * const server = new McpServer({ name: 'seafile-mcp', version: '1.0.0' });
 * registerFileTools(server);
 * ```
 */
export function registerFileTools(server: McpServer) {
  const config = loadConfig();
  const isAccountToken = config.SEAFILE_AUTH_MODE === 'account-token';
  const repoId = config.SEAFILE_REPO_ID;

  /**
   * Tool: list_files
   *
   * Lists files and directories in a specified Seafile directory path.
   * Supports pagination for large directories.
   *
   * @param path - Directory path (default: /)
   * @param page - Page number for pagination (default: 1)
   * @param per_page - Items per page (default: 100, max: 1000)
   * @returns Array of DirEntry objects representing files and directories
   */
  server.registerTool(
    'list_files',
    {
      description: 'List files and directories in a Seafile directory',
      inputSchema: {
        path: PathSchema.optional().default('/').describe('Directory path (default: /)'),
        page: z
          .number()
          .int()
          .min(1)
          .optional()
          .default(PAGINATION_DEFAULTS.PAGE)
          .describe(`Page number (default: ${PAGINATION_DEFAULTS.PAGE})`),
        per_page: z
          .number()
          .int()
          .min(1)
          .max(PAGINATION_DEFAULTS.MAX_PER_PAGE)
          .optional()
          .default(PAGINATION_DEFAULTS.PER_PAGE)
          .describe(
            `Items per page (default: ${PAGINATION_DEFAULTS.PER_PAGE}, max: ${PAGINATION_DEFAULTS.MAX_PER_PAGE})`
          ),
      },
      annotations: { readOnlyHint: true },
    },
    async ({
      path = '/',
      page = PAGINATION_DEFAULTS.PAGE,
      per_page = PAGINATION_DEFAULTS.PER_PAGE,
    }: {
      path: string;
      page: number;
      per_page: number;
    }) => {
      const validatedPath = validatePath(path);
      const result = isAccountToken
        ? await seafileRequest<DirEntry[]>(
            `${buildEndpoint(API_ENDPOINTS.ACCOUNT.DIR, { id: repoId! })}/?p=${encodeURIComponent(validatedPath)}&page=${page}&per_page=${per_page}`
          )
        : await seafileRequest<{ dirent_list: DirEntry[] }>(
            `${API_ENDPOINTS.REPO_TOKEN.DIR}/?path=${encodeURIComponent(validatedPath)}&page=${page}&per_page=${per_page}`
          );
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              isAccountToken ? result : (result as { dirent_list: DirEntry[] }).dirent_list ?? [],
              null,
              2
            ),
          },
        ],
      };
    }
  );

  /**
   * Tool: get_file
   *
   * Retrieves a temporary download link for a file.
   * The link is valid for a limited time and can be used to download the file content.
   *
   * @param path - File path (e.g., /Documents/report.txt)
   * @returns Object containing the download_link URL
   */
  server.registerTool(
    'get_file',
    {
      description: 'Get a download link for a file in Seafile',
      inputSchema: {
        path: PathSchema.describe('File path (e.g. /Documents/report.txt)'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ path }: { path: string }) => {
      const validatedPath = validatePath(path);
      const downloadLink = parseQuotedText(
        await seafileRequestText(
          isAccountToken
            ? `${buildEndpoint(API_ENDPOINTS.ACCOUNT.FILE_DOWNLOAD, { id: repoId! })}/?p=${encodeURIComponent(validatedPath)}`
            : `${API_ENDPOINTS.REPO_TOKEN.DOWNLOAD_LINK}/?path=${encodeURIComponent(validatedPath)}`
        )
      );
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify({ download_link: downloadLink }, null, 2) },
        ],
      };
    }
  );

  /**
   * Tool: get_file_detail
   *
   * Gets detailed metadata for a file including size, modification date,
   * MIME type, and other properties.
   *
   * @param path - File path
   * @returns Object with file metadata
   */
  server.registerTool(
    'get_file_detail',
    {
      description: 'Get detailed metadata for a file (size, modified date, etc.)',
      inputSchema: {
        path: PathSchema.describe('File path'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ path }: { path: string }) => {
      const validatedPath = validatePath(path);
      const detail = await seafileRequest<Record<string, unknown>>(
        isAccountToken
          ? `${buildEndpoint(API_ENDPOINTS.ACCOUNT.FILE_DETAIL, { id: repoId! })}/?p=${encodeURIComponent(validatedPath)}`
          : `${API_ENDPOINTS.REPO_TOKEN.FILE}/?path=${encodeURIComponent(validatedPath)}`
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(detail, null, 2) }],
      };
    }
  );

  /**
   * Tool: upload_file
   *
   * Uploads a file to Seafile. Content can be provided as:
   * - Plain text (UTF-8 encoded)
   * - Base64 encoded binary data (prefix with "base64:")
   *
   * Maximum file size: 100MB
   *
   * @param path - Parent directory path (e.g., /Documents)
   * @param filename - Name for the uploaded file
   * @param content - File content (text or base64: prefixed)
   * @returns Object with upload success status and file details
   *
   * @example
   * ```typescript
   * // Upload text file
   * upload_file({
   *   repo_id: '550e8400-e29b-41d4-a716-446655440000',
   *   path: '/Documents',
   *   filename: 'readme.txt',
   *   content: 'Hello, World!'
   * });
   *
   * // Upload binary file (base64 encoded)
   * upload_file({
   *   repo_id: '550e8400-e29b-41d4-a716-446655440000',
   *   path: '/Images',
   *   filename: 'photo.png',
   *   content: 'base64:iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
   * });
   * ```
   */
  server.registerTool(
    'upload_file',
    {
      description:
        'Upload a file to Seafile. Content is treated as UTF-8 text by default, or prefix with "base64:" for binary data.',
      inputSchema: {
        path: ParentPathSchema.describe('Parent directory path (e.g. /Documents)'),
        filename: FilenameSchema,
        content: z.string().describe('File content. Plain text or base64: prefix for binary'),
      },
      annotations: { idempotentHint: false },
    },
    async ({ path, filename, content }: { path: string; filename: string; content: string }) => {
      // Validate content size
      validateContentSize(content, MAX_UPLOAD_SIZE);

      const validatedPath = validatePath(path);
      const uploadLink = parseQuotedText(
        await seafileRequestText(
          isAccountToken
            ? `${buildEndpoint(API_ENDPOINTS.ACCOUNT.UPLOAD_LINK, { id: repoId! })}/?p=${encodeURIComponent(validatedPath)}`
            : `${API_ENDPOINTS.REPO_TOKEN.UPLOAD_LINK}/?path=${encodeURIComponent(validatedPath)}`
        )
      );

      let fileBuffer: Buffer;
      if (content.startsWith('base64:')) {
        fileBuffer = Buffer.from(content.slice(7), 'base64');
      } else {
        fileBuffer = Buffer.from(content, 'utf-8');
      }

      const formData = new FormData();
      formData.append('file', new Blob([fileBuffer]), filename);
      formData.append('parent_dir', validatedPath);
      formData.append('replace', '1');

      const config = loadConfig();
      const uploadResponse = await fetch(uploadLink, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.SEAFILE_TOKEN}` },
        body: formData,
        signal: AbortSignal.timeout(UPLOAD_TIMEOUT),
      });

      if (!uploadResponse.ok) {
        throw new Error(
          `Failed to upload file "${filename}": ` +
            `${uploadResponse.status} ${uploadResponse.statusText}. ${uploadResponse.status === 401 ? 'Check SEAFILE_TOKEN is valid.' : 'Check the upload link and try again.'}`
        );
      }

      const responseText = await uploadResponse.text();
      const result = responseText.trim().startsWith('{')
        ? ((JSON.parse(responseText) as Record<string, unknown>) ?? {})
        : { file_id: parseQuotedText(responseText) };
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              { success: true, filename, path: validatedPath, ...result },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  /**
   * Tool: delete_file
   *
   * Permanently deletes a file from Seafile.
   * WARNING: This operation cannot be undone.
   *
   * @param path - File path to delete
   * @returns Success confirmation with deleted file details
   */
  server.registerTool(
    'delete_file',
    {
      description: 'Delete a file from Seafile permanently',
      inputSchema: {
        path: PathSchema.describe('File path to delete'),
      },
      annotations: { destructiveHint: true },
    },
    async ({ path }: { path: string }) => {
      const validatedPath = validatePath(path);
      await seafileRequest(
        isAccountToken
          ? `${buildEndpoint(API_ENDPOINTS.ACCOUNT.FILE_OPERATIONS, { id: repoId! })}/?p=${encodeURIComponent(validatedPath)}`
          : `${API_ENDPOINTS.REPO_TOKEN.FILE}/?path=${encodeURIComponent(validatedPath)}`,
        { method: 'DELETE' }
      );
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ success: true, path: validatedPath }),
          },
        ],
      };
    }
  );
}
