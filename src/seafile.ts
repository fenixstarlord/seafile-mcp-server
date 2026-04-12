import { SEAFILE_URL, SEAFILE_TOKEN } from './types.js';

const DEFAULT_TIMEOUT = 30_000;

if (!SEAFILE_URL || !SEAFILE_TOKEN) {
  console.error('Missing required environment variables: SEAFILE_URL, SEAFILE_TOKEN');
  process.exit(1);
}

function actionableHint(status: number): string {
  switch (status) {
    case 401: return 'Check SEAFILE_TOKEN is valid.';
    case 403: return 'Token lacks permission for this operation.';
    case 404: return 'Verify the repo_id and path exist.';
    case 429: return 'Rate limited — retry after a moment.';
    default: return 'Check the Seafile server URL and try again.';
  }
}

async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  expectJson = true,
): Promise<T> {
  const url = `${SEAFILE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${SEAFILE_TOKEN}`,
        Accept: 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Seafile API error on ${options.method || 'GET'} ${endpoint}: ` +
        `${response.status} ${response.statusText}. ${actionableHint(response.status)}`,
      );
    }

    if (expectJson) {
      return response.json() as Promise<T>;
    }
    return response.text() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

export async function seafileRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return makeRequest<T>(endpoint, options, true);
}

export async function seafileRequestText(endpoint: string, options: RequestInit = {}): Promise<string> {
  return makeRequest<string>(endpoint, options, false);
}