/**
 * Unit tests for createWorktreeForCard, removeWorktreeForCard, and
 * bindWorktreeToCard orchestrators.
 *
 * The bare createWorktree / removeWorktree primitives are replaced with
 * controllable fakes via vi.mock so no real git or filesystem operations run.
 * CardsClient is injected as a plain object implementing only addBranch /
 * removeBranch — no mocking framework needed for the client half.
 *
 * bindWorktreeToCard mocks the worktree.ts bound-file helpers, pendingBind.ts
 * helpers, and the child_process execFile used to resolve the branch name —
 * again via vi.mock so no real filesystem or git operations run.
 *
 * @summary createWorktreeForCard / removeWorktreeForCard / bindWorktreeToCard unit tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardsClient } from '../src/client/cardsClient.js';
import type { EarlyWorktreeResult } from '../src/worktree.js';
import type { BindWorktreeToCardOptions } from '../src/worktreeForCard.js';
import {
  BranchUnregisterError,
  bindWorktreeToCard,
  createWorktreeForCard,
  removeWorktreeForCard
} from '../src/worktreeForCard.js';

// ---------------------------------------------------------------------------
// Module-level fake for the worktree primitives
// ---------------------------------------------------------------------------

vi.mock('../src/worktree.js', () => ({
  createWorktree: vi.fn(),
  removeWorktree: vi.fn(),
  writeCardBoundFile: vi.fn(),
  clearCardBoundFile: vi.fn(),
  appendWorktreeGitExcludes: vi.fn()
}));

vi.mock('../src/pendingBind.js', () => ({
  readPendingBind: vi.fn(),
  writePendingBind: vi.fn(),
  clearPendingBind: vi.fn()
}));

vi.mock('node:child_process', () => ({
  execFile: vi.fn()
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    access: vi.fn()
  };
});

import { execFile } from 'node:child_process';
import { access, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { clearPendingBind, writePendingBind } from '../src/pendingBind.js';
// Import after vi.mock so we get the mocked versions.
import {
  appendWorktreeGitExcludes,
  clearCardBoundFile,
  createWorktree,
  removeWorktree,
  writeCardBoundFile
} from '../src/worktree.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a minimal CardsClient fake that tracks calls and resolves immediately.
 *
 * @param overrides - Optional overrides for addBranch and removeBranch.
 * @param overrides.addBranch - Override for the addBranch method.
 * @param overrides.removeBranch - Override for the removeBranch method.
 * @returns A partial CardsClient with call tracking arrays attached.
 */
function makeClient(overrides?: {
  addBranch?: CardsClient['addBranch'];
  removeBranch?: CardsClient['removeBranch'];
}): CardsClient & {
  addBranchCalls: Parameters<CardsClient['addBranch']>[];
  removeBranchCalls: Parameters<CardsClient['removeBranch']>[];
} {
  const addBranchCalls: Parameters<CardsClient['addBranch']>[] = [];
  const removeBranchCalls: Parameters<CardsClient['removeBranch']>[] = [];

  return {
    addBranch:
      overrides?.addBranch ??
      (async (...args) => {
        addBranchCalls.push(args as Parameters<CardsClient['addBranch']>);
      }),
    removeBranch:
      overrides?.removeBranch ??
      (async (...args) => {
        removeBranchCalls.push(args as Parameters<CardsClient['removeBranch']>);
      }),
    addBranchCalls,
    removeBranchCalls
  } as unknown as CardsClient & {
    addBranchCalls: Parameters<CardsClient['addBranch']>[];
    removeBranchCalls: Parameters<CardsClient['removeBranch']>[];
  };
}

const EARLY_PATH = '/worktrees/cards/main-95/1';
const BASE_OPTIONS = {
  cardId: 'main-95',
  compiledScriptPaths: { 'post-commit': '/hooks/post-commit.mjs' },
  parentBranch: 'main',
  sessionId: 'sess-abc'
} as const;

// ---------------------------------------------------------------------------
// createWorktreeForCard
// ---------------------------------------------------------------------------

