import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseToolText(result: unknown) {
  const toolResult = result as { content?: Array<{ type: string; text?: string }> };
  assert.ok(Array.isArray(toolResult.content), 'expected tool result to include content array');
  const textBlock = toolResult.content.find(
    block => block.type === 'text' && typeof block.text === 'string'
  );
  assert.ok(textBlock?.text, 'expected tool result to include text content');
  return JSON.parse(textBlock.text) as unknown;
}

async function main() {
  const authMode = process.env.SEAFILE_AUTH_MODE ?? 'repo-token';
  const scratchDir = `/.mcp-smoke-${randomUUID().slice(0, 8)}`;
  const scratchFile = `${scratchDir}/smoke.txt`;
  const renamedFile = `${scratchDir}/smoke-renamed.txt`;

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/src/index.js'],
    cwd: process.cwd(),
    env: {
      SEAFILE_URL: getEnv('SEAFILE_URL'),
      SEAFILE_TOKEN: getEnv('SEAFILE_TOKEN'),
      SEAFILE_AUTH_MODE: authMode,
      ...(process.env.SEAFILE_REPO_ID ? { SEAFILE_REPO_ID: process.env.SEAFILE_REPO_ID } : {}),
    },
    stderr: 'pipe',
  });

  transport.stderr?.on('data', chunk => {
    process.stderr.write(chunk);
  });

  const client = new Client({ name: 'seafile-smoke', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);

  const cleanup = async () => {
    await client.callTool({ name: 'delete_file', arguments: { path: renamedFile } }).catch(() => undefined);
    await client.callTool({ name: 'delete_file', arguments: { path: scratchFile } }).catch(() => undefined);
    await client.callTool({ name: 'delete_folder', arguments: { path: scratchDir } }).catch(() => undefined);
    await transport.close().catch(() => undefined);
  };

  try {
    const tools = await client.listTools();
    const toolNames = new Set(tools.tools.map(tool => tool.name));
    for (const required of [
      'get_server_info',
      'get_repo_info',
      'list_files',
      'create_folder',
      'upload_file',
      'get_file_detail',
      'get_file',
      'rename_item',
      'delete_file',
      'delete_folder',
      'batch_delete',
    ]) {
      assert.ok(toolNames.has(required), `expected tool ${required} to be registered`);
    }
    if (authMode === 'repo-token') {
      for (const removed of ['create_share_link', 'move_item', 'copy_item', 'batch_copy', 'batch_move']) {
        assert.ok(!toolNames.has(removed), `did not expect unsupported tool ${removed}`);
      }
    } else {
      for (const advanced of ['create_share_link', 'move_item', 'copy_item', 'batch_copy', 'batch_move']) {
        assert.ok(toolNames.has(advanced), `expected account-token tool ${advanced} to be registered`);
      }

      console.log('Account-token tool registration smoke test passed');
      return;
    }

    const serverInfo = parseToolText(await client.callTool({ name: 'get_server_info', arguments: {} })) as {
      version: string;
    };
    assert.ok(serverInfo.version, 'server info should include version');

    const repoInfo = parseToolText(await client.callTool({ name: 'get_repo_info', arguments: {} })) as {
      repo_id: string;
    };
    assert.ok(repoInfo.repo_id, 'repo info should include repo id');

    const rootList = parseToolText(
      await client.callTool({ name: 'list_files', arguments: { path: '/' } })
    ) as Array<{ name: string; type: 'dir' | 'file' }>;
    assert.ok(rootList.length > 0, 'root list should not be empty');

    const childDir = rootList.find(entry => entry.type === 'dir' && entry.name !== 'docs');
    assert.ok(childDir, 'expected at least one usable child directory');

    const childList = parseToolText(
      await client.callTool({ name: 'list_files', arguments: { path: `/${childDir.name}` } })
    ) as Array<{ name: string }>;
    assert.notDeepEqual(
      childList.map(entry => entry.name),
      rootList.map(entry => entry.name),
      'non-root listing should differ from root listing'
    );

    parseToolText(
      await client.callTool({ name: 'create_folder', arguments: { path: '/', name: scratchDir.slice(1) } })
    );

    parseToolText(
      await client.callTool({
        name: 'upload_file',
        arguments: { path: scratchDir, filename: 'smoke.txt', content: 'smoke mcp content' },
      })
    );

    const detail = parseToolText(
      await client.callTool({ name: 'get_file_detail', arguments: { path: scratchFile } })
    ) as { obj_name: string };
    assert.equal(detail.obj_name, 'smoke.txt');

    const download = parseToolText(
      await client.callTool({ name: 'get_file', arguments: { path: scratchFile } })
    ) as { download_link: string };
    assert.ok(download.download_link.includes('/seafhttp/files/'), 'download link should be returned');

    parseToolText(
      await client.callTool({
        name: 'rename_item',
        arguments: { path: scratchFile, new_name: 'smoke-renamed.txt', type: 'file' },
      })
    );

    parseToolText(
      await client.callTool({
        name: 'batch_delete',
        arguments: { items: [{ path: renamedFile, type: 'file' }] },
      })
    );

    parseToolText(
      await client.callTool({ name: 'delete_folder', arguments: { path: scratchDir } })
    );

    console.log('MCP smoke test passed');
  } finally {
    await cleanup();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
