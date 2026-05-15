/**
 * Shared session utilities for Codex action workflows.
 *
 * Reuses the existing worktree lifecycle used by Claude-based actions, while
 * staging an extension-managed Codex home before launching the `codex` CLI.
 *
 * @summary Shared session utilities for Codex action workflows
 * @module
 */

import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import { homedir } from 'node:os';
import * as path from 'node:path';
import { createInterface } from 'node:readline';
import { resolveGlobalCardsConfigDir } from '@cards/sdk';
import { CARD_REPO_LOG_PATHSPEC_EXCLUSIONS } from '@cards/sdk/client';
import { createCardsClient } from '@cards/sdk/client/discovery';
import type { ActionContext, ActionInput } from '@cards/sdk/config';
import { BRANCHES_FILE, COMMITS_FILE } from '@cards/sdk/protocol';
import yaml from 'js-yaml';
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';
import { applyCodexConfig } from './applyCodexConfig.js';
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

interface JsonRpcSuccessMessage {
  id: number;
  result: unknown;
}

interface JsonRpcErrorMessage {
  id: number;
  error: {
    message?: string;
  };
}

interface JsonRpcNotificationMessage {
  method: string;
}

type TomlTable = Record<string, unknown>;

const CODEX_PLUGIN_NAMES = ['cards', 'runtime'] as const;
const CODEX_PLUGIN_MARKETPLACE = 'local';
const CODEX_CONFIG_FILE_NAME = 'config.toml';
const CODEX_AGENTS_FILE_NAME = 'AGENTS.md';
const MAX_CARD_REPO_LOG_COMMITS = 5;
const MAX_WORKSPACE_COMMITS_PER_BRANCH = 5;

interface WorkspaceData {
  branches: Record<string, { parentBranch?: string; addedAt: string }>;
  commits: string[];
}

interface CommitGroup {
  branchName: string;
  parentBranch?: string;
  shas: string[];
  orphaned?: boolean;
}

export class CardRepoAccessError extends Error {
  override readonly name = 'CardRepoAccessError';

  constructor(
    public readonly repoPath: string,
    cause: unknown
  ) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Cannot read card repository at ${repoPath}: ${reason}`);
    this.cause = cause;
  }
}

// ============================================================================
// Env block
// ============================================================================

/**
 * Builds the fenced bash env block for Codex prompt context.
 *
 * Does not read process.env — all values come from explicit parameters.
 *
 * @param actionInput - Parsed action input for the current session.
 * @param workspacePath - Active worktree path used as the Codex workspace root.
 * @param baseBranch - Base branch associated with the worktree.
 * @param workspaceBranch - Branch checked out in the worktree.
 * @returns Fenced bash block string with env vars.
 */
export function buildEnvBlock(
  actionInput: ActionInput,
  workspacePath: string,
  baseBranch: string,
  workspaceBranch: string
): string {
  const lines = [
    `CARD_ID=${actionInput.cardId}`,
    `CARD_REPO_PATH=${actionInput.cardRepoPath}`,
    `WORKSPACE_PATH=${workspacePath}`,
    `BASE_BRANCH=${baseBranch}`,
    `WORKSPACE_BRANCH=${workspaceBranch}`,
    `EXECUTION_MODE=${actionInput.executionMode}`
  ];

  return `\`\`\`bash\n${lines.join('\n')}\n\`\`\``;
}

// ============================================================================
// Card block
// ============================================================================

/**
 * Builds the `<card>` XML block with a YAML body from CARD.meta.json.
 *
 * Reads `CARD.meta.json` in full and serializes the entire parsed object
 * to YAML. Wraps readFileSync/JSON.parse errors as CardRepoAccessError (fail closed).
 *
 * @param actionInput - Parsed action input for the current session.
 * @returns The `<card type="yaml">...</card>` block string.
 * @throws {CardRepoAccessError} When CARD.meta.json cannot be read or parsed.
 */
