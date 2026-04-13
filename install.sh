#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# XDG paths
XDG_DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
INSTALL_DIR="$XDG_DATA_HOME/seafile-mcp-server"
BACKUP_DIR="$INSTALL_DIR/backups"

# Config paths
OPENCODE_CONFIG="$XDG_CONFIG_HOME/opencode/opencode.jsonc"
CLAUDE_CONFIG=""

print_banner() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Seafile MCP Server Installer${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

detect_platform() {
    local unameOut="$(uname -s)"
    case "${unameOut}" in
        Linux*)     PLATFORM=Linux;;
        Darwin*)    PLATFORM=Mac;;
        *)          PLATFORM="UNKNOWN:${unameOut}"
    esac
    
    # Detect WSL
    if [[ "$PLATFORM" == "Linux" ]] && grep -qE "(Microsoft|WSL)" /proc/version 2>/dev/null; then
        PLATFORM="Linux"
    fi
    
    print_info "Detected platform: $PLATFORM"
}

check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 20+ from https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        print_error "Node.js version $NODE_VERSION is too old. Please upgrade to Node.js 20+"
        exit 1
    fi
    print_success "Node.js $(node --version) installed"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    print_success "npm $(npm --version) installed"
    
    # Check git
    if ! command -v git &> /dev/null; then
        print_error "git is not installed"
        exit 1
    fi
    print_success "git installed"
}

setup_directories() {
    print_info "Setting up directories..."
    
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$XDG_CONFIG_HOME/opencode"
    
    print_success "Created directories at $INSTALL_DIR"
}

clone_or_update_repo() {
    print_info "Installing Seafile MCP server..."
    
    # Check if we're running from a local clone (script dir has .git and package.json)
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [ -d "$SCRIPT_DIR/.git" ] && [ -f "$SCRIPT_DIR/package.json" ]; then
        # Running from local clone - use local files
        print_info "Using local repository at $SCRIPT_DIR"
        
        # If install dir exists and is different from script dir, handle it
        if [ "$SCRIPT_DIR" != "$INSTALL_DIR" ] && [ -d "$INSTALL_DIR" ]; then
            print_info "Cleaning up existing install directory..."
            rm -rf "$INSTALL_DIR"
        fi
        
        if [ "$SCRIPT_DIR" != "$INSTALL_DIR" ]; then
            mkdir -p "$(dirname "$INSTALL_DIR")"
            ln -sf "$SCRIPT_DIR" "$INSTALL_DIR"
        fi
        cd "$INSTALL_DIR"
    elif [ -d "$INSTALL_DIR/.git" ]; then
        # Existing git installation - update
        print_info "Existing installation found, updating..."
        cd "$INSTALL_DIR"
        git pull --quiet
    elif [ -d "$INSTALL_DIR" ]; then
        # Non-git directory exists - check if usable
        if [ -f "$INSTALL_DIR/package.json" ]; then
            print_info "Using existing installation at $INSTALL_DIR"
            cd "$INSTALL_DIR"
        else
            print_error "Installation directory exists but is not a git repo and has no package.json."
            print_info "Please remove the directory and re-run installer, or run from a cloned repo."
            exit 1
        fi
    else
        # Fresh clone
        REPO_URL="${REPO_URL:-https://github.com/user/seafile-mcp-server.git}"
        mkdir -p "$(dirname "$INSTALL_DIR")"
        git clone --quiet "$REPO_URL" "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi
    
    npm install --quiet
    npm run build
    
    print_success "Seafile MCP server installed and built"
}

prompt_for_env() {
    print_info "Configuration"
    echo ""
    
    read -p "Enter your Seafile server URL (e.g., https://seafile.example.com): " SEAFILE_URL
    while [[ -z "$SEAFILE_URL" ]]; do
        print_error "Seafile URL cannot be empty"
        read -p "Enter your Seafile server URL: " SEAFILE_URL
    done
    
    read -p "Enter your Seafile repo API token: " SEAFILE_TOKEN
    echo ""
    while [[ -z "$SEAFILE_TOKEN" ]]; do
        print_error "Repo API token cannot be empty"
        read -p "Enter your Seafile repo API token: " SEAFILE_TOKEN
        echo ""
    done
    
    # Save to .env
    cat > "$INSTALL_DIR/.env" << EOF
SEAFILE_URL=$SEAFILE_URL
SEAFILE_TOKEN=$SEAFILE_TOKEN
EOF
    
    print_success "Configuration saved to $INSTALL_DIR/.env"
}

detect_claude_config_path() {
    case "$PLATFORM" in
        Mac)
            CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
            ;;
        Linux)
            CLAUDE_CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/Claude/claude_desktop_config.json"
            ;;
    esac
}