describe('createWorktreeForCard', () => {
  let settleResolve!: () => void;
  let earlyResult!: EarlyWorktreeResult;

  beforeEach(() => {
    const settle = new Promise<unknown>((res) => {
      settleResolve = res as () => void;
    }) as Promise<never>;
    earlyResult = { path: EARLY_PATH, settle: settle as EarlyWorktreeResult['settle'] };

    vi.mocked(createWorktree).mockResolvedValue(earlyResult);
    vi.mocked(removeWorktree).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls createWorktree with ref and card-binding options', async () => {
    const client = makeClient();
    await createWorktreeForCard(client, 'cards/main-95/1', BASE_OPTIONS);

    expect(createWorktree).toHaveBeenCalledOnce();
    expect(createWorktree).toHaveBeenCalledWith('cards/main-95/1', {
      cwd: undefined,
      cardId: BASE_OPTIONS.cardId,
      compiledScriptPaths: BASE_OPTIONS.compiledScriptPaths
    });
  });

  it('forwards cwd when provided', async () => {
    const client = makeClient();
    await createWorktreeForCard(client, 'cards/main-95/1', { ...BASE_OPTIONS, cwd: '/repo' });

    expect(createWorktree).toHaveBeenCalledWith('cards/main-95/1', {
      cwd: '/repo',
      cardId: BASE_OPTIONS.cardId,
      compiledScriptPaths: BASE_OPTIONS.compiledScriptPaths
    });
  });

  it('calls addBranch with the early path, ref, parentBranch, and sessionId', async () => {
    const addBranchArgs: Parameters<CardsClient['addBranch']>[] = [];
    const client = makeClient({
      addBranch: async (...args) => {
        addBranchArgs.push(args as Parameters<CardsClient['addBranch']>);
      }
    });

    await createWorktreeForCard(client, 'cards/main-95/1', BASE_OPTIONS);

    expect(addBranchArgs).toHaveLength(1);
    const [cardId, data, opts] = addBranchArgs[0]!;
    expect(cardId).toBe('main-95');
    expect(data).toEqual({ name: 'cards/main-95/1', worktree: EARLY_PATH, parentBranch: 'main' });
    expect(opts).toEqual({ sessionId: 'sess-abc' });
  });

  it('calls addBranch with the EARLY path before settle is awaited', async () => {
    const addBranchArgs: Parameters<CardsClient['addBranch']>[] = [];
    let settleAwaited = false;

    const settle = new Promise<never>((res) => {
      // Resolve only after we mark settle as being waited on
      setTimeout(() => {
        settleAwaited = true;
        res(undefined as never);
      }, 100);
    });
    vi.mocked(createWorktree).mockResolvedValue({ path: EARLY_PATH, settle });

    const client = makeClient({
      addBranch: async (...args) => {
        // By the time addBranch is called, settle must NOT have been awaited
        expect(settleAwaited).toBe(false);
        addBranchArgs.push(args as Parameters<CardsClient['addBranch']>);
      }
    });

    // The orchestrator must not await settle before calling addBranch
    await createWorktreeForCard(client, 'cards/main-95/1', BASE_OPTIONS);

    expect(addBranchArgs).toHaveLength(1);
    expect(settleAwaited).toBe(false);
  });

  it('returns the EarlyWorktreeResult (path + settle) without awaiting settle', async () => {
    const client = makeClient();

    const result = await createWorktreeForCard(client, 'cards/main-95/1', BASE_OPTIONS);

    expect(result.path).toBe(EARLY_PATH);
    // settle must be a promise (not undefined); its resolution must be
    // outstanding — we can check it hasn't resolved synchronously.
    expect(result.settle).toBeInstanceOf(Promise);
    // settle has NOT been awaited by the orchestrator, so settleResolve is
    // still callable — trigger it and confirm result.settle resolves.
    settleResolve();
    // Confirm settle resolves (doesn't hang or reject) once triggered.
    await result.settle;
  });

  it('never calls addBranch when createWorktree rejects', async () => {
    vi.mocked(createWorktree).mockRejectedValue(new Error('git failure'));
    const addBranchArgs: Parameters<CardsClient['addBranch']>[] = [];
    const client = makeClient({
      addBranch: async (...args) => {
        addBranchArgs.push(args as Parameters<CardsClient['addBranch']>);
      }
    });

    await expect(createWorktreeForCard(client, 'cards/main-95/1', BASE_OPTIONS)).rejects.toThrow('git failure');
    expect(addBranchArgs).toHaveLength(0);
  });

  it('propagates addBranch rejection', async () => {
    const client = makeClient({
      addBranch: async () => {
        throw new Error('API failure');
      }
    });

    await expect(createWorktreeForCard(client, 'cards/main-95/1', BASE_OPTIONS)).rejects.toThrow('API failure');
  });

  it('rolls back the worktree and rethrows the original error when addBranch rejects', async () => {
    // Give createWorktree a settle that resolves so the test does not depend on
    // the never-resolving default; the rollback path must not await it anyway.
    vi.mocked(createWorktree).mockResolvedValue({
      path: EARLY_PATH,
      settle: Promise.resolve(undefined) as unknown as EarlyWorktreeResult['settle']
    });

    const client = makeClient({
      addBranch: async () => {
        throw new Error('API failure');
      }
    });

    await expect(createWorktreeForCard(client, 'cards/main-95/1', BASE_OPTIONS)).rejects.toThrow('API failure');

    // The just-created worktree is rolled back so no orphan remains on disk.
    expect(removeWorktree).toHaveBeenCalledOnce();
    expect(removeWorktree).toHaveBeenCalledWith(EARLY_PATH);
  });

  it('does not leave settle as an unhandled rejection on the addBranch-rejection path', async () => {
    // A settle that REJECTS after the orchestrator has already failed and
    // returned must not surface as an unhandledRejection. The orchestrator
    // attaches a handler to settle on the rollback path.
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown): void => {
      unhandled.push(reason);
    };
    process.on('unhandledRejection', onUnhandled);

    try {
      const settle = Promise.reject(new Error('settle blew up')) as EarlyWorktreeResult['settle'];
      vi.mocked(createWorktree).mockResolvedValue({ path: EARLY_PATH, settle });

      const client = makeClient({
        addBranch: async () => {
          throw new Error('API failure');
        }
      });

      await expect(createWorktreeForCard(client, 'cards/main-95/1', BASE_OPTIONS)).rejects.toThrow('API failure');

      // Let any microtasks / unhandledRejection callbacks flush.
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(unhandled).toHaveLength(0);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });

  it('reports a combined error when rollback also fails after addBranch rejects', async () => {
    vi.mocked(createWorktree).mockResolvedValue({
      path: EARLY_PATH,
      settle: Promise.resolve(undefined) as unknown as EarlyWorktreeResult['settle']
    });
    vi.mocked(removeWorktree).mockRejectedValue(new Error('rollback boom'));

    const client = makeClient({
      addBranch: async () => {
        throw new Error('API failure');
      }
    });

    await expect(createWorktreeForCard(client, 'cards/main-95/1', BASE_OPTIONS)).rejects.toThrow(
      /addBranch=API failure; rollback=rollback boom/
    );
  });
});

