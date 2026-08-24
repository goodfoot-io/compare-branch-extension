/**
 * Shared context-building utilities for card log blocks.
 *
 * Produces `<card-repo-log>` and `<workspace-repo-log>` XML blocks from git
 * history and workspace tracking data. Used by the agent-hooks session/subagent
 * hooks and by the `cards <id> bind` CLI verb to inject card context into agent
 * sessions.
 *
 * @summary Context-building utilities for card and workspace repo log blocks
 * @module lib/context
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CARD_REPO_LOG_PATHSPEC_EXCLUSIONS } from './client/index.js';
import { CARDS_ENV_VARS } from './config/index.js';
import { BRANCHES_DIR, COMMITS_DIR } from './protocol/index.js';

const SHA_PATTERN = /^[0-9a-f]{40}$/;

// ============================================================================
// Card repo git log
// ============================================================================

/** Maximum number of qualifying commits shown in the card repo log. */
const MAX_CARD_REPO_LOG_COMMITS = 10;

/**
 * Builds the `<card-repo-log>` block with recent commits as plain text.
 *
 * Each commit renders as `sha • author\nsubject` followed by a `- file` list
 * of touched paths (filtered by the same pathspec exclusions as the log).
 * Commits are separated by blank lines.
 *
 * @param rootPath - Root directory of the card repository.
 * @returns The `<card-repo-log order="oldest-first">...</card-repo-log>` block string, or `null`.
 */
export function buildCardRepoLogBlock(rootPath: string): string | null {
  try {
    const log = execFileSync(
      'git',
      [
        'log',
        `--max-count=${MAX_CARD_REPO_LOG_COMMITS}`,
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
      return { sha: sha!, author: author!, subject: subject!, files };
    });

    const body = commits
      .map(({ sha, author, subject, files }) => {
        const fileLines = files.length > 0 ? `\n${files.map((file) => `- ${file}`).join('\n')}` : '';
        return `${sha} • ${author}\n${subject}${fileLines}`;
      })
      .join('\n\n');
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
 * A single unreadable or unparseable branch record is contained to itself:
 * it is skipped with a warning naming the file while the remaining healthy
 * records still populate both sections. Directory-level failures keep the
 * fail-closed `null` return, and so does total absence of branches and
 * commits.
 *
 * @param cardRepoPath - Root directory of the card repository.
 * @returns Parsed workspace data, or `null` when unavailable.
 */
function readWorkspaceData(cardRepoPath: string): WorkspaceData | null {
  const branches: WorkspaceData['branches'] = {};
  let commits: string[] = [];

  let files: string[];
  try {
    files = readdirSync(join(cardRepoPath, BRANCHES_DIR));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      return null;
    }
    files = [];
  }

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const filePath = join(cardRepoPath, BRANCHES_DIR, file);
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const meta = JSON.parse(raw) as { name?: string; parentBranch?: string; addedAt?: string };
      if (meta && typeof meta === 'object' && typeof meta.name === 'string') {
        branches[meta.name] = {
          parentBranch: typeof meta.parentBranch === 'string' ? meta.parentBranch : undefined,
          addedAt: typeof meta.addedAt === 'string' ? meta.addedAt : ''
        };
      }
    } catch (error) {
      console.warn('[cards-sdk] Skipping unreadable branch record %s: %s', filePath, (error as Error).message);
    }
  }

  try {
    commits = readdirSync(join(cardRepoPath, COMMITS_DIR)).filter((f): f is string => SHA_PATTERN.test(f));
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
