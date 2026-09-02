/**
 * Exercises Antigravity branches of the consolidated action handlers (launch,
 * chat, interview, captain) through end-to-end scenarios. Locks in the
 * launch-grant gate (named refusal before any spawn or session state), spawn
 * argv (terminal-owned `-i`, child-owned `-p --output-format stream-json`,
 * never `--dangerously-skip-permissions`), worktree cwd + card env vars,
 * background final-record classification (exit zero without the expected
 * final record is failure), cancellation drain, and branch-cleanup wiring for
 * the Antigravity path.
 *
 * @summary Tests Antigravity branches of consolidated action handlers
 */

import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type { ActionContext, ActionInput } from '@cards.management/sdk/config';
import { Logger } from '@cards.management/sdk/config';
import { flushMicrotasks } from '@cards.management/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('cross-spawn', async () => {
  // spawnAgentCli routes the agent launch through cross-spawn; forward it to the
  // mocked node:child_process.spawn so spawn('agy', ...) assertions hold on
  // every platform (cross-spawn would otherwise rewrite the call into a cmd.exe
  // invocation on win32 and bypass the node:child_process mock).
  const cp = await import('node:child_process');
  return { default: cp.spawn };
});
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
  execFile: vi.fn(),
  execFileSync: vi.fn()
}));

vi.mock('node:fs', () => ({
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  statSync: vi.fn()
}));

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
  cp: vi.fn(),
  mkdir: vi.fn(),
  mkdtemp: vi.fn(),
  readFile: vi.fn(),
  readdir: vi.fn(),
  rename: vi.fn(),
  rm: vi.fn(),
  stat: vi.fn(),
  writeFile: vi.fn()
}));

vi.mock('@cards.management/sdk/worktree', () => ({
  createWorktree: vi.fn(),
  checkWorktreeExists: vi.fn(),
  findGitRoots: vi.fn()
}));

vi.mock('@cards.management/sdk/transcript-sync', () => ({
  finalizePersistedSqlitePollSession: vi.fn()
}));

// createWorktreeForCard wraps the pure createWorktree git primitive with the
// per-card outfit. Mock it as a thin adapter that forwards to the low-level
// createWorktree mock (see claude-session.test.ts) so these tests keep asserting
// the pure-primitive call shape without running the real outfit side effects.
vi.mock('@cards.management/sdk/worktree-for-card', () => ({
  createWorktreeForCard: vi.fn()
}));

vi.mock('../src/lib/branch-cleanup-watcher.js', () => ({
  spawnBranchCleanupWatcher: vi.fn()
}));

const WORKTREE_PATH = '/test/workspace/.worktrees/cards/card-123/1';
const AGENT = 'antigravity-cli';
const _NOW_MS = 1_700_000_000_000;

const originalFetch = globalThis.fetch;

/**
 * Encodes a grant payload the way the extension's single writer helper does:
 * base64url-encoded JSON.
 *
 * @param grant - Grant payload to encode.
 * @returns The base64url-encoded envelope.
 */
function encodeGrant(grant: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(grant), 'utf-8').toString('base64url');
}

/**
 * Builds a valid launch grant bound to `antigravity-cli` with a future expiry.
 *
 * @param overrides - Field overrides merged over the valid payload.
 * @returns The base64url-encoded grant envelope.
 */
