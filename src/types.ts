import { z } from 'zod';

export const SEAFILE_URL = process.env.SEAFILE_URL || '';
export const SEAFILE_TOKEN = process.env.SEAFILE_TOKEN || '';

export const RepoIdSchema = z.string().describe('Repository ID');
export const PathSchema = z.string().describe('File or directory path (e.g. /Documents/report.txt)');
export const ParentPathSchema = z.string().describe('Parent directory path (e.g. /Documents)').default('/');
export const FilenameSchema = z.string().describe('Filename (e.g. report.txt)');

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