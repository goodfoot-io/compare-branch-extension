/**
 * Reproduction for: attachCard() passes agentPid: process.pid to
 * outfitWorktreeForCard, supplying the short-lived CLI invocation PID
 * instead of the real long-running agent process. When the CLI exits
 * seconds after attach, the adhoc-cleanup process sees the PID die and
 * flips the card to needs_review prematurely.
 *
 * Hypothesis under test: attachCard() hard-codes agentPid: process.pid
 * at line 1253 instead of omitting it so outfitWorktreeForCard resolves
 * the real agent PID via findAgentPid(). The fix is to remove that line
 * from the options object. This test asserts that outfitWorktreeForCard
 * is called WITHOUT agentPid in the options — an assertion that fails
 * against the current unfixed code.
 *
 * @summary attachCard passes CLI process.pid as agentPid instead of letting outfitWorktreeForCard resolve it
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir as realTmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forceRemoveSync } from '../helpers/forceRemove.js';

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return {
    ...actual,
    homedir: vi.fn(() => process.env['MOCK_HOMEDIR'] || '/tmp')
  };
});

// Mock outfitWorktreeForCard so we can inspect the options object passed to it.
const outfitWorktreeForCard = vi.fn<(...args: unknown[]) => Promise<unknown>>(() => Promise.resolve());
vi.mock('@cards.management/sdk/worktree-for-card', () => ({
  outfitWorktreeForCard: (...args: unknown[]) => outfitWorktreeForCard(...args)
}));

const readUnboundCandidates = vi.fn<
  (...args: unknown[]) => Promise<{ worktreeDir: string; sessionId: string; transcriptPath: string }[]>
>(() => Promise.resolve([]));
const removeUnboundCandidate = vi.fn<(...args: unknown[]) => Promise<void>>(() => Promise.resolve());
vi.mock('@cards.management/sdk/unbound-worktree-candidates', () => ({
  readUnboundCandidates: (...args: unknown[]) => readUnboundCandidates(...args),
  removeUnboundCandidate: (...args: unknown[]) => removeUnboundCandidate(...args)
}));

vi.mock('@cards.management/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cards.management/sdk')>();
  return {
    ...actual,
    resolveExtensionPath: vi.fn(() => Promise.resolve('/tmp/ext-install'))
  };
});

import { attachCard } from '../../src/bin/cards.js';

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

describe('attachCard agentPid (CLI PID vs agent PID)', () => {
  let testDir: string;
  let server: Server;
  /** Cards stored in the test server, keyed by ID. */
  let cards: Map<string, Record<string, unknown>>;
  let savedCardsHome: string | undefined;
  let savedXdgDataHome: string | undefined;
  let savedXdgConfigHome: string | undefined;

  /** A main repo + linked worktree that attachCard is invoked from. */
  let base: string;
  let mainRepo: string;
  let linkedWorktree: string;
  let origCwd: string;
  let savedSessionId: string | undefined;
  let savedTranscript: string | undefined;
  /** Spy on process.exit so exits throw instead of killing the process. */
  let exitSpy: ReturnType<typeof vi.spyOn>;

  /**
   * Creates a real linked git worktree (git-dir !== common-dir) so
   * resolveLinkedWorktreeDir treats it as a bind target, with
   * `branch.feature/bind.cardsParent` configured so parent-branch resolution
   * succeeds.
   */
  function makeLinkedWorktree(): void {
    mainRepo = join(base, 'main');
    execFileSync('git', ['init', '-q', '-b', 'main', mainRepo]);
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: mainRepo });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: mainRepo });
    execFileSync('git', ['commit', '-q', '--allow-empty', '-m', 'init'], { cwd: mainRepo });
    const linkedRaw = join(base, 'linked');
    execFileSync('git', ['worktree', 'add', '-q', '-b', 'feature/bind', linkedRaw], { cwd: mainRepo });
    linkedWorktree = realpathSync(linkedRaw);
    execFileSync('git', ['config', 'branch.feature/bind.cardsParent', 'main'], { cwd: linkedWorktree });
  }

  beforeEach(async () => {
    cards = new Map();

    // Create temp directory for homedir mock and pin discovery to it.
    testDir = join(realTmpdir(), `card-bind-pid-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(join(testDir, '.cards'), { recursive: true });
    process.env['MOCK_HOMEDIR'] = testDir;
    savedCardsHome = process.env['CARDS_HOME'];
    savedXdgDataHome = process.env['XDG_DATA_HOME'];
    savedXdgConfigHome = process.env['XDG_CONFIG_HOME'];
    process.env['CARDS_HOME'] = join(testDir, '.cards');
    delete process.env['XDG_DATA_HOME'];
    delete process.env['XDG_CONFIG_HOME'];

    // Minimal HTTP server: attach only needs GET /cards/:id.
    server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? '/', `http://localhost`);
      const getCardMatch = url.pathname.match(/^\/cards\/([^/]+)$/);
      if ((req.method ?? 'GET') === 'GET' && getCardMatch) {
        const card = cards.get(getCardMatch[1]!);
        if (!card) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found', code: 'NOT_FOUND' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
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

    // Worktree fixture state.
    origCwd = process.cwd();
    savedSessionId = process.env['CARDS_SESSION_ID'];
    savedTranscript = process.env['CARDS_TRANSCRIPT_PATH'];
    base = realpathSync(
      (() => {
        const b = join(realTmpdir(), `card-bind-pid-wt-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        mkdirSync(b, { recursive: true });
        return b;
      })()
    );
    outfitWorktreeForCard.mockClear();
    removeUnboundCandidate.mockClear();
    readUnboundCandidates.mockClear();
    readUnboundCandidates.mockResolvedValue([]);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null | undefined) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  afterEach(async () => {
    exitSpy.mockRestore();
    // The partial-activation gate sets `process.exitCode` (instead of a
    // libuv-racing synchronous `process.exit`) and returns; clear it so it does
    // not leak into sibling tests or fail the runner.
    process.exitCode = undefined;
    process.chdir(origCwd);
    restoreEnv('CARDS_SESSION_ID', savedSessionId);
    restoreEnv('CARDS_TRANSCRIPT_PATH', savedTranscript);
    forceRemoveSync(base);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    forceRemoveSync(testDir);
    delete process.env['MOCK_HOMEDIR'];
    restoreEnv('CARDS_HOME', savedCardsHome);
    restoreEnv('XDG_DATA_HOME', savedXdgDataHome);
    restoreEnv('XDG_CONFIG_HOME', savedXdgConfigHome);
  });

  it('does not pass agentPid to outfitWorktreeForCard, letting it resolve the real agent PID via findAgentPid', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      makeLinkedWorktree();
      cards.set('main-001', {
        id: 'main-001',
        title: 'Bind Target',
        status: 'active',
        repositoryPath: '/tmp/test-card-repo'
      });
      process.chdir(linkedWorktree);
      process.env['CARDS_SESSION_ID'] = 'sess-agent-pid-test';
      process.env['CARDS_TRANSCRIPT_PATH'] = '/tmp/transcript.jsonl';

      await expect(attachCard('main-001')).resolves.toBeUndefined();

      // Verify outfitWorktreeForCard was invoked exactly once.
      expect(outfitWorktreeForCard).toHaveBeenCalledTimes(1);

      // The third positional argument to outfitWorktreeForCard(client, worktreeDir, options)
      // is the OutfitWorktreeForCardOptions object. Current buggy code at attachCard L1253
      // hard-codes `agentPid: process.pid` — this assertion that agentPid is undefined
      // MUST FAIL against the unfixed code (where it is a concrete number).
      const options = outfitWorktreeForCard.mock.calls[0]?.[2] as Record<string, unknown> | undefined;
      expect(options).toBeDefined();
      expect(options!['agentPid']).toBeUndefined();
    } finally {
      errSpy.mockRestore();
      logSpy.mockRestore();
    }
  });
});