function validGrant(overrides: Record<string, unknown> = {}): string {
  return encodeGrant({
    v: 1,
    agent: AGENT,
    issuedAtMs: Date.now() - 1_000,
    expiresAtMs: Date.now() + 60_000,
    probeFingerprint: 'probe-fingerprint-1',
    ...overrides
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  process.env['EXTENSION_PATH'] = '/test/extension';
  process.env['MARKETPLACE_PATH'] = '/test/extension/dist/marketplace';
  process.env['API_TEST_MODE'] = '1';
  process.env['CARDS_AGENT_LAUNCH_GRANT'] = validGrant();
  delete process.env['CARDS_HOME'];
  delete process.env['EXIT_WHEN_DONE'];

  const { execFile, execFileSync } = await import('node:child_process');
  const fs = await import('node:fs/promises');
  const syncFs = await import('node:fs');

  // Git commands for the base-branch/worktree lifecycle.
  vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
    const cb = args[args.length - 1];
    const cmd = args[0] as string;
    const cmdArgs = args[1] as string[];
    const key = `${cmd} ${cmdArgs.join(' ')}`;

    if (typeof cb === 'function') {
      if (key.startsWith('git rev-parse --abbrev-ref HEAD')) {
        cb(null, { stdout: 'main\n', stderr: '' });
      } else {
        cb(new Error(`mock: unhandled command: ${key}`));
      }
    }

    return {} as ReturnType<typeof execFile>;
  });
  vi.mocked(execFileSync).mockImplementation(() => '');

  vi.mocked(syncFs.readFileSync).mockImplementation((filePath: string | Buffer | URL) => {
    throw Object.assign(new Error(`mock: unhandled readFileSync: ${String(filePath)}`), { code: 'ENOENT' });
  });

  globalThis.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (typeof url === 'string' && url.includes('/branches') && (!opts?.method || opts.method === 'GET')) {
      return Promise.resolve(
        new Response(JSON.stringify({ branches: [], commits: [], defaultBranch: 'main' }), { status: 200 })
      );
    }
    if (typeof url === 'string' && url.includes('/branches') && opts?.method === 'POST') {
      return Promise.resolve(new Response(JSON.stringify({}), { status: 201 }));
    }
    return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
  });

  const { createWorktree, checkWorktreeExists, findGitRoots } = await import('@cards.management/sdk/worktree');
  vi.mocked(findGitRoots).mockResolvedValue({ sourceRoot: '/test/workspace', repoRoot: '/test/workspace' });
  vi.mocked(checkWorktreeExists).mockResolvedValue(false);

  const { createWorktreeForCard } = await import('@cards.management/sdk/worktree-for-card');
  vi.mocked(createWorktreeForCard).mockImplementation((_client, ref, opts) =>
    createWorktree(ref, {
      cwd: opts.cwd,
      cardId: opts.cardId,
      compiledScriptPaths: opts.compiledScriptPaths
    })
  );
  vi.mocked(createWorktree).mockResolvedValue({
    path: WORKTREE_PATH,
    settle: Promise.resolve({
      branch: 'cards/card-123/1',
      worktree: WORKTREE_PATH,
      baseSha: 'abc123'
    })
  });

  const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
  vi.mocked(fs.access).mockResolvedValue(undefined);
  vi.mocked(fs.readFile).mockRejectedValue(enoent);
  vi.mocked(fs.mkdir).mockResolvedValue(undefined);
  vi.mocked(fs.mkdtemp).mockImplementation(async (prefix: string | URL) => `${String(prefix)}XXXXXX`);
  vi.mocked(fs.cp).mockResolvedValue(undefined);
  vi.mocked(fs.rename).mockResolvedValue(undefined);
  vi.mocked(fs.rm).mockResolvedValue(undefined);
  vi.mocked(fs.readdir).mockRejectedValue(enoent);
  vi.mocked(fs.stat).mockRejectedValue(enoent);
  vi.mocked(fs.writeFile).mockResolvedValue(undefined);
  const { finalizePersistedSqlitePollSession } = await import('@cards.management/sdk/transcript-sync');
  vi.mocked(finalizePersistedSqlitePollSession).mockResolvedValue({ kind: 'flushed', emitted: 0, partial: 0 });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env['API_TEST_MODE'];
  delete process.env['CARDS_AGENT_LAUNCH_GRANT'];
  delete process.env['CARDS_AGENT_MODEL'];
  delete process.env['CARDS_AGENT_EFFORT'];
});

function createMockContext(): ActionContext {
  return {
    logger: new Logger(),
    cwd: process.cwd(),
    onCancel: vi.fn(),
    onAgentShutdown: vi.fn(),
    onSwitchToInteractive: vi.fn()
  };
}

