/**
 * Reproduction test for cross-workspace bind bug.
 *
 * When `card create --workspace-path <repoB>` runs inside a linked worktree of
 * repoA, `createCard()` connects to the correct workspace (repoB via the
 * `--workspace-path` flag) but `resolveBindTarget()` discovers the cwd linked
 * worktree (repoA) and returns `kind: 'bind'` with repoA's worktree path. The
 * resolved workspace is never passed to `resolveBindTarget()`, so there is no
 * cross-check. The result is that repoA's worktree is bound to a card created
 * in repoB's workspace.
 *
 * @summary Reproduction test for card create cross-workspace bind
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir as realTmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return {
    ...actual,
    homedir: vi.fn(() => process.env['MOCK_HOMEDIR'] || '/tmp')
  };
});

// Mock the worktree-outfit orchestrator so createCard's binding side-effect is
// observable without registering branches, installing hooks, or spawning
// detached watcher processes. The real outfit path has its own suite.
const outfitWorktreeForCard = vi.fn<(...args: unknown[]) => Promise<void>>(() => Promise.resolve());
vi.mock('@cards/sdk/worktree-for-card', () => ({
  outfitWorktreeForCard: (...args: unknown[]) => outfitWorktreeForCard(...args)
}));

// Mock the candidate-set reads/removals so the run-from-outside fallback is
// driven deterministically without touching the global cards config dir.
const readUnboundCandidates = vi.fn<
  (...args: unknown[]) => Promise<{ worktreeDir: string; sessionId: string; transcriptPath: string }[]>
>(() => Promise.resolve([]));
const removeUnboundCandidate = vi.fn<(...args: unknown[]) => Promise<void>>(() => Promise.resolve());
vi.mock('@cards/sdk/unbound-worktree-candidates', () => ({
  readUnboundCandidates: (...args: unknown[]) => readUnboundCandidates(...args),
  removeUnboundCandidate: (...args: unknown[]) => removeUnboundCandidate(...args)
}));

// resolveExtensionPath is invoked only to build compiledScriptPaths for the
// (mocked) outfit call; stub it so it never touches the real install.
vi.mock('@cards/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cards/sdk')>();
  return {
    ...actual,
    resolveExtensionPath: vi.fn(() => Promise.resolve('/tmp/ext-install'))
  };
});

import { createCard } from '../../src/bin/card.js';

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

/**
 * Restores an environment variable to a previously-saved value, deleting it when
 * the saved value is `undefined` (i.e. it was unset before the test).
 *
 * @param key - Environment variable name.
 * @param saved - The value captured before the test mutated it.
 */
function restoreEnv(key: string, saved: string | undefined): void {
  if (saved === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = saved;
  }
}

