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
// Listen on the same platform endpoint createWatcher dials. On Windows the
// logical .sock path is mapped to a named pipe; on POSIX it is unchanged.
import { socketEndpoint } from '../../../src/config/watcher/socketEndpoint.js';

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
  waitForHello(): Promise<void>;
  waitForStopAck(): Promise<void>;
  stop(): Promise<void>;
}

async function buildHarness(opts: { onHello?: (socket: net.Socket, msg: ParsedMessage) => void }): Promise<Harness> {
  const socketPath = tmpSocketPath();
  const serverMessages: ParsedMessage[] = [];
  let activeSocket: net.Socket | undefined;

  let resolveHello: (() => void) | undefined;
  const helloPromise: Promise<void> = new Promise<void>((r) => {
    resolveHello = r;
  });

  let resolveStopAck: (() => void) | undefined;
  const stopAckPromise: Promise<void> = new Promise<void>((r) => {
    resolveStopAck = r;
  });

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
          resolveHello?.();
          if (opts.onHello) {
            opts.onHello(clientSocket, parsed);
          } else {
            clientSocket.write(`${JSON.stringify({ type: 'hello-ack' })}\n`);
          }
        }
        if (parsed.type === 'stop-ack') {
          resolveStopAck?.();
        }
      }
    });
  });

  await new Promise<void>((resolve) => unixServer.listen(socketEndpoint(socketPath), resolve));

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
    waitForHello() {
      // If hello already arrived, resolve immediately
      if (serverMessages.some((m) => m.type === 'hello')) return Promise.resolve();
      return helloPromise;
    },
    waitForStopAck() {
      // If stop-ack already arrived, resolve immediately
      if (serverMessages.some((m) => m.type === 'stop-ack')) return Promise.resolve();
      return stopAckPromise;
    },
    async stop() {
      // Destroy any lingering client connection so unixServer.close() does not
      // wait on an open socket (e.g. when run() never resolved).
      activeSocket?.destroy();
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

      await harness.waitForHello();

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

      await harness.waitForHello();
      // Yield to let handle.run() start the handler and register onControl before
      // the stop command is delivered.
      await new Promise<void>((r) => setImmediate(r));
      harness.sendToClient({ type: 'control', command: { type: 'stop' } });

      await runPromise;
      await harness.waitForStopAck();

      expect(stopCallbackFired).toBe(true);
      expect(harness.serverMessages.some((m) => m.type === 'stop-ack')).toBe(true);
    } finally {
      await harness.stop();
    }
  });

  it('control message batched into the same chunk as hello-ack is delivered to run()', async () => {
    // Server coalesces hello-ack and the stop control into a single socket write,
    // exactly as the OS may coalesce two quick writes into one read. A stream
    // socket does not preserve message boundaries.
    const harness = await buildHarness({
      onHello(socket) {
        socket.write(
          `${JSON.stringify({ type: 'hello-ack' })}\n${JSON.stringify({ type: 'control', command: { type: 'stop' } })}\n`
        );
      }
    });

    let stopCallbackFired = false;

    try {
      const handle = await createWatcher(
        { watcherId: 'w-batch', cardId: 'c1', metadata: {} },
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

      // run() must resolve via the batched stop control. If the trailing control
      // bytes were dropped during the handshake, the stop handler never fires and
      // run() never resolves, so this races a timeout.
      const runPromise = handle.run();
      const timedOut = Symbol('timeout');
      const result = await Promise.race([
        runPromise.then(() => 'resolved'),
        new Promise<typeof timedOut>((r) => setTimeout(() => r(timedOut), 1000))
      ]);

      expect(result).toBe('resolved');
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

      await harness.waitForHello();
      // Yield to let handle.run() start the handler before the control message arrives.
      await new Promise<void>((r) => setImmediate(r));
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
    let resolveStopAckSeen: (() => void) | undefined;
    const stopAckSeen = new Promise<void>((r) => {
      resolveStopAckSeen = r;
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
          if (msg.type === 'stop-ack') resolveStopAckSeen?.();
        }
      });
    });

    await new Promise<void>((r) => unixServer.listen(socketEndpoint(socketPath), r));

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

    // Yield to let handle.run() start the handler and register onControl before
    // the stop command is delivered.
    await new Promise<void>((r) => setImmediate(r));
    clientSocket!.write(`${JSON.stringify({ type: 'control', command: { type: 'stop' } })}\n`);

    await runPromise;
    await stopAckSeen;

    const eventMsgs = serverMessages.filter((m) => m.type === 'event');
    expect(eventMsgs.some((m) => (m['event'] as ParsedMessage | undefined)?.type === 'post-ack-event')).toBe(true);
    expect(serverMessages.some((m) => m.type === 'stop-ack')).toBe(true);

    await new Promise<void>((r) => httpServer.close(() => r()));
    await new Promise<void>((r) => unixServer.close(() => r()));
    if (fs.existsSync(socketPath)) fs.unlinkSync(socketPath);
  });
});
