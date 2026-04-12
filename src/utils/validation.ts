/**
 * Validation utilities for Seafile MCP Server
 *
 * This module provides validation functions for paths, repository IDs,
 * content sizes, and email addresses to ensure data integrity and security.
 */

/**
 * Validates and sanitizes a file/directory path
 *
 * Performs the following validations:
 * - Normalizes path separators (backslashes to forward slashes)
 * - Removes duplicate slashes
 * - Prevents path traversal attacks (../)
 * - Ensures path starts with /
 * - Removes trailing slash except for root
 *
 * @param path - The path to validate
 * @returns Sanitized path string
 * @throws {Error} If path contains path traversal attempts (../ beyond root)
 *
 * @example
 * ```typescript
 * // Basic path normalization
 * validatePath('\\Documents\\file.txt'); // Returns '/Documents/file.txt'
 *
 * // Path traversal prevention
 * validatePath('/../../etc/passwd'); // Throws Error
 *
 * // Ensuring root prefix
 * validatePath('Documents/file.txt'); // Returns '/Documents/file.txt'
 * ```
 */
export function validatePath(path: string): string {
  // Normalize path separators and remove duplicate slashes
  let normalized = path.replace(/\\/g, '/').replace(/\/{2,}/g, '/');

  // Prevent path traversal attacks
  // Check for .. that would escape the root
  const pathParts = normalized.split('/').filter(p => p.length > 0);
  let depth = 0;

  for (const part of pathParts) {
    if (part === '..') {
      depth--;
      if (depth < 0) {
        throw new Error(`Invalid path "${path}": path traversal not allowed`);
      }
    } else if (part !== '.') {
      depth++;
    }
  }

  // Ensure path starts with /
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }

  // Remove trailing slash except for root
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

/**
 * Validates a repository ID format
 *
 * Seafile repository IDs are UUIDs in the standard format:
 * xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 *
 * @param repoId - The repository ID to validate
 * @returns true if valid
 * @throws {Error} If repoId is missing or doesn't match UUID format
 *
 * @example
 * ```typescript
 * // Valid UUID
 * validateRepoId('550e8400-e29b-41d4-a716-446655440000'); // Returns true
 *
 * // Invalid formats
 * validateRepoId('invalid'); // Throws Error
 * validateRepoId(''); // Throws Error
 * ```
 */
export function validateRepoId(repoId: string): boolean {
  // Basic UUID validation (accepts both standard and Seafile's format)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!repoId || typeof repoId !== 'string') {
    throw new Error('Repository ID is required');
  }

  if (!uuidRegex.test(repoId)) {
    throw new Error(`Invalid repository ID format: "${repoId}"`);
  }

  return true;
}

/**
 * Validates file content size
 *
 * Calculates the size of content considering base64 encoding if present.
 * Content starting with 'base64:' is decoded to get actual size.
 *
 * @param content - The content to validate (plain text or base64: prefixed)
 * @param maxSizeBytes - Maximum allowed size in bytes (default: 100MB = 104857600)
 * @returns Size in bytes
 * @throws {Error} If content exceeds the maximum size
 *
 * @example
 * ```typescript
 * // Plain text
 * const size = validateContentSize('Hello World', 1024);
 * console.log(size); // 11 bytes
 *
 * // Base64 encoded
 * const size = validateContentSize('base64:SGVsbG8gV29ybGQ=', 1024);
 * console.log(size); // 11 bytes (decoded size)
 *
 * // Exceeds limit
 * validateContentSize('x'.repeat(200), 100); // Throws Error
 * ```
 */
export function validateContentSize(
  content: string,
  maxSizeBytes: number = 100 * 1024 * 1024
): number {
  // Calculate approximate size
  const size = content.startsWith('base64:')
    ? Math.ceil((content.length - 7) * 0.75) // base64 decoded size
    : Buffer.byteLength(content, 'utf-8');

  if (size > maxSizeBytes) {
    throw new Error(
      `Content size ${formatBytes(size)} exceeds maximum of ${formatBytes(maxSizeBytes)}`
    );
  }

  return size;
}

/**
 * Formats bytes to human-readable string
 *
 * Converts a byte count into a readable format (Bytes, KB, MB, GB)
 * with 2 decimal places precision.
 *
 * @param bytes - Number of bytes to format
 * @returns Formatted string (e.g., "1.50 MB")
 *
 * @example
 * ```typescript
 * formatBytes(0); // '0 Bytes'
 * formatBytes(1024); // '1 KB'
 * formatBytes(1536000); // '1.46 MB'
 * ```
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validates email format for user sharing
 *
 * Uses a basic regex pattern to validate email addresses.
 * Pattern checks for: local-part@domain.tld
 *
 * @param email - Email address to validate
 * @returns true if valid
 * @throws {Error} If email is missing or doesn't match expected format
 *
 * @example
 * ```typescript
 * // Valid emails
 * validateEmail('user@example.com'); // Returns true
 * validateEmail('user.name+tag@example.co.uk'); // Returns true
 *
 * // Invalid emails
 * validateEmail('invalid'); // Throws Error
 * validateEmail(''); // Throws Error
 * ```
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailRegex.test(email)) {
    throw new Error(`Invalid email format: "${email}"`);
  }

  return true;
}
