/**
 * Shared session utilities for Codex action workflows.
 *
 * Reuses the existing worktree lifecycle used by Claude-based actions, while
 * staging an extension-managed Codex home before launching the `codex` CLI.
 *
 * @summary Shared session utilities for Codex action workflows
 * @module
 */

import { type ChildProcess, spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import { homedir } from 'node:os';
import * as path from 'node:path';
import { resolveGlobalCardsConfigDir } from '@cards/sdk';
import { createCardsClient } from '@cards/sdk/client/discovery';
import type { ActionContext, ActionInput } from '@cards/sdk/config';
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';
import { spawnBranchCleanupWatcher } from './branch-cleanup-watcher.js';
import { errorMessage, resolveBaseBranch, resolveMarketplacePath, resolveOrCreateWorktree } from './claude-session.js';

/**
 * Options for {@link spawnCodexSession}.
 */
export interface CodexSessionOptions {
  /** Prompt string passed to the Codex CLI. */
  prompt?: string;
}

/**
 * Minimal manifest shape required by the Codex plugin loader.
 */
interface CodexPluginManifest {
  name: string;
}

interface CodexPluginMarketplaceManifest {
  name: string;
}

type TomlTable = Record<string, unknown>;

const CODEX_PLUGIN_NAME = 'runtime';
const CODEX_PLUGIN_MARKETPLACE = 'local';
const CODEX_RUNTIME_SKILL_NAME = 'runtime';
const CODEX_CONFIG_FILE_NAME = 'config.toml';
const CODEX_AGENTS_FILE_NAME = 'AGENTS.md';

/**
 * Resolves the packaged Codex bundle directory bundled alongside the extension marketplace.
 *
 * @param marketplacePath - Absolute path to the packaged marketplace directory.
 * @returns Absolute path to the bundled Codex root directory.
 */
export function resolveCodexBundlePath(marketplacePath: string): string {
  return path.join(path.dirname(marketplacePath), 'codex');
}

/**
 * Resolves the packaged Codex plugin bundled in the extension installation.
 *
 * @param marketplacePath - Absolute path to the packaged marketplace directory.
 * @returns Absolute path to the packaged Codex runtime plugin directory.
 */
export function resolveCodexPluginPath(marketplacePath: string): string {
  return path.join(resolveCodexBundlePath(marketplacePath), CODEX_PLUGIN_NAME);
}

/**
 * Resolves the packaged Claude instruction directory bundled in the extension marketplace.
 *
 * @param marketplacePath - Absolute path to the packaged marketplace directory.
 * @returns Absolute path to the bundled Claude instruction directory.
 */
export function resolveCodexClaudeInstructionsPath(marketplacePath: string): string {
  return path.join(marketplacePath, 'plugins', 'runtime', 'claude');
}

/**
 * Resolves the source Codex home that should be staged into the Cards-managed home.
 *
 * @returns Absolute path to the source Codex home.
 */
export function resolveDefaultCodexHome(): string {
  return process.env['CODEX_HOME'] ?? path.join(homedir(), '.codex');
}

/**
 * Resolves the Cards-managed staged Codex home.
 *
 * @returns Absolute path to the staged Codex home.
 */
export function resolveStagedCodexHome(): string {
  return path.join(resolveGlobalCardsConfigDir(), 'codex');
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

  return {
    name: manifest.name
  };
}

async function readCodexMarketplaceManifest(bundlePath: string): Promise<CodexPluginMarketplaceManifest> {
  const manifestPath = path.join(bundlePath, '.agents', 'plugins', 'marketplace.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8')) as Partial<CodexPluginMarketplaceManifest>;

  if (manifest.name !== CODEX_PLUGIN_MARKETPLACE) {
    throw new Error(
      `Invalid Codex marketplace manifest name at ${manifestPath}: expected "${CODEX_PLUGIN_MARKETPLACE}"`
    );
  }

  return {
    name: manifest.name
  };
}

async function ensureCodexBundleAvailable(marketplacePath: string): Promise<{
  bundlePath: string;
  pluginPath: string;
}> {
  const bundlePath = resolveCodexBundlePath(marketplacePath);
  const pluginPath = resolveCodexPluginPath(marketplacePath);
  const skillPath = path.join(pluginPath, 'skills', CODEX_RUNTIME_SKILL_NAME);
  const marketplaceManifestPath = path.join(bundlePath, '.agents', 'plugins', 'marketplace.json');

  await fs.access(bundlePath);
  await fs.access(pluginPath);
  await fs.access(skillPath);
  await fs.access(marketplaceManifestPath);
  await readCodexMarketplaceManifest(bundlePath);
  await readCodexPluginManifest(pluginPath);

  return { bundlePath, pluginPath };
}

async function readDirectoryEntries(directoryPath: string): Promise<string[]> {
  return (await fs.readdir(directoryPath)).sort((left, right) => left.localeCompare(right));
}

async function copyDirectoryContents(sourceDir: string, destinationDir: string): Promise<void> {
  const entries = await readDirectoryEntries(sourceDir);
  for (const entry of entries) {
    await fs.cp(path.join(sourceDir, entry), path.join(destinationDir, entry), {
      force: true,
      recursive: true
    });
  }
}

