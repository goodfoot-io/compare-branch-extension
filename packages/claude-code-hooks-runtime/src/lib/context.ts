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
import { readFileSync } from 'node:fs';
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

const CARD_BLOCK_KEYS = ['title', 'tags', 'gates'] as const;

/**
 * Builds the `<card>` XML block with a filtered YAML body from CARD.meta.json.
 *
 * Only includes `title`, `tags`, and `gates` fields. Lets readFileSync/JSON.parse
 * errors propagate (fail closed).
 *
 * @param actionInput - Parsed action input from the environment.
 * @returns The `<card>...</card>` block string.
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
  const filtered: Record<string, unknown> = {};
  for (const key of CARD_BLOCK_KEYS) {
    if (key in data) filtered[key] = data[key];
  }
  const yamlBody = yaml.dump(filtered, { flowLevel: -1, lineWidth: -1 }).trimEnd();
  return `<card>\n${yamlBody}\n</card>`;
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

    const body = commits.map(({ sha, author, subject }) => `${sha} • ${author}\n${subject}`).join('\n\n');
    return `<card-repo-log order="oldest-first">\n${body}\n</card-repo-log>`;
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
): Array<{ sha: string; author: string; subject: string; merged?: true }> | null {
  if (shas.length === 0) return null;
  try {
    const output = execFileSync('git', ['log', '--no-walk', '--pretty=format:%H%x00%h%x00%an%x00%s', ...shas], {
      cwd: workspacePath,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    if (!output) return null;

    const commits: Array<{ sha: string; author: string; subject: string; merged?: true }> = [];
    for (const line of output.split('\n')) {
      const [fullSha, shortSha, author, subject] = line.split('\0');
      if (!shortSha || !subject) continue;
      const commit: { sha: string; author: string; subject: string; merged?: true } = {
        sha: shortSha,
        author: author ?? '',
        subject
      };
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

    const body = commits
      .map(({ sha, author, subject, merged }) => {
        const shaLine = merged ? `${sha} [merged] • ${author}` : `${sha} • ${author}`;
        return `${shaLine}\n${subject}`;
      })
      .join('\n\n');

    const attrs: string[] = [];
    if (group.orphaned) {
      attrs.push('orphaned="true"');
    } else {
      attrs.push(`branch="${group.branchName}"`);
    }
    attrs.push(`count="${group.shas.length}"`);

    blocks.push(`<workspace-repo-log ${attrs.join(' ')}>\n${body}\n</workspace-repo-log>`);
  }

  return blocks;
}

// ============================================================================
// Combined context
// ============================================================================

/**
 * Builds the combined additional context string for session and subagent hooks.
 *
 * Produces: env block, `<card>`, optionally `<card-repo-log>`,
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
  const logBlock = buildCardRepoLogBlock(actionInput.cardRepoPath);
  const workspaceLogBlocks = buildWorkspaceRepoLogBlocks(actionInput.repoRoot, actionInput.cardRepoPath);

  const parts = [envBlock, cardBlock];
  if (logBlock) parts.push(logBlock);
  parts.push(...workspaceLogBlocks);
  return parts.join('\n\n');
}
