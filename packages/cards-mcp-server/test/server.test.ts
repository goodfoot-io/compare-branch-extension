/**
 * Integration tests for the Cards MCP server.
 *
 * @summary Integration tests for the Cards MCP server
 * @module cards-mcp-server/test/server
 */

import type { CardCommitEvent } from '@cards/sdk/protocol';
import { appendCommitToSession } from '@cards/sessions/card-repo';
import { TestWebSocketServer } from '@cards/test-utils';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import type { CardsServerConfig } from '../src/config.js';
import type { Logger } from '../src/logger.js';
import { createServer } from '../src/server.js';

vi.mock('@cards/sessions/card-repo', () => ({
  getSessionCommits: (sessionId: string): string[] => {
    if (sessionId === 'test-session') {
      return ['session-owned-sha'];
    }
    return [];
  },
  appendCommitToSession: vi.fn().mockResolvedValue(undefined)
}));

function makeConfig(wsUrl: string): CardsServerConfig {
  return {
    cardId: 'test-card',
    resolveSessionId: () => Promise.resolve('test-session'),
    apiAccessToken: 'test-token',
    wsUrl,
    logPath: '/tmp/cards-mcp-server-test.log',
    discover: () => Promise.resolve({ wsUrl, accessToken: 'test-token' })
  };
}

