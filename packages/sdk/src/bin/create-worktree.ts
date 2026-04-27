/**
 * CLI entrypoint for creating git worktrees with monorepo symlink wiring.
 *
 * Accepts a branch name, tag name, or commit SHA. Detects the ref type
 * automatically and creates either a branch-based or detached worktree.
 *
 * Outputs JSON: `{"branch":"...","worktree":"...","baseSha":"...","copiedFromInclude":N,"reroutedSymlinks":N}`
 *
 * Exit codes: 0 success, 2 general failure, 3 `.worktreeinclude` processing failure.
 *
 * @summary CLI for git worktree creation
 */

import { createWorktree } from '@cards/sdk/worktree';
import { WorktreeIncludeError } from '../worktreeInclude.js';

const USAGE = 'Usage: create-worktree <branch|tag|sha>\n';

const ref = process.argv[2];
if (!ref) {
  process.stderr.write(USAGE);
  process.exit(2);
}

if (ref === '-h' || ref === '--help') {
  process.stdout.write(USAGE);
  process.exit(0);
}

createWorktree(ref)
  .then(({ settle }) => settle)
  .then((result) => {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  })
  .catch((error: unknown) => {
    if (error instanceof WorktreeIncludeError) {
      process.stderr.write(`${error.message}\n`);
      process.exit(3);
    }
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(2);
  });
