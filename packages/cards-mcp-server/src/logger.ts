/**
 * File-based logger for the Cards MCP server.
 *
 * Writes log lines to `$REPO_ROOT/.cards/logs/cards-mcp-server.log` by default.
 * The log path can be overridden with the `CARDS_MCP_SERVER_LOGS` environment variable.
 *
 * @summary File-based logger for the Cards MCP server
 * @module cards-mcp-server/logger
 */

import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

function formatLine(level: string, message: string, meta?: Record<string, unknown>): string {
  const ts = new Date().toISOString();
  const metaSuffix = meta !== undefined ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} [${level}] ${message}${metaSuffix}\n`;
}

/**
 * Creates a file-based logger that appends to the given path.
 *
 * Creates the parent directory if it does not exist.
 *
 * @param logPath - Absolute path to the log file.
 * @returns A Logger that appends to the file.
 */
export function createFileLogger(logPath: string): Logger {
  mkdirSync(dirname(logPath), { recursive: true });

  function write(level: string, message: string, meta?: Record<string, unknown>): void {
    try {
      appendFileSync(logPath, formatLine(level, message, meta));
    } catch (err) {
      process.stderr.write(
        `[cards-mcp-server] Log write failed: ${err instanceof Error ? err.message : String(err)}\n`
      );
    }
  }

  return {
    info: (message, meta) => write('INFO', message, meta),
    warn: (message, meta) => write('WARN', message, meta),
    error: (message, meta) => write('ERROR', message, meta)
  };
}