async function resolveExistingDirectory(directoryPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(directoryPath);
    if (!stats.isDirectory()) {
      throw new Error(`Expected directory at ${directoryPath}`);
    }
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function ensureTomlTable(value: unknown, fieldName: string): TomlTable {
  if (value === undefined) {
    return {};
  }

  if (!value || Array.isArray(value) || typeof value !== 'object') {
    throw new Error(`Expected TOML table for "${fieldName}"`);
  }

  return value as TomlTable;
}

/**
 * Merges the staged config with the runtime plugin settings required by the bundled marketplace.
 *
 * @param stagedCodexHome - Absolute path to the staged Codex home.
 */
export async function mergeCodexRuntimeConfig(stagedCodexHome: string): Promise<void> {
  const configPath = path.join(stagedCodexHome, CODEX_CONFIG_FILE_NAME);

  let config: TomlTable = {};
  try {
    const rawConfig = await fs.readFile(configPath, 'utf-8');
    const parsedConfig = parseToml(rawConfig);
    config = ensureTomlTable(parsedConfig, 'root');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      config = {};
    } else {
      throw error;
    }
  }

  const features = ensureTomlTable(config['features'], 'features');
  features['plugins'] = true;
  config['features'] = features;

  const plugins = ensureTomlTable(config['plugins'], 'plugins');
  const pluginKey = `${CODEX_PLUGIN_NAME}@${CODEX_PLUGIN_MARKETPLACE}`;
  const pluginConfig = ensureTomlTable(plugins[pluginKey], `plugins.${pluginKey}`);
  pluginConfig['enabled'] = true;
  plugins[pluginKey] = pluginConfig;
  config['plugins'] = plugins;

  await fs.writeFile(configPath, `${stringifyToml(config)}\n`);
}

/**
 * Appends packaged Claude instruction content to the staged Codex home AGENTS.md.
 *
 * @param stagedCodexHome - Absolute path to the staged Codex home.
 * @param marketplacePath - Absolute path to the packaged marketplace directory.
 */
export async function mergeCodexAgentsInstructions(stagedCodexHome: string, marketplacePath: string): Promise<void> {
  const claudeInstructionsPath = resolveCodexClaudeInstructionsPath(marketplacePath);
  const claudeDocument = await fs.readFile(path.join(claudeInstructionsPath, 'CLAUDE.md'), 'utf-8');
  const commitMessageStyle = await fs.readFile(path.join(claudeInstructionsPath, 'COMMIT_MESSAGE_STYLE.md'), 'utf-8');
  const appendedContent = `${claudeDocument.trimEnd()}\n\n${commitMessageStyle.trimEnd()}\n`;
  const agentsPath = path.join(stagedCodexHome, CODEX_AGENTS_FILE_NAME);

  let existingContent = '';
  try {
    existingContent = await fs.readFile(agentsPath, 'utf-8');
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
      throw error;
    }
  }

  const nextContent =
    existingContent.length === 0 ? appendedContent : `${existingContent.replace(/\s*$/, '')}\n\n${appendedContent}`;

  await fs.writeFile(agentsPath, nextContent);
}

/**
 * Prepares the staged Codex home under the Cards global config directory.
 *
 * @param marketplacePath - Absolute path to the packaged marketplace directory.
 * @returns Staging metadata for logging and spawning.
 */
export async function prepareStagedCodexHome(marketplacePath: string): Promise<{
  bundlePath: string;
  pluginPath: string;
  sourceCodexHome: string;
  stagedCodexHome: string;
}> {
  const { bundlePath, pluginPath } = await ensureCodexBundleAvailable(marketplacePath);
  const sourceCodexHome = resolveDefaultCodexHome();
  const stagedCodexHome = resolveStagedCodexHome();
  const stagingParent = path.dirname(stagedCodexHome);
  const tempHome = path.join(stagingParent, `codex.tmp-${process.pid}-${Date.now()}`);

  await fs.mkdir(stagingParent, { recursive: true });
  await fs.rm(tempHome, { recursive: true, force: true });

  if (await resolveExistingDirectory(sourceCodexHome)) {
    await fs.cp(sourceCodexHome, tempHome, { recursive: true });
  } else {
    await fs.mkdir(tempHome, { recursive: true });
  }

  await copyDirectoryContents(bundlePath, tempHome);
  await mergeCodexRuntimeConfig(tempHome);
  await mergeCodexAgentsInstructions(tempHome, marketplacePath);
  await fs.rm(stagedCodexHome, { recursive: true, force: true });
  await fs.rename(tempHome, stagedCodexHome);

  return {
    bundlePath,
    pluginPath,
    sourceCodexHome,
    stagedCodexHome
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
export function buildCodexArgs(prompt: string | undefined, workspacePath: string, cardRepoPath: string): string[] {
  const args = ['--dangerously-bypass-approvals-and-sandbox', '--cd', workspacePath, '--add-dir', cardRepoPath];

  if (prompt !== undefined) {
    args.push(prompt);
  }

  return args;
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

  const client = await createCardsClient(context.logger);
  if (!client) {
    throw new Error('Cards API discovery failed — cannot start session');
  }

  const baseBranch = await resolveBaseBranch(input.repoRoot, client);
  const {
    worktreePath: cwd,
    branchName,
    parentBranch
  } = await resolveOrCreateWorktree(input, client, baseBranch, context.logger);

  context.logger.info('Using worktree', { cwd, branch: branchName, baseBranch, parentBranch });

  const { bundlePath, pluginPath, sourceCodexHome, stagedCodexHome } = await prepareStagedCodexHome(marketplacePath);
  context.logger.info('Prepared staged Codex home', {
    bundlePath,
    pluginPath,
    sourceCodexHome,
    stagedCodexHome
  });

  const args = buildCodexArgs(prompt, cwd, input.cardRepoPath);

  const child: ChildProcess = spawn('codex', args, {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      CODEX_HOME: stagedCodexHome,
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
