# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- ESLint and Prettier configuration for code quality and formatting
- GitHub Actions CI/CD pipeline for automated testing and building
- TypeScript conversion of setup-mcp.js to setup-mcp.ts
- Comprehensive test suite with Vitest

## [1.0.0] - 2024-XX-XX

### Added

- Initial MCP server implementation for Seafile integration
- Support for OpenWork and Claude Desktop clients
- File operations: upload, download, delete, move, copy
- Directory operations: create, list, delete
- Repository operations: list, get details
- Search functionality across files and libraries
- Sharing operations: create share links, manage shared items
- Starred items management
- Account information retrieval
- Configuration validation and environment setup
- Cross-platform installation scripts (PowerShell and Bash)
- TypeScript support with type definitions
- Comprehensive API documentation

### Features

- **File Management**: Upload, download, delete, move, and copy files in Seafile
- **Directory Operations**: Create, list, and delete directories
- **Repository Access**: Browse and manage Seafile libraries/repos
- **Search**: Search for files and directories across all libraries
- **Sharing**: Create and manage share links for files and folders
- **Starred Items**: Access and manage starred/starred files
- **Account Info**: Retrieve account information and usage statistics

[unreleased]: https://github.com/yourusername/seafile-mcp-server/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/seafile-mcp-server/releases/tag/v1.0.0