describe('card create cross-workspace bind (reproduction)', () => {
  let testDir: string;
  let server: Server;
  let cardCounter: number;

  /** Base directory for the two test repositories. */
  let reposBase: string;
  /** repoA main repository — a distinct repository from repoB. */
  let repoA: string;
  /** repoA's linked worktree — `card create` runs from here. */
  let repoALinked: string;
  /** repoB main repository — a different workspace. */
  let repoB: string;
  let origCwd: string;
  let savedSessionId: string | undefined;
  let savedTranscript: string | undefined;
  let savedCardsHome: string | undefined;
  let savedExitCode: typeof process.exitCode;

  beforeEach(async () => {
    cardCounter = 0;
    origCwd = process.cwd();
    savedSessionId = process.env['CARDS_SESSION_ID'];
    savedTranscript = process.env['CARDS_TRANSCRIPT_PATH'];
    savedCardsHome = process.env['CARDS_HOME'];
    savedExitCode = process.exitCode;

    // Create temp directory for homedir mock and discovery file.
    testDir = join(realTmpdir(), `card-cross-ws-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(join(testDir, '.cards'), { recursive: true });
    process.env['MOCK_HOMEDIR'] = testDir;
    process.env['CARDS_HOME'] = join(testDir, '.cards');

    // Create a directory for the two independent git repos.
    reposBase = join(realTmpdir(), `card-cross-ws-repos-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(reposBase, { recursive: true });

    // --- repoA: the "current" repository with a linked worktree ---
    repoA = join(reposBase, 'repoA');
    execFileSync('git', ['init', '-q', '-b', 'main', repoA]);
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoA });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: repoA });
    execFileSync('git', ['commit', '-q', '--allow-empty', '-m', 'init'], { cwd: repoA });

    // Create a linked worktree from repoA (git-dir !== common-dir, so
    // resolveLinkedWorktreeDir treats it as a bind target).
    const linkedRaw = join(reposBase, 'repoA-linked');
    execFileSync('git', ['worktree', 'add', '-q', '-b', 'feature/x', linkedRaw], { cwd: repoA });
    repoALinked = realpathSync(linkedRaw);
    execFileSync('git', ['config', 'branch.feature/x.cardsParent', 'main'], { cwd: repoALinked });

    // --- repoB: a different repository / workspace ---
    repoB = join(reposBase, 'repoB');
    execFileSync('git', ['init', '-q', '-b', 'main', repoB]);
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoB });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: repoB });
    execFileSync('git', ['commit', '-q', '--allow-empty', '-m', 'init'], { cwd: repoB });

    // Clear mock state from any previous test.
    outfitWorktreeForCard.mockClear();
    outfitWorktreeForCard.mockResolvedValue(undefined);
    readUnboundCandidates.mockClear();
    readUnboundCandidates.mockResolvedValue([]);
    removeUnboundCandidate.mockClear();

    // Start a minimal HTTP server that handles POST /cards (create).
    server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const method = req.method ?? 'GET';

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
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(card));
        return;
      }

      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, 'localhost', resolve));
    const port = (server.address() as AddressInfo).port;

    // Write discovery file pointing to test server.
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
    process.chdir(origCwd);
    restoreEnv('CARDS_SESSION_ID', savedSessionId);
    restoreEnv('CARDS_TRANSCRIPT_PATH', savedTranscript);
    restoreEnv('CARDS_HOME', savedCardsHome);
    process.exitCode = savedExitCode;
    delete process.env['MOCK_HOMEDIR'];
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(testDir, { recursive: true, force: true });
    rmSync(reposBase, { recursive: true, force: true });
  });

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

  it('does not bind the cwd worktree when --workspace-path points to a different repository', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env['CARDS_SESSION_ID'] = 'sess-cross-ws';
    process.env['CARDS_TRANSCRIPT_PATH'] = '/tmp/cross-ws-transcript.jsonl';
    try {
      // Run from INSIDE repoA's linked worktree, but target repoB as workspace.
      process.chdir(repoALinked);
      await withStdin(JSON.stringify({ title: 'Cross-workspace card' }), () => createCard(['--workspace-path', repoB]));

      // EXPECTED: the card is created in repoB's workspace — stdout carries the
      // create-result JSON irrespective of bind outcome.
      expect(logSpy).toHaveBeenCalled();
      const output = JSON.parse(logSpy.mock.calls[0]![0] as string) as Record<string, unknown>;
      expect(output['id']).toBe('test-1');

      // EXPECTED: the worktree is NOT bound because it belongs to a different
      // repository than the card's workspace.
      // FAILS against unfixed code — outfitWorktreeForCard IS currently called.
      expect(outfitWorktreeForCard).not.toHaveBeenCalled();

      // EXPECTED: a stderr notice names the worktree and explains the mismatch.
      // FAILS against unfixed code — no console.error call is currently emitted.
      const errCalls = errSpy.mock.calls.map((c) => c[0] as string).join('\n');
      expect(errCalls).toContain(repoALinked);
      expect(errCalls).toContain('different workspace');
    } finally {
      logSpy.mockRestore();
      errSpy.mockRestore();
    }
  });

  it('emits a stderr notice when the cwd worktree belongs to a different repository than the workspace', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env['CARDS_SESSION_ID'] = 'sess-cross-ws-2';
    process.env['CARDS_TRANSCRIPT_PATH'] = '/tmp/cross-ws-2-transcript.jsonl';
    try {
      process.chdir(repoALinked);
      await withStdin(JSON.stringify({ title: 'Cross-workspace notice card' }), () =>
        createCard(['--workspace-path', repoB])
      );

      // The card is still created normally — stdout carries the create-result JSON.
      expect(logSpy).toHaveBeenCalled();
      const output = JSON.parse(logSpy.mock.calls[0]![0] as string) as Record<string, unknown>;
      expect(output['id']).toBe('test-1');

      // EXPECTED: a stderr notice names the worktree and explains the workspace
      // mismatch. Fails against unfixed code — no console.error is emitted.
      const errCalls = errSpy.mock.calls.map((c) => c[0] as string).join('\n');
      expect(errCalls).toContain(repoALinked);
      expect(errCalls).toContain('different workspace');
    } finally {
      logSpy.mockRestore();
      errSpy.mockRestore();
    }
  });
});
