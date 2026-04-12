#!/usr/bin/env pwsh
#Requires -Version 5.1

<#
.SYNOPSIS
    Seafile MCP Server Installer for Windows
.DESCRIPTION
    Installs Seafile MCP server and configures MCP clients
#>

# Error handling
$ErrorActionPreference = "Stop"

# Colors
$Red = "\033[31m"
$Green = "\033[32m"
$Yellow = "\033[33m"
$Blue = "\033[34m"
$Reset = "\033[0m"

# XDG paths
$XdgDataHome = if ($env:XDG_DATA_HOME) { $env:XDG_DATA_HOME } else { "$env:LOCALAPPDATA" }
$XdgConfigHome = if ($env:XDG_CONFIG_HOME) { $env:XDG_CONFIG_HOME } else { "$env:APPDATA" }
$InstallDir = Join-Path $XdgDataHome "seafile-mcp-server"
$BackupDir = Join-Path $InstallDir "backups"

# Config paths
$OpencodeConfig = Join-Path $XdgConfigHome "opencode\opencode.jsonc"
$ClaudeConfig = Join-Path $env:APPDATA "Claude\claude_desktop_config.json"

function Print-Banner {
    Write-Host ""
    Write-Host "$Blue========================================$Reset"
    Write-Host "$Blue  Seafile MCP Server Installer$Reset"
    Write-Host "$Blue========================================$Reset"
    Write-Host ""
}

function Print-Success($message) {
    Write-Host "$Green✓$Reset $message"
}

function Print-Error($message) {
    Write-Host "$Red✗$Reset $message"
}

function Print-Info($message) {
    Write-Host "$Blueℹ$Reset $message"
}

function Print-Warning($message) {
    Write-Host "$Yellow⚠$Reset $message"
}

function Detect-Platform {
    Print-Info "Detected platform: Windows"
}

function Check-Prerequisites {
    Print-Info "Checking prerequisites..."
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        $versionNumber = [int]($nodeVersion -replace 'v', '').Split('.')[0]
        if ($versionNumber -lt 20) {
            Print-Error "Node.js version $versionNumber is too old. Please upgrade to Node.js 20+"
            exit 1
        }
        Print-Success "Node.js $nodeVersion installed"
    } catch {
        Print-Error "Node.js is not installed. Please install Node.js 20+ from https://nodejs.org/"
        exit 1
    }
    
    # Check npm
    try {
        $npmVersion = npm --version
        Print-Success "npm $npmVersion installed"
    } catch {
        Print-Error "npm is not installed"
        exit 1
    }
    
    # Check git
    try {
        $null = git --version
        Print-Success "git installed"
    } catch {
        Print-Error "git is not installed"
        exit 1
    }
}

function Setup-Directories {
    Print-Info "Setting up directories..."
    
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
    New-Item -ItemType Directory -Force -Path (Split-Path $OpencodeConfig -Parent) | Out-Null
    
    Print-Success "Created directories at $InstallDir"
}

function Clone-Or-Update-Repo {
    Print-Info "Installing Seafile MCP server..."
    
    if (Test-Path (Join-Path $InstallDir ".git")) {
        Print-Info "Existing installation found, updating..."
        Set-Location $InstallDir
        git pull --quiet
    } else {
        $repoUrl = if ($env:REPO_URL) { $env:REPO_URL } else { "https://github.com/user/seafile-mcp-server.git" }
        git clone --quiet $repoUrl $InstallDir
        Set-Location $InstallDir
    }
    
    npm install --quiet | Out-Null
    npm run build | Out-Null
    
    Print-Success "Seafile MCP server installed and built"
}

function Prompt-For-Env {
    Print-Info "Configuration"
    Write-Host ""
    
    do {
        $seafileUrl = Read-Host "Enter your Seafile server URL (e.g., https://seafile.example.com)"
        if ([string]::IsNullOrWhiteSpace($seafileUrl)) {
            Print-Error "Seafile URL cannot be empty"
        }
    } while ([string]::IsNullOrWhiteSpace($seafileUrl))
    
    do {
        $seafileToken = Read-Host "Enter your Seafile API token" -AsSecureString
        $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($seafileToken)
        $tokenPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
        
        if ([string]::IsNullOrWhiteSpace($tokenPlain)) {
            Print-Error "API token cannot be empty"
        }
    } while ([string]::IsNullOrWhiteSpace($tokenPlain))
    
    # Save to .env
    $envContent = @"
SEAFILE_URL=$seafileUrl
SEAFILE_TOKEN=$tokenPlain
"@
    
    $envContent | Set-Content (Join-Path $InstallDir ".env") -Encoding UTF8
    
    Print-Success "Configuration saved to $InstallDir\.env"
    
    # Clear sensitive variable
    $tokenPlain = $null
}

