/**
 * Tests for the stream-sync-watcher composition root.
 *
 * @summary Covers minimal-identity extraction and an end-to-end run against a fake control server.
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import * as http from 'node:http';
import * as net from 'node:net';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/client/api-discovery.js', () => ({
  discoverApiInfo: vi.fn()
}));

import { parseMinimalIdentity, runSession } from '../../src/bin/stream-sync-watcher.js';
import { discoverApiInfo } from '../../src/client/api-discovery.js';
import { createReconnectingWatcher } from '../../src/config/watcher/reconnectingWatcher.js';
import { socketEndpoint } from '../../src/config/watcher/socketEndpoint.js';
import type { SessionSyncManifest } from '../../src/transcript-sync/manifest.js';

const mockDiscoverApiInfo = vi.mocked(discoverApiInfo);

interface ParsedMessage {
  type: string;
  [key: string]: unknown;
}

function tmpSocketPath(): string {
  return path.join(tmpdir(), `ssw-${Math.random().toString(36).slice(2)}.sock`);
}

/**
 * Minimal control-socket test double, mirroring the harness used for
 * createWatcher/createReconnectingWatcher tests.
 *
 * @returns Test-double controls for starting/stopping the fake server and inspecting traffic.
 */
async function buildHarness() {
  const socketPath = tmpSocketPath();
  const serverMessages: ParsedMessage[] = [];
  let clientSocket: net.Socket | undefined;

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
        const parsed = JSON.parse(line) as ParsedMessage;
        serverMessages.push(parsed);
        if (parsed.type === 'hello') {
          socket.write(`${JSON.stringify({ type: 'hello-ack' })}\n`);
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
    httpServer.listen(0, '127.0.0.1', () => resolve((httpServer.address() as net.AddressInfo).port));
  });

  mockDiscoverApiInfo.mockResolvedValue({
    host: '127.0.0.1',
    port,
    pid: 99999,
    accessToken: 'test-token',
    startedAt: '2024-01-01T00:00:00Z'
  });

  return {
    serverMessages,
    sendControl(msg: object) {
      clientSocket?.write(`${JSON.stringify(msg)}\n`);
    },
    async stop() {
      clientSocket?.destroy();
      await new Promise<void>((r) => httpServer.close(() => r()));
      await new Promise<void>((r) => unixServer.close(() => r()));
      if (fs.existsSync(socketPath)) fs.unlinkSync(socketPath);
    }
  };
}

describe('parseMinimalIdentity', () => {
  it('extracts sessionId and cardId from valid manifest JSON', () => {
    expect(parseMinimalIdentity(JSON.stringify({ sessionId: 's1', cardId: 'c1', extra: true }))).toEqual({
      sessionId: 's1',
      cardId: 'c1'
    });
  });

  it('returns null for invalid JSON', () => {
    expect(parseMinimalIdentity('{not json')).toBeNull();
  });

  it('returns null when sessionId is missing or not a string', () => {
    expect(parseMinimalIdentity(JSON.stringify({ cardId: 'c1' }))).toBeNull();
    expect(parseMinimalIdentity(JSON.stringify({ sessionId: 42, cardId: 'c1' }))).toBeNull();
  });

  it('returns null when cardId is missing or empty', () => {
    expect(parseMinimalIdentity(JSON.stringify({ sessionId: 's1', cardId: '' }))).toBeNull();
  });

  it('returns null for a non-object JSON value', () => {
    expect(parseMinimalIdentity('"just a string"')).toBeNull();
    expect(parseMinimalIdentity('42')).toBeNull();
  });
});

