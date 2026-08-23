/**
 * Tests for the EnterWorktree (PostToolUse) hook.
 *
 * Covers:
 *  - Bound path (CARD_ID on disk or CARD_ID env) → spawnAdhocAttribution called
 *    with correct args; never nudges; action-guard + missing/invalid PID no-op.
 *  - Unbound path (bindable linked worktree) → addUnboundCandidate feeds the
 *    per-session candidate set; additionalContext nudge emitted.
 *  - Re-enter → candidate re-fed (idempotent overwrite), nudge re-emitted.
 *  - Non-bindable cwd (main worktree / non-repo) → no-op.
 *
 * The three re-exported helpers (acquireLock, resolveCardRepoPath,
 * resolveWorktreeCardId) keep their existing real-filesystem tests below using
 * the actual (non-mocked) implementations.
 *
 * @summary EnterWorktree hook tests
 */

import { execFileSync, spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Logger, TypedPostToolUseHookInput } from '@goodfoot/claude-code-hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  logError: vi.fn()
} as unknown as Logger;

// ---------------------------------------------------------------------------
// Hook integration tests (mocked dependencies)
// ---------------------------------------------------------------------------
//
// vi.mock declarations are hoisted to the top of the module regardless of
// source order, so all mocks are in effect when the hook is imported.

vi.mock('@cards.management/sdk/bin/spawn-adhoc-attribution', () => ({
  spawnAdhocAttribution: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@cards.management/sdk/unbound-worktree-candidates', () => ({
  addUnboundCandidate: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../../src/shared/default-log-file.js', () => ({
  applyDefaultLogFile: vi.fn()
}));

vi.mock('@cards.management/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cards.management/sdk')>();
  return {
    ...actual,
    findAgentPid: vi.fn().mockResolvedValue(1234),
    resolveGlobalCardsConfigDir: vi.fn().mockReturnValue('/tmp/cards-config')
  };
});

vi.mock('@cards.management/sdk/bin/process-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cards.management/sdk/bin/process-utils')>();
  return {
    ...actual,
    isKnownAgentComm: vi.fn().mockReturnValue(true)
  };
});

vi.mock('@cards.management/sdk/adhoc-attribution', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cards.management/sdk/adhoc-attribution')>();
  return {
    ...actual,
    resolveCardRepoPath: vi.fn(),
    resolveWorktreeCardId: vi.fn()
  };
});

// ---------------------------------------------------------------------------
// Helpers to access mock fns after vi.resetAllMocks()
// ---------------------------------------------------------------------------

async function importMocks() {
  const { spawnAdhocAttribution } = await import('@cards.management/sdk/bin/spawn-adhoc-attribution');
  const { addUnboundCandidate } = await import('@cards.management/sdk/unbound-worktree-candidates');
  const { findAgentPid, resolveGlobalCardsConfigDir } = await import('@cards.management/sdk');
  const { isKnownAgentComm } = await import('@cards.management/sdk/bin/process-utils');
  const { resolveCardRepoPath, resolveWorktreeCardId } = await import('@cards.management/sdk/adhoc-attribution');
  return {
    spawnAdhocAttribution: spawnAdhocAttribution as ReturnType<typeof vi.fn>,
    addUnboundCandidate: addUnboundCandidate as ReturnType<typeof vi.fn>,
    findAgentPid: findAgentPid as ReturnType<typeof vi.fn>,
    resolveGlobalCardsConfigDir: resolveGlobalCardsConfigDir as ReturnType<typeof vi.fn>,
    isKnownAgentComm: isKnownAgentComm as ReturnType<typeof vi.fn>,
    resolveCardRepoPath: resolveCardRepoPath as ReturnType<typeof vi.fn>,
    resolveWorktreeCardId: resolveWorktreeCardId as ReturnType<typeof vi.fn>
  };
}

async function importHook() {
  const mod = await import('../../../src/claude/core/enter-worktree.js');
  return mod.default;
}

// ---------------------------------------------------------------------------
// Minimal hook input factory
// ---------------------------------------------------------------------------

