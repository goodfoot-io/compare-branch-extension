/**
 * Unit tests for createWorktreeForCard and removeWorktreeForCard orchestrators.
 *
 * The bare createWorktree / removeWorktree primitives are replaced with
 * controllable fakes via vi.mock so no real git or filesystem operations run.
 * CardsClient is injected as a plain object implementing only addBranch /
 * removeBranch — no mocking framework needed for the client half.
 *
 * @summary createWorktreeForCard / removeWorktreeForCard unit tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardsClient } from '../src/client/cardsClient.js';
import type { EarlyWorktreeResult } from '../src/worktree.js';
import { BranchUnregisterError, createWorktreeForCard, removeWorktreeForCard } from '../src/worktreeForCard.js';

// ---------------------------------------------------------------------------
// Module-level fake for the worktree primitives
// ---------------------------------------------------------------------------

vi.mock('../src/worktree.js', () => ({
  createWorktree: vi.fn(),
  removeWorktree: vi.fn()
}));

// Import after vi.mock so we get the mocked versions.
import { createWorktree, removeWorktree } from '../src/worktree.js';

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
