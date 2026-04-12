import { loadConfig, ConfigError } from './config.js';

const DEFAULT_TIMEOUT = 30_000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Load config at module level but don't validate yet
let config: ReturnType<typeof loadConfig> | null = null;

function getConfig() {
  if (!config) {
    try {
      config = loadConfig();
    } catch (error) {
      if (error instanceof ConfigError) {
        console.error(`Configuration error: ${error.message}`);
        process.exit(1);
      }
      throw error;
    }
  }
  return config;
}

function actionableHint(status: number): string {
  switch (status) {
    case 401: return 'Check SEAFILE_TOKEN is valid.';
    case 403: return 'Token lacks permission for this operation.';
    case 404: return 'Verify the repo_id and path exist.';
    case 429: return 'Rate limited — retry after a moment.';
    case 503: return 'Seafile server temporarily unavailable.';
    case 504: return 'Gateway timeout — server may be overloaded.';
    default: return 'Check the Seafile server URL and try again.';
  }
}

function isRetryableError(error: unknown, status?: number): boolean {
  // Retry on network errors and specific status codes
  if (status === 429) return true; // Rate limit
  if (status === 503) return true; // Service unavailable
  if (status === 504) return true; // Gateway timeout
  if (!status && error instanceof Error) {
    // Network errors (no response)
    const message = error.message.toLowerCase();
    return message.includes('network') || 
           message.includes('timeout') || 
           message.includes('econnrefused') ||
           message.includes('ENOTFOUND');
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  expectJson = true,
  timeoutMs = DEFAULT_TIMEOUT,
): Promise<T> {
  const cfg = getConfig();
  const url = `${cfg.SEAFILE_URL}${endpoint}`;
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${cfg.SEAFILE_TOKEN}`,
          Accept: 'application/json',
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        const error = new Error(
          `Seafile API error on ${options.method || 'GET'} ${endpoint}: ` +
          `${response.status} ${response.statusText}. ${actionableHint(response.status)}`,
        );
        
        // Check if we should retry
        if (attempt < MAX_RETRIES && isRetryableError(error, response.status)) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          console.error(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
          await sleep(delay);
          continue;
        }
        
        throw error;
      }
      
      if (expectJson) {
        return response.json() as Promise<T>;
      }
      return response.text() as Promise<T>;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry
      if (attempt < MAX_RETRIES && isRetryableError(error)) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.error(`Attempt ${attempt} failed (${lastError.message}), retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      
      throw lastError;
    } finally {
      clearTimeout(timeout);
    }
  }
  
  throw lastError || new Error('Request failed after all retries');
}

export async function seafileRequest<T>(
  endpoint: string, 
  options: RequestInit = {},
  timeoutMs?: number,
): Promise<T> {
  return makeRequest<T>(endpoint, options, true, timeoutMs);
}

export async function seafileRequestText(
  endpoint: string, 
  options: RequestInit = {},
  timeoutMs?: number,
): Promise<string> {
  return makeRequest<string>(endpoint, options, false, timeoutMs);
}