/**
 * CLI entrypoint for creating git worktrees with monorepo symlink wiring.
 *
 * Accepts a branch name, tag name, or commit SHA. Detects the ref type
 * automatically and creates either a branch-based or detached worktree.
 *
 * With `--card-id <id>`, the worktree is registered with the Cards API via
 * `createWorktreeForCard` (fail-closed: exit 2 if the API cannot be
 * discovered). The branch's `parentBranch` defaults to the source repo's
 * current branch and can be overridden with `--parent-branch <name>`. Without
 * `--card-id` the CLI stays fully offline — no client, no parent branch.
 *
 * Outputs JSON: `{"branch":"...","worktree":"...","baseSha":"...","copiedFromInclude":N,"reroutedSymlinks":N}`
 *
 * Exit codes: 0 success, 2 general failure, 3 `.worktreeinclude` processing failure.
 *
 * @summary CLI for git worktree creation
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { compiledHookScriptPaths, resolveExtensionPath } from '@cards.management/sdk';
import { createCardsClient } from '@cards.management/sdk/client/discovery';
import { createWorktree } from '@cards.management/sdk/worktree';
import { createWorktreeForCard } from '@cards.management/sdk/worktree-for-card';
import { WorktreeIncludeError } from '../worktreeInclude.js';

const execFileAsync = promisify(execFile);

const USAGE = 'Usage: create-worktree [--card-id <id>] [--parent-branch <name>] <branch|tag|sha>\n';

const args = process.argv.slice(2);
let cardId: string | undefined;
let parentBranchArg: string | undefined;
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
  } else if (arg === '--parent-branch') {
    const next = args[i + 1];
    if (!next) {
      process.stderr.write(USAGE);
      process.exit(2);
    }
    parentBranchArg = next;
    i++;
  } else if (arg.startsWith('--parent-branch=')) {
    parentBranchArg = arg.slice('--parent-branch='.length);
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

// --parent-branch only has meaning for a card-bound worktree (it is recorded in
// the branch record). Supplying it without --card-id is a usage error rather
// than a silent no-op.
if (parentBranchArg !== undefined && cardId === undefined) {
  process.stderr.write('Error: --parent-branch requires --card-id\n');
  process.exit(2);
}

/**
 * Resolves the parent branch for a card-bound worktree: the explicit
 * `--parent-branch` value when given, otherwise the source repo's current
 * branch (the same HEAD createWorktree resolves the new branch from).
 *
 * @returns The parent branch name.
 */
async function resolveParentBranch(): Promise<string> {
  if (parentBranchArg !== undefined && parentBranchArg.length > 0) {
    return parentBranchArg;
  }
  const { stdout } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  const branch = stdout.trim();
  // In a detached-HEAD source repo `--abbrev-ref HEAD` returns the literal
  // "HEAD", which is not a valid parent branch. Fail closed with guidance
  // rather than recording corrupt lineage metadata.
  if (branch === 'HEAD') {
    throw new Error(
      'Source repository is in detached-HEAD state; cannot derive a parent branch. ' +
        'Pass --parent-branch <name> explicitly.'
    );
  }
  return branch;
}

async function main(): Promise<void> {
  if (cardId !== undefined) {
    const compiledScriptPaths = compiledHookScriptPaths(await resolveExtensionPath());

    // Fail-closed: a card-bound worktree must never exist on disk without a
    // branch record. Exit 2 if the API cannot be discovered. retryOnNetworkError
    // is disabled so an unreachable/stale-discovery server surfaces promptly
    // instead of retrying forever after the worktree already exists on disk.
    const client = await createCardsClient(undefined, { retryOnNetworkError: false });
    if (client === null) {
      process.stderr.write('Error: Cards API unavailable; cannot register card-bound worktree\n');
      process.exit(2);
    }

    const parentBranch = await resolveParentBranch();
    const { settle } = await createWorktreeForCard(client, ref!, {
      cardId,
      compiledScriptPaths,
      parentBranch
    });
    const result = await settle;
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }

  // Card-less: fully offline, no client, no parent branch.
  const { settle } = await createWorktree(ref!);
  const result = await settle;
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main()
  .then(() => {
    // Let the event loop drain rather than forcing `process.exit(0)`. A
    // card-bound run leaves a CardsClient keep-alive socket; on Windows a forced
    // exit races libuv tearing that socket (and the git child's process handle)
    // down and trips a fatal libuv assertion (async.c, 0xC0000409) even though
    // the worktree was created. The socket idles out (undici keep-alive ~4s) and
    // the loop exits on its own; the unref'd 5s timer is a fail-closed backstop
    // that cannot itself keep the loop alive.
    process.exitCode = 0;
    setTimeout(() => process.exit(0), 5_000).unref();
  })
  .catch((error: unknown) => {
    if (error instanceof WorktreeIncludeError) {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 3;
      setTimeout(() => process.exit(3), 5_000).unref();
      return;
    }
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
    setTimeout(() => process.exit(2), 5_000).unref();
  });
