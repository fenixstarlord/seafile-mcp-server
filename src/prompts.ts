import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerPrompts(server: McpServer) {
  // Upload workflow prompt - Step-by-step upload guide
  server.registerPrompt(
    'upload_workflow_prompt',
    {
      description:
        'Guides the user through a step-by-step workflow for uploading files to Seafile, including choosing a destination folder.',
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

}
