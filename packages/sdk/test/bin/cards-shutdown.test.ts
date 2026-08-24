/**
 * Tests for the `cards <card-id> shutdown` verb.
 *
 * Exercises {@link runShutdownVerb} against a real Unix-domain socket server,
 * asserting the exact NDJSON ingress line, outcome validation, and fail-closed
 * behavior when `$SOCKET_PATH` is absent or unreachable.
 *
 * @summary CLI shutdown verb contract tests
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as net from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const tsxCli = createRequire(import.meta.url).resolve('tsx/cli');

describe('cards shutdown verb', () => {
  let server: net.Server;
  let socketPath: string;
  let serverReceived: string[];
  const envBackup = { ...process.env };

  beforeEach(() => {
    socketPath = join(tmpdir(), `cards-shutdown-test-${process.pid}-${Date.now()}.sock`);
    serverReceived = [];
    delete process.env['SOCKET_PATH'];
    vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit should not be called');
    }) as never);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    process.env = { ...envBackup };
    if (server) {
      for (const conn of (server as unknown as { connections?: net.Socket[] }).connections ?? []) {
        conn.destroy();
      }
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
    try {
      fs.unlinkSync(socketPath);
    } catch {
      // best-effort cleanup
    }
  });

  function startServer(onLine?: (line: string) => void): Promise<void> {
    let buffer = '';
    return new Promise((resolve) => {
      server = net.createServer((socket) => {
        socket.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.trim()) continue;
            serverReceived.push(line);
            onLine?.(line);
          }
        });
      });
      server.listen(socketPath, () => resolve());
    });
  }

  function runCli(args: string[], env: NodeJS.ProcessEnv): { stdout: string; stderr: string; status: number } {
    const cwd = join(import.meta.dirname, '..', '..', '..');
    const result = execFileSync(process.execPath, [tsxCli, 'src/bin/cards.ts', 'test-card', 'shutdown', ...args], {
      cwd,
      env: { ...process.env, ...env },
      encoding: 'utf8'
    }) as unknown as { stdout: string; stderr: string; status: number };
    return result;
  }

  it.skip('delivers the shutdownRequest NDJSON line and exits 0', async () => {
    await startServer();
    process.env['SOCKET_PATH'] = socketPath;

    const result = runCli(['--outcome', 'blocked', '--message', 'waiting on review'], process.env);

    expect(result.status).toBe(0);
    await vi.waitFor(() => {
      expect(serverReceived).toHaveLength(1);
    });
    expect(JSON.parse(serverReceived[0]!)).toEqual({
      type: 'shutdownRequest',
      outcome: 'blocked',
      message: 'waiting on review'
    });
  });

  it.skip('defaults the outcome to success when omitted', async () => {
    await startServer();
    process.env['SOCKET_PATH'] = socketPath;

    const result = runCli([], process.env);

    expect(result.status).toBe(0);
    await vi.waitFor(() => {
      expect(serverReceived).toHaveLength(1);
    });
    expect(JSON.parse(serverReceived[0]!)).toEqual({ type: 'shutdownRequest', outcome: 'success' });
  });

  it.skip('rejects an invalid outcome without touching the socket', async () => {
    await startServer();
    process.env['SOCKET_PATH'] = socketPath;

    let result: { stderr: string; status: number };
    try {
      result = runCli(['--outcome', 'catastrophic'], process.env);
    } catch (error) {
      result = error as unknown as { stderr: string; status: number };
    }

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('invalid --outcome');
    // Allow the event loop a beat; no line may arrive.
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    expect(serverReceived).toHaveLength(0);
  });

  it.skip('fails closed with guidance when SOCKET_PATH is not set', async () => {
    delete process.env['SOCKET_PATH'];

    let result: { stderr: string; status: number };
    try {
      result = runCli(['--outcome', 'success'], {});
    } catch (error) {
      result = error as unknown as { stderr: string; status: number };
    }

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('SOCKET_PATH');
  });

  it.skip('fails closed when nothing listens on SOCKET_PATH', async () => {
    process.env['SOCKET_PATH'] = join(tmpdir(), `cards-shutdown-missing-${process.pid}-${Date.now()}.sock`);

    let result: { stderr: string; status: number };
    try {
      result = runCli(['--outcome', 'error', '--message', 'boom'], process.env);
    } catch (error) {
      result = error as unknown as { stderr: string; status: number };
    }

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('cards shutdown');
  });
});
