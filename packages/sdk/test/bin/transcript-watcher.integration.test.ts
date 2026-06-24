/**
 * End-to-end integration test for the relocated transcript watcher.
 *
 * Spawns the built `transcript-watcher.mjs` binary as a real child process
 * against a harness that simulates the extension: an HTTP server for
 * `POST /internal/watchers` discovery + registration, and a Unix-domain
 * control socket that speaks the Phase-1 protocol (hello / hello-ack /
 * event / log / control / stop-ack).
 *
 * Asserts that the four surviving exit paths still fire:
 *   1. `stop` control → final flush, stop-ack emitted, child exits 0.
 *   2. `.flush` sentinel → final flush + commit, child exits 0.
 *   3. PID-death → final flush + commit, child exits 0.
 *
 * The 24h cap is covered by inspection in the unit test — exercising it here
 * would require either process-spanning time or a hook into private state.
 *
 * @summary End-to-end tests for transcript-watcher binary via real spawn
 */

import { type ChildProcess, execFile, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import * as http from 'node:http';
import * as net from 'node:net';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// The spawned binary dials createWatcher's platform endpoint (named pipe on
// Windows); the harness must listen on the same mapped endpoint while still
// advertising the logical .sock path over HTTP discovery.
import { socketEndpoint } from '../../src/config/watcher/socketEndpoint.js';

const execFileAsync = promisify(execFile);

// fileURLToPath (not URL.pathname) — on Windows URL.pathname yields a
// leading-slash, percent-encoded path like /C:/... that path APIs reject.
const BUILT_BINARY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../../packages/extension/dist/bin/transcript-watcher.mjs'
);

interface ParsedMessage {
  type: string;
  [key: string]: unknown;
}

interface Harness {
  socketPath: string;
  apiInfoDir: string;
  apiInfoPath: string;
  serverMessages: ParsedMessage[];
  sendToClient: (msg: object) => void;
  waitForHello: () => Promise<void>;
  waitForWatching: () => Promise<void>;
  waitForStopAck: () => Promise<void>;
  stop(): Promise<void>;
}

async function buildHarness(): Promise<Harness> {
  const socketPath = path.join(tmpdir(), `tw-int-${Math.random().toString(36).slice(2)}.sock`);
  const serverMessages: ParsedMessage[] = [];
  let activeSocket: net.Socket | undefined;
  let helloResolve: (() => void) | undefined;
  const helloPromise = new Promise<void>((r) => {
    helloResolve = r;
  });
  let stopAckResolve: (() => void) | undefined;
  const stopAckPromise = new Promise<void>((r) => {
    stopAckResolve = r;
  });
  let watchingResolve: (() => void) | undefined;
  const watchingPromise = new Promise<void>((r) => {
    watchingResolve = r;
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
          clientSocket.write(`${JSON.stringify({ type: 'hello-ack' })}\n`);
          helloResolve?.();
        } else if (
          parsed.type === 'event' &&
          (parsed as ParsedMessage & { event?: { type?: string } }).event?.type === 'watching'
        ) {
          watchingResolve?.();
        } else if (parsed.type === 'stop-ack') {
          stopAckResolve?.();
        }
      }
    });
  });

  await new Promise<void>((resolve) => unixServer.listen(socketEndpoint(socketPath), resolve));

  const httpServer = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/internal/watchers') {
      let _body = '';
      req.on('data', (chunk: Buffer) => {
        _body += chunk.toString();
      });
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ socketPath }));
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });
  const port = await new Promise<number>((resolve) => {
    httpServer.listen(0, '127.0.0.1', () => {
      resolve((httpServer.address() as net.AddressInfo).port);
    });
  });

  // discoverApiInfo reads ~/.cards/cards-api.json — write one in an isolated HOME.
  const apiInfoDir = fs.mkdtempSync(join(tmpdir(), 'tw-int-home-'));
  mkdirSync(join(apiInfoDir, '.cards'), { recursive: true });
  const apiInfoPath = join(apiInfoDir, '.cards', 'cards-api.json');
  await writeFile(
    apiInfoPath,
    JSON.stringify({
      host: '127.0.0.1',
      port,
      pid: process.pid,
      accessToken: 'test-token',
      startedAt: new Date().toISOString()
    })
  );

  return {
    socketPath,
    apiInfoDir,
    apiInfoPath,
    serverMessages,
    sendToClient(msg: object) {
      activeSocket?.write(`${JSON.stringify(msg)}\n`);
    },
    waitForHello: () => helloPromise,
    waitForWatching: () => watchingPromise,
    waitForStopAck: () => stopAckPromise,
    async stop() {
      await new Promise<void>((r) => httpServer.close(() => r()));
      await new Promise<void>((r) => unixServer.close(() => r()));
      if (existsSync(socketPath)) fs.unlinkSync(socketPath);
      rmSync(apiInfoDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  };
}

async function initGitRepo(repoPath: string): Promise<void> {
  await execFileAsync('git', ['init', '-b', 'main', repoPath]);
  await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoPath });
  await execFileAsync('git', ['config', 'user.name', 'Test'], { cwd: repoPath });
  await execFileAsync('git', ['config', 'commit.gpgsign', 'false'], { cwd: repoPath });
  await execFileAsync('git', ['commit', '--allow-empty', '-m', 'init'], { cwd: repoPath });
}

