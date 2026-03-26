/**
 * Configuration reader for the Cards MCP server.
 *
 * Reads all required runtime values from environment variables and derives
 * the WebSocket URL from the HTTP API base URL. The session ID is resolved
 * lazily from the card-repo PID registry because the MCP server may start
 * before the session-start hook has registered the session.
 *
 * @summary Configuration reader for the Cards MCP server
 * @module cards-mcp-server/config
 */

import { join } from 'node:path';
import { findClaudePid, getSessionIdForPid } from '@cards/claude-code-sessions';
import type { DiscoverResult } from '@cards/sdk/client';
import { getApiAccessToken, getApiBaseUrl, getCardId, getRepoRoot } from '@cards/sdk/config/env';

export interface CardsServerConfig {
  cardId: string;
  resolveSessionId: () => Promise<SessionResolution>;
  apiAccessToken: string;
  wsUrl: string;
  logPath: string;
  discover?: () => Promise<DiscoverResult>;
}

/**
 * Resolves the log file path.
 *
 * Uses `CARDS_MCP_SERVER_LOG_FILE` if set, otherwise falls back to
 * `$REPO_ROOT/.cards/logs/cards-mcp-server.log`.
 *
 * @returns Absolute path to the log file.
 */
function resolveLogPath(): string {
  const override = process.env['CARDS_MCP_SERVER_LOG_FILE'];
  if (override !== undefined && override !== '') return override;
  return join(getRepoRoot(), '.cards', 'logs', 'cards-mcp-server.log');
}

/** Result of a session ID resolution attempt, with diagnostic context. */
export interface SessionResolution {
  sessionId: string | null;
  claudePid: number | null;
}

/**
 * Resolves the session ID by walking the process tree to find the parent
 * Claude PID, then looking up its session in the card-repo PID registry.
 *
 * @returns Session ID and Claude PID used for resolution.
 */
async function resolveSessionIdFromPidRegistry(): Promise<SessionResolution> {
  const claudePid = findClaudePid();
  if (claudePid === null) return { sessionId: null, claudePid: null };
  const sessionId = await getSessionIdForPid(claudePid);
  return { sessionId, claudePid };
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

  const wsUrl = apiBaseUrl.replace(/^http(s?):\/\//, 'ws$1://');

  return { cardId, resolveSessionId: resolveSessionIdFromPidRegistry, apiAccessToken, wsUrl, logPath };
}
