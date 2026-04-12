import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerPrompts(server: McpServer) {
  // File search prompt - Guides user to search for files
  server.registerPrompt(
    'file_search_prompt',
    {
      description:
        'Guides the user through searching for files in Seafile. Helps construct effective search queries and understand search options.',
      argsSchema: {
        query: z.string().describe('The search query or file name pattern to look for'),
        repo_id: z
          .string()
          .optional()
          .describe('Optional: Repository ID to limit the search to a specific library'),
        search_path: z
          .string()
          .optional()
          .describe(
            'Optional: Path within a repository to scope the search (e.g., /Documents/Projects)'
          ),
      },
    },
    (args: { query: string; repo_id?: string; search_path?: string }) => {
      const { query, repo_id, search_path } = args;
      const scopeInfo = repo_id
        ? ` in repository ${repo_id}${search_path ? ` under path "${search_path}"` : ''}`
        : ' across all accessible libraries';

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I want to search for files with the query "${query}"${scopeInfo}. Please help me find these files.

Use the search_files tool to perform this search. Here's what you need to know:

1. The query parameter is the search term (required)
2. If repo_id is provided, the search will be limited to that library
3. If search_path is provided (along with repo_id), the search will be limited to that specific folder

Please execute the search and show me the results with relevant file information including:
- File names and paths
- Which library each file is in
- Any other relevant metadata

If no files are found, suggest alternative search terms or broader search criteria.`,
            },
          },
        ],
      };
    }
  );

  // Upload workflow prompt - Step-by-step upload guide
  server.registerPrompt(
    'upload_workflow_prompt',
    {
      description:
        'Guides the user through a step-by-step workflow for uploading files to Seafile, including selecting a library and destination folder.',
      argsSchema: {
        filename: z.string().describe('Name of the file to upload'),
        content: z
          .string()
          .describe(
            'File content (plain text or base64-encoded binary data with "base64:" prefix)'
          ),
        repo_id: z.string().describe('Repository ID where the file should be uploaded'),
        path: z.string().optional().describe('Destination directory path (default: /)'),
      },
    },
    (args: { filename: string; content: string; repo_id: string; path?: string }) => {
      const { filename, content, repo_id, path = '/' } = args;
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I want to upload a file named "${filename}" to Seafile. Please guide me through the upload process.

Target location:
- Repository: ${repo_id}
- Directory: ${path}

Please perform the upload using the upload_file tool with these parameters:
- repo_id: "${repo_id}"
- path: "${path}"
- filename: "${filename}"
- content: [The file content provided]

Important notes:
1. If the content starts with "base64:", it will be decoded as binary data
2. Otherwise, the content is treated as UTF-8 text
3. If a file with the same name exists, it will be replaced

Please execute the upload and confirm:
- The file was uploaded successfully
- The destination path
- Any other relevant details from the response`,
            },
          },
        ],
      };
    }
  );

  // Share item prompt - Helps user share files/folders
  server.registerPrompt(
    'share_item_prompt',
    {
      description:
        'Helps the user share files or folders in Seafile, either via public share links or with specific users/groups.',
      argsSchema: {
        repo_id: z.string().describe('Repository ID containing the item to share'),
        path: z.string().describe('Path to the file or folder to share'),
        share_type: z
          .enum(['link', 'user', 'group'])
          .describe(
            'Type of sharing: "link" for public share link, "user" for sharing with a user, or "group" for sharing with a group'
          ),
        username: z
          .string()
          .optional()
          .describe('Email address of the user to share with (required if share_type is "user")'),
        permission: z
          .enum(['r', 'rw'])
          .optional()
          .describe('Permission level: "r" for read-only or "rw" for read-write (default: "r")'),
        password: z
          .string()
          .optional()
          .describe('Optional password for the share link (only for share_type="link")'),
        expire_days: z
          .number()
          .optional()
          .describe(
            'Optional number of days until the share link expires (only for share_type="link")'
          ),
      },
    },
    (args: {
      repo_id: string;
      path: string;
      share_type: 'link' | 'user' | 'group';
      username?: string;
      permission?: 'r' | 'rw';
      password?: string;
      expire_days?: number;
    }) => {
      const { repo_id, path, share_type, username, permission = 'r', password, expire_days } = args;
      let instructions = '';
      let toolName = '';

      if (share_type === 'link') {
        toolName = 'create_share_link';
        instructions = `Use the create_share_link tool with:
- repo_id: "${repo_id}"
- path: "${path}"${
          password
            ? `
- password: "${password}"`
            : ''
        }${
          expire_days !== undefined
            ? `
- expire_days: ${expire_days}`
            : ''
        }

This will generate a public share link that can be accessed by anyone with the link.`;
      } else if (share_type === 'user') {
        toolName = 'share_to_user';
        const userInfo = username ? `user "${username}"` : 'the specified user';
        instructions = `Use the share_to_user tool with:
- repo_id: "${repo_id}"
- share_type: "user"
- username: "${username || '[email address]'}",
- path: "${path}"
- permission: "${permission}"

This will share the item with ${userInfo} with ${permission === 'rw' ? 'read-write' : 'read-only'} permissions.`;
      } else if (share_type === 'group') {
        toolName = 'share_to_user';
        instructions = `Use the share_to_user tool with:
- repo_id: "${repo_id}"
- share_type: "group"
- group_id: [group ID number]
- path: "${path}"
- permission: "${permission}"

This will share the item with the specified group with ${permission === 'rw' ? 'read-write' : 'read-only'} permissions.`;
      }

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I want to share an item in Seafile:
- Location: repository "${repo_id}", path "${path}"
- Share type: ${share_type}
${share_type === 'link' ? (password ? '- Password protected: Yes\n' : '') + (expire_days ? `- Expires after: ${expire_days} days\n` : '') : `- Permission level: ${permission === 'rw' ? 'Read-Write' : 'Read-Only'}\n`}

Please help me share this item.

${instructions}

After completing the share operation, please provide:
- Confirmation that the share was created successfully
${share_type === 'link' ? '- The share link URL\n- Any password or expiration details' : '- Details about who the item was shared with'}
- The permission level granted`,
            },
          },
        ],
      };
    }
  );
}
