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
$ProfilesDir = Join-Path $InstallDir "profiles"

# Config paths
$OpencodeConfig = Join-Path $XdgConfigHome "opencode\opencode.jsonc"
$ClaudeConfig = Join-Path $env:APPDATA "Claude\claude_desktop_config.json"
$EntryName = ""
$EntrySlug = ""
$EntryEnvPath = ""
$SeafileAuthMode = "repo-token"
$SeafileRepoId = ""

function Get-Slug($value) {
    return (($value.ToLower() -replace '[^a-z0-9]+', '-') -replace '^-+|-+$', '')
}

function Get-EnvPrefix($value) {
    return (($value.ToUpper() -replace '[^A-Z0-9]+', '_') -replace '^_+|_+$', '')
}

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
    New-Item -ItemType Directory -Force -Path $ProfilesDir | Out-Null
    New-Item -ItemType Directory -Force -Path (Split-Path $OpencodeConfig -Parent) | Out-Null
    
    Print-Success "Created directories at $InstallDir"
}

function Clone-Or-Update-Repo {
    Print-Info "Installing Seafile MCP server..."
    
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    
    if (Test-Path (Join-Path $scriptDir ".git") -and (Test-Path (Join-Path $scriptDir "package.json"))) {
        Print-Info "Using local repository at $scriptDir"
        
        if ($scriptDir -ne $InstallDir -and (Test-Path $InstallDir)) {
            Print-Info "Cleaning up existing install directory..."
            Remove-Item -Recurse -Force $InstallDir
        }
        
        if ($scriptDir -ne $InstallDir) {
            $null = New-Item -ItemType Directory -Force -Path (Split-Path $InstallDir -Parent)
            cmd /c "mklink /J `"$InstallDir`" `"$scriptDir`"" 2>$null
        }
        Set-Location $InstallDir
    } elseif (Test-Path (Join-Path $InstallDir ".git")) {
        Print-Info "Existing installation found, updating..."
        Set-Location $InstallDir
        git pull --quiet
    } elseif (Test-Path (Join-Path $InstallDir "package.json")) {
        Print-Info "Using existing installation at $InstallDir"
        Set-Location $InstallDir
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
        $script:EntryName = Read-Host "Enter a name for this MCP entry (e.g., seafile-vibes)"
        if ([string]::IsNullOrWhiteSpace($script:EntryName)) {
            Print-Error "Entry name cannot be empty"
        }
    } while ([string]::IsNullOrWhiteSpace($script:EntryName))

    $script:EntrySlug = Get-Slug $script:EntryName
    if ([string]::IsNullOrWhiteSpace($script:EntrySlug)) {
        Print-Error "Entry name must contain letters or numbers"
        exit 1
    }
    $script:EntryEnvPath = Join-Path $ProfilesDir "$EntrySlug.env"
    
    do {
        $seafileUrl = Read-Host "Enter your Seafile server URL (e.g., https://seafile.example.com)"
        if ([string]::IsNullOrWhiteSpace($seafileUrl)) {
            Print-Error "Seafile URL cannot be empty"
        }
    } while ([string]::IsNullOrWhiteSpace($seafileUrl))
    
    do {
        Write-Host "Select auth mode:"
        Write-Host "  1. Repo token"
        Write-Host "  2. Account token"
        $authChoice = Read-Host "Enter choice [1-2]"
        $script:SeafileAuthMode = if ($authChoice -eq '2') { 'account-token' } else { 'repo-token' }
    } while ($false)

    do {
        $tokenPrompt = if ($script:SeafileAuthMode -eq 'account-token') { 'Enter your Seafile account token' } else { 'Enter your Seafile repo API token' }
        $seafileToken = Read-Host $tokenPrompt
        if ([string]::IsNullOrWhiteSpace($seafileToken)) {
            Print-Error "Token cannot be empty"
        }
    } while ([string]::IsNullOrWhiteSpace($seafileToken))

    if ($script:SeafileAuthMode -eq 'account-token') {
        do {
            $script:SeafileRepoId = Read-Host "Enter the Seafile repo ID to scope this entry"
            if ([string]::IsNullOrWhiteSpace($script:SeafileRepoId)) {
                Print-Error "Repo ID cannot be empty in account-token mode"
            }
        } while ([string]::IsNullOrWhiteSpace($script:SeafileRepoId))
    }
    
    $envContent = @"
SEAFILE_URL=$seafileUrl
SEAFILE_TOKEN=$seafileToken
SEAFILE_AUTH_MODE=$script:SeafileAuthMode
"@

    if (-not [string]::IsNullOrWhiteSpace($script:SeafileRepoId)) {
        $envContent += "`nSEAFILE_REPO_ID=$script:SeafileRepoId"
    }
    
    $envContent | Set-Content $script:EntryEnvPath -Encoding UTF8
    
    Print-Success "Configuration saved to $script:EntryEnvPath"
    
    # Clear sensitive variable
    $tokenPlain = $null
}

