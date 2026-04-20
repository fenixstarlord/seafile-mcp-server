import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerPrompts(server: McpServer) {
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
        path: z.string().optional().describe('Destination directory path (default: /)'),
      },
    },
    (args: { filename: string; content: string; path?: string }) => {
      const { filename, content, path = '/' } = args;
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I want to upload a file named "${filename}" to Seafile. Please guide me through the upload process.

Target location:
- Directory: ${path}

Please perform the upload using the upload_file tool with these parameters:
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
      description: 'Helps the user share files or folders in Seafile via a public share link.',
      argsSchema: {
        path: z.string().describe('Path to the file or folder to share'),
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
    (args: { path: string; password?: string; expire_days?: number }) => {
      const { path, password, expire_days } = args;
      const instructions = `Use the create_share_link tool with:
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

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I want to share an item in Seafile:
- Path: "${path}"
${password ? '- Password protected: Yes\n' : ''}${expire_days ? `- Expires after: ${expire_days} days\n` : ''}

Please help me share this item.

${instructions}

After completing the share operation, please provide:
- Confirmation that the share was created successfully
- The share link URL
- Any password or expiration details`,
            },
          },
        ],
      };
    }
  );
}
