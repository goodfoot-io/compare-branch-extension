/**
 * Configuration reader for the Cards MCP server.
 *
 * Reads all required runtime values from environment variables and derives
 * the WebSocket URL from the HTTP API base URL.
 *
 * @summary Configuration reader for the Cards MCP server
 * @module cards-mcp-server/config
 */

import { join } from 'node:path';
import { CARDS_ENV_VARS, getApiAccessToken, getApiBaseUrl, getCardId, getRepoRoot } from '@cards/sdk/config/env';

export interface CardsServerConfig {
  cardId: string;
  sessionId: string;
  apiAccessToken: string;
  wsUrl: string;
  logPath: string;
}

/**
 * Resolves the log file path.
 *
 * Uses `CARDS_MCP_SERVER_LOGS` if set, otherwise falls back to
 * `$REPO_ROOT/.cards/logs/cards-mcp-server.log`.
 *
 * @returns Absolute path to the log file.
 */
function resolveLogPath(): string {
  const override = process.env['CARDS_MCP_SERVER_LOGS'];
  if (override !== undefined && override !== '') return override;
  return join(getRepoRoot(), '.cards', 'logs', 'cards-mcp-server.log');
}

/**
 * Reads and validates the Cards MCP server configuration from environment variables.
 *
 * @returns Validated server configuration.
 * @throws When any required environment variable is missing or empty.
 */
export function readConfig(): CardsServerConfig {
  const cardId = getCardId();
  const apiBaseUrl = getApiBaseUrl();
  const apiAccessToken = getApiAccessToken();
  const logPath = resolveLogPath();

  const sessionId = process.env[CARDS_ENV_VARS.CARDS_SESSION_ID];
  if (sessionId === undefined || sessionId === '') {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.CARDS_SESSION_ID}`);
  }

  const wsUrl = apiBaseUrl.replace(/^http(s?):\/\//, 'ws$1://');

  return { cardId, sessionId, apiAccessToken, wsUrl, logPath };
}