configure_opencode() {
    print_info "Configuring OpenCode..."
    
    if cd "$INSTALL_DIR" && npx -y tsx scripts/setup-mcp.ts opencode "$INSTALL_DIR" "$OPENCODE_CONFIG"; then
        print_success "OpenCode configured successfully"
        
        # Add env export to shell profile for OpenCode MCP
        print_info "Adding environment variables to shell profile..."
        
        local shell_profile=""
        if [ -f "$HOME/.zshrc" ]; then
            shell_profile="$HOME/.zshrc"
        elif [ -f "$HOME/.bashrc" ]; then
            shell_profile="$HOME/.bashrc"
        elif [ -f "$HOME/.bash_profile" ]; then
            shell_profile="$HOME/.bash_profile"
        else
            shell_profile="$HOME/.profile"
        fi
        
        local env_export="# Seafile MCP Server
export SEAFILE_URL=\"\$(grep SEAFILE_URL $INSTALL_DIR/.env | cut -d'=' -f2)\"
export SEAFILE_TOKEN=\"\$(grep SEAFILE_TOKEN $INSTALL_DIR/.env | cut -d'=' -f2)\""
        
        if ! grep -q "SEAFILE_MCP_SERVER" "$shell_profile" 2>/dev/null; then
            echo "" >> "$shell_profile"
            echo "$env_export" >> "$shell_profile"
            print_success "Added env export to $shell_profile"
            print_info "Run 'source $shell_profile' or restart your terminal to apply"
        else
            print_info "Env export already exists in $shell_profile"
        fi
    else
        print_error "Failed to auto-configure OpenCode"
        echo ""
        echo -e "${YELLOW}Manual configuration required:${NC}"
        echo "Add the following to your opencode.jsonc file:"
        echo "$config_snippet"
        echo ""
        echo "Config location: $OPENCODE_CONFIG"
    fi
}

configure_claude() {
    if [ -z "$CLAUDE_CONFIG" ]; then
        print_warning "Claude Desktop config path unknown for this platform"
        return 1
    fi
    
    print_info "Configuring Claude Code..."
    
    # Read values from .env for the snippet
    local SEAFILE_URL=$(grep SEAFILE_URL "$INSTALL_DIR/.env" | cut -d'=' -f2)
    local SEAFILE_TOKEN=$(grep SEAFILE_TOKEN "$INSTALL_DIR/.env" | cut -d'=' -f2)
    
    local config_snippet="{
  \"mcpServers\": {
    \"seafile\": {
      \"command\": \"node\",
      \"args\": [\"$INSTALL_DIR/dist/src/index.js\"],
      \"env\": {
        \"SEAFILE_URL\": \"$SEAFILE_URL\",
        \"SEAFILE_TOKEN\": \"$SEAFILE_TOKEN\"
      }
    }
  }
}"
    
    if cd "$INSTALL_DIR" && npx -y tsx scripts/setup-mcp.ts claude "$INSTALL_DIR" "$CLAUDE_CONFIG"; then
        print_success "Claude Code configured successfully"
    else
        print_error "Failed to auto-configure Claude Code"
        echo ""
        echo -e "${YELLOW}Manual configuration required:${NC}"
        echo "Add the following to your claude_desktop_config.json file:"
        echo "$config_snippet"
        echo ""
        echo "Config location: $CLAUDE_CONFIG"
    fi
}

ask_config_questions() {
    echo ""
    echo "Which MCP client should be configured?"
    echo "  1. OpenCode MCP"
    echo "  2. Claude Code MCP"
    echo "  3. Both"
    echo ""
    read -p "Enter choice [1-3]: " -n 1 -r
    echo ""
    case $REPLY in
        1) configure_opencode ;;
        2) 
            if [ -n "$CLAUDE_CONFIG" ]; then
                configure_claude
            else
                print_warning "Claude Desktop config path unknown for this platform"
            fi
            ;;
        3) 
            configure_opencode
            if [ -n "$CLAUDE_CONFIG" ]; then
                configure_claude
            else
                print_warning "Claude Desktop config path unknown for this platform"
            fi
            ;;
        *) print_error "Invalid choice" ;;
    esac
}

print_summary() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Installation Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${BLUE}Installation directory:${NC} $INSTALL_DIR"
    echo -e "${BLUE}Configuration file:${NC} $INSTALL_DIR/.env"
    echo ""
    echo "To apply environment variables:"
    echo "  source ~/.zshrc   # or your shell profile"
    echo ""
    echo "To start the server:"
    echo "  cd $INSTALL_DIR && npm run start"
    echo ""
    echo "To test with MCP Inspector:"
    echo "  cd $INSTALL_DIR && npm run inspect"
    echo ""
    echo "To update (when available):"
    echo "  cd $INSTALL_DIR && git pull && npm install && npm run build"
    echo ""
    print_warning "Remember to restart your MCP client (OpenCode/Claude) for changes to take effect."
    echo ""
}

# Main execution
main() {
    print_banner
    detect_platform
    check_prerequisites
    setup_directories
    clone_or_update_repo
    prompt_for_env
    detect_claude_config_path
    ask_config_questions
    print_summary
}

main "$@"