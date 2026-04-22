/**
 * Tests for the createWatcher primitive.
 *
 * @summary Tests for watcher lifecycle, handshake, and control flow
 */

import * as fs from 'node:fs';
import * as http from 'node:http';
import * as net from 'node:net';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/client/api-discovery.js', () => ({
  discoverApiInfo: vi.fn()
}));

import { discoverApiInfo } from '../../../src/client/api-discovery.js';
import type { WatcherContext } from '../../../src/config/watcher/context.js';
import { createWatcher } from '../../../src/config/watcher/createWatcher.js';
import { WatcherRegistrationError } from '../../../src/config/watcher/errors.js';

const mockDiscoverApiInfo = vi.mocked(discoverApiInfo);

function tmpSocketPath(): string {
  return path.join(os.tmpdir(), `tw-${Math.random().toString(36).slice(2)}.sock`);
}

interface ParsedMessage {
  type: string;
  [key: string]: unknown;
}

interface Harness {
  socketPath: string;
  serverMessages: ParsedMessage[];
  sendToClient: (msg: object) => void;
  stop(): Promise<void>;
}

async function buildHarness(opts: { onHello?: (socket: net.Socket, msg: ParsedMessage) => void }): Promise<Harness> {
  const socketPath = tmpSocketPath();
  const serverMessages: ParsedMessage[] = [];
  let activeSocket: net.Socket | undefined;

  const unixServer = net.createServer((clientSocket) => {
    activeSocket = clientSocket;
    let buf = '';

    clientSocket.on('data', (chunk: Buffer) => {
      buf += chunk.toString();
      for (;;) {
        const idx = buf.indexOf('\n');
        if (idx === -1) break;
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        if (!line.trim()) continue;
        let parsed: ParsedMessage;
        try {
          parsed = JSON.parse(line) as ParsedMessage;
        } catch (err) {
          if (err instanceof SyntaxError) continue;
          throw err;
        }
        serverMessages.push(parsed);
        if (parsed.type === 'hello') {
          if (opts.onHello) {
            opts.onHello(clientSocket, parsed);
          } else {
            clientSocket.write(`${JSON.stringify({ type: 'hello-ack' })}\n`);
          }
        }
      }
    });
  });

  await new Promise<void>((resolve) => unixServer.listen(socketPath, resolve));

  const httpServer = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ socketPath }));
  });

  const port = await new Promise<number>((resolve) => {
    httpServer.listen(0, '127.0.0.1', () => {
      resolve((httpServer.address() as net.AddressInfo).port);
    });
  });

  mockDiscoverApiInfo.mockResolvedValue({
    host: '127.0.0.1',
    port,
    pid: 99999,
    accessToken: 'test-token',
    startedAt: '2024-01-01T00:00:00Z'
  });

  return {
    socketPath,
    serverMessages,
    sendToClient(msg: object) {
      activeSocket?.write(`${JSON.stringify(msg)}\n`);
    },
    async stop() {
      await new Promise<void>((r) => httpServer.close(() => r()));
      await new Promise<void>((r) => unixServer.close(() => r()));
      if (fs.existsSync(socketPath)) fs.unlinkSync(socketPath);
    }
  };
}

