/**
 * CLI entrypoint for removing Cards-managed git worktrees.
 *
 * Accepts a single worktree path argument. When the worktree is card-bound (a
 * `.cards/CARD_ID` marker is present), its branch record is also unregistered
 * via `removeWorktreeForCard`; a missing client or a failed `removeBranch` is
 * logged to stderr but does not fail the command (fail-open on branch
 * unregister). Unbound worktrees fall back to the bare `removeWorktree`. The
 * command exits 0 when the worktree is removed, even if the branch unregister
 * failed.
 *
 * Exit codes: 0 success, 2 usage or worktree-removal failure.
 *
 * @summary CLI for git worktree removal
 */

import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { createCardsClient } from '@cards/sdk/client/discovery';
import { removeWorktree } from '@cards/sdk/worktree';
import { removeWorktreeForCard } from '@cards/sdk/worktree-for-card';

const execFileAsync = promisify(execFile);

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

/**
 * Reads the `.cards/CARD_ID` marker from a worktree, returning the trimmed card
 * ID or `undefined` when the marker is absent (an unbound worktree).
 *
 * @param dir - Absolute path to the worktree directory.
 * @returns The card ID, or `undefined` if no marker exists.
 */
async function readWorktreeCardId(dir: string): Promise<string | undefined> {
  try {
    const raw = await fs.readFile(path.join(dir, '.cards', 'CARD_ID'), 'utf-8');
    return raw.trim() || undefined;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

/**
 * Reports whether a path still exists on disk. Used to distinguish a failed
 * worktree removal (path still present) from a failed branch unregister (path
 * already gone) in the fail-open handler.
 *
 * @param targetPath - Absolute path to check.
 * @returns `true` if the path exists, `false` otherwise.
 */
async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  // Resolve the card binding from disk before removal: the marker yields the
  // cardId and HEAD yields the exact registered branch name (spike S2).
  const cardId = await readWorktreeCardId(worktreePath!);

  if (cardId === undefined) {
    // Unbound worktree — no branch record to unregister.
    await removeWorktree(worktreePath!);
    return;
  }

  const { stdout } = await execFileAsync('git', ['-C', worktreePath!, 'rev-parse', '--abbrev-ref', 'HEAD']);
  const branchName = stdout.trim();

  // Fail-open: a missing client or a failed removeBranch must never fail the
  // command. Remove the worktree regardless, logging the orphaned record.
  const client = await createCardsClient();
  if (client === null) {
    process.stderr.write('Warning: Cards API unavailable; removing worktree without unregistering branch\n');
    await removeWorktree(worktreePath!);
    return;
  }

  try {
    await removeWorktreeForCard(client, worktreePath!, { cardId, branchName });
  } catch (error) {
    // removeWorktreeForCard removes the worktree first, then unregisters the
    // branch. If the worktree is gone, only the branch unregister failed — log
    // and exit 0 (recoverable orphan). If it is still on disk, the removal
    // failed; rethrow so main()'s catch exits 2.
    if (await pathExists(worktreePath!)) {
      throw error;
    }
    process.stderr.write(
      `Warning: branch unregister failed; worktree removed: ${error instanceof Error ? error.message : String(error)}\n`
    );
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(2);
  });
