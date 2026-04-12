import { z } from 'zod';
import { seafileRequest } from '../seafile.js';
import { RepoIdSchema, PathSchema } from '../types.js';

export function registerDirectoryTools(server: any) {
  server.registerTool(
    'create_folder',
    {
      description: 'Create a new directory in Seafile',
      inputSchema: {
        repo_id: RepoIdSchema,
        path: PathSchema.describe('Parent directory path'),
        name: z.string().describe('New folder name'),
      },
      annotations: { idempotentHint: false },
    },
    async ({ repo_id, path, name }: { repo_id: string; path: string; name: string }) => {
      await seafileRequest(`/api2/repos/${repo_id}/dir/?p=${encodeURIComponent(path)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ operation: 'mkdir', name }).toString(),
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ success: true, path: `${path}/${name}` }) }],
      };
    },
  );

  server.registerTool(
    'delete_folder',
    {
      description: 'Delete a directory from Seafile permanently',
      inputSchema: {
        repo_id: RepoIdSchema,
        path: PathSchema.describe('Directory path to delete'),
      },
      annotations: { destructiveHint: true },
    },
    async ({ repo_id, path }: { repo_id: string; path: string }) => {
      await seafileRequest(`/api2/repos/${repo_id}/dir/?p=${encodeURIComponent(path)}`, {
        method: 'DELETE',
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ success: true, repo_id, path }) }],
      };
    },
  );

  server.registerTool(
    'rename_item',
    {
      description: 'Rename a file or folder in Seafile',
      inputSchema: {
        repo_id: RepoIdSchema,
        path: PathSchema.describe('Current path of the item'),
        new_name: z.string().describe('New name for the item'),
        type: z.enum(['file', 'dir']).describe('Whether the item is a file or directory'),
      },
      annotations: { idempotentHint: false },
    },
    async ({ repo_id, path, new_name, type }: { repo_id: string; path: string; new_name: string; type: 'file' | 'dir' }) => {
      const endpoint = type === 'file'
        ? `/api/v2.1/repos/${repo_id}/file/`
        : `/api2/repos/${repo_id}/dir/`;

      await seafileRequest(endpoint + `?p=${encodeURIComponent(path)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ operation: 'rename', newname: new_name }).toString(),
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ success: true, repo_id, path, new_name }) }],
      };
    },
  );

  server.registerTool(
    'move_item',
    {
      description: 'Move a file or folder to a new location in Seafile',
      inputSchema: {
        repo_id: RepoIdSchema,
        src_path: PathSchema.describe('Source path of the item'),
        dst_path: PathSchema.describe('Destination directory path'),
        type: z.enum(['file', 'dir']).describe('Whether the item is a file or directory'),
        target_repo_id: RepoIdSchema.optional().describe('Target repo ID for cross-library move'),
      },
      annotations: { idempotentHint: false },
    },
    async ({ repo_id, src_path, dst_path, type, target_repo_id }: { repo_id: string; src_path: string; dst_path: string; type: 'file' | 'dir'; target_repo_id?: string }) => {
      const params = new URLSearchParams({
        operation: 'move',
        src_path,
        dst_path,
      });
      if (target_repo_id) params.set('dst_repo', target_repo_id);

      const endpoint = type === 'file'
        ? `/api/v2.1/repos/${repo_id}/file/`
        : `/api2/repos/${repo_id}/dir/`;

      await seafileRequest(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ success: true, repo_id, src_path, dst_path }) }],
      };
    },
  );

  server.registerTool(
    'copy_item',
    {
      description: 'Copy a file or folder in Seafile',
      inputSchema: {
        repo_id: RepoIdSchema,
        src_path: PathSchema.describe('Source path of the item'),
        dst_path: PathSchema.describe('Destination directory path'),
        type: z.enum(['file', 'dir']).describe('Whether the item is a file or directory'),
        target_repo_id: RepoIdSchema.optional().describe('Target repo ID for cross-library copy'),
      },
      annotations: { idempotentHint: false },
    },
    async ({ repo_id, src_path, dst_path, type, target_repo_id }: { repo_id: string; src_path: string; dst_path: string; type: 'file' | 'dir'; target_repo_id?: string }) => {
      const params = new URLSearchParams({
        operation: 'copy',
        src_path,
        dst_path,
      });
      if (target_repo_id) params.set('dst_repo', target_repo_id);

      const endpoint = type === 'file'
        ? `/api/v2.1/repos/${repo_id}/file/`
        : `/api2/repos/${repo_id}/dir/`;

      await seafileRequest(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ success: true, repo_id, src_path, dst_path }) }],
      };
    },
  );
}