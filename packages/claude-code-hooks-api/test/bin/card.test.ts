/**
 * Tests for card.mjs CLI binary functions.
 *
 * Uses a real HTTP server for API calls, real session registry on disk,
 * and real git workspace for branch detection. Only homedir and findClaudePid
 * are mocked since tests have no Cards API discovery file or Claude ancestor.
 *
 * @summary Tests for card CLI binary functions
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir as realTmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { TestGitWorkspace } from '@cards/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return {
    ...actual,
    homedir: vi.fn(() => process.env['MOCK_HOMEDIR'] || '/tmp')
  };
});

vi.mock('@cards/claude-code-sessions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cards/claude-code-sessions')>();
  return {
    ...actual,
    findClaudePid: vi.fn()
  };
});

import { findClaudePid } from '@cards/claude-code-sessions';
import {
  attachCard,
  connectClient,
  createCard,
  detachCard,
  executeAction,
  getCurrentBranch,
  isAncestorOfHead,
  listCards,
  parseCardCreateInput
} from '../../src/bin/card.js';

const mockFindClaudePid = vi.mocked(findClaudePid);

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

describe('card binary', () => {
  const testPid = process.pid;
  let testDir: string;
  let server: Server;

  /** Cards stored in the test server, keyed by ID. */
  let cards: Map<string, Record<string, unknown>>;
  /** Branches registered via POST /cards/:id/branches. */
  let branches: Map<string, Array<{ name: string }>>;
  /** Commits registered via POST /cards/:id/commits. */
  let commits: Map<string, string[]>;
  /** Counter for auto-generated card IDs. */
  let cardCounter: number;
  /** Plans stored via PUT /cards/:id/plan, keyed by card ID. */
  let plans: Map<string, string>;

  beforeEach(async () => {
    cards = new Map();
    branches = new Map();
    commits = new Map();
    plans = new Map();
    cardCounter = 0;

    // Create temp directory for homedir mock
    testDir = join(realTmpdir(), `card-bin-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(join(testDir, '.cards'), { recursive: true });
    process.env['MOCK_HOMEDIR'] = testDir;

    // Start a minimal HTTP server that handles the card API endpoints
    server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? '/', `http://localhost`);
      const method = req.method ?? 'GET';

      // GET /cards (list)
      if (method === 'GET' && url.pathname === '/cards') {
        const workspacePath = url.searchParams.get('workspacePath');
        if (!workspacePath) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'workspacePath query parameter is required' }));
          return;
        }
        let results = [...cards.values()];
        const status = url.searchParams.get('status');
        if (status) {
          results = results.filter((c) => c['status'] === status);
        }
        const tags = url.searchParams.getAll('tag');
        if (tags.length > 0) {
          results = results.filter(
            (c) => Array.isArray(c['tags']) && tags.every((t) => (c['tags'] as string[]).includes(t))
          );
        }
        const limit = url.searchParams.get('limit');
        if (limit) {
          results = results.slice(0, parseInt(limit, 10));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results));
        return;
      }

      // GET /cards/:id
      const getCardMatch = url.pathname.match(/^\/cards\/([^/]+)$/);
      if (method === 'GET' && getCardMatch) {
        const cardId = getCardMatch[1]!;
        const card = cards.get(cardId);
        if (!card) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(card));
        return;
      }

      // POST /cards (create)
      if (method === 'POST' && url.pathname === '/cards') {
        const body = JSON.parse(await collectBody(req)) as Record<string, unknown>;
        cardCounter++;
        const id = `test-${cardCounter}`;
        const card = {
          id,
          ...body,
          status: 'todo',
          repositoryPath: '/tmp/test-repo',
          createdAt: new Date().toISOString()
        };
        cards.set(id, card);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(card));
        return;
      }

      // POST /cards/:id/branches
      const branchMatch = url.pathname.match(/^\/cards\/([^/]+)\/branches$/);
      if (method === 'POST' && branchMatch) {
        const cardId = branchMatch[1]!;
        const body = JSON.parse(await collectBody(req)) as { name: string };
        const cardBranches = branches.get(cardId) ?? [];
        cardBranches.push({ name: body.name });
        branches.set(cardId, cardBranches);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({}));
        return;
      }

      // POST /cards/:id/commits
      const commitMatch = url.pathname.match(/^\/cards\/([^/]+)\/commits$/);
      if (method === 'POST' && commitMatch) {
        const cardId = commitMatch[1]!;
        const body = JSON.parse(await collectBody(req)) as { sha: string };
        const cardCommits = commits.get(cardId) ?? [];
        cardCommits.push(body.sha);
        commits.set(cardId, cardCommits);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sha: body.sha, cardId, createdAt: new Date().toISOString() }));
        return;
      }

      // PUT /cards/:id/plan
      const planMatch = url.pathname.match(/^\/cards\/([^/]+)\/plan$/);
      if (method === 'PUT' && planMatch) {
        const cardId = planMatch[1]!;
        const body = await collectBody(req);
        plans.set(cardId, JSON.parse(body) as string);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({}));
        return;
      }

      // POST /cards/:id/actions/:name
      const actionMatch = url.pathname.match(/^\/cards\/([^/]+)\/actions\/([^/]+)$/);
      if (method === 'POST' && actionMatch) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, exitCode: 0 }));
        return;
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

    mockFindClaudePid.mockReset();
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

  describe('parseCardCreateInput', () => {
    it('parses valid input with required fields', () => {
      const result = parseCardCreateInput('{"title":"Test","description":"A test card"}');
      expect(result.data.title).toBe('Test');
      expect(result.data.description).toBe('A test card');
      expect(result.plan).toBeUndefined();
      expect(result.inputKeys).toEqual(new Set(['title', 'description']));
    });

    it('parses optional fields', () => {
      const result = parseCardCreateInput(
        JSON.stringify({
          title: 'Test',
          description: 'Desc',
          tags: ['bug'],
          environment: 'staging',
          gates: { planRequired: true, reviewRequired: false }
        })
      );
      expect(result.data.tags).toEqual(['bug']);
      expect(result.data.environment).toBe('staging');
      expect(result.data.gates).toEqual({ planRequired: true, reviewRequired: false });
    });

    it('parses optional plan field', () => {
      const result = parseCardCreateInput(
        JSON.stringify({ title: 'Test', description: 'Desc', plan: '## My Plan\nStep 1' })
      );
      expect(result.plan).toBe('## My Plan\nStep 1');
      expect(result.inputKeys).toContain('plan');
    });

    it('throws on empty input', () => {
      expect(() => parseCardCreateInput('')).toThrow('expected JSON on stdin');
    });

    it('throws on invalid JSON', () => {
      expect(() => parseCardCreateInput('{not json')).toThrow('invalid JSON');
    });

    it('throws on missing title', () => {
      expect(() => parseCardCreateInput('{"description":"x"}')).toThrow('missing required field "title"');
    });

    it('throws on empty title', () => {
      expect(() => parseCardCreateInput('{"title":"  ","description":"x"}')).toThrow('missing required field "title"');
    });

    it('throws on missing description', () => {
      expect(() => parseCardCreateInput('{"title":"Test"}')).toThrow('missing required field "description"');
    });
  });

  describe('getCard', () => {
    it('fetches and prints card JSON to stdout', async () => {
      const card = { id: 'card-1', title: 'Test Card', status: 'todo' };
      cards.set('card-1', card);

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const { getCard: getCardFn } = await import('../../src/bin/card.js');
        await getCardFn('card-1');
        expect(logSpy).toHaveBeenCalledWith(JSON.stringify(card, null, 2));
      } finally {
        logSpy.mockRestore();
      }
    });
  });

  describe('getCurrentBranch', () => {
    let workspace: TestGitWorkspace;

    beforeEach(async () => {
      workspace = new TestGitWorkspace();
      await workspace.create();
    });

    afterEach(() => {
      workspace.destroy();
    });

    it('returns branch name when on a named branch', () => {
      // Test runs inside the workspace git repo
      const origCwd = process.cwd();
      try {
        process.chdir(workspace.getPath());
        const branch = getCurrentBranch();
        expect(branch).toBe('main');
      } finally {
        process.chdir(origCwd);
      }
    });
  });

  describe('isAncestorOfHead', () => {
    let workspace: TestGitWorkspace;

    beforeEach(async () => {
      workspace = new TestGitWorkspace();
      await workspace.create();
    });

    afterEach(() => {
      workspace.destroy();
    });

    it('returns true for ancestor commit', async () => {
      const firstSha = await workspace.getFirstCommitSha();
      await workspace.createAndCommitFile('test.txt', 'content');

      const origCwd = process.cwd();
      try {
        process.chdir(workspace.getPath());
        expect(isAncestorOfHead(firstSha)).toBe(true);
      } finally {
        process.chdir(origCwd);
      }
    });

    it('returns false for invalid SHA format', () => {
      expect(isAncestorOfHead('not-a-sha')).toBe(false);
    });
  });

  describe('attachCard', () => {
    it('associates PID with card and returns result', async () => {
      cards.set('test-card', { id: 'test-card', title: 'Test', status: 'todo' });
      mockFindClaudePid.mockReturnValue(testPid);

      const result = await attachCard('test-card');
      expect(result.pid).toBe(testPid);
      expect(result.cardId).toBe('test-card');
      expect(result.flushedCommits).toBe(0);
    });

    it('throws when no Claude PID found', async () => {
      mockFindClaudePid.mockReturnValue(null);
      await expect(attachCard('test-card')).rejects.toThrow('could not find Claude ancestor PID');
    });

    it('registers workspace branch when on named branch', async () => {
      const workspace = new TestGitWorkspace();
      await workspace.create();

      cards.set('test-card', { id: 'test-card', title: 'Test', status: 'todo' });
      mockFindClaudePid.mockReturnValue(testPid);

      const origCwd = process.cwd();
      try {
        process.chdir(workspace.getPath());
        const result = await attachCard('test-card');
        expect(result.branch).toBe('main');
        expect(branches.get('test-card')).toEqual([{ name: 'main' }]);
      } finally {
        process.chdir(origCwd);
        workspace.destroy();
      }
    });

    it('flushes pending commits that are reachable from HEAD', async () => {
      const workspace = new TestGitWorkspace();
      await workspace.create();
      await workspace.createAndCommitFile('file1.txt', 'content');
      const sha = (await workspace.getGit().log({ maxCount: 1 })).latest!.hash;

      cards.set('test-card', { id: 'test-card', title: 'Test', status: 'todo' });
      mockFindClaudePid.mockReturnValue(testPid);

      // Pre-populate registry with a pending commit
      const { recordPendingCommit } = await import('@cards/claude-code-sessions');
      await recordPendingCommit(testPid, sha);

      const origCwd = process.cwd();
      try {
        process.chdir(workspace.getPath());
        const result = await attachCard('test-card');
        expect(result.flushedCommits).toBe(1);
        expect(commits.get('test-card')).toEqual([sha]);
      } finally {
        process.chdir(origCwd);
        workspace.destroy();
      }
    });
  });

  describe('detachCard', () => {
    it('removes PID entry and returns result', async () => {
      mockFindClaudePid.mockReturnValue(testPid);

      // Pre-populate a session entry
      const { associatePidWithCard: associate } = await import('@cards/claude-code-sessions');
      await associate(testPid, 'test-card');

      const result = await detachCard();
      expect(result.pid).toBe(testPid);
    });

    it('succeeds even when no entry exists', async () => {
      mockFindClaudePid.mockReturnValue(testPid);
      const result = await detachCard();
      expect(result.pid).toBe(testPid);
    });

    it('throws when no Claude PID found', async () => {
      mockFindClaudePid.mockReturnValue(null);
      await expect(detachCard()).rejects.toThrow('could not find Claude ancestor PID');
    });
  });

  describe('executeAction', () => {
    it('calls server and prints result to stdout', async () => {
      cards.set('card-1', { id: 'card-1', title: 'Test', status: 'todo' });

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await executeAction('card-1', 'launch');
        expect(logSpy).toHaveBeenCalledOnce();
        const output = JSON.parse(logSpy.mock.calls[0]![0] as string) as { success: boolean; exitCode: number };
        expect(output.success).toBe(true);
        expect(output.exitCode).toBe(0);
      } finally {
        logSpy.mockRestore();
      }
    });
  });

  describe('listCards', () => {
    it('lists all cards for a workspace path', async () => {
      cards.set('card-1', { id: 'card-1', title: 'First', status: 'todo', tags: [] });
      cards.set('card-2', { id: 'card-2', title: 'Second', status: 'in_progress', tags: ['bug'] });

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await listCards(['--workspace-path', '/tmp/workspace']);
        expect(logSpy).toHaveBeenCalledOnce();
        const output = JSON.parse(logSpy.mock.calls[0]![0] as string) as unknown[];
        expect(output).toHaveLength(2);
      } finally {
        logSpy.mockRestore();
      }
    });

    it('filters by status', async () => {
      cards.set('card-1', { id: 'card-1', title: 'First', status: 'todo', tags: [] });
      cards.set('card-2', { id: 'card-2', title: 'Second', status: 'in_progress', tags: [] });

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await listCards(['--workspace-path', '/tmp/workspace', '--status', 'todo']);
        const output = JSON.parse(logSpy.mock.calls[0]![0] as string) as Array<{ id: string }>;
        expect(output).toHaveLength(1);
        expect(output[0]!.id).toBe('card-1');
      } finally {
        logSpy.mockRestore();
      }
    });

    it('filters by tag', async () => {
      cards.set('card-1', { id: 'card-1', title: 'First', status: 'todo', tags: ['feature'] });
      cards.set('card-2', { id: 'card-2', title: 'Second', status: 'todo', tags: ['bug'] });

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await listCards(['--workspace-path', '/tmp/workspace', '--tag', 'bug']);
        const output = JSON.parse(logSpy.mock.calls[0]![0] as string) as Array<{ id: string }>;
        expect(output).toHaveLength(1);
        expect(output[0]!.id).toBe('card-2');
      } finally {
        logSpy.mockRestore();
      }
    });

    it('filters by multiple tags (all must match)', async () => {
      cards.set('card-1', { id: 'card-1', title: 'First', status: 'todo', tags: ['bug'] });
      cards.set('card-2', { id: 'card-2', title: 'Second', status: 'todo', tags: ['bug', 'feature'] });
      cards.set('card-3', { id: 'card-3', title: 'Third', status: 'todo', tags: ['feature'] });

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await listCards(['--workspace-path', '/tmp/workspace', '--tag', 'bug', '--tag', 'feature']);
        const output = JSON.parse(logSpy.mock.calls[0]![0] as string) as Array<{ id: string }>;
        expect(output).toHaveLength(1);
        expect(output[0]!.id).toBe('card-2');
      } finally {
        logSpy.mockRestore();
      }
    });

    it('respects limit', async () => {
      cards.set('card-1', { id: 'card-1', title: 'First', status: 'todo', tags: [] });
      cards.set('card-2', { id: 'card-2', title: 'Second', status: 'todo', tags: [] });
      cards.set('card-3', { id: 'card-3', title: 'Third', status: 'todo', tags: [] });

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await listCards(['--workspace-path', '/tmp/workspace', '--limit', '2']);
        const output = JSON.parse(logSpy.mock.calls[0]![0] as string) as unknown[];
        expect(output).toHaveLength(2);
      } finally {
        logSpy.mockRestore();
      }
    });

    it('throws on missing workspace path when not in git repo', async () => {
      const origCwd = process.cwd();
      try {
        process.chdir('/tmp');
        await expect(listCards([])).rejects.toThrow('could not detect workspace path');
      } finally {
        process.chdir(origCwd);
      }
    });

    it('throws on invalid limit', async () => {
      await expect(listCards(['--workspace-path', '/tmp', '--limit', 'abc'])).rejects.toThrow(
        '--limit must be a positive integer'
      );
    });

    it('throws on invalid offset', async () => {
      await expect(listCards(['--workspace-path', '/tmp', '--offset', '-1'])).rejects.toThrow(
        '--offset must be a non-negative integer'
      );
    });
  });

  describe('createCard', () => {
    /**
     * Replaces process.stdin with a Readable that emits the given string,
     * calls the async function, then restores the original stdin.
     *
     * @param input - String to push onto the fake stdin stream.
     * @param fn - Async function to execute while stdin is replaced.
     * @returns The result of `fn`.
     */
    async function withStdin<T>(input: string, fn: () => Promise<T>): Promise<T> {
      const original = process.stdin;
      const fake = new Readable({ read() {} });
      Object.defineProperty(process, 'stdin', { value: fake, writable: true, configurable: true });
      fake.push(input);
      fake.push(null);
      try {
        return await fn();
      } finally {
        Object.defineProperty(process, 'stdin', { value: original, writable: true, configurable: true });
      }
    }

    it('returns only server-generated fields plus repositoryPath', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await withStdin(JSON.stringify({ title: 'Test', description: 'A test card', tags: ['bug'] }), () =>
          createCard(['--workspace-path', '/tmp/workspace'])
        );
        expect(logSpy).toHaveBeenCalledOnce();
        const output = JSON.parse(logSpy.mock.calls[0]![0] as string) as Record<string, unknown>;
        // Server-generated fields present
        expect(output['id']).toBe('test-1');
        expect(output['status']).toBe('todo');
        expect(output['repositoryPath']).toBe('/tmp/test-repo');
        expect(output['createdAt']).toBeDefined();
        // Caller-provided fields omitted
        expect(output).not.toHaveProperty('title');
        expect(output).not.toHaveProperty('description');
        expect(output).not.toHaveProperty('tags');
      } finally {
        logSpy.mockRestore();
      }
    });

    it('writes plan to card when plan field is provided', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await withStdin(
          JSON.stringify({ title: 'Planned', description: 'Has a plan', plan: '## Step 1\nDo things' }),
          () => createCard(['--workspace-path', '/tmp/workspace'])
        );
        expect(plans.get('test-1')).toBe('## Step 1\nDo things');
        // plan field itself should not appear in the output
        const output = JSON.parse(logSpy.mock.calls[0]![0] as string) as Record<string, unknown>;
        expect(output).not.toHaveProperty('plan');
      } finally {
        logSpy.mockRestore();
      }
    });

    it('does not call updatePlan when plan is absent', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await withStdin(JSON.stringify({ title: 'No plan', description: 'Simple card' }), () =>
          createCard(['--workspace-path', '/tmp/workspace'])
        );
        expect(plans.size).toBe(0);
        const output = JSON.parse(logSpy.mock.calls[0]![0] as string) as Record<string, unknown>;
        expect(output['id']).toBe('test-1');
      } finally {
        logSpy.mockRestore();
      }
    });
  });
});
