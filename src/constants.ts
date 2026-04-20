/**
 * API Endpoint Constants
 *
 * This file contains all Seafile API endpoint URLs organized by API version.
 * Use these constants instead of hardcoded strings to ensure consistency
 * and make future API version updates easier.
 *
 * @module
 * @example
 * ```typescript
 * import { API_ENDPOINTS, buildEndpoint } from './constants.js';
 *
 * const endpoint = buildEndpoint(API_ENDPOINTS.V2.REPOS, { id: '550e8400-e29b-41d4-a716-446655440000' });
 * // Result: '/api2/repos/550e8400-e29b-41d4-a716-446655440000'
 * ```
 */

/**
 * API endpoint URLs organized by version
 *
 * V2 endpoints use the /api2/ prefix (traditional Seafile API)
 * V2_1 endpoints use the /api/v2.1/ prefix (newer API features)
 *
 * Endpoints with {id} placeholders must be resolved using buildEndpoint()
 */
export const API_ENDPOINTS = {
  PUBLIC: {
    SERVER_INFO: '/api2/server-info',
  },
  REPO_TOKEN: {
    DIR: '/api/v2.1/via-repo-token/dir',
    FILE: '/api/v2.1/via-repo-token/file',
    MOVE_DIR: '/api/v2.1/via-repo-token/move-dir',
    UPLOAD_LINK: '/api/v2.1/via-repo-token/upload-link',
    DOWNLOAD_LINK: '/api/v2.1/via-repo-token/download-link',
    REPO_INFO: '/api/v2.1/via-repo-token/repo-info',
    SHARE_LINKS: '/api/v2.1/via-repo-token/share-links',
  },
} as const;

/**
 * Default pagination values for list operations
 *
 * @property PAGE - Default page number (1-indexed)
 * @property PER_PAGE - Default number of items per page
 * @property MAX_PER_PAGE - Maximum allowed items per page (API limit)
 */
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  PER_PAGE: 100,
  MAX_PER_PAGE: 1000,
} as const;

/**
 * Helper function to replace path parameters in endpoint URLs
 * @param endpoint - The endpoint URL template with placeholders like {id}
 * @param params - Object containing parameter values
 * @returns The endpoint URL with placeholders replaced
 */
export function buildEndpoint(endpoint: string, params: Record<string, string | number>): string {
  let url = endpoint;
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`{${key}}`, String(value));
  }
  return url;
}