export function buildCardBlock(actionInput: ActionInput): string {
  let data: Record<string, unknown>;
  try {
    const raw = readFileSync(path.join(actionInput.cardRepoPath, 'CARD.meta.json'), 'utf-8');
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch (error) {
    throw new CardRepoAccessError(actionInput.cardRepoPath, error);
  }
  const yamlBody = yaml.dump(data, { flowLevel: -1, lineWidth: -1 }).trimEnd();
  return `<card type="yaml">\n${yamlBody}\n</card>`;
}

// ============================================================================
// Card repo listing
// ============================================================================

/**
 * Counts files in a directory and returns count + latest mtime.
 *
 * @param dirPath - Directory to scan.
 * @returns Tuple of [count, latestMtimeMs].
 */
function dirStats(dirPath: string): [count: number, latestMtimeMs: number] {
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    let count = 0;
    let latest = 0;
    for (const entry of entries) {
      if (entry.isFile()) {
        count++;
        try {
          const mtimeMs = statSync(path.join(dirPath, entry.name)).mtimeMs;
          if (mtimeMs > latest) latest = mtimeMs;
        } catch (_statError: unknown) {
          void _statError;
        }
      }
    }
    return [count, latest];
  } catch {
    return [0, 0];
  }
}

/**
 * Formats a timestamp as ISO-8601 to the minute.
 *
 * @param mtimeMs - Millisecond timestamp.
 * @returns Formatted timestamp string.
 */
function formatTimestamp(mtimeMs: number): string {
  const iso = new Date(mtimeMs).toISOString();
  return `${iso.slice(0, 16)}Z`;
}

/**
 * Represents a single entry in the Codex card-repo YAML listing.
 */
interface CodexCardRepoEntry {
  name: string;
  modified?: string;
  entries?: CodexCardRepoEntry[];
  count?: number;
  latest?: string;
}

/**
 * Builds the `<card-repo>` block for Codex prompt context with YAML body.
 *
 * Preserves timestamps (`modified` field). Does NOT add `summary` fields.
 *
 * @param rootPath - Root directory of the card repository.
 * @returns The `<card-repo type="yaml">...</card-repo>` block string.
 * @throws {CardRepoAccessError} When the card repository cannot be read.
 */
export function buildCardRepoBlock(rootPath: string): string {
  let dirEntries: { name: string; isDir: boolean }[];
  try {
    dirEntries = readdirSync(rootPath, { withFileTypes: true }).map((entry) => ({
      name: entry.name.toString(),
      isDir: entry.isDirectory()
    }));
  } catch (error) {
    throw new CardRepoAccessError(rootPath, error);
  }

  const items: CodexCardRepoEntry[] = [];
  for (const entry of dirEntries) {
    if (entry.name === '.git') continue;
    const fullPath = path.join(rootPath, entry.name);

    if (entry.isDir) {
      if (entry.name === 'streams') {
        const streamEntries: CodexCardRepoEntry[] = [];
        try {
          const subs = readdirSync(fullPath, { withFileTypes: true });
          for (const sub of subs) {
            if (sub.isDirectory()) {
              const streamPath = path.join(fullPath, sub.name);
              const [count, latest] = dirStats(streamPath);
              const streamEntry: CodexCardRepoEntry = { name: `${sub.name}/`, count };
              if (latest > 0) {
                streamEntry.latest = formatTimestamp(latest);
              }
              streamEntries.push(streamEntry);
            }
          }
        } catch (_readdirError: unknown) {
          void _readdirError;
        }
        items.push({ name: 'streams/', entries: streamEntries });
      } else {
        const [count, latest] = dirStats(fullPath);
        const dirItem: CodexCardRepoEntry = { name: `${entry.name}/`, count };
        if (latest > 0) {
          dirItem.modified = formatTimestamp(latest);
        }
        items.push(dirItem);
      }
    } else {
      const fileItem: CodexCardRepoEntry = { name: entry.name };
      try {
        const mtimeMs = statSync(fullPath).mtimeMs;
        fileItem.modified = formatTimestamp(mtimeMs);
      } catch (_statError: unknown) {
        void _statError; // stat failed — omit modified field
      }
      items.push(fileItem);
    }
  }

  const yamlBody = yaml.dump(items, { flowLevel: -1, lineWidth: -1 }).trimEnd();
  return `<card-repo type="yaml">\n${yamlBody}\n</card-repo>`;
}

