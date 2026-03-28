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
import * as fs from 'node:fs/promises';
import { homedir } from 'node:os';
import * as path from 'node:path';
import { CardsClient } from '@cards/sdk/client';
import type { ActionContext, ActionInput } from '@cards/sdk/config';
import { spawnBranchCleanupWatcher } from './branch-cleanup-watcher.js';
import { errorMessage, resolveBaseBranch, resolveMarketplacePath, resolveOrCreateWorktree } from './claude-session.js';

/**
 * Options for {@link spawnCodexSession}.
 */
export interface CodexSessionOptions {
  /** Prompt string passed to the Codex CLI. */
  prompt: string;
}

/**
 * Minimal manifest shape required by the Codex plugin loader.
 */
interface CodexPluginManifest {
  name: string;
  version: string;
}

const CODEX_PLUGIN_NAME = 'codex-runtime';
const CODEX_PLUGIN_MARKETPLACE = 'local';
const CODEX_RUNTIME_SKILL_NAME = 'cards-runtime';

/**
 * Resolves the packaged Codex plugin bundled in the extension marketplace.
 *
 * @param marketplacePath - Absolute path to the packaged marketplace directory.
 * @returns Absolute path to the packaged Codex plugin directory.
 */
export function resolveCodexPluginPath(marketplacePath: string): string {
  return path.join(marketplacePath, 'plugins', CODEX_PLUGIN_NAME);
}

/**
 * Resolves the Codex home directory used for plugin cache installation.
 *
 * @returns Absolute path to the Codex home directory.
 */
export function resolveCodexHome(): string {
  return process.env['CODEX_HOME'] ?? path.join(homedir(), '.codex');
}

/**
 * Reads and validates the packaged Codex plugin manifest.
 *
 * @param pluginPath - Absolute path to the packaged Codex plugin directory.
 * @returns Parsed plugin manifest.
 */
export async function readCodexPluginManifest(pluginPath: string): Promise<CodexPluginManifest> {
  const manifestPath = path.join(pluginPath, '.codex-plugin', 'plugin.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8')) as Partial<CodexPluginManifest>;

  if (manifest.name !== CODEX_PLUGIN_NAME) {
    throw new Error(`Invalid Codex plugin manifest name at ${manifestPath}: expected "${CODEX_PLUGIN_NAME}"`);
  }
  if (typeof manifest.version !== 'string' || manifest.version.length === 0) {
    throw new Error(`Invalid Codex plugin manifest version at ${manifestPath}`);
  }

  return {
    name: manifest.name,
    version: manifest.version
  };
}

/**
 * Installs the packaged Codex plugin into the local Codex plugin cache.
 *
 * The packaged extension bundle remains the source of truth. The cache entry is
 * replaced atomically at the plugin subtree boundary so only `codex-runtime`
 * entries are touched.
 *
 * @param marketplacePath - Absolute path to the packaged marketplace directory.
 * @returns Installed plugin cache metadata.
 */
export async function ensureCodexPluginInstalled(marketplacePath: string): Promise<{
  pluginPath: string;
  version: string;
  cachePath: string;
}> {
  const pluginPath = resolveCodexPluginPath(marketplacePath);
  const skillPath = path.join(pluginPath, 'skills', CODEX_RUNTIME_SKILL_NAME);

  await fs.access(pluginPath);
  await fs.access(skillPath);

  const manifest = await readCodexPluginManifest(pluginPath);
  const pluginVersionsPath = path.join(
    resolveCodexHome(),
    'plugins',
    'cache',
    CODEX_PLUGIN_MARKETPLACE,
    CODEX_PLUGIN_NAME
  );
  const cachePath = path.join(pluginVersionsPath, manifest.version);

  await fs.rm(pluginVersionsPath, { recursive: true, force: true });
  await fs.mkdir(pluginVersionsPath, { recursive: true });
  await fs.symlink(pluginPath, cachePath, 'junction');

  return {
    pluginPath,
    version: manifest.version,
    cachePath
  };
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
  return [
    '--dangerously-bypass-approvals-and-sandbox',
    '--cd',
    workspacePath,
    '--add-dir',
    cardRepoPath,
    '--config',
    'features.plugins=true',
    '--config',
    `plugins.${CODEX_PLUGIN_NAME}@${CODEX_PLUGIN_MARKETPLACE}.enabled=true`,
    prompt
  ];
}

/**
 * Spawns a `codex` CLI session with worktree lifecycle and prompt-based skill guidance.
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
  const marketplacePath = resolveMarketplacePath();

  context.logger.info(`${input.actionName} action started`, {
    cardId: input.cardId,
    environment: input.environment,
    executionMode: input.executionMode
  });

  const client = new CardsClient({
    baseUrl: input.apiBaseUrl,
    accessToken: input.apiAccessToken
  });

  const baseBranch = await resolveBaseBranch(input.repoRoot, client);
  const {
    worktreePath: cwd,
    branchName,
    parentBranch
  } = await resolveOrCreateWorktree(input, client, baseBranch, context.logger);

  context.logger.info('Using worktree', { cwd, branch: branchName, baseBranch, parentBranch });
  const { pluginPath, version, cachePath } = await ensureCodexPluginInstalled(marketplacePath);
  context.logger.info('Installed Codex runtime plugin', {
    pluginPath,
    version,
    cachePath
  });

  const args = buildCodexArgs(prompt, cwd, input.cardRepoPath);

  const child: ChildProcess = spawn('codex', args, {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
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
    spawnBranchCleanupWatcher({
      cardId: input.cardId,
      repoRoot: input.repoRoot,
      cardRepoPath: input.cardRepoPath
    });
  } catch (error) {
    context.logger.warn('Failed to spawn branch-cleanup watcher (non-fatal)', {
      error: errorMessage(error)
    });
  }
}