function makeInput(
  overrides: Partial<TypedPostToolUseHookInput<'EnterWorktree'>> = {}
): TypedPostToolUseHookInput<'EnterWorktree'> {
  return {
    tool_name: 'EnterWorktree',
    hook_event_name: 'PostToolUse',
    tool_use_id: 'tool-use-1',
    cwd: '/tmp/worktree',
    session_id: 'session-abc',
    transcript_path: '/tmp/transcripts/abc.jsonl',
    tool_input: {},
    tool_response: {},
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Extract additionalContext from a hook result
// ---------------------------------------------------------------------------

function getAdditionalContext(result: unknown): string | undefined {
  if (result == null || typeof result !== 'object') return undefined;
  const r = result as Record<string, unknown>;
  const stdout = r['stdout'] as Record<string, unknown> | undefined;
  if (!stdout) return undefined;
  const hso = stdout['hookSpecificOutput'] as Record<string, unknown> | undefined;
  return hso?.['additionalContext'] as string | undefined;
}

// ---------------------------------------------------------------------------
// Bound path
// ---------------------------------------------------------------------------

describe('EnterWorktree hook — bound path', () => {
  let mocks: Awaited<ReturnType<typeof importMocks>>;

  beforeEach(async () => {
    vi.resetAllMocks();
    mocks = await importMocks();
    delete process.env['CARD_ID'];
    delete process.env['ACTION_NAME'];
    // Re-establish defaults wiped by resetAllMocks.
    mocks.resolveGlobalCardsConfigDir.mockReturnValue('/tmp/cards-config');
    mocks.resolveWorktreeCardId.mockResolvedValue('main-42');
    mocks.resolveCardRepoPath.mockResolvedValue('/srv/cards-repos/main-42');
    mocks.findAgentPid.mockResolvedValue(1234);
    mocks.isKnownAgentComm.mockReturnValue(true);
    mocks.spawnAdhocAttribution.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env['CARD_ID'];
    delete process.env['ACTION_NAME'];
  });

  it('calls spawnAdhocAttribution with correct args when CARD_ID is on disk', async () => {
    const hook = await importHook();
    const input = makeInput();

    await hook(input, { logger: mockLogger });

    expect(mocks.spawnAdhocAttribution).toHaveBeenCalledOnce();
    const [params] = mocks.spawnAdhocAttribution.mock.calls[0]!;
    expect(params).toMatchObject({
      agentPid: 1234,
      sessionId: 'session-abc',
      transcriptPath: '/tmp/transcripts/abc.jsonl',
      cardId: 'main-42',
      cardRepoPath: '/srv/cards-repos/main-42'
    });
    // lockPath is built with path.join, so on Windows it uses native (`\`)
    // separators — normalize to `/` before the separator-agnostic match.
    expect(params.lockPath.replace(/\\/g, '/')).toMatch(/adhoc-sessions\/session-abc\.lock$/);
  });

  it('prefers CARD_ID env over disk walk', async () => {
    process.env['CARD_ID'] = 'main-env';
    mocks.resolveCardRepoPath.mockImplementation((id: string) =>
      Promise.resolve(id === 'main-env' ? '/srv/cards-repos/main-env' : null)
    );
    const hook = await importHook();

    await hook(makeInput(), { logger: mockLogger });

    expect(mocks.spawnAdhocAttribution).toHaveBeenCalledOnce();
    const [params] = mocks.spawnAdhocAttribution.mock.calls[0]!;
    expect(params.cardId).toBe('main-env');
    // Disk walk not needed when env is set.
    expect(mocks.resolveWorktreeCardId).not.toHaveBeenCalled();
  });

  it('never emits an additionalContext nudge on the bound path', async () => {
    const hook = await importHook();
    const result = await hook(makeInput(), { logger: mockLogger });
    expect(getAdditionalContext(result)).toBeUndefined();
  });

  it('no-ops when ACTION_NAME env is set (action-subprocess guard)', async () => {
    process.env['ACTION_NAME'] = 'some-action';
    const hook = await importHook();

    await hook(makeInput(), { logger: mockLogger });

    expect(mocks.spawnAdhocAttribution).not.toHaveBeenCalled();
  });

  it('no-ops when findAgentPid returns null', async () => {
    mocks.findAgentPid.mockResolvedValue(null);
    const hook = await importHook();

    await hook(makeInput(), { logger: mockLogger });

    expect(mocks.spawnAdhocAttribution).not.toHaveBeenCalled();
  });

  it('no-ops when isKnownAgentComm returns false (invalid PID)', async () => {
    mocks.isKnownAgentComm.mockReturnValue(false);
    const hook = await importHook();

    await hook(makeInput(), { logger: mockLogger });

    expect(mocks.spawnAdhocAttribution).not.toHaveBeenCalled();
  });

  it('no-ops when resolveCardRepoPath returns null', async () => {
    mocks.resolveCardRepoPath.mockResolvedValue(null);
    const hook = await importHook();

    await hook(makeInput(), { logger: mockLogger });

    expect(mocks.spawnAdhocAttribution).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Unbound path
// ---------------------------------------------------------------------------

/**
 * Creates a real git repository plus a linked worktree under it. The linked
 * worktree has a git-dir distinct from the common dir, which is exactly the
 * "bindable" condition the EnterWorktree unbound path tests for.
 *
 * @param base - Temp directory to host both the main repo and the worktree.
 * @returns Absolute path to the linked worktree's toplevel directory.
 */
function makeLinkedWorktree(base: string): string {
  const mainRepo = join(base, 'main');
  const linked = join(base, 'linked');
  execFileSync('git', ['init', '-q', '-b', 'main', mainRepo]);
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: mainRepo });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: mainRepo });
  execFileSync('git', ['commit', '-q', '--allow-empty', '-m', 'init'], { cwd: mainRepo });
  execFileSync('git', ['worktree', 'add', '-q', '-b', 'feature/x', linked], { cwd: mainRepo });
  // Return the git-canonical toplevel — the exact string the hook records as the
  // candidate (it resolves the worktree via `git rev-parse --show-toplevel`). On
  // Windows that is forward-slashed and differs from `join`'s native separators,
  // so deriving it the same way keeps the candidate-path assertions cross-platform.
  return execFileSync('git', ['-C', linked, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
}

describe('EnterWorktree hook — unbound path (bindable linked worktree)', () => {
  let tmp: string;
  let mocks: Awaited<ReturnType<typeof importMocks>>;

  beforeEach(async () => {
    vi.resetAllMocks();
    mocks = await importMocks();
    // Canonicalize: git rev-parse --show-toplevel returns the realpath, so on
    // macOS the worktree resolves to /private/var/... rather than /var/...
    tmp = await realpath(await mkdtemp(join(tmpdir(), 'ew-unbound-')));
    delete process.env['CARD_ID'];
    delete process.env['ACTION_NAME'];
    mocks.resolveGlobalCardsConfigDir.mockReturnValue('/tmp/cards-config');
    // Disk walk finds no CARD_ID on the unbound path.
    mocks.resolveWorktreeCardId.mockResolvedValue(null);
    mocks.addUnboundCandidate.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    delete process.env['CARD_ID'];
    await rm(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  it('feeds the candidate set and emits a nudge for a bindable linked worktree', async () => {
    const linked = makeLinkedWorktree(tmp);

    const hook = await importHook();
    const input = makeInput({ cwd: linked, session_id: 'session-xyz', transcript_path: '/tmp/t/xyz.jsonl' });
    const result = await hook(input, { logger: mockLogger });

    expect(mocks.addUnboundCandidate).toHaveBeenCalledWith('session-xyz', linked, '/tmp/t/xyz.jsonl');

    const ctx = getAdditionalContext(result);
    expect(typeof ctx).toBe('string');
    expect(ctx).toMatch(/create a new card/);
  });

  it('re-entering the same worktree re-feeds the candidate set (idempotent overwrite) and re-nudges', async () => {
    const linked = makeLinkedWorktree(tmp);

    const hook = await importHook();
    const input = makeInput({ cwd: linked, session_id: 'session-abc', transcript_path: '/tmp/t/abc.jsonl' });
    await hook(input, { logger: mockLogger });
    const result = await hook(input, { logger: mockLogger });

    // Both entries write the candidate (the on-disk hash file is overwritten).
    expect(mocks.addUnboundCandidate).toHaveBeenCalledTimes(2);
    expect(getAdditionalContext(result)).toMatch(/create a new card/);
  });

  it('does NOT feed the candidate set when CARD_ID is also present (CARD_ID wins)', async () => {
    const linked = makeLinkedWorktree(tmp);
    mocks.resolveWorktreeCardId.mockResolvedValue('main-42');
    mocks.resolveCardRepoPath.mockResolvedValue('/srv/cards-repos/main-42');
    mocks.findAgentPid.mockResolvedValue(1234);
    mocks.isKnownAgentComm.mockReturnValue(true);
    mocks.spawnAdhocAttribution.mockResolvedValue(undefined);

    const hook = await importHook();
    const result = await hook(makeInput({ cwd: linked }), { logger: mockLogger });

    expect(mocks.addUnboundCandidate).not.toHaveBeenCalled();
    expect(getAdditionalContext(result)).toBeUndefined();
  });

  it('no-ops on a linked worktree that already carries a .cards/CARD_ID marker on disk', async () => {
    const linked = makeLinkedWorktree(tmp);
    // Disk walk returns null (no env), but the bindable test reads CARD_ID from
    // the worktree toplevel directly and must treat it as already-bound.
    await mkdir(join(linked, '.cards'), { recursive: true });
    await writeFile(join(linked, '.cards', 'CARD_ID'), 'main-99\n');

    const hook = await importHook();
    const result = await hook(makeInput({ cwd: linked }), { logger: mockLogger });

    expect(mocks.addUnboundCandidate).not.toHaveBeenCalled();
    expect(getAdditionalContext(result)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Non-bindable path: main worktree / non-repo cwd
// ---------------------------------------------------------------------------

describe('EnterWorktree hook — non-bindable cwd', () => {
  let mocks: Awaited<ReturnType<typeof importMocks>>;

  beforeEach(async () => {
    vi.resetAllMocks();
    mocks = await importMocks();
    delete process.env['CARD_ID'];
    delete process.env['ACTION_NAME'];
    mocks.resolveGlobalCardsConfigDir.mockReturnValue('/tmp/cards-config');
    mocks.resolveWorktreeCardId.mockResolvedValue(null);
    mocks.addUnboundCandidate.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env['CARD_ID'];
  });

  it('no-ops silently when cwd is not a git repository at all', async () => {
    const empty = await mkdtemp(join(tmpdir(), 'ew-neither-'));
    try {
      const hook = await importHook();
      const result = await hook(makeInput({ cwd: empty }), { logger: mockLogger });

      expect(mocks.spawnAdhocAttribution).not.toHaveBeenCalled();
      expect(mocks.addUnboundCandidate).not.toHaveBeenCalled();
      expect(getAdditionalContext(result)).toBeUndefined();
    } finally {
      await rm(empty, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('no-ops on the main worktree (git-dir equals common-dir, never a bind target)', async () => {
    const base = await mkdtemp(join(tmpdir(), 'ew-main-'));
    try {
      const mainRepo = join(base, 'main');
      execFileSync('git', ['init', '-q', '-b', 'main', mainRepo]);

      const hook = await importHook();
      const result = await hook(makeInput({ cwd: mainRepo }), { logger: mockLogger });

      expect(mocks.addUnboundCandidate).not.toHaveBeenCalled();
      expect(getAdditionalContext(result)).toBeUndefined();
    } finally {
      await rm(base, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });
});

// ---------------------------------------------------------------------------
// Re-exported helpers — real-filesystem tests (unchanged contract)
//
// These use the real implementations, imported directly from the SDK so the
// vi.mock for '@cards.management/sdk/adhoc-attribution' (which only stubs
// resolveCardRepoPath / resolveWorktreeCardId on the mocked copy) does not
// interfere. acquireLock is re-exported un-mocked, so it works directly.
// ---------------------------------------------------------------------------

// Import actual implementations for the filesystem-level tests.
const {
  resolveWorktreeCardId: realResolveWorktreeCardId,
  resolveCardRepoPath: realResolveCardRepoPath,
  acquireLock: realAcquireLock
} = await vi.importActual<typeof import('@cards.management/sdk/adhoc-attribution')>(
  '@cards.management/sdk/adhoc-attribution'
);

// acquireLock re-export is the real function, but to be safe use the actual import.
import { acquireLock } from '../../../src/claude/core/enter-worktree.js';

describe('resolveWorktreeCardId', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'cwd-walk-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  it('finds CARD_ID in the worktree root', async () => {
    await mkdir(join(root, '.cards'), { recursive: true });
    await writeFile(join(root, '.cards', 'CARD_ID'), 'main-96\n');
    expect(await realResolveWorktreeCardId(root)).toBe('main-96');
  });

  it('walks up from a nested subdirectory', async () => {
    await mkdir(join(root, '.cards'), { recursive: true });
    await writeFile(join(root, '.cards', 'CARD_ID'), 'main-96');
    const nested = join(root, 'a', 'b', 'c');
    await mkdir(nested, { recursive: true });
    expect(await realResolveWorktreeCardId(nested)).toBe('main-96');
  });

  it('returns null when no CARD_ID exists in any ancestor', async () => {
    const nested = join(root, 'x', 'y');
    await mkdir(nested, { recursive: true });
    expect(await realResolveWorktreeCardId(nested)).toBeNull();
  });
});

describe('resolveCardRepoPath', () => {
  let home: string;
  let originalDiscovery: string | undefined;

  beforeEach(async () => {
    home = await mkdtemp(join(tmpdir(), 'cwd-disc-'));
    originalDiscovery = process.env['CARDS_DISCOVERY_PATH'];
    process.env['CARDS_DISCOVERY_PATH'] = join(home, 'cards-api.json');
  });

  afterEach(async () => {
    if (originalDiscovery === undefined) {
      delete process.env['CARDS_DISCOVERY_PATH'];
    } else {
      process.env['CARDS_DISCOVERY_PATH'] = originalDiscovery;
    }
    await rm(home, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  it('joins reposPath with the cardId', async () => {
    const reposPath = join('/srv', 'cards-repos');
    await writeFile(join(home, 'cards-api.json'), JSON.stringify({ reposPath }));
    expect(await realResolveCardRepoPath('main-96', { warn: () => {} })).toBe(join(reposPath, 'main-96'));
  });

  it('returns null when the discovery file is absent', async () => {
    expect(await realResolveCardRepoPath('main-96', { warn: () => {} })).toBeNull();
  });

  it('returns null when reposPath is missing', async () => {
    await writeFile(join(home, 'cards-api.json'), JSON.stringify({ host: 'localhost', port: 1 }));
    expect(await realResolveCardRepoPath('main-96', { warn: () => {} })).toBeNull();
  });
});

describe('acquireLock', () => {
  let dir: string;
  let lockPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'cwd-lock-'));
    lockPath = join(dir, 'adhoc-sessions', 'session-1.lock');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  it('acquires a fresh lock and records the agent PID and cardId', async () => {
    expect(await realAcquireLock(lockPath, 4242, 'main-1', { warn: () => {} })).toBe(true);
    const lines = (await readFile(lockPath, 'utf-8')).split('\n');
    expect(lines[0]!.trim()).toBe('4242');
    expect(lines[1]!.trim()).toBe('main-1');
  });

  it('refuses when a live owner holds the lock', async () => {
    const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 30000)'], { stdio: 'ignore' });
    const livePid = child.pid!;
    try {
      await mkdir(join(dir, 'adhoc-sessions'), { recursive: true });
      await writeFile(lockPath, `${livePid}\nmain-1`);
      expect(await realAcquireLock(lockPath, 4242, 'main-1', { warn: () => {} })).toBe(false);
      expect((await readFile(lockPath, 'utf-8')).split('\n')[0]!.trim()).toBe(String(livePid));
    } finally {
      child.kill('SIGKILL');
    }
  });

  it('refuses and warns when the same live session enters a different card worktree', async () => {
    const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 30000)'], { stdio: 'ignore' });
    const livePid = child.pid!;
    const warnings: { msg: string; data?: Record<string, unknown> }[] = [];
    const logger = { warn: (msg: string, data?: Record<string, unknown>) => warnings.push({ msg, data }) };
    try {
      await mkdir(join(dir, 'adhoc-sessions'), { recursive: true });
      await writeFile(lockPath, `${livePid}\nmain-1`);
      expect(await realAcquireLock(lockPath, livePid, 'main-2', logger)).toBe(false);
      expect((await readFile(lockPath, 'utf-8')).split('\n')[1]!.trim()).toBe('main-1');
      expect(
        warnings.some((w) => w.data?.['boundCardId'] === 'main-1' && w.data?.['attemptedCardId'] === 'main-2')
      ).toBe(true);
    } finally {
      child.kill('SIGKILL');
    }
  });

  it('no-ops silently when the same live session re-enters the same worktree', async () => {
    const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 30000)'], { stdio: 'ignore' });
    const livePid = child.pid!;
    const warnings: string[] = [];
    const logger = { warn: (msg: string) => warnings.push(msg) };
    try {
      await mkdir(join(dir, 'adhoc-sessions'), { recursive: true });
      await writeFile(lockPath, `${livePid}\nmain-1`);
      expect(await realAcquireLock(lockPath, livePid, 'main-1', logger)).toBe(false);
      expect(warnings.length).toBe(0);
    } finally {
      child.kill('SIGKILL');
    }
  });

  it('recovers a stale lock whose owner PID is dead', async () => {
    await mkdir(join(dir, 'adhoc-sessions'), { recursive: true });
    await writeFile(lockPath, '2147483646\nmain-1');
    expect(await realAcquireLock(lockPath, 4242, 'main-2', { warn: () => {} })).toBe(true);
    const lines = (await readFile(lockPath, 'utf-8')).split('\n');
    expect(lines[0]!.trim()).toBe('4242');
    expect(lines[1]!.trim()).toBe('main-2');
  });

  it('leaves no lock unacquired path observable when fresh dir is missing', async () => {
    await expect(access(join(dir, 'adhoc-sessions'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await realAcquireLock(lockPath, 99, 'main-1', { warn: () => {} })).toBe(true);
  });
});

// Keep the re-exported acquireLock usable by name in the describe block above.
// The import is real; this assertion verifies the re-export is wired.
void acquireLock;
