/**
 * Tests for the SubagentStart (core) hook.
 *
 * The hook applies enter-worktree's UNBOUND path on the SubagentStart event:
 *  - Bindable linked worktree (linked, no `.cards/CARD_ID`) → addUnboundCandidate
 *    feeds the per-session candidate set; an additionalContext nudge is emitted.
 *  - Re-entry → candidate re-fed (idempotent overwrite), nudge re-emitted.
 *  - Already-bound worktree (`.cards/CARD_ID` on disk) → no candidate, no nudge.
 *  - Non-bindable cwd (main worktree / non-repo) → no-op.
 *
 * The hook has no BOUND (CARD_ID re-attach) path — that remains the
 * EnterWorktree hook's responsibility — so only addUnboundCandidate is mocked;
 * the shared resolveBindableWorktreeDir runs against real git repositories.
 *
 * @summary SubagentStart hook tests
 */

import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Logger, SubagentStartInput } from '@goodfoot/claude-code-hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  logError: vi.fn()
} as unknown as Logger;

vi.mock('@cards/sdk/unbound-worktree-candidates', () => ({
  addUnboundCandidate: vi.fn().mockResolvedValue(undefined)
}));

async function importMocks() {
  const { addUnboundCandidate } = await import('@cards/sdk/unbound-worktree-candidates');
  return { addUnboundCandidate: addUnboundCandidate as ReturnType<typeof vi.fn> };
}

async function importHook() {
  const mod = await import('../../../src/claude/core/subagent-start.js');
  return mod.default;
}

function makeInput(overrides: Partial<SubagentStartInput> = {}): SubagentStartInput {
  return {
    hook_event_name: 'SubagentStart',
    cwd: '/tmp/worktree',
    session_id: 'session-abc',
    transcript_path: '/tmp/transcripts/abc.jsonl',
    agent_id: 'agent-1',
    agent_type: 'claude',
    ...overrides
  } as SubagentStartInput;
}

function getAdditionalContext(result: unknown): string | undefined {
  if (result == null || typeof result !== 'object') return undefined;
  const r = result as Record<string, unknown>;
  const stdout = r['stdout'] as Record<string, unknown> | undefined;
  if (!stdout) return undefined;
  const hso = stdout['hookSpecificOutput'] as Record<string, unknown> | undefined;
  return hso?.['additionalContext'] as string | undefined;
}

/**
 * Creates a real git repository plus a linked worktree under it. The linked
 * worktree has a git-dir distinct from the common dir — the "bindable"
 * condition the hook tests for.
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

describe('SubagentStart hook — bindable linked worktree', () => {
  let tmp: string;
  let mocks: Awaited<ReturnType<typeof importMocks>>;

  beforeEach(async () => {
    vi.resetAllMocks();
    mocks = await importMocks();
    // Canonicalize: git rev-parse --show-toplevel returns the realpath, so on
    // macOS the worktree resolves to /private/var/... rather than /var/...
    tmp = await realpath(await mkdtemp(join(tmpdir(), 'sas-bindable-')));
    mocks.addUnboundCandidate.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    // maxRetries: on Windows a just-spawned `git` child (or an AV scan) can
    // still hold a transient handle on the temp tree, so the recursive rmdir
    // races it and throws EBUSY. Node's own retry backs off on exactly the
    // EBUSY/EPERM/ENOTEMPTY class until the handle is released.
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
    expect(ctx).toMatch(/card <id> bind/);
  });

  it('re-entering the same worktree re-feeds the candidate set (idempotent) and re-nudges', async () => {
    const linked = makeLinkedWorktree(tmp);

    const hook = await importHook();
    const input = makeInput({ cwd: linked, session_id: 'session-abc', transcript_path: '/tmp/t/abc.jsonl' });
    await hook(input, { logger: mockLogger });
    const result = await hook(input, { logger: mockLogger });

    expect(mocks.addUnboundCandidate).toHaveBeenCalledTimes(2);
    expect(getAdditionalContext(result)).toMatch(/create a new card/);
  });

  it('no-ops on a linked worktree that already carries a .cards/CARD_ID marker', async () => {
    const linked = makeLinkedWorktree(tmp);
    await mkdir(join(linked, '.cards'), { recursive: true });
    await writeFile(join(linked, '.cards', 'CARD_ID'), 'main-99\n');

    const hook = await importHook();
    const result = await hook(makeInput({ cwd: linked }), { logger: mockLogger });

    expect(mocks.addUnboundCandidate).not.toHaveBeenCalled();
    expect(getAdditionalContext(result)).toBeUndefined();
  });
});

describe('SubagentStart hook — non-bindable cwd', () => {
  let mocks: Awaited<ReturnType<typeof importMocks>>;

  beforeEach(async () => {
    vi.resetAllMocks();
    mocks = await importMocks();
    mocks.addUnboundCandidate.mockResolvedValue(undefined);
  });

  it('no-ops silently when cwd is not a git repository at all', async () => {
    const empty = await mkdtemp(join(tmpdir(), 'sas-neither-'));
    try {
      const hook = await importHook();
      const result = await hook(makeInput({ cwd: empty }), { logger: mockLogger });

      expect(mocks.addUnboundCandidate).not.toHaveBeenCalled();
      expect(getAdditionalContext(result)).toBeUndefined();
    } finally {
      await rm(empty, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('no-ops on the main worktree (git-dir equals common-dir, never a bind target)', async () => {
    const base = await mkdtemp(join(tmpdir(), 'sas-main-'));
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