/** Silent logger for tests. */
const nullLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {}
};

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
    const server = createServer(config, { transport: serverTransport, logger: nullLogger });

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

    await vi.waitFor(() => {
      expect(notifications).toHaveLength(1);
    });

    await server.stop();
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
    const infos: string[] = [];
    const trackingLogger: Logger = {
      info: (msg) => {
        infos.push(msg);
      },
      warn: () => {},
      error: () => {}
    };
    const server = createServer(config, { transport: serverTransport, logger: trackingLogger });

    const notifications: unknown[] = [];
    vi.spyOn(server.mcpServer, 'notification').mockImplementation(async (n) => {
      notifications.push(n);
    });

    await Promise.all([server.start(), wsServer.awaitConnection()]);

    wsServer.simulateEvent<CardCommitEvent>('card:commit', {
      cardId: 'test-card',
      commit: { ...makeCommit(), hash: 'session-owned-sha' }
    });

    await vi.waitFor(() => {
      expect(infos).toContain('Suppressed session-owned commit');
    });

    await server.stop();

    expect(notifications).toHaveLength(0);
  });

  it('dispatches commits when session ID is not yet available', async () => {
    const [serverTransport] = InMemoryTransport.createLinkedPair();
    const config = {
      ...makeConfig(wsServer.getUrl()),
      resolveSessionId: () => Promise.resolve(null)
    };
    const server = createServer(config, { transport: serverTransport, logger: nullLogger });

    const notifications: unknown[] = [];
    vi.spyOn(server.mcpServer, 'notification').mockImplementation(async (n) => {
      notifications.push(n);
    });

    await Promise.all([server.start(), wsServer.awaitConnection()]);

    wsServer.simulateEvent<CardCommitEvent>('card:commit', {
      cardId: 'test-card',
      commit: { ...makeCommit(), hash: 'session-owned-sha' }
    });

    await vi.waitFor(() => {
      expect(notifications).toHaveLength(1);
    });

    await server.stop();
  });

  it('silently ignores events for other cards', async () => {
    const [serverTransport] = InMemoryTransport.createLinkedPair();
    const config = makeConfig(wsServer.getUrl());
    const server = createServer(config, { transport: serverTransport, logger: nullLogger });

    const notifications: unknown[] = [];
    vi.spyOn(server.mcpServer, 'notification').mockImplementation(async (n) => {
      notifications.push(n);
    });

    await Promise.all([server.start(), wsServer.awaitConnection()]);

    wsServer.simulateEvent<CardCommitEvent>('card:commit', {
      cardId: 'other-card',
      commit: makeCommit()
    });

    // Allow event loop to process; other-card events should be ignored
    await Promise.resolve();
    await Promise.resolve();

    await server.stop();

    expect(notifications).toHaveLength(0);
  });

  it('silently filters bookkeeping-only commits', async () => {
    const [serverTransport] = InMemoryTransport.createLinkedPair();
    const config = makeConfig(wsServer.getUrl());
    const server = createServer(config, { transport: serverTransport, logger: nullLogger });

    const notifications: unknown[] = [];
    vi.spyOn(server.mcpServer, 'notification').mockImplementation(async (n) => {
      notifications.push(n);
    });

    await Promise.all([server.start(), wsServer.awaitConnection()]);

    wsServer.simulateEvent<CardCommitEvent>('card:commit', {
      cardId: 'test-card',
      commit: {
        ...makeCommit(),
        diff: {
          changed: 2,
          files: [
            { file: 'commits.csv', status: 'M', binary: false },
            { file: 'streams/claude-code-session/abc.jsonl', status: 'A', binary: false }
          ]
        }
      }
    });

    // Allow event loop to process; bookkeeping-only commits should be filtered
    await Promise.resolve();
    await Promise.resolve();

    await server.stop();

    expect(notifications).toHaveLength(0);
  });

  it('records dispatched commits to the session CSV', async () => {
    const [serverTransport] = InMemoryTransport.createLinkedPair();
    const config = makeConfig(wsServer.getUrl());
    const server = createServer(config, { transport: serverTransport, logger: nullLogger });

    const notifications: unknown[] = [];
    vi.spyOn(server.mcpServer, 'notification').mockImplementation(async (n) => {
      notifications.push(n);
    });

    await Promise.all([server.start(), wsServer.awaitConnection()]);

    const commit = makeCommit();
    wsServer.simulateEvent<CardCommitEvent>('card:commit', {
      cardId: 'test-card',
      commit
    });

    await vi.waitFor(() => {
      expect(notifications).toHaveLength(1);
    });

    await vi.waitFor(() => {
      expect(appendCommitToSession).toHaveBeenCalledWith('test-session', commit.hash);
    });

    await server.stop();
  });

  it('logs but does not throw when commit recording fails', async () => {
    const [serverTransport] = InMemoryTransport.createLinkedPair();
    const config = makeConfig(wsServer.getUrl());
    const errors: string[] = [];
    const testLogger: Logger = {
      info: () => {},
      warn: () => {},
      error: (msg) => {
        errors.push(msg);
      }
    };
    const server = createServer(config, { transport: serverTransport, logger: testLogger });

    const notifications: unknown[] = [];
    vi.spyOn(server.mcpServer, 'notification').mockImplementation(async (n) => {
      notifications.push(n);
    });
    (appendCommitToSession as Mock).mockRejectedValueOnce(new Error('disk full'));

    await Promise.all([server.start(), wsServer.awaitConnection()]);

    wsServer.simulateEvent<CardCommitEvent>('card:commit', {
      cardId: 'test-card',
      commit: makeCommit()
    });

    await vi.waitFor(() => {
      expect(errors).toContain('Failed to record commit to session CSV');
    });

    await server.stop();
  });

  it('dispatches commits that mix bookkeeping and user files', async () => {
    const [serverTransport] = InMemoryTransport.createLinkedPair();
    const config = makeConfig(wsServer.getUrl());
    const server = createServer(config, { transport: serverTransport, logger: nullLogger });

    const notifications: unknown[] = [];
    vi.spyOn(server.mcpServer, 'notification').mockImplementation(async (n) => {
      notifications.push(n);
    });

    await Promise.all([server.start(), wsServer.awaitConnection()]);

    wsServer.simulateEvent<CardCommitEvent>('card:commit', {
      cardId: 'test-card',
      commit: {
        ...makeCommit(),
        diff: {
          changed: 2,
          files: [
            { file: 'commits.csv', status: 'M', binary: false },
            { file: 'CARD.md', status: 'M', binary: false }
          ]
        }
      }
    });

    await vi.waitFor(() => {
      expect(notifications).toHaveLength(1);
    });

    await server.stop();
  });
});