function Configure-Opencode {
    Print-Info "Configuring OpenCode..."
    
    $escapedInstallDir = $InstallDir.Replace('\', '\\')
    
    try {
        $result = node (Join-Path $InstallDir "scripts\setup-mcp.js") opencode "$InstallDir" "$OpencodeConfig"
        if ($LASTEXITCODE -eq 0) {
            Print-Success "OpenCode configured successfully"
        } else {
            throw "Setup script failed"
        }
    } catch {
        Print-Error "Failed to auto-configure OpenCode"
        Write-Host ""
        Print-Warning "Manual configuration required:"
        Write-Host "Add the following to your opencode.jsonc file:"
        Write-Host @"
{
  "mcp": {
    "seafile": {
      "type": "local",
      "command": ["node", "$escapedInstallDir\dist\index.js"],
      "environment": {
        "SEAFILE_URL": "{env:SEAFILE_URL}",
        "SEAFILE_TOKEN": "{env:SEAFILE_TOKEN}"
      }
    }
  }
}
"@
        Write-Host ""
        Write-Host "Config location: $OpencodeConfig"
    }
}

function Configure-Claude {
    Print-Info "Configuring Claude Code..."
    
    # Read values from .env for the snippet
    $envContent = Get-Content (Join-Path $InstallDir ".env") -Raw
    $seafileUrl = ($envContent | Select-String "SEAFILE_URL=(.+)") -replace "SEAFILE_URL=", "" -replace "`r`n", ""
    $seafileToken = ($envContent | Select-String "SEAFILE_TOKEN=(.+)") -replace "SEAFILE_TOKEN=", "" -replace "`r`n", ""
    $escapedInstallDir = $InstallDir.Replace('\', '\\')
    
    try {
        $result = node (Join-Path $InstallDir "scripts\setup-mcp.js") claude "$InstallDir" "$ClaudeConfig"
        if ($LASTEXITCODE -eq 0) {
            Print-Success "Claude Code configured successfully"
        } else {
            throw "Setup script failed"
        }
    } catch {
        Print-Error "Failed to auto-configure Claude Code"
        Write-Host ""
        Print-Warning "Manual configuration required:"
        Write-Host "Add the following to your claude_desktop_config.json file:"
        Write-Host @"
{
  "mcpServers": {
    "seafile": {
      "command": "node",
      "args": ["$escapedInstallDir\dist\index.js"],
      "env": {
        "SEAFILE_URL": "$seafileUrl",
        "SEAFILE_TOKEN": "$seafileToken"
      }
    }
  }
}
"@
        Write-Host ""
        Write-Host "Config location: $ClaudeConfig"
    }
}

function Ask-Config-Questions {
    Write-Host ""
    $configureOpencode = Read-Host "Configure OpenCode MCP? [Y/n]"
    if ($configureOpencode -ne 'n' -and $configureOpencode -ne 'N') {
        Configure-Opencode
    }
    
    $configureClaude = Read-Host "Configure Claude Code MCP? [Y/n]"
    if ($configureClaude -ne 'n' -and $configureClaude -ne 'N') {
        Configure-Claude
    }
}

function Print-Summary {
    Write-Host ""
    Write-Host "$Green========================================$Reset"
    Write-Host "$Green  Installation Complete!$Reset"
    Write-Host "$Green========================================$Reset"
    Write-Host ""
    Write-Host "$Blue Installation directory:$Reset $InstallDir"
    Write-Host "$Blue Configuration file:$Reset $InstallDir\.env"
    Write-Host ""
    Write-Host "To start the server:"
    Write-Host "  cd '$InstallDir' ; npm run start"
    Write-Host ""
    Write-Host "To test with MCP Inspector:"
    Write-Host "  cd '$InstallDir' ; npm run inspect"
    Write-Host ""
    Write-Host "To update (when available):"
    Write-Host "  cd '$InstallDir' ; git pull ; npm install ; npm run build"
    Write-Host ""
    Print-Warning "Remember to restart your MCP client (OpenCode/Claude) for changes to take effect."
    Write-Host ""
}

# Main execution
Print-Banner
Detect-Platform
Check-Prerequisites
Setup-Directories
Clone-Or-Update-Repo
Prompt-For-Env
Ask-Config-Questions
Print-Summary