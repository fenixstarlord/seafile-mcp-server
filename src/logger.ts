import pino from 'pino';

/**
 * Pino logger instance for the Seafile MCP server
 *
 * This logger provides structured logging with configurable log levels,
 * ISO timestamps, and uppercase level labels. It's used throughout the
 * application for consistent logging.
 *
 * Configuration:
 * - Log level: Controlled by LOG_LEVEL environment variable (default: 'info')
 * - Timestamp: ISO 8601 format
 * - Level format: Uppercase (INFO, WARN, ERROR, etc.)
 *
 * Available log levels (in order of verbosity):
 * - trace: Most verbose, includes detailed debugging information
 * - debug: Debug information for development
 * - info: General informational messages
 * - warn: Warning messages for potential issues
 * - error: Error messages for failures
 * - fatal: Critical errors that may cause application termination
 *
 * @example
 * ```typescript
 * import { logger } from './logger.js';
 *
 * logger.info('Server starting...');
 * logger.warn({ repoId: 'abc123' }, 'Repository not found');
 * logger.error({ error: err.message }, 'Failed to process request');
 * ```
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: label => ({ level: label.toUpperCase() }),
  },
});
