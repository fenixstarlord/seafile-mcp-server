import { z } from 'zod';
import { seafileRequest, seafileRequestText } from '../seafile.js';
import { RepoIdSchema, PathSchema, ParentPathSchema, FilenameSchema, type DirEntry } from '../types.js';
import { validatePath, validateContentSize } from '../utils/validation.js';
import { loadConfig } from '../config.js';

const MAX_UPLOAD_SIZE = 100 * 1024 * 1024; // 100MB
const UPLOAD_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export function registerFileTools(server: any) {
  server.registerTool(
    'list_files',
    {
      description: 'List files and directories in a Seafile directory',
      inputSchema: {
        repo_id: RepoIdSchema,
        path: PathSchema.optional().default('/').describe('Directory path (default: /)'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ repo_id, path = '/' }: { repo_id: string; path: string }) => {
      const validatedPath = validatePath(path);
      const items = await seafileRequest<DirEntry[]>(
        `/api2/repos/${repo_id}/dir/?p=${encodeURIComponent(validatedPath)}`,
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }],
      };
    },
  );

  server.registerTool(
    'get_file',
    {
      description: 'Get a download link for a file in Seafile',
      inputSchema: {
        repo_id: RepoIdSchema,
        path: PathSchema.describe('File path (e.g. /Documents/report.txt)'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ repo_id, path }: { repo_id: string; path: string }) => {
      const validatedPath = validatePath(path);
      const downloadLink = await seafileRequestText(
        `/api2/repos/${repo_id}/file/?p=${encodeURIComponent(validatedPath)}`,
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ download_link: downloadLink }, null, 2) }],
      };
    },
  );

  server.registerTool(
    'get_file_detail',
    {
      description: 'Get detailed metadata for a file (size, modified date, etc.)',
      inputSchema: {
        repo_id: RepoIdSchema,
        path: PathSchema.describe('File path'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ repo_id, path }: { repo_id: string; path: string }) => {
      const validatedPath = validatePath(path);
      const detail = await seafileRequest<Record<string, unknown>>(
        `/api2/repos/${repo_id}/file/detail/?p=${encodeURIComponent(validatedPath)}`,
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(detail, null, 2) }],
      };
    },
  );

  server.registerTool(
    'upload_file',
    {
      description: 'Upload a file to Seafile. Content is treated as UTF-8 text by default, or prefix with "base64:" for binary data.',
      inputSchema: {
        repo_id: RepoIdSchema,
        path: ParentPathSchema.describe('Parent directory path (e.g. /Documents)'),
        filename: FilenameSchema,
        content: z.string().describe('File content. Plain text or base64: prefix for binary'),
      },
      annotations: { idempotentHint: false },
    },
    async ({ repo_id, path, filename, content }: { repo_id: string; path: string; filename: string; content: string }) => {
      // Validate content size
      validateContentSize(content, MAX_UPLOAD_SIZE);
      
      const validatedPath = validatePath(path);
      const uploadLink = await seafileRequestText(
        `/api2/repos/${repo_id}/upload-link/?p=${encodeURIComponent(validatedPath)}`,
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
          `Failed to upload file "${filename}" to repo ${repo_id}: ` +
          `${uploadResponse.status} ${uploadResponse.statusText}. ${uploadResponse.status === 401 ? 'Check SEAFILE_TOKEN is valid.' : 'Check the upload link and try again.'}`,
        );
      }

      const result = (await uploadResponse.json()) as Record<string, unknown>;
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ success: true, filename, path: validatedPath, ...result }, null, 2) }],
      };
    },
  );

  server.registerTool(
    'delete_file',
    {
      description: 'Delete a file from Seafile permanently',
      inputSchema: {
        repo_id: RepoIdSchema,
        path: PathSchema.describe('File path to delete'),
      },
      annotations: { destructiveHint: true },
    },
    async ({ repo_id, path }: { repo_id: string; path: string }) => {
      const validatedPath = validatePath(path);
      await seafileRequest(`/api/v2.1/repos/${repo_id}/file/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ p: validatedPath }).toString(),
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ success: true, repo_id, path: validatedPath }) }],
      };
    },
  );
}