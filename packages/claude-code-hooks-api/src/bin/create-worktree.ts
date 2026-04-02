/**
 * CLI entrypoint for creating git worktrees with monorepo symlink wiring.
 *
 * Accepts a branch name, tag name, or commit SHA. Detects the ref type
 * automatically and creates either a branch-based or detached worktree.
 *
 * Outputs JSON: `{"branch":"...","worktree":"...","baseSha":"...","reroutedSymlinks":N}`
 *
 * @summary CLI for git worktree creation
 */

import { createWorktree } from '@cards/sdk/worktree';

const ref = process.argv[2];
if (!ref) {
  process.stderr.write('Usage: node create-worktree.mjs <branch|tag|sha>\n');
  process.exit(2);
}

createWorktree(ref)
  .then(({ settle }) => settle)
  .then((result) => {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  })
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(2);
  });
