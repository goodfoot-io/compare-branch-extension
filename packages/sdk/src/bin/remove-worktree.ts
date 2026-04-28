/**
 * CLI entrypoint for removing Cards-managed git worktrees.
 *
 * Accepts a single worktree path argument. Fails closed: any error exits 2.
 *
 * Exit codes: 0 success, 2 usage or runtime failure.
 *
 * @summary CLI for git worktree removal
 */

import { removeWorktree } from '@cards/sdk/worktree';

const USAGE = 'Usage: remove-worktree <path>\n';

const args = process.argv.slice(2);
let worktreePath: string | undefined;

for (const arg of args) {
  if (arg === '-h' || arg === '--help') {
    process.stdout.write(USAGE);
    process.exit(0);
  } else if (worktreePath === undefined) {
    worktreePath = arg;
  } else {
    process.stderr.write(USAGE);
    process.exit(2);
  }
}

if (!worktreePath) {
  process.stderr.write(USAGE);
  process.exit(2);
}

removeWorktree(worktreePath)
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(2);
  });
