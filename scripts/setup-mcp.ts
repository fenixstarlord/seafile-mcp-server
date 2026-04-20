#!/usr/bin/env node
/**
 * Cross-platform MCP configuration setup script
 * Usage: npx tsx scripts/setup-mcp.ts <client> <install-dir> <config-path> <entry-name> <env-path>
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CLIENT = process.argv[2];
const INSTALL_DIR = process.argv[3];
const CONFIG_PATH = process.argv[4];
const ENTRY_NAME = process.argv[5];
const ENV_PATH = process.argv[6];

if (!CLIENT || !INSTALL_DIR || !CONFIG_PATH || !ENTRY_NAME || !ENV_PATH) {
  console.error(
    'Usage: npx tsx scripts/setup-mcp.ts <client> <install-dir> <config-path> <entry-name> <env-path>'
  );
  console.error('  client: opencode | claude');
  process.exit(1);
}

interface OpencodeConfig {
  mcp?: Record<
    string,
    {
      type: string;
      command: string[];
      environment: Record<string, string>;
    }
  >;
  [key: string]: unknown;
}

interface ClaudeConfig {
  mcpServers?: Record<
    string,
    {
      command: string;
      args: string[];
      env: Record<string, string>;
    }
  >;
  [key: string]: unknown;
}

function getBackupPath(configPath: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupDir = path.join(
    process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local/share'),
    'seafile-mcp-server/backups'
  );

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  return path.join(backupDir, `${path.basename(configPath)}.backup-${timestamp}`);
}

function validateJson(jsonString: string): boolean {
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
}

function loadEnvFile(envPath: string): Record<string, string> {
  const env: Record<string, string> = {};

  if (!fs.existsSync(envPath)) {
    throw new Error(`Env file not found: ${envPath}`);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=');
    if (key && value !== undefined) {
      env[key.trim()] = value.trim();
    }
  });

  return env;
}

function sanitizeEnvPrefix(name: string): string {
  return name.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
}

function readOrInitJson<T extends object>(configPath: string, fallback: T, isJsonc = false): T {
  if (!fs.existsSync(configPath)) {
    return fallback;
  }

  const content = fs.readFileSync(configPath, 'utf8');
  const cleaned = isJsonc
    ? content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
    : content;

  if (!validateJson(cleaned)) {
    throw new Error(`Invalid JSON in existing config: ${configPath}`);
  }

  const backupPath = getBackupPath(configPath);
  fs.copyFileSync(configPath, backupPath);
  console.log(`Backed up existing config to: ${backupPath}`);

  return JSON.parse(cleaned) as T;
}

function setupOpencodeConfig(): boolean {
  const envPrefix = sanitizeEnvPrefix(ENTRY_NAME);
  const config = readOrInitJson<OpencodeConfig>(CONFIG_PATH, {}, true);

  if (!config.mcp) {
    config.mcp = {};
  }

  config.mcp[ENTRY_NAME] = {
    type: 'local',
    command: ['node', path.join(INSTALL_DIR, 'dist', 'src', 'index.js')],
    environment: {
      SEAFILE_URL: `{env:SEAFILE_${envPrefix}_URL}`,
      SEAFILE_TOKEN: `{env:SEAFILE_${envPrefix}_TOKEN}`,
      SEAFILE_AUTH_MODE: `{env:SEAFILE_${envPrefix}_AUTH_MODE}`,
      SEAFILE_REPO_ID: `{env:SEAFILE_${envPrefix}_REPO_ID}`,
    },
  };

  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log(`Updated OpenCode MCP entry '${ENTRY_NAME}' in: ${CONFIG_PATH}`);
  return true;
}

function setupClaudeConfig(): boolean {
  const env = loadEnvFile(ENV_PATH);
  const config = readOrInitJson<ClaudeConfig>(CONFIG_PATH, { mcpServers: {} });

  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  const entryEnv: Record<string, string> = {
    SEAFILE_URL: env.SEAFILE_URL || '',
    SEAFILE_TOKEN: env.SEAFILE_TOKEN || '',
    SEAFILE_AUTH_MODE: env.SEAFILE_AUTH_MODE || 'repo-token',
  };

  if (env.SEAFILE_REPO_ID) {
    entryEnv.SEAFILE_REPO_ID = env.SEAFILE_REPO_ID;
  }

  config.mcpServers[ENTRY_NAME] = {
    command: 'node',
    args: [path.join(INSTALL_DIR, 'dist', 'src', 'index.js').replace(/\\/g, '/')],
    env: entryEnv,
  };

  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log(`Updated Claude MCP entry '${ENTRY_NAME}' in: ${CONFIG_PATH}`);
  return true;
}

try {
  switch (CLIENT) {
    case 'opencode':
      process.exit(setupOpencodeConfig() ? 0 : 1);
    case 'claude':
      process.exit(setupClaudeConfig() ? 0 : 1);
    default:
      console.error(`Unknown client: ${CLIENT}`);
      process.exit(1);
  }
} catch (error) {
  if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
  } else {
    console.error('An unknown error occurred');
  }
  process.exit(1);
}
