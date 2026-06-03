/**
 * Shared session utilities for Codex action workflows.
 *
 * Reuses the existing worktree lifecycle used by Claude-based actions, while
 * populating the Codex plugin cache before launching the `codex` CLI.
 *
 * @summary Shared session utilities for Codex action workflows
 * @module
 */

import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import { homedir } from 'node:os';
import * as path from 'node:path';
import { CARD_REPO_LOG_PATHSPEC_EXCLUSIONS } from '@cards/sdk/client';
import { createCardsClient } from '@cards/sdk/client/discovery';
import type { ActionContext, ActionInput } from '@cards/sdk/config';
import { BRANCHES_FILE, COMMITS_FILE } from '@cards/sdk/protocol';
import yaml from 'js-yaml';
import { stringify as stringifyToml } from 'smol-toml';
import { spawnBranchCleanupWatcher } from './branch-cleanup-watcher.js';
import { errorMessage, resolveBaseBranch, resolveMarketplacePath, resolveOrCreateWorktree } from './claude-session.js';

/**
 * Options for {@link spawnCodexSession}.
 */
export interface CodexSessionOptions {
  /** Prompt string passed to the Codex CLI. */
  prompt?: string;
  /**
   * Content injected into the Codex CLI as a `developer_instructions` config
   * override (`-c developer_instructions=...`). This is the Codex analog of
   * Claude's `--append-system-prompt`: the value is appended to the developer
   * message bundle every turn without disabling the personality template or
   * overriding `base_instructions` / AGENTS.md `user_instructions`.
   */
  appendSystemPrompt?: string;
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

const CODEX_PLUGIN_NAMES = ['cards', 'runtime'] as const;
const CODEX_PLUGIN_MARKETPLACE = 'local';
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
 * Resolves the source Codex home that should be staged into the Cards-managed home.
 *
 * @returns Absolute path to the source Codex home.
 */
export function resolveDefaultCodexHome(): string {
  return process.env['CODEX_HOME'] ?? path.join(homedir(), '.codex');
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

// Matches codex PLUGINS_CACHE_DIR (store.rs:17,40)
const CODEX_PLUGINS_CACHE_DIR = 'plugins/cache';
// Matches codex DEFAULT_PLUGIN_VERSION (store.rs:16)
const CODEX_PLUGIN_VERSION = 'local';

let cacheInstallCounter = 0;

/**
 * Copies each bundled plugin into the codex plugin cache under the resolved
 * home, making them loadable via `-c plugins."<name>@local".enabled=true`
 * without touching the user's config.toml.
 *
 * Cache path: `<codexHome>/plugins/cache/local/<pluginName>/local/`
 * (marketplace=`local`, version segment=`local` per codex DEFAULT_PLUGIN_VERSION)
 *
 * Errors from mkdir or cp propagate — fail closed.
 *
 * @param codexHome - Resolved codex home (`$CODEX_HOME ?? ~/.codex`).
 * @param marketplacePath - Absolute path to the packaged marketplace directory.
 * @returns Bundle path, source plugin paths, and the on-disk cache load paths.
 */
export async function populateCodexPluginCache(
  codexHome: string,
  marketplacePath: string
): Promise<{
  bundlePath: string;
  pluginPaths: Record<(typeof CODEX_PLUGIN_NAMES)[number], string>;
  pluginCachePaths: Record<(typeof CODEX_PLUGIN_NAMES)[number], string>;
}> {
  const { bundlePath, pluginPaths } = await ensureCodexBundleAvailable(marketplacePath);
  const pluginCachePaths = {} as Record<(typeof CODEX_PLUGIN_NAMES)[number], string>;

  // marketplaceDir = plugins/cache/local/ — ONE LEVEL ABOVE plugin_base_root.
  // Staging dirs are placed here so the version scanner (active_plugin_version,
  // store.rs:70-91) — which reads only <plugin_base_root>/ — never enumerates them.
  const marketplaceDir = path.join(codexHome, CODEX_PLUGINS_CACHE_DIR, CODEX_PLUGIN_MARKETPLACE);
  await fs.mkdir(marketplaceDir, { recursive: true });

  for (const pluginName of CODEX_PLUGIN_NAMES) {
    const destDir = path.join(marketplaceDir, pluginName, CODEX_PLUGIN_VERSION);
    await installPluginToCache(pluginName, marketplaceDir, pluginPaths[pluginName], destDir);

    // Verify manifest is present at the exact load path — fail closed.
    // An off-by-one in destDir (missing version segment, wrong marketplace)
    // produces a concrete error here rather than a silent "plugin not installed"
    // at session startup (Q22 primary detection).
    await readCodexPluginManifest(destDir, pluginName);
    pluginCachePaths[pluginName] = destDir;
  }

  return { bundlePath, pluginPaths, pluginCachePaths };
}

async function installPluginToCache(
  pluginName: string,
  marketplaceDir: string,
  sourceDir: string,
  destDir: string
): Promise<void> {
  const n = cacheInstallCounter++;
  // Stage under marketplaceDir (= plugins/cache/local/), NOT inside
  // plugin_base_root (= plugins/cache/local/<plugin>/).
  // codex's version scanner reads only plugin_base_root/; dirs under
  // marketplaceDir are never enumerated as version candidates.
  const incomingDir = path.join(marketplaceDir, `.incoming-${process.pid}-${n}-${pluginName}`);
  const outgoingDir = path.join(marketplaceDir, `.outgoing-${process.pid}-${n}-${pluginName}`);

  // 1. Write into temp under marketplaceDir — invisible to version scanner.
  await fs.mkdir(incomingDir, { recursive: true });
  await fs.cp(sourceDir, incomingDir, { recursive: true, force: true });

  // 1b. Ensure the plugin-base dir (parent of destDir) exists — fs.rename does
  //     not create missing parents, so the move into destDir would ENOENT on a
  //     fresh cache. Creating it empty is harmless: the version scanner finds no
  //     version candidates until the rename lands the `local` child.
  await fs.mkdir(path.dirname(destDir), { recursive: true });

  // 2. Step aside the live version dir (if present) — single atomic rename.
  //    Moves plugins/cache/local/<plugin>/local → marketplaceDir/.outgoing-…
  try {
    await fs.rename(destDir, outgoingDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    // destDir did not exist yet — nothing to step aside; continue.
  }

  // 3. Rename incoming into place — single atomic rename; destDir vacant.
  //    Moves marketplaceDir/.incoming-… → plugins/cache/local/<plugin>/local
  await fs.rename(incomingDir, destDir);

  // 4. Best-effort cleanup of the stepped-aside dir (non-fatal).
  await fs.rm(outgoingDir, { recursive: true, force: true }).catch(() => undefined);
}

/**
 * Formats a `developer_instructions` value as a Codex `-c key=value` override.
 *
 * Codex parses the right-hand side of a `-c` override as TOML
 * ({@link https://github.com/openai/codex/blob/main/codex-rs/utils/cli/src/config_override.rs}).
 * Using `smol-toml`'s stringifier guarantees that multi-line content,
 * embedded quotes, and other special characters are safely encoded as a TOML
 * basic string.
 *
 * @param value - The developer-instructions content to inject.
 * @returns A `developer_instructions = "..."` assignment suitable for `-c`.
 */
export function formatDeveloperInstructionsOverride(value: string): string {
  return stringifyToml({ developer_instructions: value }).trimEnd();
}

/**
 * Builds the CLI argument list for the `codex` process.
 *
 * @param prompt - Prompt passed to Codex.
 * @param workspacePath - Card worktree path used as the Codex workspace root.
 * @param cardRepoPath - Additional writable directory for the card repo.
 * @param appendSystemPrompt - Content injected as `developer_instructions`
 *   via `-c`. This is the Codex analog of Claude's `--append-system-prompt`.
 * @returns Array of CLI arguments.
 */
export function buildCodexArgs(
  prompt: string | undefined,
  workspacePath: string,
  cardRepoPath: string,
  appendSystemPrompt?: string
): string[] {
  const args = ['--dangerously-bypass-approvals-and-sandbox', '--cd', workspacePath, '--add-dir', cardRepoPath];

  // Enable bundled plugins at runtime — never persisted to config.toml.
  // Keys contain no '.' so codex's dotted-path -c parser maps them correctly.
  args.push('-c', 'features.plugins=true');
  args.push('-c', 'plugins.cards@local.enabled=true');
  args.push('-c', 'plugins.runtime@local.enabled=true');

  if (appendSystemPrompt !== undefined && appendSystemPrompt.length > 0) {
    args.push('-c', formatDeveloperInstructionsOverride(appendSystemPrompt));
  }

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
  const { prompt: rawPrompt, appendSystemPrompt } = options;
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

  const codexHome = resolveDefaultCodexHome();
  const { bundlePath, pluginPaths, pluginCachePaths } = await populateCodexPluginCache(codexHome, marketplacePath);
  context.logger.info('Populated Codex plugin cache', { codexHome, bundlePath, pluginPaths, pluginCachePaths });

  const additionalContext = buildAdditionalContext(input, cwd, baseBranch, branchName);
  const prompt = buildCodexPrompt(rawPrompt, additionalContext);
  const args = buildCodexArgs(prompt, cwd, input.cardRepoPath, appendSystemPrompt);

  const child: ChildProcess = spawn('codex', args, {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      CODEX_HOME: codexHome,
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
