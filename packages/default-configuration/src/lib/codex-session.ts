/**
 * Shared session utilities for Codex action workflows.
 *
 * Reuses the existing worktree lifecycle used by Claude-based actions, while
 * tailoring process spawn arguments and environment for the `codex` CLI.
 *
 * @summary Shared session utilities for Codex action workflows
 * @module
 */

import { type ChildProcess, spawn } from 'node:child_process';
import * as path from 'node:path';
import { CardsClient } from '@cards/sdk/client';
import type { ActionContext, ActionInput } from '@cards/sdk/config';
import {
  cleanupMergedBranches,
  errorMessage,
  resolveBaseBranch,
  resolveMarketplacePath,
  resolveOrCreateWorktree
} from './claude-session.js';

/**
 * Options for {@link spawnCodexSession}.
 */
export interface CodexSessionOptions {
  /** Prompt string passed to the Codex CLI. */
  prompt: string;
}

/**
 * Resolves the Codex config file bundled in the extension marketplace.
 *
 * @param marketplacePath - Absolute path to the packaged marketplace directory.
 * @returns Absolute path to the bundled Codex config file.
 */
export function resolveCodexConfigPath(marketplacePath: string): string {
  return path.join(marketplacePath, '.codex', 'config.toml');
}

/**
 * Builds the CLI argument list for the `codex` process.
 *
 * @param prompt - Prompt passed to Codex.
 * @param workspacePath - Card worktree path used as the Codex workspace root.
 * @param cardRepoPath - Additional writable directory for the card repo.
 * @returns Array of CLI arguments.
 */
export function buildCodexArgs(prompt: string, workspacePath: string, cardRepoPath: string): string[] {
  return ['--dangerously-bypass-approvals-and-sandbox', '--cd', workspacePath, '--add-dir', cardRepoPath, prompt];
}

/**
 * Spawns a `codex` CLI session with worktree lifecycle and packaged config wiring.
 *
 * @param input - Parsed action input from the environment.
 * @param context - Action context providing logger and lifecycle hooks.
 * @param options - Session-specific parameters.
 */
export async function spawnCodexSession(
  input: ActionInput,
  context: ActionContext,
  options: CodexSessionOptions
): Promise<void> {
  const { prompt } = options;

  context.logger.info(`${input.actionName} action started`, {
    cardId: input.cardId,
    environment: input.environment,
    executionMode: input.executionMode
  });

  const client = new CardsClient({
    baseUrl: input.apiBaseUrl,
    accessToken: input.apiAccessToken
  });

  const baseBranch = await resolveBaseBranch(input.repoRoot);
  const {
    worktreePath: cwd,
    branchName,
    parentBranch
  } = await resolveOrCreateWorktree(input, client, baseBranch, context.logger);

  context.logger.info('Using worktree', { cwd, branch: branchName, baseBranch, parentBranch });

  const marketplacePath = resolveMarketplacePath();
  const codexConfigPath = resolveCodexConfigPath(marketplacePath);
  const args = buildCodexArgs(prompt, cwd, input.cardRepoPath);

  const child: ChildProcess = spawn('codex', args, {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      CODEX_CONFIG: codexConfigPath,
      WORKSPACE_PATH: cwd,
      BASE_BRANCH: baseBranch,
      PARENT_BRANCH: parentBranch,
      WORKSPACE_BRANCH: branchName
    }
  });

  context.onCancel(() => {
    context.logger.info(`${input.actionName} action cancelled, terminating codex`);
    child.kill('SIGTERM');
  });

  const exitCode = await new Promise<number | null>((resolve) => {
    child.on('close', resolve);
  });

  context.logger.info(`${input.actionName} action completed`, { exitCode });

  try {
    await cleanupMergedBranches(input, client, baseBranch, context.logger);
  } catch (error) {
    context.logger.warn('Branch cleanup failed', {
      error: errorMessage(error)
    });
  }
}
