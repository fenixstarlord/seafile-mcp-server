import { loadConfig, ConfigError } from './config.js';
import { logger } from './logger.js';

/** Default request timeout in milliseconds (30 seconds) */
const DEFAULT_TIMEOUT = 30_000;

/** Maximum number of retry attempts for failed requests */
const MAX_RETRIES = 3;

/** Base delay between retries in milliseconds (exponential backoff) */
const RETRY_DELAY_MS = 1000;

/** Cached configuration loaded lazily */
let config: ReturnType<typeof loadConfig> | null = null;

/**
 * Gets the cached configuration or loads it on first access
 * Handles ConfigError by logging a fatal error and exiting the process
 *
 * @returns The validated configuration object
 * @throws {ConfigError} Exits process if configuration is invalid
 */
function getConfig() {
  if (!config) {
    try {
      config = loadConfig();
    } catch (error) {
      if (error instanceof ConfigError) {
        logger.fatal({ error: error.message }, 'Configuration error');
        process.exit(1);
      }
      throw error;
    }
  }
  return config;
}

/**
 * Returns a user-friendly hint based on HTTP status code
 * Helps users understand what went wrong and how to fix it
 *
 * @param status - HTTP status code
 * @returns Actionable error message hint
 *
 * @example
 * ```typescript
 * const hint = actionableHint(401);
 * console.log(hint); // 'Check SEAFILE_TOKEN is valid.'
 * ```
 */
function actionableHint(status: number): string {
  switch (status) {
    case 401:
      return 'Check SEAFILE_TOKEN is valid.';
    case 403:
      return 'Token lacks permission for this operation.';
    case 404:
      return 'Verify the repo_id and path exist.';
    case 429:
      return 'Rate limited — retry after a moment.';
    case 503:
      return 'Seafile server temporarily unavailable.';
    case 504:
      return 'Gateway timeout — server may be overloaded.';
    default:
      return 'Check the Seafile server URL and try again.';
  }
}

/**
 * Determines if an error is retryable based on status code or error type
 * Retryable errors include rate limits, service unavailable, and network errors
 *
 * @param error - The error object (if any)
 * @param status - HTTP status code (if available)
 * @returns True if the request should be retried
 *
 * @example
 * ```typescript
 * if (isRetryableError(error, 429)) {
 *   await retryRequest();
 * }
 * ```
 */
function isRetryableError(error: unknown, status?: number): boolean {
  // Retry on network errors and specific status codes
  if (status === 429) return true; // Rate limit
  if (status === 503) return true; // Service unavailable
  if (status === 504) return true; // Gateway timeout
  if (!status && error instanceof Error) {
    // Network errors (no response)
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')
    );
  }
  return false;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength === '0') {
    return undefined as T;
  }

  const text = await response.text();
  if (text.trim() === '') {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

/**
 * Creates a promise that resolves after the specified milliseconds
 * Used for implementing delays between retry attempts
 *
 * @param ms - Number of milliseconds to sleep
 * @returns Promise that resolves after the delay
 *
 * @example
 * ```typescript
 * await sleep(1000); // Wait 1 second
 * ```
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Internal function to make HTTP requests to the Seafile API
 * Implements retry logic with exponential backoff for transient failures
 *
 * @param endpoint - API endpoint path (e.g., '/api2/repos/')
 * @param options - Fetch options (method, headers, body, etc.)
 * @param expectJson - Whether to expect JSON response (true) or text (false)
 * @param timeoutMs - Request timeout in milliseconds
 * @returns Promise resolving to the response data
 * @throws {Error} When request fails after all retries or returns non-OK status
 *
 * @example
 * ```typescript
 * const repos = await makeRequest<RepoInfo[]>('/api2/repos/');
 * ```
 */
async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  expectJson = true,
  timeoutMs = DEFAULT_TIMEOUT
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
            `${response.status} ${response.statusText}. ${actionableHint(response.status)}`
        );

        // Check if we should retry
        if (attempt < MAX_RETRIES && isRetryableError(error, response.status)) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          logger.warn(
            { attempt, delayMs: delay, status: response.status, errorMessage: error.message },
            'Retrying request'
          );
          await sleep(delay);
          continue;
        }

        throw error;
      }

      if (expectJson) {
        return parseJsonResponse<T>(response);
      }
      return response.text() as Promise<T>;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (attempt < MAX_RETRIES && isRetryableError(error)) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        logger.warn(
          { attempt, delayMs: delay, errorMessage: lastError?.message },
          'Retrying request after error'
        );
        await sleep(delay);
        continue;
      }

      throw lastError;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error('Request failed after all retries');
}

/**
 * Makes a JSON API request to the Seafile server
 * Automatically parses the response as JSON
 *
 * @param endpoint - API endpoint path (e.g., '/api2/repos/')
 * @param options - Fetch options (method, headers, body, etc.)
 * @param timeoutMs - Optional request timeout in milliseconds (default: 30000)
 * @returns Promise resolving to the parsed JSON response
 * @throws {Error} When request fails or returns non-OK status
 *
 * @example
 * ```typescript
 * // GET request
 * const repos = await seafileRequest<RepoInfo[]>('/api2/repos/');
 *
 * // POST request with body
 * const result = await seafileRequest('/api2/repos/', {
 *   method: 'POST',
 *   body: 'name=MyLibrary'
 * });
 * ```
 */
export async function seafileRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs?: number
): Promise<T> {
  return makeRequest<T>(endpoint, options, true, timeoutMs);
}

/**
 * Makes an API request to the Seafile server and returns text response
 * Used for endpoints that return plain text (e.g., download links)
 *
 * @param endpoint - API endpoint path (e.g., '/api2/repos/{id}/file/')
 * @param options - Fetch options (method, headers, body, etc.)
 * @param timeoutMs - Optional request timeout in milliseconds (default: 30000)
 * @returns Promise resolving to the text response
 * @throws {Error} When request fails or returns non-OK status
 *
 * @example
 * ```typescript
 * const downloadUrl = await seafileRequestText(
 *   `/api2/repos/${repoId}/file/?p=${encodeURIComponent(path)}`
 * );
 * ```
 */
export async function seafileRequestText(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs?: number
): Promise<string> {
  return makeRequest<string>(endpoint, options, false, timeoutMs);
}
