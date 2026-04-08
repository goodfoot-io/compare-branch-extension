/**
 * Tests for card.mjs CLI binary functions.
 *
 * Uses a real HTTP server for API calls, real session registry on disk,
 * and real git workspace for branch detection. Only homedir and findAgentPid
 * are mocked since tests have no Cards API discovery file or Claude ancestor.
 *
 * @summary Tests for card CLI binary functions
 */

import { execFileSync } from 'node:child_process';
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

vi.mock('@cards/sessions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cards/sessions')>();
  return {
    ...actual,
    findAgentPid: vi.fn()
  };
});

import { findAgentPid } from '@cards/sessions';
import {
  attachCard,
  connectClient,
  createCard,
  detachCard,
  executeAction,
  getCurrentBranch,
  getWorktreeForBranch,
  isAncestorOfHead,
  listCards,
  parseCardCreateInput,
  searchCards
} from '../../src/bin/card.js';

const mockFindAgentPid = vi.mocked(findAgentPid);

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
  /** Files stored via PUT /cards/:id/fs/:path, keyed by `${cardId}/${filePath}`. */
  let files: Map<string, string>;

  beforeEach(async () => {
    cards = new Map();
    branches = new Map();
    commits = new Map();
    files = new Map();
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
        const search = url.searchParams.get('search');
        if (search) {
          const term = search.toLowerCase();
          results = results.filter((c) => typeof c['title'] === 'string' && c['title'].toLowerCase().includes(term));
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

      // PUT /cards/:id/fs/:path (generic file write)
      const fsMatch = url.pathname.match(/^\/cards\/([^/]+)\/fs\/(.+)$/);
      if (method === 'PUT' && fsMatch) {
        const cardId = fsMatch[1]!;
        const filePath = fsMatch[2]!;
        const raw = await collectBody(req);
        const body = JSON.parse(raw) as string;
        files.set(`${cardId}/${filePath}`, body);
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

    mockFindAgentPid.mockReset();
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
      const result = parseCardCreateInput('{"title":"Test"}');
      expect(result.data.title).toBe('Test');
      expect(result.inputKeys).toEqual(new Set(['title']));
    });

    it('parses optional fields', () => {
      const result = parseCardCreateInput(
        JSON.stringify({
          title: 'Test',
          tags: ['bug'],
          environment: 'staging',
          gates: { planRequired: true, mergeRequestRequired: false }
        })
      );
      expect(result.data.tags).toEqual(['bug']);
      expect(result.data.environment).toBe('staging');
      expect(result.data.gates).toEqual({ planRequired: true, mergeRequestRequired: false });
    });

    it('tracks all caller-provided keys in inputKeys', () => {
      const result = parseCardCreateInput(JSON.stringify({ title: 'Test', tags: ['bug'], environment: 'staging' }));
      expect(result.inputKeys).toEqual(new Set(['title', 'tags', 'environment']));
    });

    it('throws on empty input', () => {
      expect(() => parseCardCreateInput('')).toThrow('expected JSON on stdin');
    });

    it('throws on invalid JSON', () => {
      expect(() => parseCardCreateInput('{not json')).toThrow('invalid JSON');
    });

    it('throws on missing title', () => {
      expect(() => parseCardCreateInput('{"tags":["bug"]}')).toThrow('missing required field "title"');
    });

    it('throws on empty title', () => {
      expect(() => parseCardCreateInput('{"title":"  "}')).toThrow('missing required field "title"');
    });

    it('throws on a single unknown field listing it and valid fields', () => {
      expect(() => parseCardCreateInput('{"title":"Test","description":"Token refresh fails"}')).toThrow(
        'unknown fields: "description". valid fields: title, tags, environment, gates, relations'
      );
    });

    it('throws on multiple unknown fields listing them and valid fields', () => {
      expect(() => parseCardCreateInput('{"title":"Test","description":"desc","plan":"do it","extra":1}')).toThrow(
        'unknown fields: "description", "plan", "extra". valid fields: title, tags, environment, gates, relations'
      );
    });

    it('accepts all valid fields without throwing', () => {
      expect(() =>
        parseCardCreateInput(
          JSON.stringify({
            title: 'Test',
            tags: ['bug'],
            environment: 'staging',
            gates: { planRequired: true, mergeRequestRequired: false },
            relations: [{ type: 'related', cardId: 'main-001' }]
          })
        )
      ).not.toThrow();
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

  describe('getWorktreeForBranch', () => {
    let workspace: TestGitWorkspace;

    beforeEach(async () => {
      workspace = new TestGitWorkspace();
      await workspace.create();
    });

    afterEach(() => {
      workspace.destroy();
    });

    it('returns worktree path for a branch checked out in the main worktree', () => {
      const origCwd = process.cwd();
      try {
        process.chdir(workspace.getPath());
        const result = getWorktreeForBranch('main');
        expect(result).toBe(workspace.getPath());
      } finally {
        process.chdir(origCwd);
      }
    });

    it('returns null for a branch not checked out anywhere', () => {
      const origCwd = process.cwd();
      try {
        process.chdir(workspace.getPath());
        const result = getWorktreeForBranch('nonexistent-branch');
        expect(result).toBeNull();
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
      mockFindAgentPid.mockReturnValue(testPid);

      const result = await attachCard('test-card');
      expect(result.pid).toBe(testPid);
      expect(result.cardId).toBe('test-card');
      expect(result.flushedCommits).toBe(0);
    });

    it('throws when no agent PID found', async () => {
      mockFindAgentPid.mockReturnValue(null);
      await expect(attachCard('test-card')).rejects.toThrow('could not find agent ancestor PID');
    });

    it('registers workspace branch when on named branch', async () => {
      const workspace = new TestGitWorkspace();
      await workspace.create();

      cards.set('test-card', { id: 'test-card', title: 'Test', status: 'todo' });
      mockFindAgentPid.mockReturnValue(testPid);

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

    it('stderr includes cwd and toplevel on association', async () => {
      const workspace = new TestGitWorkspace();
      await workspace.create();

      cards.set('test-card', { id: 'test-card', title: 'Test', status: 'todo' });
      mockFindAgentPid.mockReturnValue(testPid);

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const origCwd = process.cwd();
      try {
        process.chdir(workspace.getPath());
        await attachCard('test-card');

        const messages = errorSpy.mock.calls.map((c) => c[0] as string);
        const cwdLine = messages.find((m) => m.startsWith('card attach: cwd='));
        expect(cwdLine).toBeDefined();
        expect(cwdLine).toContain(`cwd=${workspace.getPath()}`);
        expect(cwdLine).toContain('toplevel=');
      } finally {
        process.chdir(origCwd);
        errorSpy.mockRestore();
        workspace.destroy();
      }
    });

    it('stderr warns when branch is checked out in a worktree', async () => {
      const workspace = new TestGitWorkspace();
      await workspace.create();

      cards.set('test-card', { id: 'test-card', title: 'Test', status: 'todo' });
      mockFindAgentPid.mockReturnValue(testPid);

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const origCwd = process.cwd();
      try {
        process.chdir(workspace.getPath());
        await attachCard('test-card');

        const messages = errorSpy.mock.calls.map((c) => c[0] as string);
        // 'main' branch is checked out in the workspace itself, so warning should appear
        const warningLine = messages.find((m) => m.includes('warning: branch main is checked out at'));
        expect(warningLine).toBeDefined();
      } finally {
        process.chdir(origCwd);
        errorSpy.mockRestore();
        workspace.destroy();
      }
    });

    it('flushes pending commits that are reachable from HEAD', async () => {
      const workspace = new TestGitWorkspace();
      await workspace.create();
      await workspace.createAndCommitFile('file1.txt', 'content');
      const sha = (await workspace.getGit().log({ maxCount: 1 })).latest!.hash;

      cards.set('test-card', { id: 'test-card', title: 'Test', status: 'todo' });
      mockFindAgentPid.mockReturnValue(testPid);

      // Pre-populate registry with a pending commit
      const { recordPendingCommit } = await import('@cards/sessions');
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

    it('deduplicates pending commits before flushing them', async () => {
      const workspace = new TestGitWorkspace();
      await workspace.create();
      await workspace.createAndCommitFile('file1.txt', 'content');
      const sha = (await workspace.getGit().log({ maxCount: 1 })).latest!.hash;

      cards.set('test-card', { id: 'test-card', title: 'Test', status: 'todo' });
      mockFindAgentPid.mockReturnValue(testPid);

      const { recordPendingCommit } = await import('@cards/sessions');
      await recordPendingCommit(testPid, sha);
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
      mockFindAgentPid.mockReturnValue(testPid);

      // Pre-populate a session entry
      const { associatePidWithCard: associate } = await import('@cards/sessions');
      await associate(testPid, 'test-card');

      const result = await detachCard();
      expect(result.pid).toBe(testPid);
    });

    it('succeeds even when no entry exists', async () => {
      mockFindAgentPid.mockReturnValue(testPid);
      const result = await detachCard();
      expect(result.pid).toBe(testPid);
    });

    it('throws when no agent PID found', async () => {
      mockFindAgentPid.mockReturnValue(null);
      await expect(detachCard()).rejects.toThrow('could not find agent ancestor PID');
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
      cards.set('card-2', { id: 'card-2', title: 'Second', status: 'active', tags: ['bug'] });

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
      cards.set('card-2', { id: 'card-2', title: 'Second', status: 'active', tags: [] });

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

  describe('searchCards', () => {
    it('passes text query to server as search parameter', async () => {
      cards.set('card-1', {
        id: 'card-1',
        title: 'Login Bug',
        status: 'todo',
        tags: [],
        isPinned: false,
        order: 0,
        repositoryId: 'test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        gates: { planRequired: false, planApproved: false, mergeRequestRequired: false, mergeApproved: false },
        isMerged: null,
        relations: [],
        incomingRelations: []
      });
      cards.set('card-2', {
        id: 'card-2',
        title: 'Unrelated Feature',
        status: 'todo',
        tags: [],
        isPinned: false,
        order: 0,
        repositoryId: 'test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        gates: { planRequired: false, planApproved: false, mergeRequestRequired: false, mergeApproved: false },
        isMerged: null,
        relations: [],
        incomingRelations: []
      });

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await searchCards(['login bug', '--workspace-path', '/tmp/workspace']);
        expect(logSpy).toHaveBeenCalledOnce();
        const output = JSON.parse(logSpy.mock.calls[0]![0] as string) as Array<{ id: string }>;
        expect(output).toHaveLength(1);
        expect(output[0]!.id).toBe('card-1');
      } finally {
        logSpy.mockRestore();
      }
    });

    it('sends stored tags to server and filters results', async () => {
      cards.set('card-1', {
        id: 'card-1',
        title: 'Bug Report',
        status: 'todo',
        tags: ['bug'],
        isPinned: false,
        order: 0,
        repositoryId: 'test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        gates: { planRequired: false, planApproved: false, mergeRequestRequired: false, mergeApproved: false },
        isMerged: null,
        relations: [],
        incomingRelations: []
      });
      cards.set('card-2', {
        id: 'card-2',
        title: 'Feature Request',
        status: 'todo',
        tags: ['feature'],
        isPinned: false,
        order: 0,
        repositoryId: 'test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        gates: { planRequired: false, planApproved: false, mergeRequestRequired: false, mergeApproved: false },
        isMerged: null,
        relations: [],
        incomingRelations: []
      });

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await searchCards(['#bug', '--workspace-path', '/tmp/workspace']);
        expect(logSpy).toHaveBeenCalledOnce();
        const output = JSON.parse(logSpy.mock.calls[0]![0] as string) as Array<{ id: string }>;
        expect(output).toHaveLength(1);
        expect(output[0]!.id).toBe('card-1');
      } finally {
        logSpy.mockRestore();
      }
    });

    it('applies derived tag filtering client-side', async () => {
      cards.set('card-1', {
        id: 'card-1',
        title: 'Planning Card',
        status: 'todo',
        tags: [],
        isPinned: false,
        order: 0,
        repositoryId: 'test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        gates: { planRequired: true, planApproved: false, mergeRequestRequired: false, mergeApproved: false },
        isMerged: null,
        relations: [],
        incomingRelations: []
      });
      cards.set('card-2', {
        id: 'card-2',
        title: 'Normal Card',
        status: 'todo',
        tags: [],
        isPinned: false,
        order: 0,
        repositoryId: 'test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        gates: { planRequired: false, planApproved: false, mergeRequestRequired: false, mergeApproved: false },
        isMerged: null,
        relations: [],
        incomingRelations: []
      });

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        // 'planning' is a derived tag — not sent to server, filtered client-side
        await searchCards(['#planning', '--workspace-path', '/tmp/workspace']);
        expect(logSpy).toHaveBeenCalledOnce();
        const output = JSON.parse(logSpy.mock.calls[0]![0] as string) as Array<{ id: string }>;
        expect(output).toHaveLength(1);
        expect(output[0]!.id).toBe('card-1');
      } finally {
        logSpy.mockRestore();
      }
    });

    it('applies @relation filtering client-side', async () => {
      cards.set('card-1', {
        id: 'card-1',
        title: 'Related',
        status: 'todo',
        tags: [],
        isPinned: false,
        order: 0,
        repositoryId: 'test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        gates: { planRequired: false, planApproved: false, mergeRequestRequired: false, mergeApproved: false },
        isMerged: null,
        relations: [{ type: 'related', cardId: 'card-2' }],
        incomingRelations: []
      });
      cards.set('card-2', {
        id: 'card-2',
        title: 'Target',
        status: 'todo',
        tags: [],
        isPinned: false,
        order: 0,
        repositoryId: 'test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        gates: { planRequired: false, planApproved: false, mergeRequestRequired: false, mergeApproved: false },
        isMerged: null,
        relations: [],
        incomingRelations: [{ type: 'related', cardId: 'card-1' }]
      });
      cards.set('card-3', {
        id: 'card-3',
        title: 'Unrelated',
        status: 'todo',
        tags: [],
        isPinned: false,
        order: 0,
        repositoryId: 'test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        gates: { planRequired: false, planApproved: false, mergeRequestRequired: false, mergeApproved: false },
        isMerged: null,
        relations: [],
        incomingRelations: []
      });

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await searchCards(['@card-2', '--workspace-path', '/tmp/workspace']);
        expect(logSpy).toHaveBeenCalledOnce();
        const output = JSON.parse(logSpy.mock.calls[0]![0] as string) as Array<{ id: string }>;
        const ids = output.map((c) => c.id).sort();
        expect(ids).toEqual(['card-1', 'card-2']);
      } finally {
        logSpy.mockRestore();
      }
    });

    it('passes --status and --limit flags through to server', async () => {
      cards.set('card-1', {
        id: 'card-1',
        title: 'First',
        status: 'todo',
        tags: [],
        isPinned: false,
        order: 0,
        repositoryId: 'test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        gates: { planRequired: false, planApproved: false, mergeRequestRequired: false, mergeApproved: false },
        isMerged: null,
        relations: [],
        incomingRelations: []
      });
      cards.set('card-2', {
        id: 'card-2',
        title: 'Second',
        status: 'active',
        tags: [],
        isPinned: false,
        order: 0,
        repositoryId: 'test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        gates: { planRequired: false, planApproved: false, mergeRequestRequired: false, mergeApproved: false },
        isMerged: null,
        relations: [],
        incomingRelations: []
      });
      cards.set('card-3', {
        id: 'card-3',
        title: 'Third',
        status: 'todo',
        tags: [],
        isPinned: false,
        order: 0,
        repositoryId: 'test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        gates: { planRequired: false, planApproved: false, mergeRequestRequired: false, mergeApproved: false },
        isMerged: null,
        relations: [],
        incomingRelations: []
      });

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await searchCards(['--workspace-path', '/tmp/workspace', '--status', 'todo', '--limit', '1']);
        expect(logSpy).toHaveBeenCalledOnce();
        const output = JSON.parse(logSpy.mock.calls[0]![0] as string) as Array<{ id: string; status: string }>;
        expect(output).toHaveLength(1);
        expect(output[0]!.status).toBe('todo');
      } finally {
        logSpy.mockRestore();
      }
    });

    it('returns all cards when called with no query', async () => {
      cards.set('card-1', {
        id: 'card-1',
        title: 'First',
        status: 'todo',
        tags: [],
        isPinned: false,
        order: 0,
        repositoryId: 'test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        gates: { planRequired: false, planApproved: false, mergeRequestRequired: false, mergeApproved: false },
        isMerged: null,
        relations: [],
        incomingRelations: []
      });
      cards.set('card-2', {
        id: 'card-2',
        title: 'Second',
        status: 'active',
        tags: [],
        isPinned: false,
        order: 0,
        repositoryId: 'test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        gates: { planRequired: false, planApproved: false, mergeRequestRequired: false, mergeApproved: false },
        isMerged: null,
        relations: [],
        incomingRelations: []
      });

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await searchCards(['--workspace-path', '/tmp/workspace']);
        expect(logSpy).toHaveBeenCalledOnce();
        const output = JSON.parse(logSpy.mock.calls[0]![0] as string) as Array<{ id: string }>;
        expect(output).toHaveLength(2);
        // Output is CardListSummary objects with flattened gate fields
        const first = output[0] as Record<string, unknown>;
        expect(first).toHaveProperty('planRequired');
        expect(first).toHaveProperty('planApproved');
      } finally {
        logSpy.mockRestore();
      }
    });
  });

  describe('help mechanisms', () => {
    const cardBinPath = new URL('../../src/bin/card.ts', import.meta.url).pathname;

    function runCard(args: string[]): { stdout: string; exitCode: number } {
      try {
        const stdout = execFileSync('tsx', [cardBinPath, ...args], {
          encoding: 'utf8'
        });
        return { stdout, exitCode: 0 };
      } catch (error) {
        const err = error as { stdout?: string; status?: number };
        return { stdout: err.stdout ?? '', exitCode: err.status ?? 1 };
      }
    }

    it('card help prints help text and exits 0', () => {
      const result = runCard(['help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage: card.mjs');
    });

    it('card list --help prints help text and exits 0', () => {
      const result = runCard(['list', '--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage: card.mjs');
    });

    it('card search -h prints help text and exits 0', () => {
      const result = runCard(['search', '-h']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage: card.mjs');
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
        await withStdin(JSON.stringify({ title: 'Test', tags: ['bug'] }), () =>
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
        expect(output).not.toHaveProperty('tags');
      } finally {
        logSpy.mockRestore();
      }
    });

    it('does not write any files to the card repository', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await withStdin(JSON.stringify({ title: 'Test', tags: ['bug'] }), () =>
          createCard(['--workspace-path', '/tmp/workspace'])
        );
        expect(files.size).toBe(0);
      } finally {
        logSpy.mockRestore();
      }
    });
  });
});
