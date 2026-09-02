/**
 * Reproduction for: `cards create` run from inside a live-session unbound
 * worktree binds the worktree (branch registered, `.cards/CARD_ID` written) but
 * leaves the card in `todo` — activation was silently skipped inside
 * outfitWorktreeForCard — AND the skip produces NO operator-visible diagnostic.
 *
 * Hypothesis under test: outfitCreatedWorktree() calls outfitWorktreeForCard()
 * but DISCARDS the returned OutfitAttributionOutcome. The try/catch only emits a
 * diagnostic when an exception is THROWN; a skipped activation is RETURNED (no
 * throw), so the create path produces no observable signal that the worktree was
 * bound-but-not-activated. Contrast attachCard(), which reads the outcome and
 * fails closed.
 *
 * Correct behavior: when outfitWorktreeForCard returns
 * `{ attribution: 'skipped', activated: false, reason }`, createCard must surface
 * an unmistakable diagnostic (a console.error matching /not activated/i naming
 * the reason). The create stdout JSON payload must remain intact (the card WAS
 * created), so — unlike bind — this does not exit non-zero; it just must emit
 * the observable diagnostic.
 *
 * @summary createCard surfaces a diagnostic when activation is skipped
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir as realTmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forceRemoveSync } from '../helpers/forceRemove.js';

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return {
    ...actual,
    homedir: vi.fn(() => process.env['MOCK_HOMEDIR'] || '/tmp')
  };
});

// Mock the worktree-outfit orchestrator so we can have it RETURN (not throw) a
// skipped-activation outcome: branch registered but card never activated.
const outfitWorktreeForCard = vi.fn<(...args: unknown[]) => Promise<unknown>>(() => Promise.resolve());
vi.mock('@cards.management/sdk/worktree-for-card', () => ({
  outfitWorktreeForCard: (...args: unknown[]) => outfitWorktreeForCard(...args)
}));

// Mock the candidate-set reads/removals so create never touches the global
// cards config dir.
const readUnboundCandidates = vi.fn<
  (...args: unknown[]) => Promise<{ worktreeDir: string; sessionId: string; transcriptPath: string }[]>
>(() => Promise.resolve([]));
const removeUnboundCandidate = vi.fn<(...args: unknown[]) => Promise<void>>(() => Promise.resolve());
vi.mock('@cards.management/sdk/unbound-worktree-candidates', () => ({
  readUnboundCandidates: (...args: unknown[]) => readUnboundCandidates(...args),
  removeUnboundCandidate: (...args: unknown[]) => removeUnboundCandidate(...args)
}));

// resolveExtensionPath is invoked only to build compiledScriptPaths for the
// (mocked) outfit call; stub it so it never touches the real install.
vi.mock('@cards.management/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cards.management/sdk')>();
  return {
    ...actual,
    resolveExtensionPath: vi.fn(() => Promise.resolve('/tmp/ext-install'))
  };
});

import { createCard } from '../../src/bin/cards.js';

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
 * Restores an environment variable to a previously-saved value, deleting it
 * when the saved value is `undefined` (i.e. it was unset before the test).
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

describe('createCard activation outcome (observable diagnostic)', () => {
  let testDir: string;
  let server: Server;
  let savedCardsHome: string | undefined;
  let savedXdgDataHome: string | undefined;
  let savedXdgConfigHome: string | undefined;

  /** A main repo + linked worktree createCard is invoked from. */
  let base: string;
  let mainRepo: string;
  let linkedWorktree: string;
  let origCwd: string;
  let savedSessionId: string | undefined;
  let savedTranscript: string | undefined;
  let savedExitCode: typeof process.exitCode;

  /**
   * Creates a real linked git worktree (git-dir ≠ common-dir) so the cwd-primary
   * leg of resolveBindTarget treats it as a bind target, with
   * `branch.feature/create.cardsParent` configured so parent-branch resolution
   * succeeds.
   */
  function makeLinkedWorktree(): void {
    mainRepo = join(base, 'main');
    execFileSync('git', ['init', '-q', '-b', 'main', mainRepo]);
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: mainRepo });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: mainRepo });
    execFileSync('git', ['commit', '-q', '--allow-empty', '-m', 'init'], { cwd: mainRepo });
    const linkedRaw = join(base, 'linked');
    execFileSync('git', ['worktree', 'add', '-q', '-b', 'feature/create', linkedRaw], { cwd: mainRepo });
    linkedWorktree = realpathSync(linkedRaw);
    execFileSync('git', ['config', 'branch.feature/create.cardsParent', 'main'], { cwd: linkedWorktree });
  }

  /**
   * Replaces process.stdin with a Readable that emits the given string, calls
   * the async function, then restores the original stdin.
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

  beforeEach(async () => {
    testDir = join(realTmpdir(), `card-create-outcome-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(join(testDir, '.cards'), { recursive: true });
    process.env['MOCK_HOMEDIR'] = testDir;
    savedCardsHome = process.env['CARDS_HOME'];
    savedXdgDataHome = process.env['XDG_DATA_HOME'];
    savedXdgConfigHome = process.env['XDG_CONFIG_HOME'];
    process.env['CARDS_HOME'] = join(testDir, '.cards');
    delete process.env['XDG_DATA_HOME'];
    delete process.env['XDG_CONFIG_HOME'];

    // Minimal HTTP server: createCard needs POST /cards.
    server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? '/', `http://localhost`);
      const method = req.method ?? 'GET';
      if (method === 'POST' && url.pathname === '/cards') {
        const body = JSON.parse(await collectBody(req)) as Record<string, unknown>;
        const card = {
          id: 'main-001',
          ...body,
          status: 'todo',
          repositoryPath: '/tmp/test-card-repo',
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

    origCwd = process.cwd();
    savedSessionId = process.env['CARDS_SESSION_ID'];
    savedTranscript = process.env['CARDS_TRANSCRIPT_PATH'];
    savedExitCode = process.exitCode;
    base = realpathSync(
      (() => {
        const b = join(realTmpdir(), `card-create-outcome-wt-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        mkdirSync(b, { recursive: true });
        return b;
      })()
    );
    outfitWorktreeForCard.mockClear();
    removeUnboundCandidate.mockClear();
    readUnboundCandidates.mockClear();
    readUnboundCandidates.mockResolvedValue([]);
  });

  afterEach(async () => {
    process.chdir(origCwd);
    restoreEnv('CARDS_SESSION_ID', savedSessionId);
    restoreEnv('CARDS_TRANSCRIPT_PATH', savedTranscript);
    process.exitCode = savedExitCode;
    forceRemoveSync(base);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    forceRemoveSync(testDir);
    delete process.env['MOCK_HOMEDIR'];
    restoreEnv('CARDS_HOME', savedCardsHome);
    restoreEnv('XDG_DATA_HOME', savedXdgDataHome);
    restoreEnv('XDG_CONFIG_HOME', savedXdgConfigHome);
  });

  it('emits a diagnostic when outfitWorktreeForCard reports activation was skipped', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      makeLinkedWorktree();
      process.chdir(linkedWorktree);
      process.env['CARDS_SESSION_ID'] = 'sess-skipped-activation';
      process.env['CARDS_TRANSCRIPT_PATH'] = '/tmp/transcript.jsonl';

      // Activation was silently skipped (RETURNED, not thrown): the worktree got
      // its branch registered but the card was never activated.
      outfitWorktreeForCard.mockResolvedValue({
        attribution: 'skipped',
        activated: false,
        reason: 'not-activatable'
      });

      await withStdin(JSON.stringify({ title: 'Bound but unactivated card' }), () =>
        createCard(['--workspace-path', '/tmp/workspace'])
      );

      // The card WAS created — stdout payload must remain intact.
      expect(logSpy).toHaveBeenCalledOnce();
      const output = JSON.parse(logSpy.mock.calls[0]![0] as string) as Record<string, unknown>;
      expect(output['id']).toBe('main-001');

      // The contract under test: the bound-but-not-activated state must produce
      // an unmistakable diagnostic that names the reason. Current code discards
      // the returned outcome, so nothing is emitted — this is the failing assert.
      const stderr = errSpy.mock.calls.map((c) => c.map(String).join(' ')).join('\n');
      expect(stderr).toMatch(/not activated/i);
      expect(stderr).toMatch(/not-activatable/);
    } finally {
      errSpy.mockRestore();
      logSpy.mockRestore();
    }
  });
});