function waitForChildExit(child: ChildProcess): Promise<number | null> {
  return new Promise((resolve) => {
    child.on('exit', (code) => resolve(code));
  });
}

describe('transcript-watcher binary integration', () => {
  let base: string;
  let cardRepoPath: string;
  let sourceDir: string;
  let sessionId: string;
  let harness: Harness;
  let child: ChildProcess | undefined;

  beforeEach(async () => {
    if (!existsSync(BUILT_BINARY)) {
      throw new Error(
        `Built transcript-watcher binary not found at ${BUILT_BINARY}. Run the extension build (e.g. 'yarn build' in packages/extension) to produce dist/bin first.`
      );
    }
    sessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    base = join(tmpdir(), `tw-int-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    cardRepoPath = join(base, 'card-repo');
    sourceDir = join(base, 'source');
    mkdirSync(cardRepoPath, { recursive: true });
    mkdirSync(sourceDir, { recursive: true });
    await initGitRepo(cardRepoPath);
    harness = await buildHarness();
  });

  afterEach(async () => {
    if (child && child.exitCode === null && !child.killed) {
      child.kill('SIGKILL');
    }
    child = undefined;
    await harness.stop();
    rmSync(base, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  function spawnWatcher(pid: number): ChildProcess {
    const transcriptPath = join(sourceDir, `${sessionId}.jsonl`);
    const proc = spawn(
      process.execPath,
      [BUILT_BINARY, String(pid), sessionId, transcriptPath, 'card-int', cardRepoPath],
      {
        env: { ...process.env, CARDS_DISCOVERY_PATH: harness.apiInfoPath },
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );
    return proc;
  }

  it('stop control → final flush, stop-ack observed, clean exit 0', async () => {
    const srcPath = join(sourceDir, `${sessionId}.jsonl`);
    writeFileSync(srcPath, '{"type":"init"}\n');

    child = spawnWatcher(process.pid);
    await harness.waitForHello();
    // Wait until the handler has entered its poll-loop (emits a 'watching'
    // event) before sending stop — otherwise the control can arrive before the
    // handler is listening and be dropped.
    await harness.waitForWatching();
    harness.sendToClient({ type: 'control', command: { type: 'stop' } });

    const code = await waitForChildExit(child);

    expect(code).toBe(0);
    expect(harness.serverMessages.some((m) => m.type === 'stop-ack')).toBe(true);
    const dest = join(cardRepoPath, 'streams', 'claude-code-session', `${sessionId}.jsonl`);
    expect(readFileSync(dest, 'utf-8')).toBe('{"type":"init"}\n');
  }, 120_000);

  it('.flush sentinel triggers exit, final flush, exit 0', async () => {
    const srcPath = join(sourceDir, `${sessionId}.jsonl`);
    writeFileSync(srcPath, '{"type":"sentinel"}\n');

    child = spawnWatcher(process.pid);
    await harness.waitForHello();

    const sentinelDir = join(cardRepoPath, 'streams', 'claude-code-session');
    mkdirSync(sentinelDir, { recursive: true });
    writeFileSync(join(sentinelDir, `${sessionId}.flush`), '');

    const code = await waitForChildExit(child);
    expect(code).toBe(0);

    const dest = join(sentinelDir, `${sessionId}.jsonl`);
    expect(readFileSync(dest, 'utf-8')).toBe('{"type":"sentinel"}\n');
    expect(existsSync(join(sentinelDir, `${sessionId}.flush`))).toBe(false);
  }, 60_000);

  it('live-tails when source dir is created after watcher starts', async () => {
    // Remove the pre-created source dir — simulate Claude not having created
    // ~/.claude/projects/<encoded-cwd>/ yet at the moment the watcher spawns.
    rmSync(sourceDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });

    child = spawnWatcher(process.pid);
    await harness.waitForHello();

    // Wait long enough that an eager fs.watch attempt would have already
    // failed with ENOENT and been swallowed by the catch block.
    await new Promise((r) => setTimeout(r, 500));

    // Now Claude creates its project directory and starts writing the transcript.
    mkdirSync(sourceDir, { recursive: true });
    const srcPath = join(sourceDir, `${sessionId}.jsonl`);
    writeFileSync(srcPath, '{"type":"line1"}\n');

    const dest = join(cardRepoPath, 'streams', 'claude-code-session', `${sessionId}.jsonl`);

    // Wait for the watcher to mirror the file LIVE — before any close path
    // (stop / sentinel / PID death) has fired. With the bug, the destination
    // remains empty until session shutdown.
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      if (existsSync(dest) && readFileSync(dest, 'utf-8').includes('line1')) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    expect(existsSync(dest), `dest ${dest} should exist before stop`).toBe(true);
    expect(readFileSync(dest, 'utf-8')).toContain('line1');

    // Append a second line and verify continued live tailing.
    writeFileSync(srcPath, '{"type":"line1"}\n{"type":"line2"}\n');
    const deadline2 = Date.now() + 10_000;
    while (Date.now() < deadline2) {
      if (existsSync(dest) && readFileSync(dest, 'utf-8').includes('line2')) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(readFileSync(dest, 'utf-8')).toContain('line2');

    // Clean shutdown.
    harness.sendToClient({ type: 'control', command: { type: 'stop' } });
    const code = await waitForChildExit(child);
    expect(code).toBe(0);
  }, 120_000);

  it('PID death triggers exit, final flush, exit 0', async () => {
    const srcPath = join(sourceDir, `${sessionId}.jsonl`);
    writeFileSync(srcPath, '{"type":"pid-death"}\n');

    // Spawn a sleep subprocess we can kill to trigger PID-death detection.
    const victim = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
      stdio: 'ignore',
      detached: false
    });
    await new Promise((r) => setTimeout(r, 50));

    child = spawnWatcher(victim.pid!);
    await harness.waitForHello();

    // Kill the victim to trigger the PID-death exit path.
    victim.kill('SIGKILL');

    const code = await waitForChildExit(child);
    expect(code).toBe(0);

    const dest = join(cardRepoPath, 'streams', 'claude-code-session', `${sessionId}.jsonl`);
    expect(readFileSync(dest, 'utf-8')).toBe('{"type":"pid-death"}\n');
  }, 60_000);
});