// ---------------------------------------------------------------------------
// removeWorktreeForCard
// ---------------------------------------------------------------------------

describe('removeWorktreeForCard', () => {
  const REMOVE_OPTIONS = {
    cardId: 'main-95',
    branchName: 'cards/main-95/1',
    sessionId: 'sess-xyz'
  } as const;

  beforeEach(() => {
    vi.mocked(removeWorktree).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls removeWorktree with the worktree path', async () => {
    const client = makeClient();
    await removeWorktreeForCard(client, EARLY_PATH, REMOVE_OPTIONS);

    expect(removeWorktree).toHaveBeenCalledOnce();
    expect(removeWorktree).toHaveBeenCalledWith(EARLY_PATH);
  });

  it('calls removeBranch with cardId, branchName, and sessionId', async () => {
    const removeBranchArgs: Parameters<CardsClient['removeBranch']>[] = [];
    const client = makeClient({
      removeBranch: async (...args) => {
        removeBranchArgs.push(args as Parameters<CardsClient['removeBranch']>);
      }
    });

    await removeWorktreeForCard(client, EARLY_PATH, REMOVE_OPTIONS);

    expect(removeBranchArgs).toHaveLength(1);
    const [cardId, name, opts] = removeBranchArgs[0]!;
    expect(cardId).toBe('main-95');
    expect(name).toBe('cards/main-95/1');
    expect(opts).toEqual({ sessionId: 'sess-xyz' });
  });

  it('removes the worktree BEFORE unregistering the branch', async () => {
    const callOrder: string[] = [];

    vi.mocked(removeWorktree).mockImplementation(async () => {
      callOrder.push('removeWorktree');
    });

    const client = makeClient({
      removeBranch: async () => {
        callOrder.push('removeBranch');
      }
    });

    await removeWorktreeForCard(client, EARLY_PATH, REMOVE_OPTIONS);

    expect(callOrder).toEqual(['removeWorktree', 'removeBranch']);
  });

  it('propagates the teardown failure untouched (not wrapped) when removeWorktree rejects', async () => {
    const diskError = new Error('disk error');
    vi.mocked(removeWorktree).mockRejectedValue(diskError);
    const removeBranchArgs: Parameters<CardsClient['removeBranch']>[] = [];
    const client = makeClient({
      removeBranch: async (...args) => {
        removeBranchArgs.push(args as Parameters<CardsClient['removeBranch']>);
      }
    });

    // The teardown-phase error must propagate as-is so callers can apply their
    // teardown stance to it; it is NOT a BranchUnregisterError.
    await expect(removeWorktreeForCard(client, EARLY_PATH, REMOVE_OPTIONS)).rejects.toBe(diskError);
    expect(removeBranchArgs).toHaveLength(0);
  });

  it('wraps a removeBranch failure in BranchUnregisterError carrying the cause', async () => {
    const apiError = new Error('API remove failure');
    const client = makeClient({
      removeBranch: async () => {
        throw apiError;
      }
    });

    await expect(removeWorktreeForCard(client, EARLY_PATH, REMOVE_OPTIONS)).rejects.toBeInstanceOf(
      BranchUnregisterError
    );
    // The original cause is preserved for diagnostics.
    await removeWorktreeForCard(client, EARLY_PATH, REMOVE_OPTIONS).catch((error: unknown) => {
      expect(error).toBeInstanceOf(BranchUnregisterError);
      expect((error as BranchUnregisterError).cause).toBe(apiError);
    });
  });
});