function Configure-Opencode {
    Print-Info "Configuring OpenCode..."
    
    $escapedInstallDir = $InstallDir.Replace('\', '\\')
    
    try {
        Push-Location $InstallDir
        npx -y tsx scripts/setup-mcp.ts opencode "$InstallDir" "$OpencodeConfig" "$EntryName" "$EntryEnvPath"
        if ($LASTEXITCODE -eq 0) {
            Print-Success "OpenCode configured successfully"
            
            Print-Info "Adding environment variables to PowerShell profile..."
            
            $shellProfile = $PROFILE
            $envPrefix = Get-EnvPrefix $EntryName
            $marker = "# SEAFILE_MCP_SERVER_$envPrefix"
            $envBlock = @"
$marker
`$env:SEAFILE_${envPrefix}_URL = (Get-Content "$EntryEnvPath" | Select-String '^SEAFILE_URL=') -replace 'SEAFILE_URL=', ''
`$env:SEAFILE_${envPrefix}_TOKEN = (Get-Content "$EntryEnvPath" | Select-String '^SEAFILE_TOKEN=') -replace 'SEAFILE_TOKEN=', ''
`$env:SEAFILE_${envPrefix}_AUTH_MODE = (Get-Content "$EntryEnvPath" | Select-String '^SEAFILE_AUTH_MODE=') -replace 'SEAFILE_AUTH_MODE=', ''
`$env:SEAFILE_${envPrefix}_REPO_ID = (Get-Content "$EntryEnvPath" | Select-String '^SEAFILE_REPO_ID=') -replace 'SEAFILE_REPO_ID=', ''
"@
            
            if (-not (Test-Path $shellProfile)) {
                New-Item -ItemType File -Path $shellProfile -Force | Out-Null
            }
            
            if (-not (Select-String -Path $shellProfile -Pattern [regex]::Escape($marker) -Quiet)) {
                Add-Content -Path $shellProfile -Value "`n$envBlock"
                Print-Success "Added env export to $shellProfile"
                Print-Info "Run 'Reload-Profile' or restart your terminal to apply"
            } else {
                Print-Info "Env export already exists in $shellProfile"
            }
        } else {
            throw "Setup script failed"
        }
        Pop-Location
    } catch {
        Pop-Location | Out-Null
        Print-Error "Failed to auto-configure OpenCode"
        Write-Host ""
        Print-Warning "Manual configuration required:"
        Write-Host "Add the following to your opencode.jsonc file:"
        $envPrefix = Get-EnvPrefix $EntryName
        Write-Host @"
{
  "mcp": {
    "$EntryName": {
      "type": "local",
      "command": ["node", "$escapedInstallDir\dist\src\index.js"],
      "environment": {
        "SEAFILE_URL": "{env:SEAFILE_${envPrefix}_URL}",
        "SEAFILE_TOKEN": "{env:SEAFILE_${envPrefix}_TOKEN}",
        "SEAFILE_AUTH_MODE": "{env:SEAFILE_${envPrefix}_AUTH_MODE}",
        "SEAFILE_REPO_ID": "{env:SEAFILE_${envPrefix}_REPO_ID}"
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
    
    $escapedInstallDir = $InstallDir.Replace('\', '\\')
    
    try {
        Push-Location $InstallDir
        npx -y tsx scripts/setup-mcp.ts claude "$InstallDir" "$ClaudeConfig" "$EntryName" "$EntryEnvPath"
        if ($LASTEXITCODE -eq 0) {
            Print-Success "Claude Code configured successfully"
        } else {
            throw "Setup script failed"
        }
        Pop-Location
    } catch {
        Pop-Location | Out-Null
        Print-Error "Failed to auto-configure Claude Code"
        Write-Host ""
        Print-Warning "Manual configuration required:"
        Write-Host "Add the following to your claude_desktop_config.json file:"
        $entryEnv = @{}
        Get-Content $EntryEnvPath | ForEach-Object {
            if ($_ -match '^(?<key>[^=]+)=(?<value>.*)$') { $entryEnv[$matches.key] = $matches.value }
        }
        Write-Host @"
{
  "mcpServers": {
    "$EntryName": {
      "command": "node",
      "args": ["$escapedInstallDir\dist\src\index.js"],
      "env": {
        "SEAFILE_URL": "$($entryEnv['SEAFILE_URL'])",
        "SEAFILE_TOKEN": "$($entryEnv['SEAFILE_TOKEN'])",
        "SEAFILE_AUTH_MODE": "$($entryEnv['SEAFILE_AUTH_MODE'])",
        "SEAFILE_REPO_ID": "$($entryEnv['SEAFILE_REPO_ID'])"
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
    Write-Host "Which MCP client should be configured?"
    Write-Host "  1. OpenCode MCP"
    Write-Host "  2. Claude Code MCP"
    Write-Host "  3. Both"
    Write-Host ""
    $choice = Read-Host "Enter choice [1-3]"
    
    switch ($choice) {
        '1' { Configure-Opencode }
        '2' { Configure-Claude }
        '3' { 
            Configure-Opencode
            Configure-Claude
        }
        default { Print-Error "Invalid choice" }
    }
}

function Print-Summary {
    Write-Host ""
    Write-Host "$Green========================================$Reset"
    Write-Host "$Green  Installation Complete!$Reset"
    Write-Host "$Green========================================$Reset"
    Write-Host ""
    Write-Host "$Blue Installation directory:$Reset $InstallDir"
    Write-Host "$Blue Profile file:$Reset $EntryEnvPath"
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
    Write-Host "To add another named MCP entry later, re-run this installer."
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
