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
import { resolveGlobalCardsConfigDir } from '@cards/sdk';
import { createCardsClient } from '@cards/sdk/client/discovery';
import type { ActionContext, ActionInput } from '@cards/sdk/config';
import { BRANCHES_FILE, COMMITS_FILE, Effort } from '@cards/sdk/protocol';
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
const CODEX_CONFIG_FILE_NAME = 'config.toml';
const CODEX_AGENTS_FILE_NAME = 'AGENTS.md';
const MAX_CARD_REPO_LOG_COMMITS = 5;
const MAX_WORKSPACE_COMMITS_PER_BRANCH = 5;
const CARD_REPO_LOG_PATHSPEC_EXCLUSIONS = [':!streams/', `:!${COMMITS_FILE}`, `:!${BRANCHES_FILE}`] as const;

interface CardMeta {
  id: string;
  title: string;
  status: string;
  gates: {
    planRequired: boolean;
    planApproved: boolean;
    mergeRequestRequired: boolean;
    mergeApproved: boolean;
  };
}

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

interface TrieNode {
  children: Map<string, TrieNode>;
  isFile: boolean;
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

function readCardMeta(rootPath: string): CardMeta | null {
  try {
    const raw = readFileSync(path.join(rootPath, 'CARD.meta.json'), 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const gates = parsed['gates'] as Record<string, boolean> | undefined;
    return {
      id: String(parsed['id'] ?? ''),
      title: String(parsed['title'] ?? ''),
      status: String(parsed['status'] ?? ''),
      gates: {
        planRequired: gates?.['planRequired'] === true,
        planApproved: gates?.['planApproved'] === true,
        mergeRequestRequired: gates?.['mergeRequestRequired'] === true,
        mergeApproved: gates?.['mergeApproved'] === true
      }
    };
  } catch {
    return null;
  }
}

/**
 * Builds the `<card>` XML block for Codex prompt context.
 *
 * @param actionInput - Parsed action input for the current session.
 * @param workspacePath - Active worktree path used as the Codex workspace root.
 * @param baseBranch - Base branch associated with the worktree.
 * @param workspaceBranch - Branch checked out in the worktree.
 * @returns The `<card ...>...</card>` block string.
 */
export function buildCardBlock(
  actionInput: ActionInput,
  workspacePath: string,
  baseBranch: string,
  workspaceBranch: string
): string {
  const meta = readCardMeta(actionInput.cardRepoPath);
  const id = meta?.id || actionInput.cardId;
  const title = meta?.title || '';
  const status = meta?.status || '';
  const gatesLine = meta
    ? `gates: planRequired=${meta.gates.planRequired} planApproved=${meta.gates.planApproved} mergeRequestRequired=${meta.gates.mergeRequestRequired} mergeApproved=${meta.gates.mergeApproved}`
    : '';

  const envLines = [
    `  CARD_REPO_PATH=${actionInput.cardRepoPath}`,
    `  WORKSPACE_PATH=${workspacePath}`,
    `  BASE_BRANCH=${baseBranch}`,
    `  WORKSPACE_BRANCH=${workspaceBranch}`
  ];

  const bodyLines: string[] = [];
  if (title) bodyLines.push(`title: ${title}`);
  bodyLines.push('');
  if (gatesLine) bodyLines.push(gatesLine);
  bodyLines.push('env:');
  bodyLines.push(...envLines);

  const attrs = [`id="${id}"`, `status="${status}"`, `mode="${actionInput.executionMode}"`];
  return `<card ${attrs.join(' ')}>\n${bodyLines.join('\n')}\n</card>`;
}

function formatTimestamp(mtimeMs: number): string {
  const iso = new Date(mtimeMs).toISOString();
  return `${iso.slice(0, 16)}Z`;
}

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
 * Builds the `<card-repo>` block for Codex prompt context.
 *
 * @param rootPath - Root directory of the card repository.
 * @returns The `<card-repo>...</card-repo>` block string.
 * @throws {CardRepoAccessError} When the card repository cannot be read.
 */
export function buildCardRepoBlock(rootPath: string): string {
  let entries: { name: string; isDir: boolean }[];
  try {
    entries = readdirSync(rootPath, { withFileTypes: true }).map((entry) => ({
      name: entry.name.toString(),
      isDir: entry.isDirectory()
    }));
  } catch (error) {
    throw new CardRepoAccessError(rootPath, error);
  }

  const lines: string[] = [];
  for (const entry of entries) {
    if (entry.name === '.git') continue;
    const fullPath = path.join(rootPath, entry.name);

    if (entry.isDir) {
      if (entry.name === 'streams') {
        lines.push('streams/');
        try {
          const streamEntries = readdirSync(fullPath, { withFileTypes: true });
          for (const streamEntry of streamEntries) {
            if (streamEntry.isDirectory()) {
              const streamPath = path.join(fullPath, streamEntry.name);
              const [count, latest] = dirStats(streamPath);
              const latestSuffix = latest > 0 ? `   latest ${formatTimestamp(latest)}` : '';
              lines.push(`${`  ${streamEntry.name}/`.padEnd(24)}${count} files${latestSuffix}`);
            }
          }
        } catch (_readdirError: unknown) {
          void _readdirError;
        }
      } else {
        const [count, latest] = dirStats(fullPath);
        const latestSuffix = latest > 0 ? `   latest ${formatTimestamp(latest)}` : '';
        lines.push(`${`${entry.name}/`.padEnd(24)}${count} files${latestSuffix}`);
      }
    } else {
      try {
        const mtimeMs = statSync(fullPath).mtimeMs;
        lines.push(`${entry.name}`.padEnd(24) + formatTimestamp(mtimeMs));
      } catch {
        lines.push(entry.name);
      }
    }
  }

  return `<card-repo>\n${lines.join('\n')}\n</card-repo>`;
}

function createNode(): TrieNode {
  return { children: new Map(), isFile: false };
}

function insertPath(root: TrieNode, filePath: string): void {
  let node = root;
  for (const segment of filePath.split('/')) {
    let child = node.children.get(segment);
    if (!child) {
      child = createNode();
      node.children.set(segment, child);
    }
    node = child;
  }
  node.isFile = true;
}

function renderNode(node: TrieNode, indent: number): string {
  const lines: string[] = [];
  const prefix = ' '.repeat(indent);
  const dirs: [string, TrieNode][] = [];
  const files: [string, TrieNode][] = [];

  for (const [name, child] of node.children) {
    if (child.isFile && child.children.size === 0) {
      files.push([name, child]);
    } else if (child.isFile && child.children.size > 0) {
      files.push([name, createNode()]);
      dirs.push([name, child]);
    } else {
      dirs.push([name, child]);
    }
  }

  dirs.sort(([left], [right]) => left.localeCompare(right));
  files.sort(([left], [right]) => left.localeCompare(right));

  for (const [name, child] of dirs) {
    let collapsed = name;
    let current = child;
    while (current.children.size === 1 && !current.isFile) {
      const [nextName, nextChild] = current.children.entries().next().value as [string, TrieNode];
      collapsed += `/${nextName}`;
      current = nextChild;
    }

    if (current.isFile && current.children.size === 0) {
      lines.push(`${prefix}${collapsed}`);
    } else {
      lines.push(`${prefix}${collapsed}/`);
      lines.push(renderNode(current, indent + 2));
    }
  }

  for (const [name] of files) {
    lines.push(`${prefix}${name}`);
  }

  return lines.filter(Boolean).join('\n');
}

function formatFileTree(paths: string[]): string {
  if (paths.length === 0) return '';
  const root = createNode();
  for (const filePath of paths) {
    if (filePath) insertPath(root, filePath);
  }
  return renderNode(root, 1);
}

function formatSingleCommit(block: string): string {
  const lines = block.split('\n').filter((line) => line.trim());
  if (lines.length === 0) return '';
  const header = lines[0]!;
  const files = lines.slice(1);
  const tree = formatFileTree(files);
  return tree ? `${header}\n${tree}` : header;
}

function isCommitHeader(line: string): boolean {
  return /^[0-9a-f]{7,} - /.test(line);
}

function formatBlankLineDelimited(raw: string): string {
  const lines = raw.split('\n');
  const commitBlocks: string[][] = [];
  let current: string[] = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!;
    if (line === '' && current.length > 0) {
      const next = lines[index + 1];
      if (next && isCommitHeader(next)) {
        commitBlocks.push(current);
        current = [];
        continue;
      }
    }
    current.push(line);
  }

  if (current.length > 0) commitBlocks.push(current);
  return commitBlocks.map((block) => formatSingleCommit(block.join('\n').trim())).join('\n\n');
}

function formatCommitLog(rawLog: string, separator: 'nul' | 'blank-line'): string {
  if (!rawLog.trim()) return '';
  if (separator === 'nul') {
    return rawLog
      .split('\0')
      .filter((block) => block.trim())
      .map((block) => formatSingleCommit(block.trim()))
      .join('\n\n');
  }

  return formatBlankLineDelimited(rawLog);
}

/**
 * Builds the `<card-repo-log>` block for Codex prompt context.
 *
 * @param rootPath - Root directory of the card repository.
 * @returns The `<card-repo-log ...>...</card-repo-log>` block string, or `null`.
 */
export function buildCardRepoLogBlock(rootPath: string): string | null {
  try {
    const log = execFileSync(
      'git',
      [
        'log',
        `-${MAX_CARD_REPO_LOG_COMMITS}`,
        '--pretty=format:%x00%h - %an: %s',
        '--name-only',
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
    ).trim();

    if (!log) return null;
    const formatted = formatCommitLog(log, 'nul');
    if (!formatted) return null;

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
    return `<card-repo-log${countAttribute}>\n${formatted}\n</card-repo-log>`;
  } catch {
    return null;
  }
}

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

function annotateMergedCommits(output: string, mergedShas: Set<string>): string {
  return output.replace(/^([0-9a-f]{40}) ([0-9a-f]{7,} - .*)$/gm, (_, fullSha: string, rest: string) => {
    return mergedShas.has(fullSha) ? `${rest} [merged]` : rest;
  });
}

function resolveWorkspaceCommitDetails(workspacePath: string, shas: string[], mergedShas?: Set<string>): string | null {
  if (shas.length === 0) return null;
  try {
    const useFullHash = mergedShas !== undefined && mergedShas.size > 0;
    const format = useFullHash ? '%H %h - %s' : '%h - %s';
    const output = execFileSync('git', ['log', '--no-walk', `--pretty=format:${format}`, '--name-only', ...shas], {
      cwd: workspacePath,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    if (!output) return null;
    const annotated = useFullHash ? annotateMergedCommits(output, mergedShas) : output;
    return formatCommitLog(annotated, 'blank-line') || null;
  } catch {
    return null;
  }
}

/**
 * Builds the additional card context prepended to Codex prompts.
 *
 * Mirrors the Claude hook format closely enough for Codex sessions to receive
 * the same card/workspace metadata at prompt time.
 *
 * @param input - Parsed action input for the current session.
 * @param workspacePath - Active worktree path used as the Codex workspace root.
 * @param baseBranch - Base branch associated with the worktree.
 * @param workspaceBranch - Branch checked out in the worktree.
 * @returns XML-like context block string.
 */
export function buildAdditionalContext(
  input: ActionInput,
  workspacePath: string,
  baseBranch: string,
  workspaceBranch: string
): string {
  const cardBlock = buildCardBlock(input, workspacePath, baseBranch, workspaceBranch);
  const repoBlock = buildCardRepoBlock(input.cardRepoPath);
  const logBlock = buildCardRepoLogBlock(input.cardRepoPath);
  const workspaceLogBlocks = buildWorkspaceRepoLogBlocks(input.repoRoot, input.cardRepoPath, baseBranch);

  const parts = [cardBlock, repoBlock];
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

/**
 * Builds `<workspace-repo-log>` blocks for Codex prompt context.
 *
 * @param workspacePath - Root directory of the workspace repository.
 * @param cardRepoPath - Root directory of the card repository.
 * @param baseBranch - Base branch associated with the workspace.
 * @returns Array of `<workspace-repo-log>` block strings, or empty array.
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

  const printedShas = new Set<string>();
  const blocks: string[] = [];

  for (const group of groups) {
    const newShas = group.shas.filter((sha) => !printedShas.has(sha));
    const duplicateShas = group.shas.filter((sha) => printedShas.has(sha));
    const displayShas = newShas.slice(-MAX_WORKSPACE_COMMITS_PER_BRANCH);
    const mergedShas = new Set(displayShas.filter((sha) => baseReachable.has(sha)));
    const details = resolveWorkspaceCommitDetails(workspacePath, displayShas, mergedShas);

    if (details) {
      for (const sha of displayShas) printedShas.add(sha);
    }

    const bodyParts: string[] = [];
    if (details) bodyParts.push(details);
    if (duplicateShas.length > 0) {
      bodyParts.push(duplicateShas.map((sha) => sha.slice(0, 7)).join('\n'));
    }
    if (bodyParts.length === 0) continue;

    const attrs: string[] = [];
    if (group.orphaned) {
      attrs.push('orphaned="true"');
    } else {
      attrs.push(`branch="${group.branchName}"`);
      if (group.parentBranch) attrs.push(`parentBranch="${group.parentBranch}"`);
    }
    attrs.push(`count="${group.shas.length}"`);

    blocks.push(`<workspace-repo-log ${attrs.join(' ')}>\n${bodyParts.join('\n')}\n</workspace-repo-log>`);
  }

  return blocks;
}

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
  const marketplaceManifestPath = path.join(bundlePath, '.agents', 'plugins', 'marketplace.json');

  await fs.access(bundlePath);
  await fs.access(pluginPath);
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
  pluginPath: string;
  sourceCodexHome: string;
  stagedCodexHome: string;
}> {
  const { bundlePath, pluginPath } = await ensureCodexBundleAvailable(marketplacePath);
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

  const { bundlePath, pluginPath, sourceCodexHome, stagedCodexHome } = await prepareStagedCodexHome(marketplacePath);
  context.logger.info('Prepared staged Codex home', {
    bundlePath,
    pluginPath,
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
      WORKSPACE_BRANCH: branchName,
      EFFORT: input.effort ?? Effort.medium
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
