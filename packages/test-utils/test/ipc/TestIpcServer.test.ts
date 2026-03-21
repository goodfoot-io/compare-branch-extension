/**
 * Integration tests for TestIpcServer.
 *
 * Why: verify real Unix socket behavior, NDJSON framing, and nonce filtering
 * in a way that unit tests cannot simulate reliably.
 *
 *
 * @summary Integration tests for TestIpcServer
 * @module test-utils/test/ipc/TestIpcServer.test
 */
import * as fs from 'node:fs';
import * as net from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestIpcServer } from '../../src/ipc/TestIpcServer.js';

describe('TestIpcServer', () => {
  let server: TestIpcServer;

  beforeEach(() => {
    server = new TestIpcServer();
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('start()', () => {
    it('creates socket file in temp directory', async () => {
      const socketPath = await server.start();
      expect(socketPath).toContain('test-ipc-');
      expect(socketPath).toContain('.sock');
      expect(fs.existsSync(socketPath)).toBe(true);
    });

    it('accepts client connections', async () => {
      const socketPath = await server.start();

      const client = net.createConnection(socketPath);
      await new Promise<void>((resolve, reject) => {
        client.on('connect', () => resolve());
        client.on('error', reject);
      });

      expect(server.getConnectionCount()).toBe(1);
      client.destroy();
    });
  });

  describe('getNonce()', () => {
    it('returns a UUID nonce', () => {
      const nonce = server.getNonce();
      expect(nonce).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('returns same nonce on multiple calls', () => {
      const nonce1 = server.getNonce();
      const nonce2 = server.getNonce();
      expect(nonce1).toBe(nonce2);
    });
  });

  describe('getSocketPath()', () => {
    it('returns null before start', () => {
      expect(server.getSocketPath()).toBeNull();
    });

    it('returns path after start', async () => {
      const path = await server.start();
      expect(server.getSocketPath()).toBe(path);
    });
  });

  describe('message handling', () => {
    it('receives NDJSON messages', async () => {
      const socketPath = await server.start();
      const nonce = server.getNonce();

      const client = net.createConnection(socketPath);
      await new Promise<void>((resolve) => client.on('connect', () => resolve()));

      const message = { type: 'test:message', nonce, data: 'hello' };
      client.write(`${JSON.stringify(message)}\n`);

      await vi.waitFor(() => {
        expect(server.getReceivedMessages().length).toBe(1);
      });

      const messages = server.getReceivedMessages();
      expect(messages[0]?.type).toBe('test:message');

      client.destroy();
    });

    it('ignores messages with invalid nonce', async () => {
      const socketPath = await server.start();

      const client = net.createConnection(socketPath);
      await new Promise<void>((resolve) => client.on('connect', () => resolve()));

      const message = { type: 'test:message', nonce: 'wrong-nonce', data: 'hello' };
      client.write(`${JSON.stringify(message)}\n`);

      // Allow event loop to process; invalid nonce messages should be dropped
      await Promise.resolve();
      await Promise.resolve();

      const messages = server.getReceivedMessages();
      expect(messages.length).toBe(0);

      client.destroy();
    });

    it('ignores messages without type field', async () => {
      const socketPath = await server.start();
      const nonce = server.getNonce();

      const client = net.createConnection(socketPath);
      await new Promise<void>((resolve) => client.on('connect', () => resolve()));

      const message = { nonce, data: 'no type field' };
      client.write(`${JSON.stringify(message)}\n`);

      // Allow event loop to process; messages without type should be dropped
      await Promise.resolve();
      await Promise.resolve();

      const messages = server.getReceivedMessages();
      expect(messages.length).toBe(0);

      client.destroy();
    });

    it('handles multiple messages in one chunk', async () => {
      const socketPath = await server.start();
      const nonce = server.getNonce();

      const client = net.createConnection(socketPath);
      await new Promise<void>((resolve) => client.on('connect', () => resolve()));

      const msg1 = JSON.stringify({ type: 'msg1', nonce });
      const msg2 = JSON.stringify({ type: 'msg2', nonce });
      client.write(`${msg1}\n${msg2}\n`);

      await vi.waitFor(() => {
        expect(server.getReceivedMessages().length).toBe(2);
      });

      const messages = server.getReceivedMessages();
      expect(messages[0]?.type).toBe('msg1');
      expect(messages[1]?.type).toBe('msg2');

      client.destroy();
    });

    it('handles split messages across chunks', async () => {
      const socketPath = await server.start();
      const nonce = server.getNonce();

      const client = net.createConnection(socketPath);
      await new Promise<void>((resolve) => client.on('connect', () => resolve()));

      const fullMessage = JSON.stringify({ type: 'split:message', nonce });
      const part1 = fullMessage.slice(0, 10);
      const part2 = `${fullMessage.slice(10)}\n`;

      client.write(part1);
      await Promise.resolve();
      client.write(part2);

      await vi.waitFor(() => {
        expect(server.getReceivedMessages().length).toBe(1);
      });

      const messages = server.getReceivedMessages();
      expect(messages[0]?.type).toBe('split:message');

      client.destroy();
    });

    it('ignores invalid JSON', async () => {
      const socketPath = await server.start();

      const client = net.createConnection(socketPath);
      await new Promise<void>((resolve) => client.on('connect', () => resolve()));

      client.write('not valid json\n');

      // Allow event loop to process; invalid JSON should be dropped
      await Promise.resolve();
      await Promise.resolve();

      const messages = server.getReceivedMessages();
      expect(messages.length).toBe(0);

      client.destroy();
    });
  });

  describe('awaitMessage()', () => {
    it('waits for next message', async () => {
      const socketPath = await server.start();
      const nonce = server.getNonce();

      const client = net.createConnection(socketPath);
      await new Promise<void>((resolve) => client.on('connect', () => resolve()));

      const messagePromise = server.awaitMessage(1000);

      const message = { type: 'awaited:message', nonce };
      client.write(`${JSON.stringify(message)}\n`);

      const received = await messagePromise;
      expect(received.type).toBe('awaited:message');

      client.destroy();
    });

    it('times out if no message received', async () => {
      await server.start();

      await expect(server.awaitMessage(100)).rejects.toThrow('Timeout waiting for IPC message after 100ms');
    });

    it('resolves multiple awaits in order', async () => {
      const socketPath = await server.start();
      const nonce = server.getNonce();

      const client = net.createConnection(socketPath);
      await new Promise<void>((resolve) => client.on('connect', () => resolve()));

      const promise1 = server.awaitMessage(1000);
      const promise2 = server.awaitMessage(1000);

      client.write(`${JSON.stringify({ type: 'first', nonce })}\n`);
      client.write(`${JSON.stringify({ type: 'second', nonce })}\n`);

      const msg1 = await promise1;
      const msg2 = await promise2;

      expect(msg1.type).toBe('first');
      expect(msg2.type).toBe('second');

      client.destroy();
    });
  });

  describe('getReceivedMessages()', () => {
    it('returns copy of messages array', async () => {
      const socketPath = await server.start();
      const nonce = server.getNonce();

      const client = net.createConnection(socketPath);
      await new Promise<void>((resolve) => client.on('connect', () => resolve()));

      client.write(`${JSON.stringify({ type: 'test', nonce })}\n`);
      await vi.waitFor(() => {
        expect(server.getReceivedMessages().length).toBe(1);
      });

      const messages1 = server.getReceivedMessages();
      const messages2 = server.getReceivedMessages();

      expect(messages1).not.toBe(messages2);
      expect(messages1).toEqual(messages2);

      client.destroy();
    });
  });

  describe('clearReceivedMessages()', () => {
    it('clears all received messages', async () => {
      const socketPath = await server.start();
      const nonce = server.getNonce();

      const client = net.createConnection(socketPath);
      await new Promise<void>((resolve) => client.on('connect', () => resolve()));

      client.write(`${JSON.stringify({ type: 'test', nonce })}\n`);
      await vi.waitFor(() => {
        expect(server.getReceivedMessages().length).toBe(1);
      });
      server.clearReceivedMessages();
      expect(server.getReceivedMessages().length).toBe(0);

      client.destroy();
    });
  });

  describe('stop()', () => {
    it('closes all connections', async () => {
      const socketPath = await server.start();

      const client = net.createConnection(socketPath);
      await new Promise<void>((resolve) => client.on('connect', () => resolve()));

      expect(server.getConnectionCount()).toBe(1);

      await server.stop();

      expect(server.getConnectionCount()).toBe(0);
    });

    it('removes socket file', async () => {
      const socketPath = await server.start();
      expect(fs.existsSync(socketPath)).toBe(true);

      await server.stop();

      expect(fs.existsSync(socketPath)).toBe(false);
    });

    it('can be called multiple times safely', async () => {
      await server.start();
      await server.stop();
      await server.stop();
      // Should not throw
    });

    it('clears internal state', async () => {
      const socketPath = await server.start();
      const nonce = server.getNonce();

      const client = net.createConnection(socketPath);
      await new Promise<void>((resolve) => client.on('connect', () => resolve()));

      client.write(`${JSON.stringify({ type: 'test', nonce })}\n`);
      await vi.waitFor(() => {
        expect(server.getReceivedMessages().length).toBe(1);
      });

      client.destroy();
      await server.stop();

      expect(server.getReceivedMessages().length).toBe(0);
      expect(server.getSocketPath()).toBeNull();
    });
  });

  describe('connection tracking', () => {
    it('tracks multiple connections', async () => {
      const socketPath = await server.start();

      const client1 = net.createConnection(socketPath);
      await new Promise<void>((resolve) => client1.on('connect', () => resolve()));

      await vi.waitFor(() => {
        expect(server.getConnectionCount()).toBe(1);
      });

      const client2 = net.createConnection(socketPath);
      await new Promise<void>((resolve) => client2.on('connect', () => resolve()));

      await vi.waitFor(() => {
        expect(server.getConnectionCount()).toBe(2);
      });

      client1.destroy();
      await vi.waitFor(() => {
        expect(server.getConnectionCount()).toBe(1);
      });

      client2.destroy();
      await vi.waitFor(() => {
        expect(server.getConnectionCount()).toBe(0);
      });
    });
  });
});
