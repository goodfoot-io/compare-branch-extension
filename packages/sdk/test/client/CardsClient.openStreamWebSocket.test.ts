/**
 * SDK-level integration tests for `CardsClient.openStreamWebSocket()` against a real
 * WebSocket server.
 *
 * Each test spins up a minimal `ws.WebSocketServer` on a random port and injects
 * a `wsFactory` into `openStreamWebSocket()` so no real network address is needed.
 * The factory creates a real `ws.WebSocket` client pointing at the test server,
 * keeping both sides of the connection real while staying self-contained.
 *
 *
 * @summary SDK integration tests for CardsClient.openStreamWebSocket()
 * @module test/client/CardsClient.openStreamWebSocket
 */

import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';
import { CardsClient } from '../../src/client/cardsClient.js';
import type { IngestWsFactory } from '../../src/client/types/client.js';

// ---------------------------------------------------------------------------
// Test server helpers
// ---------------------------------------------------------------------------

/**
 * A simplified WebSocket session handler for tests.
 *
 * Receives a `ws.WebSocket` server-side socket and lets individual tests
 * control the conversation (send ready, record messages, etc.).
 */
interface TestServerSession {
  /** The server-side WebSocket for this connection. */
  socket: WebSocket;
  /** Messages received from the client (parsed JSON). */
  received: unknown[];
  /** Send a JSON message to the client. */
  send(msg: unknown): void;
}

interface TestWsServer {
  httpServer: Server;
  wsServer: WebSocketServer;
  port: number;
  /** Wait for the next client connection and return a TestServerSession. */
  nextConnection(): Promise<TestServerSession>;
}

/**
 * Creates a minimal HTTP + WebSocket server for test use.
 *
 * @returns Bound test server object.
 */
async function createTestWsServer(): Promise<TestWsServer> {
  const httpServer = createServer();
  const wsServer = new WebSocketServer({ server: httpServer });

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const port = (httpServer.address() as AddressInfo).port;

  function nextConnection(): Promise<TestServerSession> {
    return new Promise((resolve) => {
      wsServer.once('connection', (socket: WebSocket) => {
        const received: unknown[] = [];
        socket.on('message', (data: Buffer | string) => {
          received.push(JSON.parse(data.toString()));
        });
        const session: TestServerSession = {
          socket,
          received,
          send(msg: unknown) {
            socket.send(JSON.stringify(msg));
          }
        };
        resolve(session);
      });
    });
  }

  return { httpServer, wsServer, port, nextConnection };
}

/**
 * Stops the test server, waiting for all connections to drain.
 *
 * @param srv - Test server to stop.
 */
