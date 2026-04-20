import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

type RootListing = {
  user_perm: string;
  dirent_list: Array<{
    type: 'dir' | 'file';
    name: string;
    parent_dir: string;
    permission?: string;
  }>;
};

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function apiUrl(path: string): string {
  return `${getEnv('SEAFILE_URL').replace(/\/$/, '')}${path}`;
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    Authorization: `Bearer ${getEnv('SEAFILE_TOKEN')}`,
    Accept: 'application/json',
    ...extra,
  };
}

async function expectOk(response: Response, context: string): Promise<string> {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${context} failed: ${response.status} ${response.statusText}\n${text}`);
  }
  return text;
}

function unquote(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return JSON.parse(trimmed) as string;
  }
  return trimmed;
}

async function listDir(path: string) {
  const response = await fetch(
    apiUrl(`/api/v2.1/via-repo-token/dir/?path=${encodeURIComponent(path)}`),
    { headers: authHeaders() }
  );
  return JSON.parse(await expectOk(response, `list dir ${path}`)) as RootListing;
}

async function main() {
  const scratchDir = `/.mcp-smoke-${randomUUID().slice(0, 8)}`;
  const scratchFile = `${scratchDir}/smoke.txt`;
  const renamedFile = `${scratchDir}/smoke-renamed.txt`;

  const cleanup = async () => {
    await fetch(apiUrl(`/api/v2.1/via-repo-token/file/?path=${encodeURIComponent(renamedFile)}`), {
      method: 'DELETE',
      headers: authHeaders(),
    }).catch(() => undefined);
    await fetch(apiUrl(`/api/v2.1/via-repo-token/file/?path=${encodeURIComponent(scratchFile)}`), {
      method: 'DELETE',
      headers: authHeaders(),
    }).catch(() => undefined);
    await fetch(apiUrl(`/api/v2.1/via-repo-token/dir/?path=${encodeURIComponent(scratchDir)}`), {
      method: 'DELETE',
      headers: authHeaders(),
    }).catch(() => undefined);
  };

  try {
    const serverInfo = await fetch(apiUrl('/api2/server-info/'), { headers: authHeaders() });
    const serverInfoBody = JSON.parse(await expectOk(serverInfo, 'server info')) as {
      version: string;
    };
    assert.ok(serverInfoBody.version, 'server info should include version');

    const repoInfo = await fetch(apiUrl('/api/v2.1/via-repo-token/repo-info/'), {
      headers: authHeaders(),
    });
    const repoInfoBody = JSON.parse(await expectOk(repoInfo, 'repo info')) as {
      repo_id: string;
      repo_name: string;
    };
    assert.ok(repoInfoBody.repo_id, 'repo info should include repo_id');
    assert.ok(repoInfoBody.repo_name, 'repo info should include repo_name');

    const rootListing = await listDir('/');
    assert.ok(rootListing.dirent_list.length > 0, 'root listing should not be empty');

    const childDir = rootListing.dirent_list.find(entry => entry.type === 'dir' && entry.name !== 'docs');
    assert.ok(childDir, 'expected at least one usable child directory at root');

    const childListing = await listDir(`/${childDir.name}`);
    assert.notDeepEqual(
      childListing.dirent_list.map(entry => entry.name),
      rootListing.dirent_list.map(entry => entry.name),
      'non-root directory listing should differ from root listing'
    );

    const mkdirResponse = await fetch(
      apiUrl(`/api/v2.1/via-repo-token/dir/?path=${encodeURIComponent(scratchDir)}`),
      {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
        body: new URLSearchParams({ operation: 'mkdir' }).toString(),
      }
    );
    await expectOk(mkdirResponse, 'create folder');

    const uploadLinkResponse = await fetch(
      apiUrl(`/api/v2.1/via-repo-token/upload-link/?path=${encodeURIComponent(scratchDir)}`),
      { headers: authHeaders() }
    );
    const uploadLink = unquote(await expectOk(uploadLinkResponse, 'get upload link'));
    assert.ok(uploadLink.includes('/seafhttp/upload-api/'), 'upload link should point at seafhttp');

    const formData = new FormData();
    formData.append('file', new Blob([Buffer.from('smoke api content')]), 'smoke.txt');
    formData.append('parent_dir', scratchDir);
    formData.append('replace', '1');

    const uploadResponse = await fetch(uploadLink, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });
    const uploadBody = unquote(await expectOk(uploadResponse, 'upload file'));
    assert.ok(uploadBody.length > 0, 'upload response should include a file id or payload');

    const fileDetailResponse = await fetch(
      apiUrl(`/api/v2.1/via-repo-token/file/?path=${encodeURIComponent(scratchFile)}`),
      { headers: authHeaders() }
    );
    const fileDetail = JSON.parse(await expectOk(fileDetailResponse, 'get file detail')) as {
      obj_name: string;
    };
    assert.equal(fileDetail.obj_name, 'smoke.txt');

    const downloadLinkResponse = await fetch(
      apiUrl(`/api/v2.1/via-repo-token/download-link/?path=${encodeURIComponent(scratchFile)}`),
      { headers: authHeaders() }
    );
    const downloadLink = unquote(await expectOk(downloadLinkResponse, 'get download link'));
    assert.ok(downloadLink.includes('/seafhttp/files/'), 'download link should point at seafhttp files');

    const renameResponse = await fetch(
      apiUrl(`/api/v2.1/via-repo-token/file/?path=${encodeURIComponent(scratchFile)}`),
      {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
        body: new URLSearchParams({ operation: 'rename', newname: 'smoke-renamed.txt' }).toString(),
      }
    );
    await expectOk(renameResponse, 'rename file');

    const deleteFileResponse = await fetch(
      apiUrl(`/api/v2.1/via-repo-token/file/?path=${encodeURIComponent(renamedFile)}`),
      {
        method: 'DELETE',
        headers: authHeaders(),
      }
    );
    await expectOk(deleteFileResponse, 'delete file');

    const deleteDirResponse = await fetch(
      apiUrl(`/api/v2.1/via-repo-token/dir/?path=${encodeURIComponent(scratchDir)}`),
      {
        method: 'DELETE',
        headers: authHeaders(),
      }
    );
    await expectOk(deleteDirResponse, 'delete folder');

    console.log('API smoke test passed');
  } finally {
    await cleanup();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
