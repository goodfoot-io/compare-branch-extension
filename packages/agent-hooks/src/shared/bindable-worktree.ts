/**
 * Shared *bindable linked worktree* detection.
 *
 * A bindable worktree is a linked git worktree (`git rev-parse --git-dir` ≠
 * `--git-common-dir`) that carries no `.cards/CARD_ID` marker. This catches any
 * unbound linked worktree — hook-created or hand-made (`git worktree add`) — and
 * never matches the main repository (where `--git-dir` equals `--git-common-dir`).
 *
 * Both the EnterWorktree (PostToolUse) and SubagentStart hooks key their
 * unbound-candidate / nudge behavior on this exact test, so it lives here as a
 * single source of truth rather than being duplicated per hook.
 *
 * @summary Bindable linked worktree detection shared across worktree-aware hooks
 * @module shared/bindable-worktree
 */

import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Tests whether `cwd` is a *bindable* linked git worktree: a linked worktree
 * (`git rev-parse --git-dir` ≠ `--git-common-dir`) that carries no
 * `.cards/CARD_ID` marker. Returns the worktree's toplevel directory when
 * bindable, or `null` otherwise.
 *
 * Detects any unbound linked worktree, including hand-made ones
 * (`git worktree add`) that no WorktreeCreate hook ever ran for. The main
 * repository (where `--git-dir` equals `--git-common-dir`) is not bindable.
 *
 * @param cwd - Directory to test (an EnterWorktree target or a subagent cwd).
 * @returns Absolute toplevel path of the bindable worktree, or null.
 */
export async function resolveBindableWorktreeDir(cwd: string): Promise<string | null> {
  let gitDir: string;
  let gitCommonDir: string;
  let toplevel: string;
  try {
    [gitDir, gitCommonDir, toplevel] = await Promise.all([
      execFileAsync('git', ['-C', cwd, 'rev-parse', '--path-format=absolute', '--git-dir']).then((r) =>
        r.stdout.trim()
      ),
      execFileAsync('git', ['-C', cwd, 'rev-parse', '--path-format=absolute', '--git-common-dir']).then((r) =>
        r.stdout.trim()
      ),
      execFileAsync('git', ['-C', cwd, 'rev-parse', '--show-toplevel']).then((r) => r.stdout.trim())
    ]);
  } catch {
    // Not a git repository, or git unavailable — nothing bindable here.
    return null;
  }

  // A linked worktree has a git-dir distinct from the common dir. The main
  // worktree has them equal and is never a bind target.
  if (gitDir === gitCommonDir) return null;

  // Already bound — CARD_ID wins; do not feed the candidate set.
  try {
    await access(join(toplevel, '.cards', 'CARD_ID'));
    return null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  return toplevel;
}