// ---------------------------------------------------------------------------
// bindWorktreeToCard
// ---------------------------------------------------------------------------

describe('bindWorktreeToCard', () => {
  const WORKTREE_DIR = '/worktrees/cards/main-115/1';
  const BIND_OPTIONS: BindWorktreeToCardOptions = {
    cardId: 'main-115',
    parentBranch: 'main',
    sessionId: 'sess-bind-abc'
  };

  // The cross-process bind lock writes a real lock file under the global Cards
  // config dir. Redirect that dir to an isolated temp dir per run via
  // CARDS_HOME so the lock primitive exercises real file I/O without touching
  // the developer's actual ~/.cards.
  let cardsHomeDir: string;
  let priorCardsHome: string | undefined;

  beforeEach(async () => {
    priorCardsHome = process.env['CARDS_HOME'];
    cardsHomeDir = await mkdtemp(join(tmpdir(), 'bind-lock-test-'));
    process.env['CARDS_HOME'] = cardsHomeDir;

    // Default: CARD_ID does not exist (ENOENT → not yet bound).
    vi.mocked(access).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    // Default: git rev-parse succeeds and returns the branch name.
    vi.mocked(execFile).mockImplementation((_cmd, _args, cb) => {
      (cb as (err: null, result: { stdout: string; stderr: string }) => void)(null, {
        stdout: 'cards/main-115/1\n',
        stderr: ''
      });
      return {} as ReturnType<typeof execFile>;
    });
    vi.mocked(writeCardBoundFile).mockResolvedValue(undefined);
    vi.mocked(clearCardBoundFile).mockResolvedValue(undefined);
    vi.mocked(appendWorktreeGitExcludes).mockResolvedValue(undefined);
    vi.mocked(writePendingBind).mockResolvedValue(undefined);
    vi.mocked(clearPendingBind).mockResolvedValue(undefined);
  });

  afterEach(async () => {
    vi.clearAllMocks();
    if (priorCardsHome === undefined) {
      delete process.env['CARDS_HOME'];
    } else {
      process.env['CARDS_HOME'] = priorCardsHome;
    }
    await rm(cardsHomeDir, { recursive: true, force: true });
  });

  it('happy path: returns bound, writes CARD_ID, excludes it from git, calls addBranch, then clears PENDING_BIND', async () => {
    const addBranchArgs: Parameters<CardsClient['addBranch']>[] = [];
    const client = makeClient({
      addBranch: async (...args) => {
        addBranchArgs.push(args as Parameters<CardsClient['addBranch']>);
      }
    });

    const outcome = await bindWorktreeToCard(client, WORKTREE_DIR, BIND_OPTIONS);

    // This call performed the bind.
    expect(outcome).toBe('bound');

    // CARD_ID written before addBranch.
    expect(writeCardBoundFile).toHaveBeenCalledOnce();
    expect(writeCardBoundFile).toHaveBeenCalledWith(WORKTREE_DIR, 'main-115');

    // addBranch called with branch name from git HEAD, worktree path, and parentBranch.
    expect(addBranchArgs).toHaveLength(1);
    const [cardId, data, opts] = addBranchArgs[0]!;
    expect(cardId).toBe('main-115');
    expect(data).toEqual({ name: 'cards/main-115/1', worktree: WORKTREE_DIR, parentBranch: 'main' });
    expect(opts).toEqual({ sessionId: 'sess-bind-abc' });

    // The CARD_ID marker this bind wrote is added to the worktree's git
    // info/exclude so it does not show as untracked/committable.
    expect(appendWorktreeGitExcludes).toHaveBeenCalledOnce();
    expect(appendWorktreeGitExcludes).toHaveBeenCalledWith(WORKTREE_DIR, ['.cards/CARD_ID']);

    // PENDING_BIND cleared after successful addBranch.
    expect(clearPendingBind).toHaveBeenCalledOnce();
    expect(clearPendingBind).toHaveBeenCalledWith(WORKTREE_DIR);
  });

  it('addBranch failure: un-writes CARD_ID, leaves PENDING_BIND marker untouched, never removes worktree, rethrows original error', async () => {
    const apiError = new Error('addBranch API failure');
    const client = makeClient({
      addBranch: async () => {
        throw apiError;
      }
    });

    await expect(bindWorktreeToCard(client, WORKTREE_DIR, BIND_OPTIONS)).rejects.toBe(apiError);

    // CARD_ID un-written on rollback.
    expect(clearCardBoundFile).toHaveBeenCalledOnce();
    expect(clearCardBoundFile).toHaveBeenCalledWith(WORKTREE_DIR);

    // PENDING_BIND is NOT rewritten on the rollback path. The on-disk marker was
    // never cleared (that only happens on success), so it is still the original
    // full marker EnterWorktree wrote — with its transcriptPath + sessionId
    // intact. Rewriting it here would overwrite that valid marker with a
    // transcriptPath-stripped copy and brick the worktree.
    expect(writePendingBind).not.toHaveBeenCalled();
    expect(clearPendingBind).not.toHaveBeenCalled();

    // removeWorktree is NEVER called — the worktree predates the bind.
    expect(removeWorktree).not.toHaveBeenCalled();
  });

  it('CARD_ID already present: returns already-bound, clears stale PENDING_BIND, does not call addBranch', async () => {
    // Simulate CARD_ID already existing on disk.
    vi.mocked(access).mockResolvedValue(undefined);
    const addBranchArgs: Parameters<CardsClient['addBranch']>[] = [];
    const client = makeClient({
      addBranch: async (...args) => {
        addBranchArgs.push(args as Parameters<CardsClient['addBranch']>);
      }
    });

    const outcome = await bindWorktreeToCard(client, WORKTREE_DIR, BIND_OPTIONS);

    // The reconciliation branch is distinguishable from a successful bind so
    // the caller does not spawn attribution for the wrong card.
    expect(outcome).toBe('already-bound');

    // PENDING_BIND drained so the EnterWorktree nag stops.
    expect(clearPendingBind).toHaveBeenCalledOnce();
    expect(clearPendingBind).toHaveBeenCalledWith(WORKTREE_DIR);

    // addBranch NOT called — would be a duplicate non-idempotent POST.
    expect(addBranchArgs).toHaveLength(0);

    // writeCardBoundFile NOT called — it's already there.
    expect(writeCardBoundFile).not.toHaveBeenCalled();
  });

  it('acquires and releases a real cross-process lock file under the global cards config dir', async () => {
    let lockFileSeenDuringCriticalSection = false;
    const bindLocksDir = join(cardsHomeDir, 'bind-locks');

    const client = makeClient();

    // Observe the lock-file state from inside the critical section: by the time
    // writeCardBoundFile runs, acquireLock must already have created a lock file.
    vi.mocked(writeCardBoundFile).mockImplementation(async () => {
      const entries = await readdir(bindLocksDir).catch((): string[] => []);
      lockFileSeenDuringCriticalSection = entries.some((name) => name.endsWith('.lock'));
    });

    await bindWorktreeToCard(client, WORKTREE_DIR, BIND_OPTIONS);

    // The lock existed during the bind...
    expect(lockFileSeenDuringCriticalSection).toBe(true);

    // ...and was released (unlinked) in the finally block once the bind returned.
    const entriesAfter = await readdir(bindLocksDir).catch((): string[] => []);
    expect(entriesAfter.filter((name) => name.endsWith('.lock'))).toHaveLength(0);
  });

  it('serializes concurrent binds against the same worktree via the file lock', async () => {
    const callOrder: string[] = [];
    let resolveFirstStarted!: () => void;
    const firstStarted = new Promise<void>((res) => {
      resolveFirstStarted = res;
    });

    const client = makeClient({
      addBranch: async () => {
        callOrder.push('addBranch');
      }
    });

    vi.mocked(writeCardBoundFile).mockImplementation(async () => {
      callOrder.push('writeCardBoundFile');
      resolveFirstStarted();
      // Hold the critical section open long enough for the second call to
      // contend on the lock file while the first still holds it.
      await new Promise<void>((res) => setTimeout(res, 30));
    });

    // Launch both binds concurrently. The second must block on the lock file
    // until the first releases it.
    const first = bindWorktreeToCard(client, WORKTREE_DIR, BIND_OPTIONS);
    await firstStarted; // first is now inside its critical section, holding the lock
    const second = bindWorktreeToCard(client, WORKTREE_DIR, { ...BIND_OPTIONS, sessionId: 'sess-2' });

    await Promise.all([first, second]);

    // The lock serialized the two binds: each (writeCardBoundFile, addBranch)
    // pair completed before the next began — not interleaved.
    expect(callOrder).toEqual(['writeCardBoundFile', 'addBranch', 'writeCardBoundFile', 'addBranch']);
  });

  it('appendWorktreeGitExcludes failure: still returns bound, clears PENDING_BIND, and addBranch was called', async () => {
    // Simulate a transient git/fs error in the display-only exclude step.
    vi.mocked(appendWorktreeGitExcludes).mockRejectedValue(new Error('git rev-parse hiccup'));

    const addBranchArgs: Parameters<CardsClient['addBranch']>[] = [];
    const client = makeClient({
      addBranch: async (...args) => {
        addBranchArgs.push(args as Parameters<CardsClient['addBranch']>);
      }
    });

    // The exclude failure must not propagate — the bind is already durable.
    const outcome = await bindWorktreeToCard(client, WORKTREE_DIR, BIND_OPTIONS);
    expect(outcome).toBe('bound');

    // The durable bind step (addBranch) ran exactly once.
    expect(addBranchArgs).toHaveLength(1);

    // The PENDING_BIND marker was cleared despite the exclude failure (reorder
    // ensures clearPendingBind runs before appendWorktreeGitExcludes).
    expect(clearPendingBind).toHaveBeenCalledOnce();
    expect(clearPendingBind).toHaveBeenCalledWith(WORKTREE_DIR);
  });
});
