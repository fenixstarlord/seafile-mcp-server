#!/usr/bin/env node
/**
 * Cross-platform MCP configuration setup script
 * Usage: node setup-mcp.js <client> <install-dir> <config-path>
 */

const fs = require('fs');
const path = require('path');

const CLIENT = process.argv[2];
const INSTALL_DIR = process.argv[3];
const CONFIG_PATH = process.argv[4];

if (!CLIENT || !INSTALL_DIR || !CONFIG_PATH) {
    console.error('Usage: node setup-mcp.js <client> <install-dir> <config-path>');
    console.error('  client: opencode | claude');
    process.exit(1);
}

function getBackupPath(configPath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupDir = path.join(process.env.XDG_DATA_HOME || path.join(require('os').homedir(), '.local/share'), 'seafile-mcp-server/backups');
    
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    
    return path.join(backupDir, `${path.basename(configPath)}.backup-${timestamp}`);
}

function validateJson(jsonString) {
    try {
        JSON.parse(jsonString);
        return true;
    } catch (e) {
        return false;
    }
}

function setupOpencodeConfig() {
    const escapedPath = INSTALL_DIR.replace(/\\/g, '\\\\');
    
    const seafileEntry = {
        type: 'local',
        command: ['node', path.join(INSTALL_DIR, 'dist', 'index.js')],
        environment: {
            SEAFILE_URL: '{env:SEAFILE_URL}',
            SEAFILE_TOKEN: '{env:SEAFILE_TOKEN}'
        }
    };
    
    let config = {};
    
    if (fs.existsSync(CONFIG_PATH)) {
        const content = fs.readFileSync(CONFIG_PATH, 'utf8');
        // Remove comments (simple approach for JSONC)
        const cleaned = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
        
        if (validateJson(cleaned)) {
            config = JSON.parse(cleaned);
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

function setupClaudeConfig() {
    // Read values from .env file
    const envPath = path.join(INSTALL_DIR, '.env');
    if (!fs.existsSync(envPath)) {
        throw new Error('.env file not found');
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            env[key.trim()] = value.trim();
        }
    });
    
    const escapedPath = INSTALL_DIR.replace(/\\/g, '/');
    
    const seafileEntry = {
        command: 'node',
        args: [path.join(INSTALL_DIR, 'dist', 'index.js').replace(/\\/g, '/')],
        env: {
            SEAFILE_URL: env.SEAFILE_URL,
            SEAFILE_TOKEN: env.SEAFILE_TOKEN
        }
    };
    
    let config = { mcpServers: {} };
    
    if (fs.existsSync(CONFIG_PATH)) {
        const content = fs.readFileSync(CONFIG_PATH, 'utf8');
        
        if (validateJson(content)) {
            config = JSON.parse(content);
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
    console.error(`Error: ${error.message}`);
    process.exit(1);
}