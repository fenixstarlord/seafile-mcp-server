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
    
    if [ -d "$INSTALL_DIR/.git" ]; then
        print_info "Existing installation found, updating..."
        cd "$INSTALL_DIR"
        git pull --quiet
    else
        REPO_URL="${REPO_URL:-https://github.com/user/seafile-mcp-server.git}"
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
    
    read -s -p "Enter your Seafile API token: " SEAFILE_TOKEN
    echo ""
    while [[ -z "$SEAFILE_TOKEN" ]]; do
        print_error "API token cannot be empty"
        read -s -p "Enter your Seafile API token: " SEAFILE_TOKEN
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
    
    local config_snippet="{
  \"mcp\": {
    \"seafile\": {
      \"type\": \"local\",
      \"command\": [\"node\", \"$INSTALL_DIR/dist/index.js\"],
      \"environment\": {
        \"SEAFILE_URL\": \"{env:SEAFILE_URL}\",
        \"SEAFILE_TOKEN\": \"{env:SEAFILE_TOKEN}\"
      }
    }
  }
}"
    
    if node "$INSTALL_DIR/scripts/setup-mcp.js" opencode "$INSTALL_DIR" "$OPENCODE_CONFIG"; then
        print_success "OpenCode configured successfully"
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
      \"args\": [\"$INSTALL_DIR/dist/index.js\"],
      \"env\": {
        \"SEAFILE_URL\": \"$SEAFILE_URL\",
        \"SEAFILE_TOKEN\": \"$SEAFILE_TOKEN\"
      }
    }
  }
}"
    
    if node "$INSTALL_DIR/scripts/setup-mcp.js" claude "$INSTALL_DIR" "$CLAUDE_CONFIG"; then
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
    read -p "Configure OpenCode MCP? [Y/n] " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        configure_opencode
    fi
    
    if [ -n "$CLAUDE_CONFIG" ]; then
        read -p "Configure Claude Code MCP? [Y/n] " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            configure_claude
        fi
    fi
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