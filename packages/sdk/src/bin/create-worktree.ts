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

import * as path from 'node:path';
import { resolveExtensionPath } from '@cards/sdk';
import { createWorktree } from '@cards/sdk/worktree';
import { WorktreeIncludeError } from '../worktreeInclude.js';

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

async function main(): Promise<void> {
  let options: Parameters<typeof createWorktree>[1];
  if (cardId !== undefined) {
    const compiledScriptPaths = await buildCompiledScriptPaths();
    options = { cardId, compiledScriptPaths };
  }

  const { settle } = await createWorktree(ref!, options);
  const result = await settle;
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main().catch((error: unknown) => {
  if (error instanceof WorktreeIncludeError) {
    process.stderr.write(`${error.message}\n`);
    process.exit(3);
  }
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(2);
});
