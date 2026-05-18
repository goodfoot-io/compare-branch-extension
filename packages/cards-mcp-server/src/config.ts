/**
 * Configuration reader for the Cards MCP server.
 *
 * Reads all required runtime values from the cards-api.json discovery file.
 * The session ID is resolved lazily via the SDK session resolver.
 *
 * @summary Configuration reader for the Cards MCP server
 * @module cards-mcp-server/config
 */

import { join } from 'node:path';
import type { DiscoverResult } from '@cards/sdk/client';
import { discoverApiInfo } from '@cards/sdk/client/discovery';
import { getCardId, getRepoRoot } from '@cards/sdk/config/env';
import { resolveSessionId } from '@cards/sdk/session-resolver';

export interface CardsServerConfig {
  cardId: string;
  resolveSessionId: () => Promise<string | null>;
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

/**
 * Reads and validates the Cards MCP server configuration via API discovery.
 *
 * @returns Validated server configuration.
 * @throws When discovery returns null (cards-api.json not found or invalid).
 */
export async function readConfig(): Promise<CardsServerConfig> {
  const cardId = getCardId();
  const logPath = resolveLogPath();

  const info = await discoverApiInfo();
  if (info === null) {
    throw new Error('Cards API discovery failed: cards-api.json not found or invalid');
  }

  const wsUrl = `ws://${info.host}:${info.port}`;
  const apiAccessToken = info.accessToken;

  return { cardId, resolveSessionId, apiAccessToken, wsUrl, logPath };
}
