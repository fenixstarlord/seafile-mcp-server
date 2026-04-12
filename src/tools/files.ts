import { z } from 'zod';
import { seafileRequest, seafileRequestText } from '../seafile.js';
import { RepoIdSchema, PathSchema, ParentPathSchema, FilenameSchema, type DirEntry } from '../types.js';

const SEAFILE_URL = process.env.SEAFILE_URL || '';
const SEAFILE_TOKEN = process.env.SEAFILE_TOKEN || '';

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
      const items = await seafileRequest<DirEntry[]>(
        `/api2/repos/${repo_id}/dir/?p=${encodeURIComponent(path)}`,
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
      const downloadLink = await seafileRequestText(
        `/api2/repos/${repo_id}/file/?p=${encodeURIComponent(path)}`,
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
      const detail = await seafileRequest<Record<string, unknown>>(
        `/api2/repos/${repo_id}/file/detail/?p=${encodeURIComponent(path)}`,
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
      const uploadLink = await seafileRequestText(
        `/api2/repos/${repo_id}/upload-link/?p=${encodeURIComponent(path)}`,
      );

      let fileBuffer: Buffer;
      if (content.startsWith('base64:')) {
        fileBuffer = Buffer.from(content.slice(7), 'base64');
      } else {
        fileBuffer = Buffer.from(content, 'utf-8');
      }

      const formData = new FormData();
      formData.append('file', new Blob([fileBuffer]), filename);
      formData.append('parent_dir', path);
      formData.append('replace', '1');

      const uploadResponse = await fetch(uploadLink, {
        method: 'POST',
        headers: { Authorization: `Bearer ${SEAFILE_TOKEN}` },
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(
          `Failed to upload file "${filename}" to repo ${repo_id}: ` +
          `${uploadResponse.status} ${uploadResponse.statusText}. ${uploadResponse.status === 401 ? 'Check SEAFILE_TOKEN is valid.' : 'Check the upload link and try again.'}`,
        );
      }

      const result = (await uploadResponse.json()) as Record<string, unknown>;
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ success: true, filename, path, ...result }, null, 2) }],
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
      await seafileRequest(`/api/v2.1/repos/${repo_id}/file/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ p: path }).toString(),
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ success: true, repo_id, path }) }],
      };
    },
  );
}