/**
 * Builds a mock child with EventEmitter stdout/stderr so background tests can
 * drive stream-json parsing and close/error deterministically.
 *
 * @returns A ChildProcess-shaped mock with event-driven stdio.
 */
function createMockChild(): ChildProcess {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  return {
    pid: 12345,
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      handlers.set(event, cb);
    }),
    kill: vi.fn(),
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
    emit(event: string, ...args: unknown[]) {
      handlers.get(event)?.(...args);
      return true;
    }
  } as unknown as ChildProcess;
}

function baseInput(overrides?: Partial<ActionInput>): ActionInput {
  return {
    cardId: 'card-123',
    actionName: 'Launch',
    environment: 'default',
    executionMode: 'interactive',
    repoRoot: '/test/workspace',
    cardRepoPath: '/test/repo',
    configPath: '/test/config',
    extensionPath: '/test/extension',
    codingAgent: AGENT,
    ...overrides
  };
}

describe('resolveCodingAgent — antigravity', () => {
  it('resolves antigravity-cli to itself', async () => {
    const { resolveCodingAgent } = await import('../src/lib/coding-agent.js');

    expect(resolveCodingAgent({ codingAgent: 'antigravity-cli' })).toBe('antigravity-cli');
  });
});

describe('launch action — antigravity branch', () => {
  it('revalidates the launch grant after worktree settlement and refuses expiry before spawn', async () => {
    const { spawn } = await import('node:child_process');
    const { createWorktree } = await import('@cards.management/sdk/worktree');
    const issuedAt = Date.now();
    process.env['CARDS_AGENT_LAUNCH_GRANT'] = validGrant({
      issuedAtMs: issuedAt - 1,
      expiresAtMs: issuedAt + 50
    });

    let resolveSettle!: (value: { branch: string; worktree: string; baseSha: string }) => void;
    const settle = new Promise<{ branch: string; worktree: string; baseSha: string }>((resolve) => {
      resolveSettle = resolve;
    });
    vi.mocked(createWorktree).mockResolvedValue({ path: WORKTREE_PATH, settle });

    const action = (await import('../src/actions/launch.js')).default;
    const promise = action(baseInput(), createMockContext());
    const refusal = expect(promise).rejects.toThrow(/\[expired\]/);
    await flushMicrotasks();
    expect(spawn).not.toHaveBeenCalled();

    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(issuedAt + 51);
    resolveSettle({ branch: 'cards/card-123/1', worktree: WORKTREE_PATH, baseSha: 'abc123' });
    await refusal;
    expect(spawn).not.toHaveBeenCalled();
    nowSpy.mockRestore();
  });

  it('spawns terminal-owned agy -i in the card worktree with card env and the minted session id', async () => {
    const { spawn } = await import('node:child_process');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const action = (await import('../src/actions/launch.js')).default;
    const promise = action(baseInput(), createMockContext());
    await flushMicrotasks();

    expect(vi.mocked(spawn).mock.calls).toHaveLength(1);
    expect(vi.mocked(spawn).mock.calls[0]![0]).toBe('agy');

    const args = vi.mocked(spawn).mock.calls[0]![1] as string[];
    expect(args[0]).toBe('-i');
    expect(args[1]).toMatch(/Load the `runtime:card` skill and follow the `<routing-instructions>`\.$/);
    expect(args).not.toContain('--dangerously-skip-permissions');

    const opts = vi.mocked(spawn).mock.calls[0]![2] as {
      cwd: string;
      stdio: string;
      detached: boolean;
      env: Record<string, string | undefined>;
    };
    expect(opts.cwd).toBe(WORKTREE_PATH);
    expect(opts.stdio).toBe('inherit');
    expect(opts.detached).toBe(process.platform !== 'win32');
    expect(opts.env.WORKSPACE_PATH).toBe(WORKTREE_PATH);
    expect(opts.env.BASE_BRANCH).toBe('main');
    expect(opts.env.PARENT_BRANCH).toBe('main');
    expect(opts.env.WORKSPACE_BRANCH).toBe('cards/card-123/1');
    // Pre-spawn session identity carrier: every in-session `cards` CLI
    // inherits the minted id through ANTIGRAVITY_SESSION_ID.
    expect(opts.env.ANTIGRAVITY_SESSION_ID).toMatch(/^[0-9a-f-]{36}$/);

    child.emit('close', 0);
    await promise;

    const { spawnBranchCleanupWatcher } = await import('../src/lib/branch-cleanup-watcher.js');
    expect(spawnBranchCleanupWatcher).toHaveBeenCalledWith(
      { cardId: 'card-123', repoRoot: '/test/workspace', cardRepoPath: '/test/repo', sessionId: expect.any(String) },
      expect.anything()
    );
  });

  it('does not settle a successful child exit before the launcher-owned final poll settles', async () => {
    const { spawn } = await import('node:child_process');
    const { finalizePersistedSqlitePollSession } = await import('@cards.management/sdk/transcript-sync');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);
    let releaseFinalization: (() => void) | undefined;
    vi.mocked(finalizePersistedSqlitePollSession).mockReturnValueOnce(
      new Promise((resolve) => {
        releaseFinalization = () => resolve({ kind: 'flushed', emitted: 1, partial: 0 });
      })
    );

    const action = (await import('../src/actions/launch.js')).default;
    let settled = false;
    const promise = action(baseInput(), createMockContext()).finally(() => {
      settled = true;
    });
    await flushMicrotasks();
    child.emit('close', 0);
    await flushMicrotasks();

    expect(settled).toBe(false);
    expect(finalizePersistedSqlitePollSession).toHaveBeenCalledWith(
      expect.objectContaining({ cardRepoPath: '/test/repo', sessionId: expect.any(String) })
    );
    releaseFinalization?.();
    await promise;
  });

  it('names final transcript degradation instead of reporting an otherwise successful exit', async () => {
    const { spawn } = await import('node:child_process');
    const { finalizePersistedSqlitePollSession } = await import('@cards.management/sdk/transcript-sync');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);
    vi.mocked(finalizePersistedSqlitePollSession).mockResolvedValueOnce({
      kind: 'degraded',
      reason: 'db-absent',
      detail: 'conversation DB is absent at final drain'
    });

    const action = (await import('../src/actions/launch.js')).default;
    const promise = action(baseInput(), createMockContext());
    await flushMicrotasks();
    child.emit('close', 0);

    await expect(promise).rejects.toThrow(/final Antigravity transcript drain degraded \(db-absent:/);
  });

  it('forwards action-selected model and effort as separate argv values', async () => {
    const { spawn } = await import('node:child_process');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);
    process.env['CARDS_AGENT_MODEL'] = 'gemini-3-pro';
    process.env['CARDS_AGENT_EFFORT'] = 'high';

    const action = (await import('../src/actions/launch.js')).default;
    const promise = action(baseInput(), createMockContext());
    await flushMicrotasks();

    expect(vi.mocked(spawn).mock.calls[0]![1]).toEqual([
      '-i',
      expect.stringMatching(/`runtime:card` skill/),
      '--model',
      'gemini-3-pro',
      '--effort',
      'high'
    ]);
    child.emit('close', 0);
    await promise;
  });

  it.each([
    'interactive',
    'background'
  ] as const)('fails %s action completion when a runtime hook wrote a failure marker', async (executionMode) => {
    const { spawn } = await import('node:child_process');
    const fs = await import('node:fs/promises');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);
    vi.mocked(fs.readdir).mockResolvedValue(['conversation.failure'] as never);
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ stage: 'watcher-setup', reason: 'attach failed' }));

    const action = (await import('../src/actions/launch.js')).default;
    const promise = action(baseInput({ executionMode }), createMockContext());
    await flushMicrotasks();
    if (executionMode === 'background') {
      child.stdout?.emit('data', Buffer.from(`${JSON.stringify({ conversation_id: 'conv-1', status: 'SUCCESS' })}\n`));
    }
    child.emit('close', 0);
    await expect(promise).rejects.toThrow(/runtime hook failure \(watcher-setup: attach failed\)/);
  });

  it('fails an interactive action on a nonzero child exit', async () => {
    const { spawn } = await import('node:child_process');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const action = (await import('../src/actions/launch.js')).default;
    const promise = action(baseInput(), createMockContext());
    await flushMicrotasks();
    child.emit('close', 23);
    await expect(promise).rejects.toThrow(/agy exited with code 23/);
  });

  it('spawns child-owned agy -p --output-format stream-json and settles on the SUCCESS final record', async () => {
    const { spawn } = await import('node:child_process');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const action = (await import('../src/actions/launch.js')).default;
    const promise = action(baseInput({ executionMode: 'background' }), createMockContext());
    await flushMicrotasks();

    const args = vi.mocked(spawn).mock.calls[0]![1] as string[];
    expect(args).toEqual([
      '-p',
      expect.stringMatching(/Load the `runtime:card` skill and follow the `<routing-instructions>`\.$/),
      '--output-format',
      'stream-json'
    ]);
    expect(args).not.toContain('--dangerously-skip-permissions');

    const opts = vi.mocked(spawn).mock.calls[0]![2] as { cwd: string; stdio: unknown };
    expect(opts.cwd).toBe(WORKTREE_PATH);
    // Background handlers are console-less and own the stream-json stdout;
    // stderr is piped for diagnostic capture.
    expect(opts.stdio).toEqual(['ignore', 'pipe', 'pipe']);

    child.stdout?.emit(
      'data',
      Buffer.from(`${JSON.stringify({ conversation_id: 'conv-1', status: 'SUCCESS', response: 'done' })}\n`)
    );
    child.emit('close', 0);
    await promise;

    // Inline cleanup only — no detached watcher behind a headless run.
    const { spawnBranchCleanupWatcher } = await import('../src/lib/branch-cleanup-watcher.js');
    expect(spawnBranchCleanupWatcher).not.toHaveBeenCalled();
  });

  it('fails a background launch that exits zero without the expected final record', async () => {
    const { spawn } = await import('node:child_process');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const action = (await import('../src/actions/launch.js')).default;
    const promise = action(baseInput({ executionMode: 'background' }), createMockContext());
    await flushMicrotasks();

    child.emit('close', 0);
    await expect(promise).rejects.toThrow(/exited 0 without the expected final stream-json record/);

    const { spawnBranchCleanupWatcher } = await import('../src/lib/branch-cleanup-watcher.js');
    expect(spawnBranchCleanupWatcher).not.toHaveBeenCalled();
  });

  it('fails a background launch on nonzero exit, signal termination, unsuccessful status, and malformed stream', async () => {
    const { spawn } = await import('node:child_process');
    const action = (await import('../src/actions/launch.js')).default;

    const nonzero = createMockChild();
    vi.mocked(spawn).mockReturnValueOnce(nonzero);
    const nonzeroPromise = action(baseInput({ executionMode: 'background' }), createMockContext());
    await flushMicrotasks();
    nonzero.emit('close', 1);
    await expect(nonzeroPromise).rejects.toThrow(/agy exited with code 1/);

    const signalled = createMockChild();
    vi.mocked(spawn).mockReturnValueOnce(signalled);
    const signalPromise = action(baseInput({ executionMode: 'background' }), createMockContext());
    await flushMicrotasks();
    signalled.emit('close', null, 'SIGTERM');
    await expect(signalPromise).rejects.toThrow(/terminated on signal SIGTERM/);

    const unsuccessful = createMockChild();
    vi.mocked(spawn).mockReturnValueOnce(unsuccessful);
    const unsuccessfulPromise = action(baseInput({ executionMode: 'background' }), createMockContext());
    await flushMicrotasks();
    unsuccessful.stdout?.emit(
      'data',
      Buffer.from(`${JSON.stringify({ conversation_id: 'conv-1', status: 'ERROR' })}\n`)
    );
    unsuccessful.emit('close', 0);
    await expect(unsuccessfulPromise).rejects.toThrow(/final record status is 'ERROR'/);

    const malformed = createMockChild();
    vi.mocked(spawn).mockReturnValueOnce(malformed);
    const malformedPromise = action(baseInput({ executionMode: 'background' }), createMockContext());
    await flushMicrotasks();
    malformed.stdout?.emit('data', Buffer.from('not json\n'));
    malformed.emit('close', 0);
    await expect(malformedPromise).rejects.toThrow(/non-JSON line/);
  });

  it('registers onCancel that drains the owned process group', async () => {
    const { spawn } = await import('node:child_process');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    // Termination goes through createAntigravityTerminationController, which
    // signals the launcher-owned process group (-pid) — see
    // antigravity-termination.ts. The group "exits" (ESRCH on the existence
    // probe) as soon as SIGTERM is sent, simulating a cooperative child.
    let exited = false;
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(((_pid: number, signal?: string | number) => {
      if (signal === 'SIGTERM') {
        exited = true;
        return true;
      }
      if (exited) {
        throw Object.assign(new Error('ESRCH'), { code: 'ESRCH' });
      }
      return true;
    }) as typeof process.kill);

    const context = createMockContext();
    const action = (await import('../src/actions/launch.js')).default;
    const promise = action(baseInput(), context);
    await flushMicrotasks();

    const onCancel = vi.mocked(context.onCancel).mock.calls[0][0] as () => Promise<void>;
    await onCancel();
    expect(killSpy).toHaveBeenCalledWith(-12345, 'SIGTERM');

    child.emit('close', 0);
    await promise;

    killSpy.mockRestore();
  });
});

