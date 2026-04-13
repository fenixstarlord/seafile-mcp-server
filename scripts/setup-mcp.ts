#!/usr/bin/env node
/**
 * Cross-platform MCP configuration setup script
 * Usage: npx tsx scripts/setup-mcp.ts <client> <install-dir> <config-path>
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CLIENT = process.argv[2];
const INSTALL_DIR = process.argv[3];
const CONFIG_PATH = process.argv[4];

if (!CLIENT || !INSTALL_DIR || !CONFIG_PATH) {
  console.error('Usage: npx tsx scripts/setup-mcp.ts <client> <install-dir> <config-path>');
  console.error('  client: opencode | claude');
  process.exit(1);
}

interface OpencodeConfig {
  mcp?: {
    seafile?: {
      type: string;
      command: string[];
      environment: Record<string, string>;
    };
  };
  [key: string]: unknown;
}

interface ClaudeConfig {
  mcpServers?: {
    seafile?: {
      command: string;
      args: string[];
      env: Record<string, string>;
    };
  };
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
    throw new Error('.env file not found');
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('='); // Handle values that contain =
    if (key && value !== undefined) {
      env[key.trim()] = value.trim();
    }
  });

  return env;
}

function setupOpencodeConfig(): boolean {
  const seafileEntry = {
    type: 'local',
    command: ['node', path.join(INSTALL_DIR, 'dist', 'src', 'index.js')],
    environment: {
      SEAFILE_URL: '{env:SEAFILE_URL}',
      SEAFILE_TOKEN: '{env:SEAFILE_TOKEN}',
    },
  };

  let config: OpencodeConfig = {};

  if (fs.existsSync(CONFIG_PATH)) {
    const content = fs.readFileSync(CONFIG_PATH, 'utf8');
    // Remove comments (simple approach for JSONC)
    const cleaned = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

    if (validateJson(cleaned)) {
      config = JSON.parse(cleaned) as OpencodeConfig;
    } else {
      throw new Error('Invalid JSON in existing config');
    }

    // Backup existing config
    const backupPath = getBackupPath(CONFIG_PATH);
    fs.copyFileSync(CONFIG_PATH, backupPath);
    console.log(`Backed up existing config to: ${backupPath}`);
  }

  // Ensure mcp section exists
  if (!config.mcp) {
    config.mcp = {};
  }

  // Check if seafile already exists
  if (config.mcp.seafile) {
    console.log('Seafile MCP configuration already exists, updating...');
  }

  config.mcp.seafile = seafileEntry;

  // Write config (preserve JSONC if comments existed)
  const output = JSON.stringify(config, null, 2);
  fs.writeFileSync(CONFIG_PATH, output);
  console.log(`Updated: ${CONFIG_PATH}`);

  return true;
}

function setupClaudeConfig(): boolean {
  // Read values from .env file
  const envPath = path.join(INSTALL_DIR, '.env');
  const env = loadEnvFile(envPath);

  const seafileEntry = {
    command: 'node',
    args: [path.join(INSTALL_DIR, 'dist', 'src', 'index.js').replace(/\\/g, '/')],
    env: {
      SEAFILE_URL: env.SEAFILE_URL || '',
      SEAFILE_TOKEN: env.SEAFILE_TOKEN || '',
    },
  };

  let config: ClaudeConfig = { mcpServers: {} };

  if (fs.existsSync(CONFIG_PATH)) {
    const content = fs.readFileSync(CONFIG_PATH, 'utf8');

    if (validateJson(content)) {
      config = JSON.parse(content) as ClaudeConfig;
    } else {
      throw new Error('Invalid JSON in existing config');
    }

    // Backup existing config
    const backupPath = getBackupPath(CONFIG_PATH);
    fs.copyFileSync(CONFIG_PATH, backupPath);
    console.log(`Backed up existing config to: ${backupPath}`);
  }

  // Ensure mcpServers section exists
  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  // Check if seafile already exists
  if (config.mcpServers.seafile) {
    console.log('Seafile MCP configuration already exists, updating...');
  }

  config.mcpServers.seafile = seafileEntry;

  // Write config
  const output = JSON.stringify(config, null, 2);
  fs.writeFileSync(CONFIG_PATH, output);
  console.log(`Updated: ${CONFIG_PATH}`);

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
