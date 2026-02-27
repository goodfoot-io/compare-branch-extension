/**
 * Tests for compare.mjs CLI binary functions.
 *
 * Uses a real HTTP server for API calls and real discovery file on disk.
 * Only homedir is mocked to redirect discovery to a temp directory.
 *
 * @summary Tests for compare CLI binary functions
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir as realTmpdir } from 'node:os';
import { join } from 'node:path';
import type { CompareState } from '@cards/sdk/protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return {
    ...actual,
    homedir: vi.fn(() => process.env['MOCK_HOMEDIR'] || '/tmp')
  };
});

import { clearCompare, connectClient, getCompare, parseCompareInput } from '../../src/bin/compare.js';

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

describe('compare binary', () => {
  let testDir: string;
  let server: Server;

  /** Current compare state stored by the test server. */
  let compareState: CompareState | null;

  beforeEach(async () => {
    compareState = null;

    // Create temp directory for homedir mock
    testDir = join(realTmpdir(), `compare-bin-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(join(testDir, '.cards'), { recursive: true });
    process.env['MOCK_HOMEDIR'] = testDir;

    // Start a minimal HTTP server that handles compare endpoints
    server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? '/', `http://localhost`);
      const method = req.method ?? 'GET';

      if (url.pathname === '/compare') {
        if (method === 'POST') {
          const body = JSON.parse(await collectBody(req)) as Record<string, unknown>;
          // Determine mode from request shape
          let mode: string;
          if ('repositoryPath' in body) mode = 'dynamic';
          else if ('attributionShas' in body) mode = 'fixed-attribution';
          else mode = 'branch-range';
          compareState = { mode, ...body } as CompareState;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(compareState));
          return;
        }
        if (method === 'GET') {
          if (!compareState) {
            res.writeHead(204);
            res.end();
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(compareState));
          return;
        }
        if (method === 'DELETE') {
          compareState = null;
          res.writeHead(204);
          res.end();
          return;
        }
      }

      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, 'localhost', resolve));
    const port = (server.address() as AddressInfo).port;

    // Write discovery file pointing to test server
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

  describe('connectClient', () => {
    it('returns a client when discovery succeeds', async () => {
      const client = await connectClient();
      expect(client).toBeDefined();
    });

    it('throws when discovery file is missing', async () => {
      rmSync(join(testDir, '.cards', 'cards-api.json'));
      await expect(connectClient()).rejects.toThrow('API discovery failed');
    });
  });

  describe('parseCompareInput', () => {
    it('parses branch range request', () => {
      const request = parseCompareInput('{"baseRef":"main","compareRef":"feature/x"}');
      expect(request).toEqual({ baseRef: 'main', compareRef: 'feature/x' });
    });

    it('parses dynamic request', () => {
      const request = parseCompareInput('{"baseRef":"main","repositoryPath":"/repo"}');
      expect(request).toEqual({ baseRef: 'main', repositoryPath: '/repo' });
    });

    it('parses fixed attribution request', () => {
      const request = parseCompareInput('{"compareRef":"feature/x","attributionShas":["abc"]}');
      expect(request).toEqual({ compareRef: 'feature/x', attributionShas: ['abc'] });
    });

    it('throws on empty input', () => {
      expect(() => parseCompareInput('')).toThrow('expected JSON on stdin');
    });

    it('throws on invalid JSON', () => {
      expect(() => parseCompareInput('{bad')).toThrow('invalid JSON');
    });
  });

  describe('getCompare', () => {
    it('returns null when no comparison is active', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const result = await getCompare();
        expect(result).toBeNull();
        expect(logSpy).toHaveBeenCalledWith('No active comparison');
      } finally {
        logSpy.mockRestore();
      }
    });

    it('returns state when comparison is active', async () => {
      compareState = { mode: 'branch-range', baseRef: 'main', compareRef: 'feature/x' };

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const result = await getCompare();
        expect(result).toEqual(compareState);
        expect(logSpy).toHaveBeenCalledWith(JSON.stringify(compareState, null, 2));
      } finally {
        logSpy.mockRestore();
      }
    });
  });

  describe('clearCompare', () => {
    it('clears active comparison', async () => {
      compareState = { mode: 'branch-range', baseRef: 'main', compareRef: 'feature/x' };

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await clearCompare();
        expect(compareState).toBeNull();
        expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ success: true }));
      } finally {
        logSpy.mockRestore();
      }
    });
  });
});
