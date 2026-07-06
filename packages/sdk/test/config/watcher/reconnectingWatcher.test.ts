/**
 * Tests for the reconnecting watcher control channel.
 *
 * @summary Covers initial connect, transparent emit/log forwarding, reconnect-after-drop, and stop handling.
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
import { createReconnectingWatcher } from '../../../src/config/watcher/reconnectingWatcher.js';
import { socketEndpoint } from '../../../src/config/watcher/socketEndpoint.js';

const mockDiscoverApiInfo = vi.mocked(discoverApiInfo);

function tmpSocketPath(): string {
  return path.join(os.tmpdir(), `rw-${Math.random().toString(36).slice(2)}.sock`);
}

interface ParsedMessage {
  type: string;
  [key: string]: unknown;
}

/**
 * A control-socket test double that listens on a fresh socket path each time
 * a client dials (mirroring the extension registering a fresh socketPath per
 * POST /internal/watchers call), so reconnect tests can assert re-registration
 * actually happened.
 *
 * @returns Test-double controls: start/stop, recorded registrations/sockets/messages, and a drop helper.
 */
function buildServer() {
  const registrations: string[] = [];
  const sockets: net.Socket[] = [];
  const messagesBySocket = new Map<net.Socket, ParsedMessage[]>();
  let currentSocketPath = tmpSocketPath();
  let unixServer: net.Server | undefined;

  async function listen(): Promise<void> {
    unixServer?.close();
    currentSocketPath = tmpSocketPath();
    unixServer = net.createServer((clientSocket) => {
      sockets.push(clientSocket);
      messagesBySocket.set(clientSocket, []);
      let buf = '';
      clientSocket.on('data', (chunk: Buffer) => {
        buf += chunk.toString();
        for (;;) {
          const idx = buf.indexOf('\n');
          if (idx === -1) break;
          const line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (!line.trim()) continue;
          const parsed = JSON.parse(line) as ParsedMessage;
          messagesBySocket.get(clientSocket)?.push(parsed);
          if (parsed.type === 'hello') {
            registrations.push(String(parsed['watcherId']));
            clientSocket.write(`${JSON.stringify({ type: 'hello-ack' })}\n`);
          }
        }
      });
    });
    await new Promise<void>((resolve) => unixServer!.listen(socketEndpoint(currentSocketPath), resolve));
  }

  const httpServer = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ socketPath: currentSocketPath }));
  });

  return {
    async start(): Promise<number> {
      await listen();
      return new Promise<number>((resolve) => {
        httpServer.listen(0, '127.0.0.1', () => resolve((httpServer.address() as net.AddressInfo).port));
      });
    },
    registrations,
    sockets,
    messagesBySocket,
    /** Simulates the control socket dropping (extension restart). */
    dropCurrentSocket(): void {
      sockets[sockets.length - 1]?.destroy();
    },
    async stop(): Promise<void> {
      for (const s of sockets) s.destroy();
      await new Promise<void>((r) => httpServer.close(() => r()));
      await new Promise<void>((r) => unixServer?.close(() => r()));
      if (fs.existsSync(currentSocketPath)) fs.unlinkSync(currentSocketPath);
    }
  };
}

describe('createReconnectingWatcher', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('connects, and ctx.emit forwards events over the socket', async () => {
    const server = buildServer();
    const port = await server.start();
    mockDiscoverApiInfo.mockResolvedValue({
      host: '127.0.0.1',
      port,
      pid: 1,
      accessToken: 'tok',
      startedAt: '2024-01-01T00:00:00Z'
    });

    try {
      const handle = await createReconnectingWatcher({ watcherId: 'w1', cardId: 'c1', metadata: {} });
      handle.ctx.emit({ type: 'status', data: { files: [] } });

      await vi.waitFor(() => {
        const msgs = server.messagesBySocket.get(server.sockets[0]!) ?? [];
        expect(msgs.some((m) => m.type === 'event')).toBe(true);
      });

      handle.shutdown();
    } finally {
      await server.stop();
    }
  });

  it('reconnects with a fresh registration after the control socket drops unexpectedly', async () => {
    const server = buildServer();
    const port = await server.start();
    mockDiscoverApiInfo.mockResolvedValue({
      host: '127.0.0.1',
      port,
      pid: 1,
      accessToken: 'tok',
      startedAt: '2024-01-01T00:00:00Z'
    });

    try {
      const handle = await createReconnectingWatcher({ watcherId: 'w-reconnect', cardId: 'c1', metadata: {} });
      await vi.waitFor(() => expect(server.registrations.length).toBe(1));

      server.dropCurrentSocket();

      await vi.waitFor(() => expect(server.registrations.length).toBe(2), { timeout: 5000, interval: 25 });
      expect(server.registrations).toEqual(['w-reconnect', 'w-reconnect']);

      // ctx must still work post-reconnect.
      handle.ctx.emit({ type: 'status', data: {} });
      await vi.waitFor(() => {
        const latestSocket = server.sockets[server.sockets.length - 1]!;
        const msgs = server.messagesBySocket.get(latestSocket) ?? [];
        expect(msgs.some((m) => m.type === 'event')).toBe(true);
      });

      handle.shutdown();
    } finally {
      await server.stop();
    }
  }, 10000);

  it('runs the stop handler and resolves waitForStop on a stop control', async () => {
    const server = buildServer();
    const port = await server.start();
    mockDiscoverApiInfo.mockResolvedValue({
      host: '127.0.0.1',
      port,
      pid: 1,
      accessToken: 'tok',
      startedAt: '2024-01-01T00:00:00Z'
    });

    try {
      const handle = await createReconnectingWatcher({ watcherId: 'w-stop', cardId: 'c1', metadata: {} });
      let stopFired = false;
      handle.ctx.onControl('stop', () => {
        stopFired = true;
      });

      await vi.waitFor(() => expect(server.sockets.length).toBe(1));
      server.sockets[0]!.write(`${JSON.stringify({ type: 'control', command: { type: 'stop' } })}\n`);

      await handle.waitForStop();
      expect(stopFired).toBe(true);

      await vi.waitFor(() => {
        const msgs = server.messagesBySocket.get(server.sockets[0]!) ?? [];
        expect(msgs.some((m) => m.type === 'stop-ack')).toBe(true);
      });
    } finally {
      await server.stop();
    }
  });

  it('does not attempt to reconnect after shutdown()', async () => {
    const server = buildServer();
    const port = await server.start();
    mockDiscoverApiInfo.mockResolvedValue({
      host: '127.0.0.1',
      port,
      pid: 1,
      accessToken: 'tok',
      startedAt: '2024-01-01T00:00:00Z'
    });

    try {
      const handle = await createReconnectingWatcher({ watcherId: 'w-shutdown', cardId: 'c1', metadata: {} });
      await vi.waitFor(() => expect(server.registrations.length).toBe(1));

      handle.shutdown();
      server.dropCurrentSocket();

      // Give any (incorrect) reconnect attempt a chance to fire, then assert none did.
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(server.registrations.length).toBe(1);
    } finally {
      await server.stop();
    }
  });
});