async function stopTestWsServer(srv: TestWsServer): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    srv.wsServer.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  await new Promise<void>((resolve, reject) => {
    srv.httpServer.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Builds an `IngestWsFactory` that ignores the URL produced by `CardsClient`
 * and instead connects to the given test server port, preserving the original
 * `Authorization` header.
 *
 * The return cast `as unknown as globalThis.WebSocket` mirrors the pattern used
 * in {@link createDefaultWsFactory} in `cardsClient.ts`: the `ws` package's
 * `WebSocket` is structurally compatible with the browser `WebSocket` API that
 * `IngestWsFactory` is typed against, but the two types are nominally distinct.
 *
 * @param port - Local port of the test WebSocket server.
 * @returns A factory usable as the `wsFactory` parameter of `openStreamWebSocket`.
 */
function makeFactory(port: number): IngestWsFactory {
  return (_url: string, options: { headers: Record<string, string> }): globalThis.WebSocket => {
    // Connect to the test server regardless of the URL CardsClient computed.
    // The Authorization header is forwarded so auth behaviour can be tested.
    return new WebSocket(`ws://127.0.0.1:${port}`, { headers: options.headers }) as unknown as globalThis.WebSocket;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Wait for the server-side session to have received at least `count` messages.
 *
 * @param session - Test server session to poll.
 * @param count - Target message count.
 * @param timeoutMs - Maximum wait time.
 */
async function waitForMessages(session: TestServerSession, count: number, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (session.received.length >= count) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error(
    `waitForMessages timed out: expected ${String(count)} messages, got ${String(session.received.length)}`
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CardsClient.openStreamWebSocket()', () => {
  const TEST_TIMEOUT = 10_000;

  let srv: TestWsServer;
  let client: CardsClient;

  beforeEach(async () => {
    srv = await createTestWsServer();
    client = new CardsClient({
      baseUrl: `http://127.0.0.1:${srv.port}`,
      accessToken: 'test-token'
    });
  });

  afterEach(async () => {
    await stopTestWsServer(srv);
  });

  it(
    'ready message received → session returned with correct resumeFrom',
    async () => {
      const connectionPromise = srv.nextConnection();
      const sessionPromise = client.openStreamWebSocket(
        'card-1',
        'claude-code-session',
        'session.jsonl',
        {},
        makeFactory(srv.port)
      );

      const serverSession = await connectionPromise;
      // Server sends ready with resumeFrom: 5
      serverSession.send({ type: 'ready', resumeFrom: 5 });

      const session = await sessionPromise;
      expect(session.resumeFrom).toBe(5);
      expect(session.linesSent).toBe(5);

      // Cleanup: close server-side socket
      serverSession.socket.close();
    },
    TEST_TIMEOUT
  );

  it(
    'write() sends { type: "line", lineNumber, content } to the server',
    async () => {
      const connectionPromise = srv.nextConnection();
      const sessionPromise = client.openStreamWebSocket(
        'card-1',
        'claude-code-session',
        'session.jsonl',
        {},
        makeFactory(srv.port)
      );

      const serverSession = await connectionPromise;
      serverSession.send({ type: 'ready', resumeFrom: 0 });

      const session = await sessionPromise;

      session.write('{"type":"init"}');
      session.write('{"type":"result"}');

      await waitForMessages(serverSession, 2);

      expect(serverSession.received[0]).toEqual({
        type: 'line',
        lineNumber: 1,
        content: '{"type":"init"}'
      });
      expect(serverSession.received[1]).toEqual({
        type: 'line',
        lineNumber: 2,
        content: '{"type":"result"}'
      });
      expect(session.linesSent).toBe(2);

      serverSession.socket.close();
    },
    TEST_TIMEOUT
  );

  it(
    'lineNumber increments from resumeFrom when session resumes',
    async () => {
      const connectionPromise = srv.nextConnection();
      const sessionPromise = client.openStreamWebSocket(
        'card-1',
        'claude-code-session',
        'session.jsonl',
        {},
        makeFactory(srv.port)
      );

      const serverSession = await connectionPromise;
      // Simulate a resumed stream: server already has 3 lines
      serverSession.send({ type: 'ready', resumeFrom: 3 });

      const session = await sessionPromise;
      expect(session.resumeFrom).toBe(3);

      session.write('new line 4');

      await waitForMessages(serverSession, 1);

      // lineNumber should start at resumeFrom + 1
      expect(serverSession.received[0]).toEqual({
        type: 'line',
        lineNumber: 4,
        content: 'new line 4'
      });
      expect(session.linesSent).toBe(4);

      serverSession.socket.close();
    },
    TEST_TIMEOUT
  );

  it(
    'close() sends { type: "close" } and resolves with StreamResult',
    async () => {
      const connectionPromise = srv.nextConnection();
      const sessionPromise = client.openStreamWebSocket(
        'card-1',
        'claude-code-session',
        'session.jsonl',
        {},
        makeFactory(srv.port)
      );

      const serverSession = await connectionPromise;
      serverSession.send({ type: 'ready', resumeFrom: 0 });

      const session = await sessionPromise;

      session.write('line one');

      // close() sends the close message and waits for the WS to close
      const closePromise = session.close();

      // Server sees the close message then closes its end
      await waitForMessages(serverSession, 2); // line + close
      expect(serverSession.received[1]).toEqual({ type: 'close' });

      serverSession.socket.close(1000);

      const result = await closePromise;
      expect(result.filename).toBe('session.jsonl');
      expect(result.streamType).toBe('claude-code-session');
      expect(result.lineCount).toBe(1);
      expect(result.status).toBe('completed');
    },
    TEST_TIMEOUT
  );

  it(
    'rejects when the server sends an error message before ready',
    async () => {
      const connectionPromise = srv.nextConnection();
      const sessionPromise = client.openStreamWebSocket(
        'card-1',
        'claude-code-session',
        'session.jsonl',
        {},
        makeFactory(srv.port)
      );

      const serverSession = await connectionPromise;
      // Server rejects — sends error instead of ready
      serverSession.send({ type: 'error', message: 'Stream already has a live connection' });
      serverSession.socket.close(4409);

      await expect(sessionPromise).rejects.toThrow('Stream already has a live connection');
    },
    TEST_TIMEOUT
  );

  it(
    'rejects when the WebSocket closes before ready is received',
    async () => {
      const connectionPromise = srv.nextConnection();
      const sessionPromise = client.openStreamWebSocket(
        'card-1',
        'claude-code-session',
        'session.jsonl',
        {},
        makeFactory(srv.port)
      );

      const serverSession = await connectionPromise;
      // Close immediately without sending ready
      serverSession.socket.close(1001, 'Going Away');

      await expect(sessionPromise).rejects.toThrow(/closed before ready/);
    },
    TEST_TIMEOUT
  );

  it(
    'Authorization header is forwarded when accessToken is set',
    async () => {
      // Capture the headers from the upgrade request
      let capturedAuthHeader = '';
      srv.wsServer.once('connection', (_socket, request) => {
        capturedAuthHeader = request.headers['authorization'] ?? '';
      });

      const connectionPromise = srv.nextConnection();
      const sessionPromise = client.openStreamWebSocket(
        'card-1',
        'claude-code-session',
        'session.jsonl',
        {},
        makeFactory(srv.port)
      );

      const serverSession = await connectionPromise;
      serverSession.send({ type: 'ready', resumeFrom: 0 });

      await sessionPromise;

      expect(capturedAuthHeader).toBe('Bearer test-token');

      serverSession.socket.close();
    },
    TEST_TIMEOUT
  );
});
