/**
 * Integration tests for the Cards MCP server.
 *
 * @summary Integration tests for the Cards MCP server
 * @module cards-mcp-server/test/server
 */

import type { CardCommitEvent } from '@cards/sdk/protocol';
import { TestWebSocketServer } from '@cards/test-utils';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardsServerConfig } from '../src/config.js';
import { createServer } from '../src/server.js';

vi.mock('@cards/claude-code-sessions/card-repo', () => ({
  getSessionCommits: (sessionId: string): string[] => {
    if (sessionId === 'test-session') {
      return ['session-owned-sha'];
    }
    return [];
  }
}));

function makeConfig(wsUrl: string): CardsServerConfig {
  return {
    cardId: 'test-card',
    sessionId: 'test-session',
    apiAccessToken: 'test-token',
    wsUrl
  };
}

function makeCommit(): CardCommitEvent['commit'] {
  return {
    hash: 'abc1234567890',
    date: '2026-03-20T12:00:00Z',
    message: 'Add feature',
    refs: '',
    body: '',
    author_name: 'Alice',
    author_email: 'alice@example.com',
    diff: { changed: 1, files: [{ file: 'CARD.md', status: 'M', binary: false }] }
  };
}

describe('createServer', () => {
  let wsServer: TestWebSocketServer;

  beforeEach(async () => {
    wsServer = new TestWebSocketServer();
    await wsServer.start();
  });

  afterEach(async () => {
    await wsServer.stop();
  });

  it('dispatches a notifications/claude/channel notification for a non-session commit', async () => {
    const [serverTransport] = InMemoryTransport.createLinkedPair();
    const config = makeConfig(wsServer.getUrl());
    const server = createServer(config, { transport: serverTransport });

    const notifications: unknown[] = [];
    vi.spyOn(server.mcpServer, 'notification').mockImplementation(async (n) => {
      notifications.push(n);
    });

    // Await start and first connection concurrently so awaitConnection
    // does not miss the connection event that fires during start().
    await Promise.all([server.start(), wsServer.awaitConnection()]);

    wsServer.simulateEvent<CardCommitEvent>('card:commit', {
      cardId: 'test-card',
      commit: makeCommit()
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    await server.stop();

    expect(notifications).toHaveLength(1);
    const n = notifications[0] as { method: string; params: { content: string; meta: Record<string, string> } };
    expect(n.method).toBe('notifications/claude/channel');
    expect(n.params.content).toContain('abc1234');
    expect(n.params.meta['card_id']).toBe('test-card');
    expect(n.params.meta['commit_sha']).toBe('abc1234567890');
    expect(n.params.meta['author']).toBe('Alice');
    expect(n.params.meta['ts']).toBe('2026-03-20T12:00:00Z');
  });

  it('silently filters commits that belong to the current session', async () => {
    const [serverTransport] = InMemoryTransport.createLinkedPair();
    const config = makeConfig(wsServer.getUrl());
    const server = createServer(config, { transport: serverTransport });

    const notifications: unknown[] = [];
    vi.spyOn(server.mcpServer, 'notification').mockImplementation(async (n) => {
      notifications.push(n);
    });

    await Promise.all([server.start(), wsServer.awaitConnection()]);

    wsServer.simulateEvent<CardCommitEvent>('card:commit', {
      cardId: 'test-card',
      commit: { ...makeCommit(), hash: 'session-owned-sha' }
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    await server.stop();

    expect(notifications).toHaveLength(0);
  });

  it('silently ignores events for other cards', async () => {
    const [serverTransport] = InMemoryTransport.createLinkedPair();
    const config = makeConfig(wsServer.getUrl());
    const server = createServer(config, { transport: serverTransport });

    const notifications: unknown[] = [];
    vi.spyOn(server.mcpServer, 'notification').mockImplementation(async (n) => {
      notifications.push(n);
    });

    await Promise.all([server.start(), wsServer.awaitConnection()]);

    wsServer.simulateEvent<CardCommitEvent>('card:commit', {
      cardId: 'other-card',
      commit: makeCommit()
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    await server.stop();

    expect(notifications).toHaveLength(0);
  });
});
