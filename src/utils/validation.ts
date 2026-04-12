/**
 * Validation utilities for Seafile MCP Server
 */

/**
 * Validates and sanitizes a file/directory path
 * - Normalizes path separators
 * - Prevents path traversal attacks (../)
 * - Ensures path starts with /
 * 
 * @param path - The path to validate
 * @returns Sanitized path
 * @throws Error if path contains traversal attempts
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
 * Seafile repo IDs are typically UUIDs
 * 
 * @param repoId - The repository ID to validate
 * @returns true if valid
 * @throws Error if invalid format
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
 * @param content - The content to validate
 * @param maxSizeBytes - Maximum allowed size (default: 100MB)
 * @returns Size in bytes
 * @throws Error if content exceeds max size
 */
export function validateContentSize(content: string, maxSizeBytes: number = 100 * 1024 * 1024): number {
  // Calculate approximate size
  const size = content.startsWith('base64:')
    ? Math.ceil((content.length - 7) * 0.75)  // base64 decoded size
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
 * @param email - Email to validate
 * @returns true if valid
 * @throws Error if invalid
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || !emailRegex.test(email)) {
    throw new Error(`Invalid email format: "${email}"`);
  }
  
  return true;
}