describe('runSession', () => {
  let base: string;
  let watchRoot: string;
  let cardRepoPath: string;
  let manifest: SessionSyncManifest;

  beforeEach(() => {
    base = join(tmpdir(), `ssw-session-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    watchRoot = join(base, 'watchRoot');
    cardRepoPath = join(base, 'card');
    mkdirSync(watchRoot, { recursive: true });
    mkdirSync(cardRepoPath, { recursive: true });
    execFileSync('git', ['init'], { cwd: cardRepoPath });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: cardRepoPath });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: cardRepoPath });

    manifest = {
      version: 1,
      sessionId: 'sess-1',
      cardId: 'card-1',
      runtime: 'claude-code',
      streamType: 'claude-code-session',
      watchRoot,
      sources: [{ pattern: 'sess-1.jsonl', role: 'main', mode: 'jsonl-tail' }],
      // A PID that is essentially guaranteed not to be alive, so the lifecycle
      // loop exits via the process-death path on its very first check instead
      // of waiting for a real 5s steady tick.
      monitorPid: 2147483647,
      cardRepoPath
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    rmSync(base, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  it('syncs the main file, writes the sidecar, and commits on process-death exit', async () => {
    writeFileSync(join(watchRoot, 'sess-1.jsonl'), 'line1\n');

    const harness = await buildHarness();
    try {
      const handle = await createReconnectingWatcher({
        watcherId: manifest.sessionId,
        cardId: manifest.cardId,
        metadata: {}
      });

      await runSession(manifest, handle);

      const destPath = join(cardRepoPath, 'streams', 'claude-code-session', 'sess-1.jsonl');
      expect(readFileSync(destPath, 'utf-8')).toBe('line1\n');
      expect(existsSync(`${destPath}.meta.json`)).toBe(true);

      const log = execFileSync('git', ['log', '--format=%s'], { cwd: cardRepoPath, encoding: 'utf-8' });
      expect(log).toContain('Close session sess-1.');

      expect(
        harness.serverMessages.some((m) => m.type === 'event' && (m['event'] as ParsedMessage)?.type === 'watching')
      ).toBe(true);
    } finally {
      await harness.stop();
    }
  });

  it('closes gracefully and acknowledges a stop control without waiting for a steady tick', async () => {
    writeFileSync(join(watchRoot, 'sess-1.jsonl'), 'line1\n');
    manifest = { ...manifest, monitorPid: process.pid }; // stays alive; only a stop control ends the loop

    const harness = await buildHarness();
    try {
      const handle = await createReconnectingWatcher({
        watcherId: manifest.sessionId,
        cardId: manifest.cardId,
        metadata: {}
      });

      const runPromise = runSession(manifest, handle);

      await vi.waitFor(() => {
        expect(
          harness.serverMessages.some((m) => m.type === 'event' && (m['event'] as ParsedMessage)?.type === 'watching')
        ).toBe(true);
      });

      harness.sendControl({ type: 'control', command: { type: 'stop' } });
      await runPromise;

      expect(harness.serverMessages.some((m) => m.type === 'stop-ack')).toBe(true);

      const log = execFileSync('git', ['log', '--format=%s'], { cwd: cardRepoPath, encoding: 'utf-8' });
      expect(log).toContain('Close session sess-1.');
    } finally {
      await harness.stop();
    }
  });

  it('recovers a pre-existing destination file instead of re-tailing from zero', async () => {
    const destDir = join(cardRepoPath, 'streams', 'claude-code-session');
    mkdirSync(destDir, { recursive: true });
    writeFileSync(join(destDir, 'sess-1.jsonl'), 'line1\n');
    writeFileSync(join(watchRoot, 'sess-1.jsonl'), 'line1\nline2\n');

    const harness = await buildHarness();
    try {
      const handle = await createReconnectingWatcher({
        watcherId: manifest.sessionId,
        cardId: manifest.cardId,
        metadata: {}
      });

      await runSession(manifest, handle);

      const destPath = join(destDir, 'sess-1.jsonl');
      // Only the newly-arrived line is appended — the pre-existing content is
      // not re-tailed/duplicated.
      expect(readFileSync(destPath, 'utf-8')).toBe('line1\nline2\n');
    } finally {
      await harness.stop();
    }
  });
});
