/**
 * Shared context-building utilities for SessionStart and SubagentStart hooks.
 *
 * Both hooks need identical card context injection. This module extracts the
 * shared logic so it can be reused without duplication.
 *
 * @summary Shared context-building utilities for session and subagent hooks
 * @module lib/context
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CARD_REPO_LOG_PATHSPEC_EXCLUSIONS } from '@cards/sdk/client';
import type { ActionInput } from '@cards/sdk/config';
import { CARDS_ENV_VARS } from '@cards/sdk/config';
import { BRANCHES_FILE, COMMITS_FILE } from '@cards/sdk/protocol';
import yaml from 'js-yaml';

/**
 * Error thrown when the card repository cannot be read.
 *
 * Wraps the underlying filesystem error with the repository path for
 * structured error handling in session and subagent hooks.
 */
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

  /**
   * Builds a user-facing system message explaining the card repo access failure.
   *
   * @param actor - Human-readable noun for the failing entity (e.g. "session", "subagent").
   * @returns Object with `systemMessage` and `stopReason` strings.
   */
  toHookFailure(actor: string): { systemMessage: string; stopReason: string } {
    return {
      systemMessage: [
        `The card repository at '${this.repoPath}' is not accessible.`,
        '',
        `Error: ${this.message}`,
        '',
        `This ${actor} cannot proceed without a valid card repository. To resolve:`,
        `1. Verify the card repository directory exists at: ${this.repoPath}`,
        '2. Ensure the current process has read permissions for the directory and its contents',
        '3. Check that the CARD_REPO_PATH environment variable points to a valid card repository'
      ].join('\n'),
      stopReason: `Card repository inaccessible at ${this.repoPath}: ${this.message}`
    };
  }
}

// ============================================================================
// Env block
// ============================================================================

/**
 * Builds the fenced bash env block with card environment variables.
 *
 * @param actionInput - Parsed action input from the environment.
 * @returns Fenced bash block string with env vars.
 */