// ============================================================================
// Card repo git log
// ============================================================================

/**
 * Builds the `<card-repo-log>` block for Codex prompt context with YAML body.
 *
 * @param rootPath - Root directory of the card repository.
 * @returns The `<card-repo-log type="yaml" ...>...</card-repo-log>` block string, or `null`.
 */
export function buildCardRepoLogBlock(rootPath: string): string | null {
  try {
    const log = execFileSync(
      'git',
      [
        'log',
        `-${MAX_CARD_REPO_LOG_COMMITS}`,
        '--reverse',
        '--name-only',
        '--pretty=format:%x1e%h%x00%an%x00%s',
        '--',
        '.',
        ...CARD_REPO_LOG_PATHSPEC_EXCLUSIONS,
        ':!.gitignore'
      ],
      {
        cwd: rootPath,
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe']
      }
    );

    const chunks = log.split('\x1e').filter((chunk) => chunk.trim().length > 0);
    if (chunks.length === 0) return null;

    const commits = chunks.map((chunk) => {
      const lines = chunk.split('\n');
      const [sha, author, subject] = lines[0]!.split('\0');
      const files = lines
        .slice(1)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      const commit: { sha: string; author: string; subject: string; files?: string[] } = {
        sha: sha!,
        author: author!,
        subject: subject!
      };
      if (files.length > 0) commit.files = files;
      return commit;
    });

    let totalCount: number | null = null;
    try {
      const countString = execFileSync('git', ['rev-list', '--count', 'HEAD'], {
        cwd: rootPath,
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
      totalCount = Number.parseInt(countString, 10);
      if (Number.isNaN(totalCount)) totalCount = null;
    } catch (_countError: unknown) {
      void _countError;
    }

    const countAttribute = totalCount !== null ? ` count="${totalCount}"` : '';
    const yamlBody = yaml.dump(commits, { flowLevel: -1, lineWidth: -1 }).trimEnd();
    return `<card-repo-log type="yaml"${countAttribute} order="oldest-first">\n${yamlBody}\n</card-repo-log>`;
  } catch {
    return null;
  }
}

// ============================================================================
// Workspace repo log
// ============================================================================

function readWorkspaceData(cardRepoPath: string): WorkspaceData | null {
  const branches: WorkspaceData['branches'] = {};
  let commits: string[] = [];

  try {
    const raw = readFileSync(path.join(cardRepoPath, BRANCHES_FILE), 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, { parentBranch?: string; addedAt?: string }>;
    for (const [name, meta] of Object.entries(parsed)) {
      if (meta && typeof meta === 'object') {
        branches[name] = {
          parentBranch: typeof meta.parentBranch === 'string' ? meta.parentBranch : undefined,
          addedAt: typeof meta.addedAt === 'string' ? meta.addedAt : ''
        };
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      return null;
    }
  }

  try {
    const raw = readFileSync(path.join(cardRepoPath, COMMITS_FILE), 'utf-8');
    commits = raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line): line is string => line.length > 0);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      return null;
    }
  }

  if (Object.keys(branches).length === 0 && commits.length === 0) {
    return null;
  }

  return { branches, commits };
}

function getReachableShas(workspacePath: string, ref: string): Set<string> {
  try {
    const output = execFileSync('git', ['log', '--format=%H', ref], {
      cwd: workspacePath,
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    return new Set(output ? output.split('\n') : []);
  } catch {
    return new Set();
  }
}

function filterResolvableShas(workspacePath: string, shas: string[]): string[] {
  if (shas.length === 0) return [];
  try {
    const output = execFileSync('git', ['cat-file', '--batch-check'], {
      input: `${shas.join('\n')}\n`,
      cwd: workspacePath,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    const lines = output.split('\n');
    const resolvable: string[] = [];
    for (let index = 0; index < lines.length && index < shas.length; index++) {
      if (!lines[index]!.includes('missing')) {
        resolvable.push(shas[index]!);
      }
    }
    return resolvable;
  } catch {
    return [];
  }
}

/**
 * Resolves commit details for specific SHAs as `{ sha, subject }` objects.
 *
 * @param workspacePath - Root directory of the workspace repository.
 * @param shas - Full 40-char SHAs to resolve.
 * @param mergedShas - SHAs reachable from the base branch (considered merged).
 * @returns Array of commit objects, or `null` on failure.
 */
function resolveWorkspaceCommitDetails(
  workspacePath: string,
  shas: string[],
  mergedShas?: Set<string>
): Array<{ sha: string; subject: string; merged?: true }> | null {
  if (shas.length === 0) return null;
  try {
    const output = execFileSync('git', ['log', '--no-walk', '--pretty=format:%H%x00%h%x00%s', ...shas], {
      cwd: workspacePath,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    if (!output) return null;

    const commits: Array<{ sha: string; subject: string; merged?: true }> = [];
    for (const line of output.split('\n')) {
      const [fullSha, shortSha, subject] = line.split('\0');
      if (!shortSha || !subject) continue;
      const commit: { sha: string; subject: string; merged?: true } = { sha: shortSha, subject };
      if (mergedShas?.has(fullSha!)) {
        commit.merged = true;
      }
      commits.push(commit);
    }
    return commits.length > 0 ? commits : null;
  } catch {
    return null;
  }
}

/**
 * Builds `<workspace-repo-log>` blocks for Codex prompt context with YAML body.
 *
 * Preserves `parentBranch` attribute on branch blocks.
 *
 * @param workspacePath - Root directory of the workspace repository.
 * @param cardRepoPath - Root directory of the card repository.
 * @param baseBranch - Base branch associated with the workspace.
 * @returns Array of `<workspace-repo-log type="yaml" ...>` block strings, or empty array.
 */
export function buildWorkspaceRepoLogBlocks(workspacePath: string, cardRepoPath: string, baseBranch: string): string[] {
  const workspace = readWorkspaceData(cardRepoPath);
  if (!workspace) return [];

  const sortedBranches = Object.entries(workspace.branches).sort(([, left], [, right]) =>
    left.addedAt.localeCompare(right.addedAt)
  );

  const reachableFromTracked = new Set<string>();
  const groups: CommitGroup[] = [];

  for (const [name, meta] of sortedBranches) {
    const reachable = getReachableShas(workspacePath, name);
    const branchShas = workspace.commits.filter((sha) => reachable.has(sha));
    for (const sha of branchShas) reachableFromTracked.add(sha);
    if (branchShas.length > 0) {
      groups.push({ branchName: name, parentBranch: meta.parentBranch, shas: branchShas });
    }
  }

  const baseReachable = getReachableShas(workspacePath, baseBranch);
  const baseShas = workspace.commits.filter((sha) => baseReachable.has(sha) && !reachableFromTracked.has(sha));
  if (baseShas.length > 0) {
    groups.push({ branchName: baseBranch, shas: baseShas });
  }

  const orphanedShas = workspace.commits.filter((sha) => !reachableFromTracked.has(sha) && !baseReachable.has(sha));
  const resolvableShas = filterResolvableShas(workspacePath, orphanedShas);
  if (resolvableShas.length > 0) {
    groups.push({ branchName: '', shas: resolvableShas, orphaned: true });
  }

  const blocks: string[] = [];

  for (const group of groups) {
    const displayShas = group.shas.slice(-MAX_WORKSPACE_COMMITS_PER_BRANCH);
    const mergedShas = new Set(displayShas.filter((sha) => baseReachable.has(sha)));
    const commits = resolveWorkspaceCommitDetails(workspacePath, displayShas, mergedShas);

    if (!commits) continue;

    const yamlBody = yaml.dump(commits, { flowLevel: -1, lineWidth: -1 }).trimEnd();

    const attrs: string[] = ['type="yaml"'];
    if (group.orphaned) {
      attrs.push('orphaned="true"');
    } else {
      attrs.push(`branch="${group.branchName}"`);
      if (group.parentBranch) attrs.push(`parentBranch="${group.parentBranch}"`);
    }
    attrs.push(`count="${group.shas.length}"`);

    blocks.push(`<workspace-repo-log ${attrs.join(' ')}>\n${yamlBody}\n</workspace-repo-log>`);
  }

  return blocks;
}

// ============================================================================
// Combined context
// ============================================================================

/**
 * Builds the additional card context prepended to Codex prompts.
 *
 * @param input - Parsed action input for the current session.
 * @param workspacePath - Active worktree path used as the Codex workspace root.
 * @param baseBranch - Base branch associated with the worktree.
 * @param workspaceBranch - Branch checked out in the worktree.
 * @returns Context block string with env block and YAML XML blocks.
 */
export function buildAdditionalContext(
  input: ActionInput,
  workspacePath: string,
  baseBranch: string,
  workspaceBranch: string
): string {
  const envBlock = buildEnvBlock(input, workspacePath, baseBranch, workspaceBranch);
  const cardBlock = buildCardBlock(input);
  const repoBlock = buildCardRepoBlock(input.cardRepoPath);
  const logBlock = buildCardRepoLogBlock(input.cardRepoPath);
  const workspaceLogBlocks = buildWorkspaceRepoLogBlocks(input.repoRoot, input.cardRepoPath, baseBranch);

  const parts = [envBlock, cardBlock, repoBlock];
  if (logBlock) parts.push(logBlock);
  parts.push(...workspaceLogBlocks);
  return parts.join('\n\n');
}

/**
 * Prepends additional card context to the user prompt for Codex sessions.
 *
 * @param prompt - Original prompt passed to Codex, if any.
 * @param additionalContext - XML-like card/workspace context block.
 * @returns Prompt with prepended context, or `undefined` when no prompt exists.
 */
export function buildCodexPrompt(prompt: string | undefined, additionalContext: string): string | undefined {
  if (prompt === undefined) {
    return undefined;
  }

  return `${additionalContext}\n\n${prompt}`;
}

// ============================================================================
// Codex bundle + staging utilities
// ============================================================================

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
 * @param pluginName - Bundled Codex plugin name to resolve.
 * @returns Absolute path to the packaged Codex runtime plugin directory.
 */
export function resolveCodexPluginPath(
  marketplacePath: string,
  pluginName: (typeof CODEX_PLUGIN_NAMES)[number]
): string {
  return path.join(resolveCodexBundlePath(marketplacePath), pluginName);
}

/**
 * Resolves the packaged Claude instruction directory bundled in the extension marketplace.
 *
 * @param marketplacePath - Absolute path to the packaged marketplace directory.
 * @returns Absolute path to the bundled Claude instruction directory.
 */
export function resolveCodexClaudeInstructionsPath(marketplacePath: string): string {
  return path.join(marketplacePath, 'claude', 'runtime', 'claude');
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
 * @param expectedName - Expected plugin name from the bundle manifest.
 * @returns Parsed plugin manifest.
 */
export async function readCodexPluginManifest(
  pluginPath: string,
  expectedName: (typeof CODEX_PLUGIN_NAMES)[number]
): Promise<CodexPluginManifest> {
  const manifestPath = path.join(pluginPath, '.codex-plugin', 'plugin.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8')) as Partial<CodexPluginManifest>;

  if (manifest.name !== expectedName) {
    throw new Error(`Invalid Codex plugin manifest name at ${manifestPath}: expected "${expectedName}"`);
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
  pluginPaths: Record<(typeof CODEX_PLUGIN_NAMES)[number], string>;
}> {
  const bundlePath = resolveCodexBundlePath(marketplacePath);
  const pluginPaths = Object.fromEntries(
    CODEX_PLUGIN_NAMES.map((pluginName) => [pluginName, resolveCodexPluginPath(marketplacePath, pluginName)])
  ) as Record<(typeof CODEX_PLUGIN_NAMES)[number], string>;
  const marketplaceManifestPath = path.join(bundlePath, '.agents', 'plugins', 'marketplace.json');

  await fs.access(bundlePath);
  await fs.access(marketplaceManifestPath);
  await readCodexMarketplaceManifest(bundlePath);
  for (const pluginName of CODEX_PLUGIN_NAMES) {
    await fs.access(pluginPaths[pluginName]);
    await readCodexPluginManifest(pluginPaths[pluginName], pluginName);
  }

  return { bundlePath, pluginPaths };
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

function isJsonRpcSuccessMessage(value: unknown): value is JsonRpcSuccessMessage {
  return !!value && typeof value === 'object' && 'id' in value && 'result' in value;
}

function isJsonRpcErrorMessage(value: unknown): value is JsonRpcErrorMessage {
  return !!value && typeof value === 'object' && 'id' in value && 'error' in value;
}

function isJsonRpcNotificationMessage(value: unknown): value is JsonRpcNotificationMessage {
  return !!value && typeof value === 'object' && 'method' in value;
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
 * Merges the staged config with the plugin settings required by the bundled marketplace.
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

  const { result } = applyCodexConfig(config, {
    enablePlugins: ['cards@local', 'runtime@local'],
    featuresPlugins: true
  });

  // Keep fs.writeFile (not atomic rename) — the staged CODEX_HOME may sit on
  // tmpfs/overlay where rename fails.
  await fs.writeFile(configPath, `${stringifyToml(result)}\n`);
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

async function installBundledCodexPlugins(stagedCodexHome: string): Promise<void> {
  const marketplacePath = path.join(stagedCodexHome, '.agents', 'plugins', 'marketplace.json');
  const child = spawn('codex', ['app-server'], {
    cwd: stagedCodexHome,
    env: {
      ...process.env,
      CODEX_HOME: stagedCodexHome
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  if (!child.stdin || !child.stdout) {
    child.kill('SIGTERM');
    throw new Error('Codex app-server did not provide stdio pipes');
  }

  const stderrLines: string[] = [];
  child.stderr?.on('data', (chunk: Buffer | string) => {
    stderrLines.push(chunk.toString());
  });

  let closeCode: number | null = null;
  let closeSignal: NodeJS.Signals | null = null;
  let closeError: Error | null = null;
  child.once('error', (error) => {
    closeError = error;
  });
  child.once('close', (code, signal) => {
    closeCode = code;
    closeSignal = signal;
  });

  const reader = createInterface({ input: child.stdout });
  const pendingLines: string[] = [];
  const pendingResolvers: Array<(line: string) => void> = [];

  reader.on('line', (line) => {
    const nextResolver = pendingResolvers.shift();
    if (nextResolver) {
      nextResolver(line);
      return;
    }
    pendingLines.push(line);
  });

  function readLine(): Promise<string> {
    const nextLine = pendingLines.shift();
    if (nextLine !== undefined) {
      return Promise.resolve(nextLine);
    }
    return new Promise((resolve) => {
      pendingResolvers.push(resolve);
    });
  }

  async function sendJsonRpc(message: Record<string, unknown>): Promise<void> {
    child.stdin!.write(`${JSON.stringify(message)}\n`);
  }

  async function readResponse(requestId: number): Promise<void> {
    while (true) {
      if (closeError) {
        throw closeError;
      }
      if (closeCode !== null) {
        throw new Error(
          `Codex app-server exited before responding to request ${requestId} (code=${closeCode}, signal=${closeSignal ?? 'none'})`
        );
      }

      const line = await readLine();
      const message = JSON.parse(line) as unknown;
      if (isJsonRpcNotificationMessage(message)) {
        continue;
      }
      if (isJsonRpcSuccessMessage(message) && message.id === requestId) {
        return;
      }
      if (isJsonRpcErrorMessage(message) && message.id === requestId) {
        throw new Error(message.error.message ?? `Codex app-server request ${requestId} failed`);
      }
    }
  }

  try {
    await sendJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        clientInfo: {
          name: 'cards-codex-launcher',
          version: '1.0.0'
        },
        capabilities: {
          experimentalApi: true
        }
      }
    });
    await readResponse(1);

    await sendJsonRpc({
      jsonrpc: '2.0',
      method: 'initialized'
    });

    let requestId = 2;
    for (const pluginName of CODEX_PLUGIN_NAMES) {
      await sendJsonRpc({
        jsonrpc: '2.0',
        id: requestId,
        method: 'plugin/install',
        params: {
          marketplacePath,
          pluginName,
          forceRemoteSync: false
        }
      });
      await readResponse(requestId);
      requestId++;
    }
  } finally {
    reader.close();
    child.stdin.end();
    child.kill('SIGTERM');
  }

  if (closeError) {
    throw closeError;
  }
}

const STAGED_HOME_PREFIX = 'codex.tmp-';
let stagingCounter = 0;

async function cleanupStaleStagedHomes(stagingParent: string): Promise<void> {
  let entries: string[];
  try {
    entries = await fs.readdir(stagingParent);
  } catch {
    return;
  }

  const currentPid = String(process.pid);
  const removals = entries
    .filter(
      (entry) =>
        entry.startsWith(STAGED_HOME_PREFIX) && entry.slice(STAGED_HOME_PREFIX.length).split('-')[0] !== currentPid
    )
    .map((entry) => fs.rm(path.join(stagingParent, entry), { recursive: true, force: true }));
  await Promise.allSettled(removals);
}

/**
 * Prepares the staged Codex home under the Cards global config directory.
 *
 * @param marketplacePath - Absolute path to the packaged marketplace directory.
 * @returns Staging metadata for logging and spawning.
 */
export async function prepareStagedCodexHome(marketplacePath: string): Promise<{
  bundlePath: string;
  pluginPaths: Record<(typeof CODEX_PLUGIN_NAMES)[number], string>;
  sourceCodexHome: string;
  stagedCodexHome: string;
}> {
  const { bundlePath, pluginPaths } = await ensureCodexBundleAvailable(marketplacePath);
  const sourceCodexHome = resolveDefaultCodexHome();
  const stagingParent = path.dirname(resolveStagedCodexHome());
  const stagedCodexHome = path.join(stagingParent, `codex.tmp-${process.pid}-${Date.now()}-${stagingCounter++}`);

  await fs.mkdir(stagingParent, { recursive: true });
  await cleanupStaleStagedHomes(stagingParent);

  if (await resolveExistingDirectory(sourceCodexHome)) {
    await fs.cp(sourceCodexHome, stagedCodexHome, { recursive: true });
  } else {
    await fs.mkdir(stagedCodexHome, { recursive: true });
  }

  await copyDirectoryContents(bundlePath, stagedCodexHome);
  await mergeCodexRuntimeConfig(stagedCodexHome);
  await mergeCodexAgentsInstructions(stagedCodexHome, marketplacePath);
  await installBundledCodexPlugins(stagedCodexHome);

  return {
    bundlePath,
    pluginPaths,
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
  const { prompt: rawPrompt } = options;
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

  const { bundlePath, pluginPaths, sourceCodexHome, stagedCodexHome } = await prepareStagedCodexHome(marketplacePath);
  context.logger.info('Prepared staged Codex home', {
    bundlePath,
    pluginPaths,
    sourceCodexHome,
    stagedCodexHome
  });

  const additionalContext = buildAdditionalContext(input, cwd, baseBranch, branchName);
  const prompt = buildCodexPrompt(rawPrompt, additionalContext);
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
