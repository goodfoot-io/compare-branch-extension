/**
 * Tests for notification.mjs CLI binary functions.
 *
 * Uses a real HTTP server for API calls. Only homedir is mocked since tests
 * have no Cards API discovery file.
 *
 * @summary Tests for notification CLI binary functions
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir as realTmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return {
    ...actual,
    homedir: vi.fn(() => process.env['MOCK_HOMEDIR'] || '/tmp')
  };
});

import { sendNotification } from '../../src/bin/notification.js';

/**
 * Collects the full request body as a string.
 *
 * @param req - Incoming HTTP request to read.
 * @returns The complete body content.
 */
function collectBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
  });
}

describe('notification binary', () => {
  let testDir: string;
  let server: Server;

  /** Notifications received by the test server. */
  let receivedNotifications: Array<Record<string, unknown>>;

  beforeEach(async () => {
    receivedNotifications = [];

    testDir = join(realTmpdir(), `notif-bin-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(join(testDir, '.cards'), { recursive: true });
    process.env['MOCK_HOMEDIR'] = testDir;

    server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? '/', `http://localhost`);
      const method = req.method ?? 'GET';

      if (method === 'POST' && url.pathname === '/api/notifications') {
        const body = JSON.parse(await collectBody(req)) as Record<string, unknown>;

        if (!body['type'] || !body['title'] || !body['message'] || !body['source']) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing required fields' }));
          return;
        }

        if (!['error', 'warning', 'info'].includes(body['type'] as string)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid type' }));
          return;
        }

        receivedNotifications.push(body);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
      }

      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, 'localhost', resolve));
    const port = (server.address() as AddressInfo).port;

    writeFileSync(
      join(testDir, '.cards', 'cards-api.json'),
      JSON.stringify({
        host: 'localhost',
        port,
        accessToken: 'test-token',
        pid: 12345,
        startedAt: '2024-01-01T00:00:00Z'
      })
    );
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(testDir, { recursive: true, force: true });
    delete process.env['MOCK_HOMEDIR'];
  });

  it('sends a notification with all required fields', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await sendNotification([
        '--type',
        'info',
        '--title',
        'Build complete',
        '--message',
        'All tests pass',
        '--source',
        'test-agent'
      ]);

      expect(receivedNotifications).toHaveLength(1);
      expect(receivedNotifications[0]).toEqual({
        type: 'info',
        title: 'Build complete',
        message: 'All tests pass',
        source: 'test-agent'
      });
    } finally {
      logSpy.mockRestore();
    }
  });

  it('accepts all severity types', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      for (const type of ['error', 'warning', 'info']) {
        await sendNotification(['--type', type, '--title', 'Test', '--message', 'Body', '--source', 'src']);
      }
      expect(receivedNotifications).toHaveLength(3);
      expect(receivedNotifications.map((n) => n['type'])).toEqual(['error', 'warning', 'info']);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('throws on missing --type', async () => {
    await expect(sendNotification(['--title', 'T', '--message', 'M', '--source', 'S'])).rejects.toThrow(
      'missing required flag --type'
    );
  });

  it('throws on missing --title', async () => {
    await expect(sendNotification(['--type', 'info', '--message', 'M', '--source', 'S'])).rejects.toThrow(
      'missing required flag --title'
    );
  });

  it('throws on missing --message', async () => {
    await expect(sendNotification(['--type', 'info', '--title', 'T', '--source', 'S'])).rejects.toThrow(
      'missing required flag --message'
    );
  });

  it('throws on missing --source', async () => {
    await expect(sendNotification(['--type', 'info', '--title', 'T', '--message', 'M'])).rejects.toThrow(
      'missing required flag --source'
    );
  });

  it('throws on invalid severity type', async () => {
    await expect(
      sendNotification(['--type', 'critical', '--title', 'T', '--message', 'M', '--source', 'S'])
    ).rejects.toThrow('invalid --type "critical"');
  });

  it('throws when discovery file is missing', async () => {
    rmSync(join(testDir, '.cards', 'cards-api.json'));
    await expect(
      sendNotification(['--type', 'info', '--title', 'T', '--message', 'M', '--source', 'S'])
    ).rejects.toThrow('API discovery failed');
  });
});