describe('chat action — antigravity branch', () => {
  it('spawns interactive agy -i with the native chat-routing address and suppressed exit-when-done', async () => {
    const { spawn } = await import('node:child_process');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const action = (await import('../src/actions/chat.js')).default;
    const promise = action(baseInput({ actionName: 'Chat' }), createMockContext());
    await flushMicrotasks();

    const calls = vi.mocked(spawn).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0]![0]).toBe('agy');
    const args = calls[0]![1] as string[];
    expect(args[0]).toBe('-i');
    expect(args[1]).toMatch(/Load the `runtime:chat-routing` skill and follow the `<routing-instructions>`\.$/);

    const opts = calls[0]![2] as { cwd: string; env: Record<string, string | undefined> };
    expect(opts.cwd).toBe(WORKTREE_PATH);
    expect(opts.env.EXIT_WHEN_DONE).toBe('false');

    child.emit('close', 0);
    await promise;
  });

  it('rejects background mode and does not spawn', async () => {
    const { spawn } = await import('node:child_process');

    const action = (await import('../src/actions/chat.js')).default;
    await expect(
      action(baseInput({ actionName: 'Chat', executionMode: 'background' }), createMockContext())
    ).rejects.toThrow(/antigravity-cli.*does not support background-mode chat/);

    expect(spawn).not.toHaveBeenCalled();
  });
});

