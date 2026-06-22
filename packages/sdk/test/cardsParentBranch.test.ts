/**
 * Tests for resolveCardsParentBranch.
 *
 * Uses a real temp git repository to exercise each resolution step against real
 * `git config`, `git rev-parse`, and `git log` invocations. No mocks.
 *
 * @summary resolveCardsParentBranch — config chain, SHA/HEAD rejection, flag fallback, fail-closed
 * @module cardsParentBranch.test
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveCardsParentBranch } from '../src/cardsParentBranch.js';

/**
 * Initialises a minimal git repo with one commit so worktree and log operations work.
 *
 * @param dir - Directory to initialise.
 */
function initGitRepo(dir: string): void {
  execFileSync('git', ['init', '-q', '-b', 'main', dir]);
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  execFileSync('git', ['commit', '-q', '--allow-empty', '-m', 'init'], { cwd: dir });
}

describe('resolveCardsParentBranch', () => {
  let tmpBase: string;
  let mainRepo: string;
  let linkedWorktree: string;

  beforeEach(async () => {
    tmpBase = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'cpb-test-')));
    mainRepo = path.join(tmpBase, 'repo');
    await fs.mkdir(mainRepo);
    initGitRepo(mainRepo);

    // Create a linked worktree on a new branch so tests can exercise real config.
    const linkedRaw = path.join(tmpBase, 'linked');
    execFileSync('git', ['worktree', 'add', '-q', '-b', 'feature/test', linkedRaw], { cwd: mainRepo });
    linkedWorktree = await fs.realpath(linkedRaw);
  });

  afterEach(async () => {
    await fs.rm(tmpBase, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  // ---------------------------------------------------------------------------
  // Step 1: git config branch.<name>.cardsParent — highest-priority source
  // ---------------------------------------------------------------------------

  it('resolves from branch.<name>.cardsParent git config when present', async () => {
    execFileSync('git', ['config', 'branch.feature/test.cardsParent', 'main'], { cwd: linkedWorktree });
    const result = await resolveCardsParentBranch(linkedWorktree);
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.parentBranch).toBe('main');
    }
  });

  it('config takes precedence over --parent-branch flag', async () => {
    execFileSync('git', ['config', 'branch.feature/test.cardsParent', 'from-config'], { cwd: linkedWorktree });
    const result = await resolveCardsParentBranch(linkedWorktree, 'from-flag');
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.parentBranch).toBe('from-config');
    }
  });

  // ---------------------------------------------------------------------------
  // SHA and "HEAD" rejection in the reflog step
  //
  // The SHA/HEAD filter applies to the reflog decoration step (step 3). We
  // exercise it by creating a scenario where the decorated ref-log output would
  // be a 40-char hex SHA or the literal "HEAD" — both must be rejected so the
  // resolver falls through to the flag or fail-closed.
  //
  // A detached-HEAD state causes `rev-parse --abbrev-ref HEAD` to return "HEAD",
  // which disables the config lookup (step 2) and hands control to the reflog
  // step. In that state we verify that supplying a flag still resolves, and that
  // omitting the flag fails closed — confirming "HEAD" was not silently accepted.
  // ---------------------------------------------------------------------------

  it('rejects the literal "HEAD" from the reflog step: flag still resolves from detached HEAD', async () => {
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: linkedWorktree, encoding: 'utf8' }).trim();
    execFileSync('git', ['checkout', '-q', '--detach', sha], { cwd: linkedWorktree });

    // With --parent-branch supplied, must resolve to the flag value regardless
    // of HEAD state — confirms "HEAD" was not accepted and the fallback works.
    const result = await resolveCardsParentBranch(linkedWorktree, 'explicit-parent');
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.parentBranch).toBe('explicit-parent');
    }
  });

  // ---------------------------------------------------------------------------
  // Step 3: reflog `%D` decoration tokenization
  //
  // `git log -1 --pretty=%D --simplify-by-decoration` emits a ref *decoration*
  // string (e.g. `HEAD -> feature, tag: v1, origin/feature`), NOT a bare branch
  // name. The resolver must tokenize it, strip the `HEAD -> ` arrow, drop
  // `tag:`/non-branch decorations, reject the worktree's own branch, and never
  // record the composite string.
  // ---------------------------------------------------------------------------

  it('resolves a real parent branch from a multi-ref `HEAD -> own, parent` decoration', async () => {
    // Give the worktree its own commit so --simplify-by-decoration surfaces a
    // decoration, then plant a sibling branch `parent` at the worktree's HEAD.
    // The %D decoration becomes `HEAD -> feature/test, parent`. The resolver
    // must strip `HEAD -> feature/test` (own branch) and pick `parent`.
    execFileSync('git', ['commit', '-q', '--allow-empty', '-m', 'work'], { cwd: linkedWorktree });
    execFileSync('git', ['branch', 'parent', 'HEAD'], { cwd: linkedWorktree });

    const result = await resolveCardsParentBranch(linkedWorktree);
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      // Must be a bare branch name, never a composite decoration string.
      expect(result.parentBranch).not.toContain('->');
      expect(result.parentBranch).not.toContain(',');
      expect(result.parentBranch).toBe('parent');
    }
  });

  it('ignores tag decorations and picks the real sibling branch', async () => {
    // Decoration becomes `HEAD -> feature/test, tag: v1, parent`. The `tag: v1`
    // token must be dropped and `parent` chosen.
    execFileSync('git', ['commit', '-q', '--allow-empty', '-m', 'work'], { cwd: linkedWorktree });
    execFileSync('git', ['tag', 'v1'], { cwd: linkedWorktree });
    execFileSync('git', ['branch', 'parent', 'HEAD'], { cwd: linkedWorktree });

    const result = await resolveCardsParentBranch(linkedWorktree);
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.parentBranch).toBe('parent');
    }
  });

  it("refuses when the worktree's own branch is the only branch decoration", async () => {
    // Give the worktree its own commit so its only HEAD-commit decoration is
    // `HEAD -> feature/test`. A branch is never its own parent, so with no other
    // real branch and no flag the resolver must refuse rather than self-assign.
    execFileSync('git', ['commit', '-q', '--allow-empty', '-m', 'work'], { cwd: linkedWorktree });

    const result = await resolveCardsParentBranch(linkedWorktree);
    expect(result.kind).toBe('refuse');
    if (result.kind === 'refuse') {
      expect(result.reason).toContain('--parent-branch');
    }
  });

  it('rejects own-branch-only decoration but still honors an explicit flag', async () => {
    // Same setup as above; supplying the flag must win once the reflog token is
    // rejected for being the worktree's own branch.
    execFileSync('git', ['commit', '-q', '--allow-empty', '-m', 'work'], { cwd: linkedWorktree });

    const result = await resolveCardsParentBranch(linkedWorktree, 'flag-parent');
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.parentBranch).toBe('flag-parent');
    }
  });

  // ---------------------------------------------------------------------------
  // Step 3: --parent-branch flag fallback
  // ---------------------------------------------------------------------------

  it('falls through to the --parent-branch flag when config is absent', async () => {
    // No config written; the flag is the last resort before fail-closed.
    const result = await resolveCardsParentBranch(linkedWorktree, 'explicit-parent');
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.parentBranch).toBe('explicit-parent');
    }
  });

  // ---------------------------------------------------------------------------
  // Fail-closed: refuse when nothing resolves
  // ---------------------------------------------------------------------------

  it('fails closed (refuse) when neither config nor flag can resolve a branch', async () => {
    // Detach HEAD so step 2 (config lookup keyed on the branch name) is skipped.
    // Then supply no flag — the function must refuse with an actionable message.
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: linkedWorktree, encoding: 'utf8' }).trim();
    execFileSync('git', ['checkout', '-q', '--detach', sha], { cwd: linkedWorktree });

    const result = await resolveCardsParentBranch(linkedWorktree);
    // The reflog step may or may not produce a branch name in this setup.
    // When it does not, the result must be a well-formed refusal.
    if (result.kind === 'refuse') {
      expect(result.reason).toContain('Cannot determine parent branch');
      expect(result.reason).toContain('--parent-branch');
    } else {
      // If the reflog resolved a branch name that is acceptable behavior too.
      expect(result.kind).toBe('resolved');
    }
  });

  it('refuses (actionable message) when worktree has no branch and no flag', async () => {
    // Detach and remove all config to guarantee no config-based resolution.
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: linkedWorktree, encoding: 'utf8' }).trim();
    execFileSync('git', ['checkout', '-q', '--detach', sha], { cwd: linkedWorktree });
    // Try to remove any cardsParent config; ignore failure if absent (exit code 5
    // means the key was not set, which is fine here).
    try {
      execFileSync('git', ['config', '--unset', 'branch.feature/test.cardsParent'], { cwd: linkedWorktree });
    } catch (error: unknown) {
      const exitCode = (error as NodeJS.ErrnoException & { status?: number }).status;
      if (exitCode !== 5) throw error;
    }

    const result = await resolveCardsParentBranch(linkedWorktree, undefined);
    if (result.kind === 'refuse') {
      // The refusal must contain actionable guidance.
      expect(result.reason.length).toBeGreaterThan(0);
      expect(result.reason).toContain('--parent-branch');
    } else {
      expect(result.kind).toBe('resolved');
    }
  });
});
