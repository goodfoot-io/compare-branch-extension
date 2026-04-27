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

const USAGE = 'Usage: create-worktree [--card-id <id>] <branch|tag|sha>\n';

const args = process.argv.slice(2);
let cardId: string | undefined;
let ref: string | undefined;

for (let i = 0; i < args.length; i++) {
  const arg = args[i]!;
  if (arg === '-h' || arg === '--help') {
    process.stdout.write(USAGE);
    process.exit(0);
  } else if (arg === '--card-id') {
    const next = args[i + 1];
    if (!next) {
      process.stderr.write(USAGE);
      process.exit(2);
    }
    cardId = next;
    i++;
  } else if (arg.startsWith('--card-id=')) {
    cardId = arg.slice('--card-id='.length);
  } else if (ref === undefined) {
    ref = arg;
  } else {
    process.stderr.write(USAGE);
    process.exit(2);
  }
}

if (!ref) {
  process.stderr.write(USAGE);
  process.exit(2);
}

if (cardId !== undefined && cardId.length === 0) {
  process.stderr.write('Error: --card-id requires a non-empty value\n');
  process.exit(2);
}

createWorktree(ref, cardId !== undefined ? { cardId } : undefined)
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