describe('interview action — antigravity branch', () => {
  it('spawns interactive agy -i with the native interview address and suppressed exit-when-done', async () => {
    const { spawn } = await import('node:child_process');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const action = (await import('../src/actions/interview.js')).default;
    const promise = action(baseInput({ actionName: 'Interview' }), createMockContext());
    await flushMicrotasks();

    const calls = vi.mocked(spawn).mock.calls;
    expect(calls).toHaveLength(1);
    const args = calls[0]![1] as string[];
    expect(args[0]).toBe('-i');
    expect(args[1]).toMatch(/Load the `runtime:interview` skill and follow the `<routing-instructions>`\.$/);

    const opts = calls[0]![2] as { env: Record<string, string | undefined> };
    expect(opts.env.EXIT_WHEN_DONE).toBe('false');

    child.emit('close', 0);
    await promise;
  });

  it('rejects background mode and does not spawn', async () => {
    const { spawn } = await import('node:child_process');

    const action = (await import('../src/actions/interview.js')).default;
    await expect(
      action(baseInput({ actionName: 'Interview', executionMode: 'background' }), createMockContext())
    ).rejects.toThrow(/antigravity-cli.*does not support background-mode interviews/);

    expect(spawn).not.toHaveBeenCalled();
  });
});

describe('captain action — antigravity branch', () => {
  it('spawns interactive agy -i with the native captain address', async () => {
    const { spawn } = await import('node:child_process');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const action = (await import('../src/actions/captain.js')).default;
    const promise = action(baseInput({ actionName: 'Captain' }), createMockContext());
    await flushMicrotasks();

    const args = vi.mocked(spawn).mock.calls[0]![1] as string[];
    expect(args[0]).toBe('-i');
    expect(args[1]).toMatch(/Load the `runtime:captain` skill and follow the `<routing-instructions>`\.$/);

    child.emit('close', 0);
    await promise;
  });

  it('spawns background agy -p with stream-json output and the captain address', async () => {
    const { spawn } = await import('node:child_process');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const action = (await import('../src/actions/captain.js')).default;
    const promise = action(baseInput({ actionName: 'Captain', executionMode: 'background' }), createMockContext());
    await flushMicrotasks();

    const args = vi.mocked(spawn).mock.calls[0]![1] as string[];
    expect(args.slice(0, 2)).toEqual(['-p', expect.stringMatching(/`runtime:captain` skill/)]);
    expect(args.slice(2)).toEqual(['--output-format', 'stream-json']);

    child.stdout?.emit('data', Buffer.from(`${JSON.stringify({ conversation_id: 'conv-1', status: 'SUCCESS' })}\n`));
    child.emit('close', 0);
    await promise;
  });
});

