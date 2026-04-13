import { z } from 'zod';

/**
 * Configuration schema using Zod for environment variable validation
 * @property SEAFILE_URL - The Seafile server URL (must be a valid URL)
 * @property SEAFILE_TOKEN - The repo API token for Seafile library access
 */
const ConfigSchema = z.object({
  SEAFILE_URL: z.string().url().min(1),
  SEAFILE_TOKEN: z.string().min(1),
});

/**
 * Inferred TypeScript type from the ConfigSchema
 * Represents the validated configuration object
 */
export type Config = z.infer<typeof ConfigSchema>;

/**
 * Loads and validates configuration from environment variables
 * Reads SEAFILE_URL and SEAFILE_TOKEN from process.env, trims whitespace,
 * and validates against the ConfigSchema using Zod.
 *
 * @returns Validated configuration object with SEAFILE_URL and SEAFILE_TOKEN
 * @throws {ConfigError} If validation fails (missing or invalid environment variables)
 *
 * @example
 * ```typescript
 * const config = loadConfig();
 * console.log(config.SEAFILE_URL); // 'https://seafile.example.com'
 * ```
 */
export function loadConfig(): Config {
  const url = process.env.SEAFILE_URL?.trim();
  const token = process.env.SEAFILE_TOKEN?.trim();

  const result = ConfigSchema.safeParse({
    SEAFILE_URL: url,
    SEAFILE_TOKEN: token,
  });

  if (!result.success) {
    const issues = result.error.issues.map(i => i.message).join(', ');
    throw new ConfigError(`Configuration error: ${issues}`);
  }

  return result.data;
}

/**
 * Custom error class for configuration errors
 * Extends Error and sets the name property to 'ConfigError' for easy identification
 *
 * @example
 * ```typescript
 * try {
 *   const config = loadConfig();
 * } catch (error) {
 *   if (error instanceof ConfigError) {
 *     console.error('Config issue:', error.message);
 *   }
 * }
 * ```
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Repository information interface
 * Represents a Seafile library/repository with its metadata
 *
 * @property id - Unique repository ID (UUID format)
 * @property name - Display name of the repository
 * @property desc - Description of the repository
 * @property owner - Username of the repository owner
 * @property modified - ISO 8601 timestamp of last modification
 * @property size - Total size in bytes
 */
export interface RepoInfo {
  id: string;
  name: string;
  desc: string;
  owner: string;
  modified: string;
  size: number;
}

/**
 * Directory entry interface
 * Represents a file or directory within a Seafile repository
 *
 * @property id - Unique entry ID
 * @property type - Entry type: 'file' or 'dir'
 * @property name - Entry name
 * @property size - Size in bytes (0 for directories)
 * @property modified - ISO 8601 timestamp of last modification (optional)
 * @property starred - Whether the item is starred (optional)
 */
export interface DirEntry {
  id: string;
  type: 'file' | 'dir';
  name: string;
  size: number;
  modified?: string;
  starred?: boolean;
}

/**
 * File detail interface
 * Represents detailed metadata for a specific file
 *
 * @property id - Unique file ID
 * @property name - File name
 * @property size - Size in bytes
 * @property modified - ISO 8601 timestamp of last modification
 * @property type - MIME type or file type string
 * @property parent_dir - Parent directory path
 * @property starred - Whether the file is starred (optional)
 */
export interface FileDetail {
  id: string;
  name: string;
  size: number;
  modified: string;
  type: string;
  parent_dir: string;
  starred?: boolean;
}

/**
 * Zod schema for repository ID validation
 * Used for tool input validation
 */
export const RepoIdSchema = z.string().describe('Repository ID');

/**
 * Zod schema for file/directory path validation
 * Used for tool input validation
 * Example: /Documents/report.txt
 */
export const PathSchema = z
  .string()
  .describe('File or directory path (e.g. /Documents/report.txt)');

/**
 * Zod schema for parent directory path validation
 * Used for tool input validation for upload operations
 * Defaults to root path '/'
 * Example: /Documents
 */
export const ParentPathSchema = z
  .string()
  .describe('Parent directory path (e.g. /Documents)')
  .default('/');

/**
 * Zod schema for filename validation
 * Used for tool input validation for file operations
 * Example: report.txt
 */
export const FilenameSchema = z.string().describe('Filename (e.g. report.txt)');
