import { seafileRequest } from '../seafile.js';

export function registerAccountTools(server: any) {
  server.registerTool(
    'get_server_info',
    {
      description: 'Get Seafile server version and configuration info',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      const info = await seafileRequest<Record<string, unknown>>('/api2/server-info/');
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(info, null, 2) }],
      };
    },
  );

  server.registerTool(
    'get_account_info',
    {
      description: 'Get the authenticated user\'s account information',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      const info = await seafileRequest<Record<string, unknown>>('/api2/account/info/');
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(info, null, 2) }],
      };
    },
  );
}