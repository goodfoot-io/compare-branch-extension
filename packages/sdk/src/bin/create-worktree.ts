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
import * as path from 'node:path';
import { promisify } from 'node:util';
import { resolveExtensionPath } from '@cards/sdk';
import { createCardsClient } from '@cards/sdk/client/discovery';
import { createWorktree } from '@cards/sdk/worktree';
import { createWorktreeForCard } from '@cards/sdk/worktree-for-card';
import { WorktreeIncludeError } from '../worktreeInclude.js';

const execFileAsync = promisify(execFile);

/**
 * Builds the `compiledScriptPaths` map for `createWorktree({ cardId })`.
 *
 * Resolves the extension path via env var or the `~/.cards/EXTENSION_PATH` file
 * written by the extension on activation. Fail-closed: throws if the extension
 * path cannot be determined, preventing silent hook-provisioning loss (D10a).
 *
 * @returns Map of hook name to absolute compiled `.mjs` path.
 */
async function buildCompiledScriptPaths(): Promise<Record<string, string>> {
  const extensionPath = await resolveExtensionPath();
  const gitHooksDir = path.join(extensionPath, 'dist', 'git-hooks');
  return {
    'pre-commit': path.join(gitHooksDir, 'pre-commit.mjs'),
    'post-commit': path.join(gitHooksDir, 'post-commit.mjs'),
    'post-rewrite': path.join(gitHooksDir, 'post-rewrite.mjs')
  };
}

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
  return stdout.trim();
}

async function main(): Promise<void> {
  if (cardId !== undefined) {
    const compiledScriptPaths = await buildCompiledScriptPaths();

    // Fail-closed: a card-bound worktree must never exist on disk without a
    // branch record. Exit 2 if the API cannot be discovered.
    const client = await createCardsClient();
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
    // Exit explicitly: a card-bound run opens a keep-alive HTTP socket via
    // CardsClient that would otherwise hold the event loop open.
    process.exit(0);
  })
  .catch((error: unknown) => {
    if (error instanceof WorktreeIncludeError) {
      process.stderr.write(`${error.message}\n`);
      process.exit(3);
    }
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(2);
  });