describe('launch-grant gating — antigravity action rows', () => {
  it('refuses launch for every action row when the grant is absent, without spawning or creating session state', async () => {
    const { spawn } = await import('node:child_process');
    const { createWorktree } = await import('@cards.management/sdk/worktree');
    const { LaunchGrantRefusalError } = await import('../src/lib/launch-grant.js');
    delete process.env['CARDS_AGENT_LAUNCH_GRANT'];

    const rows = [
      { importPath: '../src/actions/launch.js', actionName: 'Launch' },
      { importPath: '../src/actions/chat.js', actionName: 'Chat' },
      { importPath: '../src/actions/interview.js', actionName: 'Interview' },
      { importPath: '../src/actions/captain.js', actionName: 'Captain' }
    ] as const;

    for (const row of rows) {
      const action = (await import(row.importPath)).default;
      await expect(action(baseInput({ actionName: row.actionName }), createMockContext())).rejects.toThrow(
        LaunchGrantRefusalError
      );
      await expect(action(baseInput({ actionName: row.actionName }), createMockContext())).rejects.toThrow(
        /\[absent\]/
      );
    }

    expect(spawn).not.toHaveBeenCalled();
    expect(vi.mocked(createWorktree)).not.toHaveBeenCalled();
  });

  it.each([
    ['malformed', validGrant({ probeFingerprint: '' })],
    ['wrong-version', validGrant({ v: 2 })],
    ['agent-mismatch', validGrant({ agent: 'codex-cli' })],
    ['expired', validGrant({ expiresAtMs: Date.now() - 1 })]
  ])('refuses launch on a %s grant without spawning', async (expectedReason, encoded) => {
    const { spawn } = await import('node:child_process');
    const { createWorktree } = await import('@cards.management/sdk/worktree');
    process.env['CARDS_AGENT_LAUNCH_GRANT'] = encoded;

    const action = (await import('../src/actions/launch.js')).default;
    await expect(action(baseInput(), createMockContext())).rejects.toThrow(new RegExp(`\\[${expectedReason}\\]`));

    expect(spawn).not.toHaveBeenCalled();
    expect(vi.mocked(createWorktree)).not.toHaveBeenCalled();
  });
});
