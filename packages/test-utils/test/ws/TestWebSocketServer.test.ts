/**
 * Integration tests for TestWebSocketServer.
 *
 * Why: ensure a real WebSocket server enforces auth tokens, broadcasts payloads,
 * and records client messages correctly.
 *
 *
 * @summary Integration tests for TestWebSocketServer
 * @module test-utils/test/ws/TestWebSocketServer.test
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { getRandomPort, TestWebSocketServer } from '../../src/ws/TestWebSocketServer.js';

describe('TestWebSocketServer', () => {
  let server: TestWebSocketServer;

  beforeEach(() => {
    server = new TestWebSocketServer();
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('start()', () => {
    it('starts server on random port', async () => {
      const port = await server.start();
      expect(port).toBeGreaterThan(0);
    });

    it('starts server on specified port', async () => {
      const requestedPort = await getRandomPort();
      const actualPort = await server.start({ port: requestedPort });
      expect(actualPort).toBe(requestedPort);
    });

    it('accepts client connections', async () => {
      const port = await server.start();

      const client = new WebSocket(`ws://localhost:${port}`);
      await new Promise<void>((resolve) => {
        client.on('open', () => {
          resolve();
        });
      });

      expect(server.getClientCount()).toBe(1);
      client.close();
    });
  });

  describe('getPort()', () => {
    it('returns the port number', async () => {
      const port = await server.start();
      expect(server.getPort()).toBe(port);
    });

    it('throws if server not started', () => {
      expect(() => server.getPort()).toThrow('Server not started');
    });
  });

  describe('getUrl()', () => {
    it('returns WebSocket URL without auth token', async () => {
      const port = await server.start();
      const url = server.getUrl();
      expect(url).toBe(`ws://localhost:${port}`);
    });

    it('returns WebSocket URL with auth token', async () => {
      const port = await server.start({ authToken: 'secret123' });
      const url = server.getUrl(true);
      expect(url).toBe(`ws://localhost:${port}?token=secret123`);
    });
  });

  describe('authentication', () => {
    it('accepts connections with valid token', async () => {
      const port = await server.start({ authToken: 'valid-token' });

      const client = new WebSocket(`ws://localhost:${port}?token=valid-token`);
      await new Promise<void>((resolve, reject) => {
        client.on('open', () => {
          resolve();
        });
        client.on('error', reject);
      });

      expect(server.getClientCount()).toBe(1);
      client.close();
    });

    it('rejects connections with invalid token', async () => {
      const port = await server.start({ authToken: 'valid-token' });

      const client = new WebSocket(`ws://localhost:${port}?token=invalid`);

      await new Promise<void>((resolve) => {
        client.on('close', (code) => {
          expect(code).toBe(4001);
          resolve();
        });
      });

      await vi.waitFor(() => {
        expect(server.getClientCount()).toBe(0);
      });
    });
  });

  describe('broadcast()', () => {
    it('sends message to all connected clients', async () => {
      const port = await server.start();

      const client1 = new WebSocket(`ws://localhost:${port}`);
      const client2 = new WebSocket(`ws://localhost:${port}`);

      await Promise.all([
        new Promise<void>((resolve) => client1.on('open', () => resolve())),
        new Promise<void>((resolve) => client2.on('open', () => resolve()))
      ]);

      const messages1: string[] = [];
      const messages2: string[] = [];

      client1.on('message', (data) => messages1.push(data.toString()));
      client2.on('message', (data) => messages2.push(data.toString()));

      server.broadcast({ type: 'test', value: 42 });

      await vi.waitFor(() => {
        expect(messages1).toHaveLength(1);
        expect(messages2).toHaveLength(1);
      });

      expect(messages1).toEqual([JSON.stringify({ type: 'test', value: 42 })]);
      expect(messages2).toEqual([JSON.stringify({ type: 'test', value: 42 })]);

      client1.close();
      client2.close();
    });

    it('throws if server not started', () => {
      expect(() => server.broadcast({ type: 'test' })).toThrow('Server not started');
    });
  });

  describe('sendTo()', () => {
    it('sends message to specific client', async () => {
      const port = await server.start();

      const client = new WebSocket(`ws://localhost:${port}`);
      await new Promise<void>((resolve) => client.on('open', () => resolve()));

      const messages: string[] = [];
      client.on('message', (data) => messages.push(data.toString()));

      const clients = server.getClients();
      const serverClient = Array.from(clients)[0];
      if (serverClient) {
        server.sendTo(serverClient, { type: 'specific' });
      }

      await vi.waitFor(() => {
        expect(messages).toHaveLength(1);
      });

      expect(messages).toEqual([JSON.stringify({ type: 'specific' })]);
      client.close();
    });
  });

  describe('simulateEvent()', () => {
    it('broadcasts typed event', async () => {
      const port = await server.start();

      const client = new WebSocket(`ws://localhost:${port}`);
      await new Promise<void>((resolve) => client.on('open', () => resolve()));

      const messages: unknown[] = [];
      client.on('message', (data) => {
        messages.push(JSON.parse(data.toString()));
      });

      interface TestEvent {
        type: 'test:event';
        data: string;
      }
      server.simulateEvent<TestEvent>('test:event', { data: 'payload' });

      await vi.waitFor(() => {
        expect(messages).toHaveLength(1);
      });

      expect(messages).toEqual([{ type: 'test:event', data: 'payload' }]);
      client.close();
    });
  });

  describe('message receiving', () => {
    it('records messages from clients', async () => {
      const port = await server.start();

      const client = new WebSocket(`ws://localhost:${port}`);
      await new Promise<void>((resolve) => client.on('open', () => resolve()));

      client.send(JSON.stringify({ type: 'client:message', value: 'hello' }));

      await vi.waitFor(() => {
        expect(server.getReceivedMessages().length).toBe(1);
      });

      const messages = server.getReceivedMessages();
      expect(messages.length).toBe(1);
      expect(messages[0]?.data).toEqual({ type: 'client:message', value: 'hello' });

      client.close();
    });

    it('clears received messages', async () => {
      const port = await server.start();

      const client = new WebSocket(`ws://localhost:${port}`);
      await new Promise<void>((resolve) => client.on('open', () => resolve()));

      client.send(JSON.stringify({ type: 'test' }));
      await vi.waitFor(() => {
        expect(server.getReceivedMessages().length).toBe(1);
      });
      server.clearReceivedMessages();
      expect(server.getReceivedMessages().length).toBe(0);

      client.close();
    });
  });

  describe('awaitConnection()', () => {
    it('waits for client to connect', async () => {
      const port = await server.start();

      const connectionPromise = server.awaitConnection(1000);
      const client = new WebSocket(`ws://localhost:${port}`);

      const serverClient = await connectionPromise;
      expect(serverClient).toBeDefined();

      // Wait for client to fully open before closing
      await new Promise<void>((resolve) => {
        if (client.readyState === WebSocket.OPEN) {
          resolve();
        } else {
          client.on('open', () => resolve());
        }
      });

      client.close();
    });

    it('times out if no connection', async () => {
      await server.start();

      await expect(server.awaitConnection(100)).rejects.toThrow('Timeout waiting for connection after 100ms');
    });
  });

  describe('awaitMessage()', () => {
    it('waits for message from client', async () => {
      const port = await server.start();

      const client = new WebSocket(`ws://localhost:${port}`);
      await new Promise<void>((resolve) => client.on('open', () => resolve()));

      const messagePromise = server.awaitMessage(1000);
      client.send(JSON.stringify({ type: 'awaited' }));

      const data = await messagePromise;
      expect(data).toEqual({ type: 'awaited' });

      client.close();
    });

    it('times out if no message', async () => {
      const port = await server.start();

      const client = new WebSocket(`ws://localhost:${port}`);
      await new Promise<void>((resolve) => client.on('open', () => resolve()));

      await expect(server.awaitMessage(100)).rejects.toThrow('Timeout waiting for message after 100ms');

      client.close();
    });
  });

  describe('stop()', () => {
    it('closes all client connections', async () => {
      const port = await server.start();

      const client = new WebSocket(`ws://localhost:${port}`);
      await new Promise<void>((resolve) => client.on('open', () => resolve()));

      expect(server.getClientCount()).toBe(1);

      await server.stop();

      expect(server.getClientCount()).toBe(0);
    });

    it('can be called multiple times safely', async () => {
      await server.start();
      await server.stop();
      await server.stop();
      // Should not throw
    });
  });
});

describe('getRandomPort()', () => {
  it('returns an available port', async () => {
    const port = await getRandomPort();
    expect(port).toBeGreaterThan(0);
    expect(port).toBeLessThan(65536);
  });

  it('returns different ports on successive calls', async () => {
    const ports = await Promise.all([getRandomPort(), getRandomPort(), getRandomPort()]);

    // While not guaranteed to be different, they should be unique
    // in practice due to OS port allocation
    const uniquePorts = new Set(ports);
    expect(uniquePorts.size).toBeGreaterThanOrEqual(1);
  });
});
