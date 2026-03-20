/**
 * Configuration reader for the Cards MCP server.
 *
 * Reads all required runtime values from environment variables and derives
 * the WebSocket URL from the HTTP API base URL.
 *
 * @summary Configuration reader for the Cards MCP server
 * @module cards-mcp-server/config
 */

import { CARDS_ENV_VARS, getApiAccessToken, getApiBaseUrl, getCardId, getCardRepoPath } from '@cards/sdk/config/env';

export interface CardsServerConfig {
  cardId: string;
  cardRepoPath: string;
  sessionId: string;
  apiBaseUrl: string;
  apiAccessToken: string;
  wsUrl: string;
}

/**
 * Reads and validates the Cards MCP server configuration from environment variables.
 *
 * @returns Validated server configuration.
 * @throws When any required environment variable is missing or empty.
 */
export function readConfig(): CardsServerConfig {
  const cardId = getCardId();
  const cardRepoPath = getCardRepoPath();
  const apiBaseUrl = getApiBaseUrl();
  const apiAccessToken = getApiAccessToken();

  const sessionId = process.env[CARDS_ENV_VARS.CARDS_SESSION_ID];
  if (sessionId === undefined || sessionId === '') {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.CARDS_SESSION_ID}`);
  }

  const wsUrl = apiBaseUrl.replace(/^http(s?):\/\//, 'ws$1://');

  return { cardId, cardRepoPath, sessionId, apiBaseUrl, apiAccessToken, wsUrl };
}