export function buildEnvBlock(actionInput: ActionInput): string {
  const workspacePath = process.env[CARDS_ENV_VARS.WORKSPACE_PATH] ?? '';
  const baseBranch = process.env[CARDS_ENV_VARS.BASE_BRANCH] ?? '';
  const workspaceBranch = process.env[CARDS_ENV_VARS.WORKSPACE_BRANCH] ?? '';

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
 * to YAML. Lets readFileSync/JSON.parse errors propagate (fail closed).
 *
 * @param actionInput - Parsed action input from the environment.
 * @returns The `<card type="yaml">...</card>` block string.
 * @throws {CardRepoAccessError} When CARD.meta.json cannot be read.
 */
export function buildCardBlock(actionInput: ActionInput): string {
  let data: Record<string, unknown>;
  try {
    const raw = readFileSync(join(actionInput.cardRepoPath, 'CARD.meta.json'), 'utf-8');
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
 * Counts files (non-directories) in a directory.
 *
 * @param dirPath - Directory to scan.
 * @returns Number of files, or `0` on error.
 */
function dirFileCount(dirPath: string): number {
  try {
    return readdirSync(dirPath, { withFileTypes: true }).filter((e) => e.isFile()).length;
  } catch {
    return 0;
  }
}

/**
 * Reads the `summary` field from a `.md.meta.json` sidecar file.
 *
 * @param sidecarPath - Absolute path to the sidecar JSON file.
 * @returns The summary string, or `null` when the file is missing, malformed, or has no summary.
 */
function readSidecarSummary(sidecarPath: string): string | null {
  try {
    const raw = readFileSync(sidecarPath, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const summary = parsed['summary'];
    return typeof summary === 'string' && summary.length > 0 ? summary : null;
  } catch {
    return null;
  }
}

/**
 * Represents a single entry in the card-repo YAML listing.
 */
interface CardRepoEntry {
  name: string;
  summary?: string;
  entries?: CardRepoEntry[];
  remaining?: number;
  count?: number;
}

/**
 * Builds the `<card-repo>` block with a YAML body listing directory contents.
 *
 * @param rootPath - Root directory of the card repository.
 * @returns The `<card-repo type="yaml">...</card-repo>` block string.
 * @throws {CardRepoAccessError} When the root directory cannot be read.
 */
export function buildCardRepoBlock(rootPath: string): string {
  let dirEntries: { name: string; isDir: boolean }[];
  try {
    dirEntries = readdirSync(rootPath, { withFileTypes: true }).map((d) => ({
      name: d.name.toString(),
      isDir: d.isDirectory()
    }));
  } catch (error) {
    throw new CardRepoAccessError(rootPath, error);
  }

  const items: CardRepoEntry[] = [];

  for (const entry of dirEntries) {
    if (entry.name === '.git') continue;
    const fullPath = join(rootPath, entry.name);

    if (entry.isDir) {
      if (entry.name === 'streams') {
        const streamEntries: CardRepoEntry[] = [];
        try {
          const subs = readdirSync(fullPath, { withFileTypes: true });
          for (const sub of subs) {
            if (sub.isDirectory()) {
              const subName = sub.name.toString();
              const count = dirFileCount(join(fullPath, subName));
              streamEntries.push({ name: `${subName}/`, count });
            }
          }
        } catch (_readdirError: unknown) {
          void _readdirError;
        }
        items.push({ name: 'streams/', entries: streamEntries });
      } else if (entry.name === 'comment') {
        const commentEntries: CardRepoEntry[] = [];
        try {
          const subs = readdirSync(fullPath, { withFileTypes: true });
          const fileEntries: { name: string; birthtime: number }[] = [];
          for (const f of subs) {
            if (f.isFile()) {
              try {
                const stat = statSync(join(fullPath, f.name));
                const birthtime = stat.birthtimeMs > 0 ? stat.birthtimeMs : stat.mtimeMs;
                fileEntries.push({ name: f.name, birthtime });
              } catch {
                fileEntries.push({ name: f.name, birthtime: 0 });
              }
            }
          }
          fileEntries.sort((a, b) => a.birthtime - b.birthtime);
          for (const f of fileEntries) {
            commentEntries.push({ name: f.name });
          }
        } catch (_readdirError: unknown) {
          void _readdirError;
        }
        items.push({ name: 'comment/', entries: commentEntries });
      } else {
        // Other directory: expand .md files that have sidecar summaries
        try {
          const children = readdirSync(fullPath, { withFileTypes: true });
          const fileNames = children.filter((e) => e.isFile()).map((e) => e.name.toString());
          const subDirCount = children.filter((e) => e.isDirectory()).length;

          const summarized: { name: string; summary: string; sidecarName: string }[] = [];
          for (const name of fileNames) {
            if (name.endsWith('.md') && !name.endsWith('.meta.json')) {
              const sidecarName = `${name}.meta.json`;
              const summary = readSidecarSummary(join(fullPath, sidecarName));
              if (summary) {
                summarized.push({ name, summary, sidecarName });
              }
            }
          }

          if (summarized.length === 0) {
            const count = fileNames.length + subDirCount;
            items.push({ name: `${entry.name}/`, count });
          } else {
            const dirItem: CardRepoEntry = { name: `${entry.name}/`, entries: [] };
            const listedNames = new Set<string>();
            for (const { name, summary, sidecarName } of summarized) {
              dirItem.entries!.push({ name, summary });
              dirItem.entries!.push({ name: sidecarName });
              listedNames.add(name);
              listedNames.add(sidecarName);
            }
            const remaining = fileNames.filter((n) => !listedNames.has(n)).length + subDirCount;
            if (remaining > 0) {
              dirItem.remaining = remaining;
            }
            items.push(dirItem);
          }
        } catch (_readdirError: unknown) {
          items.push({ name: `${entry.name}/` });
        }
      }
    } else {
      // Root-level file
      if (entry.name.endsWith('.md') && !entry.name.endsWith('.meta.json')) {
        const summary = readSidecarSummary(join(rootPath, `${entry.name}.meta.json`));
        if (summary) {
          items.push({ name: entry.name, summary });
        } else {
          items.push({ name: entry.name });
        }
      } else {
        items.push({ name: entry.name });
      }
    }
  }

  const yamlBody = yaml.dump(items, { flowLevel: -1, lineWidth: -1 }).trimEnd();
  return `<card-repo type="yaml">\n${yamlBody}\n</card-repo>`;
}

// ============================================================================
// Card repo git log
// ============================================================================

/** Maximum number of qualifying commits shown in the card repo log. */
const MAX_CARD_REPO_LOG_COMMITS = 10;

/**
 * Builds the `<card-repo-log>` block with recent commits in YAML format.
 *
 * Each commit is a `{ sha, author, subject }` object. Uses NUL-delimited
 * fields for reliable parsing.
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
        `--max-count=${MAX_CARD_REPO_LOG_COMMITS}`,
        '--reverse',
        '--pretty=format:%h%x00%an%x00%s',
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

    const commits = log.split('\n').map((line) => {
      const [sha, author, subject] = line.split('\0');
      return { sha: sha!, author: author!, subject: subject! };
    });

    let totalCount: number | null = null;
    try {
      const countStr = execFileSync('git', ['rev-list', '--count', 'HEAD'], {
        cwd: rootPath,
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
      totalCount = parseInt(countStr, 10);
      if (Number.isNaN(totalCount)) totalCount = null;
    } catch (_countError: unknown) {
      void _countError; // count is optional
    }

    const countAttr = totalCount !== null ? ` count="${totalCount}"` : '';
    const yamlBody = yaml.dump(commits, { flowLevel: -1, lineWidth: -1 }).trimEnd();
    return `<card-repo-log type="yaml"${countAttr} order="oldest-first">\n${yamlBody}\n</card-repo-log>`;
  } catch {
    return null;
  }
}

// ============================================================================
// Workspace repo log
// ============================================================================

/** Maximum number of commits shown per branch block. */
const MAX_WORKSPACE_COMMITS_PER_BRANCH = 5;

/**
 * Workspace tracking data read from separate workspace files.
 */
interface WorkspaceData {
  branches: Record<string, { parentBranch?: string; addedAt: string }>;
  commits: string[];
}

/**
 * Reads workspace data from separate files in the card repository.
 *
 * @param cardRepoPath - Root directory of the card repository.
 * @returns Parsed workspace data, or `null` when unavailable.
 */
function readWorkspaceData(cardRepoPath: string): WorkspaceData | null {
  const branches: WorkspaceData['branches'] = {};
  let commits: string[] = [];

  try {
    const raw = readFileSync(join(cardRepoPath, BRANCHES_FILE), 'utf-8');
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
    const raw = readFileSync(join(cardRepoPath, COMMITS_FILE), 'utf-8');
    commits = raw
      .split('\n')
      .map((l) => l.trim())
      .filter((s): s is string => s.length > 0);
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

/**
 * Returns the set of commit SHAs reachable from a git ref.
 *
 * @param workspacePath - Root directory of the workspace repository.
 * @param ref - Git ref name (branch, tag, or SHA).
 * @returns Set of full 40-char SHAs, or empty set on failure.
 */
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

/**
 * Filters SHAs to those that exist as objects in the workspace repo.
 *
 * @param workspacePath - Root directory of the workspace repository.
 * @param shas - Full 40-char SHAs to check.
 * @returns SHAs that exist in the repository.
 */
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
    for (let i = 0; i < lines.length && i < shas.length; i++) {
      if (!lines[i]!.includes('missing')) {
        resolvable.push(shas[i]!);
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
 * Commit group for a single branch or the orphaned bucket.
 */
interface CommitGroup {
  branchName: string;
  shas: string[];
  orphaned?: boolean;
}

/**
 * Builds `<workspace-repo-log>` blocks showing workspace commits grouped by branch.
 *
 * Each commit is a `{ sha, subject }` object. Merged commits gain `merged: true`.
 * No cross-branch dedup.
 *
 * @param workspacePath - Root directory of the workspace repository.
 * @param cardRepoPath - Root directory of the card repository.
 * @returns Array of `<workspace-repo-log type="yaml" ...>` block strings, or empty array.
 */
export function buildWorkspaceRepoLogBlocks(workspacePath: string, cardRepoPath: string): string[] {
  const workspace = readWorkspaceData(cardRepoPath);
  if (!workspace) return [];

  const baseBranch = process.env[CARDS_ENV_VARS.BASE_BRANCH] ?? 'main';

  // Sort branches by addedAt (oldest first)
  const sortedBranches = Object.entries(workspace.branches).sort(([, a], [, b]) => a.addedAt.localeCompare(b.addedAt));

  const reachableFromTracked = new Set<string>();
  const groups: CommitGroup[] = [];

  for (const [name] of sortedBranches) {
    const reachable = getReachableShas(workspacePath, name);
    const branchShas = workspace.commits.filter((sha) => reachable.has(sha));
    for (const sha of branchShas) reachableFromTracked.add(sha);
    if (branchShas.length > 0) {
      groups.push({ branchName: name, shas: branchShas });
    }
  }

  // Base branch: commits reachable from base but NOT from any tracked branch
  const baseReachable = getReachableShas(workspacePath, baseBranch);
  const baseShas = workspace.commits.filter((sha) => baseReachable.has(sha) && !reachableFromTracked.has(sha));
  if (baseShas.length > 0) {
    groups.push({ branchName: baseBranch, shas: baseShas });
  }

  // Orphaned: not reachable from any tracked branch or base, filter to resolvable
  const orphanedShas = workspace.commits.filter((sha) => !reachableFromTracked.has(sha) && !baseReachable.has(sha));
  const resolvable = filterResolvableShas(workspacePath, orphanedShas);
  if (resolvable.length > 0) {
    groups.push({ branchName: '', shas: resolvable, orphaned: true });
  }

  const blocks: string[] = [];

  for (const group of groups) {
    // Show most recent N with full detail
    const displayShas = group.shas.slice(-MAX_WORKSPACE_COMMITS_PER_BRANCH);
    const mergedShas = new Set(displayShas.filter((sha) => baseReachable.has(sha)));
    const commits = resolveWorkspaceCommitDetails(workspacePath, displayShas, mergedShas);

    if (!commits) continue;

    const yamlBody = yaml.dump(commits, { flowLevel: -1, lineWidth: -1 }).trimEnd();

    // Build XML tag
    const attrs: string[] = ['type="yaml"'];
    if (group.orphaned) {
      attrs.push('orphaned="true"');
    } else {
      attrs.push(`branch="${group.branchName}"`);
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
 * Builds the combined additional context string for session and subagent hooks.
 *
 * Produces: env block, `<card>`, `<card-repo>`, optionally `<card-repo-log>`,
 * and optionally `<workspace-repo-log>` blocks.
 * Let {@link CardRepoAccessError} propagate to the caller for structured
 * error handling.
 *
 * @param actionInput - Parsed action input from the environment.
 * @returns Combined context string with env block and XML blocks.
 * @throws {CardRepoAccessError} When the card repository cannot be read.
 */
export function buildAdditionalContext(actionInput: ActionInput): string {
  const envBlock = buildEnvBlock(actionInput);
  const cardBlock = buildCardBlock(actionInput);
  const repoBlock = buildCardRepoBlock(actionInput.cardRepoPath);
  const logBlock = buildCardRepoLogBlock(actionInput.cardRepoPath);
  const workspaceLogBlocks = buildWorkspaceRepoLogBlocks(actionInput.repoRoot, actionInput.cardRepoPath);

  const parts = [envBlock, cardBlock, repoBlock];
  if (logBlock) parts.push(logBlock);
  parts.push(...workspaceLogBlocks);
  return parts.join('\n\n');
}
