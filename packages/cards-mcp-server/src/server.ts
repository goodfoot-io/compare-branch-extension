/**
 * MCP server factory for the Cards channel notification server.
 *
 * Creates an MCP Server with the `claude/channel` experimental capability and
 * wires a Cards EventSubscriber to dispatch `card:commit` events as channel
 * notifications, filtered by card ID, session attribution, and bookkeeping
 * pathspec exclusions.
 *
 * @summary MCP server factory for the Cards channel notification server
 * @module cards-mcp-server/server
 */

import { EventSubscriber } from '@cards/sdk/client';
import type { CardCommitEvent } from '@cards/sdk/protocol';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { CardsServerConfig } from './config.js';
import { isSessionCommit } from './filter.js';
import { formatCommit } from './format.js';
import type { Logger } from './logger.js';
import { createFileLogger } from './logger.js';
import { isBookkeepingCommit } from './pathspec.js';

const CHANNEL_INSTRUCTIONS = `\
You are connected to the Cards MCP server. Notifications arrive on the \
\`claude/channel\` channel with the following XML envelope:

  <channel source="cards" card_id="..." commit_sha="..." author="..." ts="...">
    <content>...</content>
  </channel>

When you receive a notification:
1. Read the changed files in the card repository to refresh your understanding of the card state.
2. Assess whether the commit affects your current plan or implementation.
3. Decide whether to adjust your approach based on the new information.`;

export interface CardsMcpServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  mcpServer: Server;
}

export interface CreateServerOptions {
  transport?: Transport;
  logger?: Logger;
}

/**
 * Creates a Cards MCP server bound to the given configuration.
 *
 * @param config - Runtime configuration (card ID, session ID, WebSocket URL, etc.).
 * @param options - Optional overrides for the MCP transport and logger (used in tests).
 * @returns An object with `start`, `stop`, and `mcpServer` properties.
 */
export function createServer(config: CardsServerConfig, options: CreateServerOptions = {}): CardsMcpServer {
  const logger = options.logger ?? createFileLogger(config.logPath);

  const mcp = new Server(
    { name: 'cards-mcp-server', version: '1.0.0' },
    {
      capabilities: { experimental: { 'claude/channel': {} } },
      instructions: CHANNEL_INSTRUCTIONS
    }
  );

  const subscriber = new EventSubscriber({ wsUrl: config.wsUrl, accessToken: config.apiAccessToken });

  const onCommit = (event: CardCommitEvent): void => {
    if (event.cardId !== config.cardId) return;
    if (isSessionCommit(config.sessionId, event.commit.hash)) {
      logger.info('Suppressed session-owned commit', { sha: event.commit.hash });
      return;
    }
    if (isBookkeepingCommit(event.commit)) {
      logger.info('Suppressed bookkeeping-only commit', { sha: event.commit.hash });
      return;
    }

    const content = formatCommit(event.commit);
    const meta: Record<string, string> = {
      card_id: event.cardId,
      commit_sha: event.commit.hash,
      author: event.commit.author_name,
      ts: event.commit.date
    };

    logger.info('Dispatching channel notification', { sha: event.commit.hash, author: event.commit.author_name });

    mcp
      .notification({
        method: 'notifications/claude/channel',
        params: { content, meta }
      })
      .catch((err: unknown) => {
        logger.error('Failed to send channel notification', {
          sha: event.commit.hash,
          error: err instanceof Error ? err.message : String(err)
        });
      });
  };

  subscriber.on('card:commit', onCommit);

  return {
    mcpServer: mcp,
    async start(): Promise<void> {
      const transport = options.transport ?? new StdioServerTransport();
      await mcp.connect(transport);
      await subscriber.connect();
      logger.info('Server started', { cardId: config.cardId, sessionId: config.sessionId });
    },
    async stop(): Promise<void> {
      logger.info('Server stopping');
      subscriber.disconnect();
      await mcp.close();
    }
  };
}
