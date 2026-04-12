import { z } from 'zod';

// Configuration schema
const ConfigSchema = z.object({
  SEAFILE_URL: z.string().url().min(1),
  SEAFILE_TOKEN: z.string().min(1),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Loads and validates configuration from environment variables
 * @throws ConfigError if validation fails
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
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

// Re-export types for convenience
export interface RepoInfo {
  id: string;
  name: string;
  desc: string;
  owner: string;
  modified: string;
  size: number;
}

export interface DirEntry {
  id: string;
  type: 'file' | 'dir';
  name: string;
  size: number;
  modified?: string;
  starred?: boolean;
}

export interface FileDetail {
  id: string;
  name: string;
  size: number;
  modified: string;
  type: string;
  parent_dir: string;
  starred?: boolean;
}

// Zod schemas for tool inputs
export const RepoIdSchema = z.string().describe('Repository ID');
export const PathSchema = z.string().describe('File or directory path (e.g. /Documents/report.txt)');
export const ParentPathSchema = z.string().describe('Parent directory path (e.g. /Documents)').default('/');
export const FilenameSchema = z.string().describe('Filename (e.g. report.txt)');