describe('createWatcher', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('handshake happy path: POST returns socketPath → dial → hello → hello-ack → handler runs → returns → run() resolves', async () => {
    const harness = await buildHarness({});
    let handlerInvoked = false;

    try {
      const handle = await createWatcher(
        { watcherId: 'w1', cardId: 'c1', metadata: {} },
        async (_ctx: WatcherContext) => {
          handlerInvoked = true;
        }
      );
      await handle.run();

      expect(handlerInvoked).toBe(true);
      expect(harness.serverMessages.some((m) => m.type === 'hello')).toBe(true);
    } finally {
      await harness.stop();
    }
  });

  it('extension-down throws WatcherRegistrationError', async () => {
    mockDiscoverApiInfo.mockResolvedValue(null);

    await expect(createWatcher({ watcherId: 'wx', cardId: 'cx', metadata: {} }, async () => {})).rejects.toThrow(
      WatcherRegistrationError
    );
  });

  it('duplicate watcherId: server closes first socket — existing watcher run() rejects with specific error', async () => {
    let firstSocket: net.Socket | undefined;
    let connectionCount = 0;

    const harness = await buildHarness({
      onHello(socket) {
        connectionCount++;
        if (connectionCount === 1) {
          firstSocket = socket;
          socket.write(`${JSON.stringify({ type: 'hello-ack' })}\n`);
        } else {
          socket.write(`${JSON.stringify({ type: 'hello-ack' })}\n`);
          firstSocket?.destroy();
        }
      }
    });

    try {
      const firstHandle = await createWatcher({ watcherId: 'dup', cardId: 'c1', metadata: {} }, async () => {
        await new Promise<void>(() => {});
      });

      const runPromise = firstHandle.run();

      await new Promise<void>((r) => setTimeout(r, 50));

      const secondHandle = await createWatcher({ watcherId: 'dup', cardId: 'c1', metadata: {} }, async () => {});

      await expect(runPromise).rejects.toThrow(/unexpected/i);
      await secondHandle.run();
    } finally {
      await harness.stop();
    }
  });

  it('onControl("stop") callback fires on incoming control, then stop-ack is sent, then socket closes cleanly', async () => {
    const harness = await buildHarness({});
    let stopCallbackFired = false;

    try {
      const handle = await createWatcher(
        { watcherId: 'w-stop', cardId: 'c1', metadata: {} },
        async (ctx: WatcherContext) => {
          ctx.onControl('stop', async () => {
            stopCallbackFired = true;
          });
          await new Promise<void>((resolve) => {
            const interval = setInterval(() => {
              if (stopCallbackFired) {
                clearInterval(interval);
                resolve();
              }
            }, 10);
          });
        }
      );

      const runPromise = handle.run();

      await new Promise<void>((r) => setTimeout(r, 50));
      harness.sendToClient({ type: 'control', command: { type: 'stop' } });

      await runPromise;
      // Allow server's data event to fire (stop-ack is written before socket.end()
      // callback, but the server data event is async relative to the end callback)
      await new Promise<void>((r) => setTimeout(r, 20));

      expect(stopCallbackFired).toBe(true);
      expect(harness.serverMessages.some((m) => m.type === 'stop-ack')).toBe(true);
    } finally {
      await harness.stop();
    }
  });

  it('unregistered control command types are warned-and-ignored', async () => {
    const harness = await buildHarness({});
    let handlerComplete = false;

    try {
      const handle = await createWatcher(
        { watcherId: 'w-unk', cardId: 'c1', metadata: {} },
        async (_ctx: WatcherContext) => {
          await new Promise<void>((r) => setTimeout(r, 150));
          handlerComplete = true;
        }
      );

      const runPromise = handle.run();

      await new Promise<void>((r) => setTimeout(r, 50));
      harness.sendToClient({ type: 'control', command: { type: 'unknown-cmd' } });

      await runPromise;
      expect(handlerComplete).toBe(true);

      const warnLogs = harness.serverMessages.filter((m) => m.type === 'log' && m['level'] === 'warn');
      expect(warnLogs.some((m) => String(m['message']).includes('unknown-cmd'))).toBe(true);
    } finally {
      await harness.stop();
    }
  });

  it('events emitted before hello-ack are buffered; events emitted after stop-ack are dropped', async () => {
    const socketPath = tmpSocketPath();
    const serverMessages: ParsedMessage[] = [];
    let clientSocket: net.Socket | undefined;
    let resolveHelloSeen: (() => void) | undefined;
    const helloSeen = new Promise<void>((r) => {
      resolveHelloSeen = r;
    });

    const unixServer = net.createServer((socket) => {
      clientSocket = socket;
      let buf = '';
      socket.on('data', (chunk: Buffer) => {
        buf += chunk.toString();
        for (;;) {
          const idx = buf.indexOf('\n');
          if (idx === -1) break;
          const line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (!line.trim()) continue;
          let msg: ParsedMessage;
          try {
            msg = JSON.parse(line) as ParsedMessage;
          } catch (err) {
            if (err instanceof SyntaxError) continue;
            throw err;
          }
          serverMessages.push(msg);
          if (msg.type === 'hello') resolveHelloSeen?.();
        }
      });
    });

    await new Promise<void>((r) => unixServer.listen(socketPath, r));

    const httpServer = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ socketPath }));
    });

    const port = await new Promise<number>((resolve) => {
      httpServer.listen(0, '127.0.0.1', () => {
        resolve((httpServer.address() as net.AddressInfo).port);
      });
    });

    mockDiscoverApiInfo.mockResolvedValue({
      host: '127.0.0.1',
      port,
      pid: 99999,
      accessToken: 'test-token',
      startedAt: '2024-01-01T00:00:00Z'
    });

    const watcherPromise = createWatcher(
      { watcherId: 'w-buf', cardId: 'c1', metadata: {} },
      async (ctx: WatcherContext) => {
        ctx.emit({ type: 'post-ack-event', data: 1 });

        let stopFired = false;
        ctx.onControl('stop', async () => {
          stopFired = true;
        });
        await new Promise<void>((resolve) => {
          const iv = setInterval(() => {
            if (stopFired) {
              clearInterval(iv);
              resolve();
            }
          }, 10);
        });
      }
    );

    await helloSeen;
    clientSocket!.write(`${JSON.stringify({ type: 'hello-ack' })}\n`);

    const handle = await watcherPromise;
    const runPromise = handle.run();

    await new Promise<void>((r) => setTimeout(r, 50));
    clientSocket!.write(`${JSON.stringify({ type: 'control', command: { type: 'stop' } })}\n`);

    await runPromise;
    // Allow server's data event to fire (stop-ack write precedes socket.end() callback
    // but the server data event is async relative to the local end callback)
    await new Promise<void>((r) => setTimeout(r, 20));

    const eventMsgs = serverMessages.filter((m) => m.type === 'event');
    expect(eventMsgs.some((m) => (m['event'] as ParsedMessage | undefined)?.type === 'post-ack-event')).toBe(true);
    expect(serverMessages.some((m) => m.type === 'stop-ack')).toBe(true);

    await new Promise<void>((r) => httpServer.close(() => r()));
    await new Promise<void>((r) => unixServer.close(() => r()));
    if (fs.existsSync(socketPath)) fs.unlinkSync(socketPath);
  });
});
