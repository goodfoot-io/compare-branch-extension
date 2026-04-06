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
import type { ActionInput } from '@cards/sdk/config';
import { CARDS_ENV_VARS } from '@cards/sdk/config';
import { BRANCHES_FILE, COMMITS_FILE } from '@cards/sdk/protocol';
import { formatCommitLog } from './file-tree.js';
import { CARD_REPO_LOG_PATHSPEC_EXCLUSIONS } from './gitPathspecs.js';

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
// Card metadata
// ============================================================================

/**
 * A relation entry parsed from `CARD.meta.json`.
 */
interface CardRelation {
  type: string;
  cardId: string;
}

/**
 * Subset of CARD.meta.json fields surfaced in the `<card>` context block.
 */
interface CardMeta {
  id: string;
  title: string;
  status: string;
  tags: string[];
  gates: {
    planRequired: boolean;
    planApproved: boolean;
    mergeRequestRequired: boolean;
    mergeApproved: boolean;
  };
  relations: CardRelation[];
}

/**
 * Reads and parses CARD.meta.json from the card repository.
 *
 * Returns `null` when the file is missing or malformed so the caller
 * can fall back to values from {@link ActionInput}.
 *
 * @param rootPath - Root directory of the card repository.
 * @returns Parsed metadata, or `null` when unavailable.
 */
function readCardMeta(rootPath: string): CardMeta | null {
  try {
    const raw = readFileSync(join(rootPath, 'CARD.meta.json'), 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const gates = parsed['gates'] as Record<string, boolean> | undefined;
    return {
      id: String(parsed['id'] ?? ''),
      title: String(parsed['title'] ?? ''),
      status: String(parsed['status'] ?? ''),
      tags: Array.isArray(parsed['tags']) ? (parsed['tags'] as string[]) : [],
      gates: {
        planRequired: gates?.['planRequired'] === true,
        planApproved: gates?.['planApproved'] === true,
        mergeRequestRequired: gates?.['mergeRequestRequired'] === true,
        mergeApproved: gates?.['mergeApproved'] === true
      },
      relations: parseRelations(parsed['relations'])
    };
  } catch {
    return null;
  }
}

/**
 * Parses the `relations` field from raw CARD.meta.json data.
 *
 * @param raw - The raw `relations` value from the parsed JSON.
 * @returns Array of validated relation entries, or empty array when invalid/absent.
 */
function parseRelations(raw: unknown): CardRelation[] {
  if (!Array.isArray(raw)) return [];
  const result: CardRelation[] = [];
  for (const entry of raw) {
    if (entry && typeof entry === 'object' && typeof entry.type === 'string' && typeof entry.cardId === 'string') {
      result.push({ type: entry.type, cardId: entry.cardId });
    }
  }
  return result;
}

/**
 * Reads the title from a related card's CARD.meta.json.
 *
 * Resolves the related card's repository path as a sibling directory
 * of the current card's repository.
 *
 * @param cardRepoPath - Root directory of the current card's repository.
 * @param relatedCardId - Stable branch-prefixed identifier (e.g. `"main-99"`) used to locate the sibling directory.
 * @returns The related card's title, or `null` when unreadable.
 */
function readRelatedCardTitle(cardRepoPath: string, relatedCardId: string): string | null {
  try {
    const parentDir = join(cardRepoPath, '..');
    const relatedPath = join(parentDir, relatedCardId, 'CARD.meta.json');
    const raw = readFileSync(relatedPath, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const title = parsed['title'];
    return typeof title === 'string' ? title : null;
  } catch {
    return null;
  }
}

/**
 * Builds the `<card>` XML block with card identity, gates, and env vars.
 *
 * Falls back to {@link ActionInput} fields when CARD.meta.json is unreadable.
 *
 * @param actionInput - Parsed action input from the environment.
 * @returns The `<card ...>...</card>` block string.
 */
export function buildCardBlock(actionInput: ActionInput): string {
  const meta = readCardMeta(actionInput.cardRepoPath);

  const id = meta?.id || actionInput.cardId;
  const title = meta?.title || '';
  const status = meta?.status || '';

  const tagsLine = meta && meta.tags.length > 0 ? `tags: ${meta.tags.join(', ')}` : '';

  const gatesLine = meta
    ? `gates: planRequired=${meta.gates.planRequired} planApproved=${meta.gates.planApproved} mergeRequestRequired=${meta.gates.mergeRequestRequired} mergeApproved=${meta.gates.mergeApproved}`
    : '';

  const workspaceBranch = process.env[CARDS_ENV_VARS.WORKSPACE_BRANCH];
  const baseBranch = process.env[CARDS_ENV_VARS.BASE_BRANCH];

  const workspacePath = process.env[CARDS_ENV_VARS.WORKSPACE_PATH];
  const envLines = [`  CARD_REPO_PATH=${actionInput.cardRepoPath}`];
  if (workspacePath) envLines.push(`  WORKSPACE_PATH=${workspacePath}`);
  if (baseBranch) envLines.push(`  BASE_BRANCH=${baseBranch}`);
  if (workspaceBranch) envLines.push(`  WORKSPACE_BRANCH=${workspaceBranch}`);

  const bodyLines: string[] = [];
  if (title) bodyLines.push(`title: ${title}`);
  bodyLines.push('');
  if (tagsLine) bodyLines.push(tagsLine);
  if (gatesLine) bodyLines.push(gatesLine);
  bodyLines.push('env:');
  bodyLines.push(...envLines);

  if (meta && meta.relations.length > 0) {
    const relationLines = meta.relations.map((rel) => {
      const relatedRepoPath = join(actionInput.cardRepoPath, '..', rel.cardId);
      const relatedTitle = readRelatedCardTitle(actionInput.cardRepoPath, rel.cardId);
      const titlePart = relatedTitle ? ` "${relatedTitle}"` : '';
      return `  ${rel.type}: ${rel.cardId}${titlePart} (${relatedRepoPath})`;
    });
    bodyLines.push('relations:');
    bodyLines.push(...relationLines);
  }

  const attrs = [`id="${id}"`, `status="${status}"`, `mode="${actionInput.executionMode}"`];

  return `<card ${attrs.join(' ')}>\n${bodyLines.join('\n')}\n</card>`;
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
 * Builds the `<card-repo>` block: root-level files, directories with
 * child counts, streams subdirectories, and inlined sidecar summaries.
 *
 * When a `.md` file has a `.md.meta.json` sidecar containing a `summary`
 * field, the summary is indented below the file entry. Directories that
 * contain at least one summarized file are expanded; directories with no
 * summaries show a compact file count.
 *
 * @param rootPath - Root directory of the card repository.
 * @returns The `<card-repo>...</card-repo>` block string.
 * @throws {CardRepoAccessError} When the root directory cannot be read.
 */
export function buildCardRepoBlock(rootPath: string): string {
  let entries: { name: string; isDir: boolean }[];
  try {
    entries = readdirSync(rootPath, { withFileTypes: true }).map((d) => ({
      name: d.name.toString(),
      isDir: d.isDirectory()
    }));
  } catch (error) {
    throw new CardRepoAccessError(rootPath, error);
  }

  const lines: string[] = [];

  for (const entry of entries) {
    if (entry.name === '.git') continue;
    const fullPath = join(rootPath, entry.name);

    if (entry.isDir) {
      if (entry.name === 'streams') {
        // Streams: show each subdirectory with child count
        lines.push('streams/');
        try {
          const streamEntries = readdirSync(fullPath, { withFileTypes: true });
          for (const sub of streamEntries) {
            if (sub.isDirectory()) {
              const subName = sub.name.toString();
              const count = dirFileCount(join(fullPath, subName));
              lines.push(`${`  ${subName}/`.padEnd(24)}${count} files`);
            }
          }
        } catch (_readdirError: unknown) {
          void _readdirError; // streams dir unreadable — already listed the directory name
        }
      } else if (entry.name === 'comment') {
        // Comment: list individual files sorted by creation time
        lines.push('comment/');
        try {
          const commentEntries = readdirSync(fullPath, { withFileTypes: true });
          const fileEntries: { name: string; birthtime: number }[] = [];
          for (const f of commentEntries) {
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
            lines.push(`  ${f.name}`);
          }
        } catch (_readdirError: unknown) {
          void _readdirError; // comment dir unreadable — already listed the directory name
        }
      } else {
        // Other directory: expand .md files that have sidecar summaries
        try {
          const dirEntries = readdirSync(fullPath, { withFileTypes: true });
          const fileNames = dirEntries.filter((e) => e.isFile()).map((e) => e.name.toString());
          const subDirCount = dirEntries.filter((e) => e.isDirectory()).length;

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
            // No summaries — compact count on same line
            const count = fileNames.length + subDirCount;
            lines.push(`${`${entry.name}/`.padEnd(24)}${count} files`);
          } else {
            lines.push(`${entry.name}/`);
            const listedNames = new Set<string>();
            for (const { name, summary, sidecarName } of summarized) {
              lines.push(`  ${name}`);
              for (const summaryLine of summary.split('\n')) {
                lines.push(`    ${summaryLine}`);
              }
              lines.push(`  ${sidecarName}`);
              listedNames.add(name);
              listedNames.add(sidecarName);
            }
            const remaining = fileNames.filter((n) => !listedNames.has(n)).length + subDirCount;
            if (remaining > 0) {
              lines.push(`  + ${remaining} files`);
            }
          }
        } catch (_readdirError: unknown) {
          // Directory unreadable — show name only
          lines.push(`${entry.name}/`);
        }
      }
    } else {
      // Root-level file
      lines.push(entry.name);
      if (entry.name.endsWith('.md') && !entry.name.endsWith('.meta.json')) {
        const summary = readSidecarSummary(join(rootPath, `${entry.name}.meta.json`));
        if (summary) {
          for (const summaryLine of summary.split('\n')) {
            lines.push(`  ${summaryLine}`);
          }
        }
      }
    }
  }

  return `<card-repo>\n${lines.join('\n')}\n</card-repo>`;
}

// ============================================================================
// Card repo git log
// ============================================================================

/** Maximum number of qualifying commits shown in the card repo log. */
const MAX_CARD_REPO_LOG_COMMITS = 10;

/**
 * Builds the `<card-repo-log>` block with recent commits in chronological
 * (oldest-first) order.
 *
 * Excludes commits that exclusively touch `streams/` or bookkeeping files.
 * Each line shows the short hash, author, and subject — no file lists.
 * An `order="oldest-first"` attribute indicates chronological direction.
 *
 * Returns `null` when the repository has no qualifying commits or git is
 * unavailable, so the block can be omitted from the output.
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
        `--max-count=${MAX_CARD_REPO_LOG_COMMITS}`,
        '--reverse',
        '--pretty=format:%h %an: %s',
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
    return `<card-repo-log${countAttr} order="oldest-first">\n${log}\n</card-repo-log>`;
  } catch {
    return null;
  }
}

// ============================================================================
// Workspace repo log
// ============================================================================

/** Maximum number of commits shown with full detail per branch block. */
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
 * Reads branches from `branches.json` and commits from
 * `commits.csv`. Each file is read independently — ENOENT is
 * treated as an empty result, other errors cause `null` to be returned.
 *
 * Returns data whenever either file has content. Returns `null` only when
 * both files are absent or empty, or when a non-ENOENT error occurs.
 *
 * @param cardRepoPath - Root directory of the card repository.
 * @returns Parsed workspace data, or `null` when unavailable.
 */
function readWorkspaceData(cardRepoPath: string): WorkspaceData | null {
  const branches: WorkspaceData['branches'] = {};
  let commits: string[] = [];

  // Read branches from branches.json
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

  // Read commits from commits.csv
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

  // Return data when either file has content
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
 * Uses `git cat-file --batch-check` for a single-call batch existence test.
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
 * Annotates merged commits and strips full SHAs from git log output.
 *
 * Takes output produced with `--pretty=format:%H %h - %s` and replaces each
 * header line with `%h - %s [merged]` (when the full SHA is in `mergedShas`)
 * or plain `%h - %s` (when it is not).
 *
 * @param output - Raw git log output using `%H %h - %s` format.
 * @param mergedShas - Full 40-char SHAs considered merged.
 * @returns Output in standard `%h - %s` format with `[merged]` annotations.
 */
function annotateMergedCommits(output: string, mergedShas: Set<string>): string {
  return output.replace(/^([0-9a-f]{40}) ([0-9a-f]{7,} - .*)$/gm, (_, fullSha: string, rest: string) => {
    return mergedShas.has(fullSha) ? `${rest} [merged]` : rest;
  });
}

/**
 * Resolves commit details for specific SHAs using `git log --no-walk`.
 *
 * When `mergedShas` is provided, commits whose full SHA appears in the set
 * receive a `[merged]` suffix on their subject line.
 *
 * @param workspacePath - Root directory of the workspace repository.
 * @param shas - Full 40-char SHAs to resolve.
 * @param mergedShas - SHAs reachable from the base branch (considered merged).
 * @returns Formatted commit log with tree-rendered file lists, or `null` on failure.
 */
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
 * Reads branches from `branches.json` and commits from
 * `commits.csv`, partitions commits across branches using git
 * reachability, and renders per-branch XML blocks. Already-printed commits
 * appear as bare short hashes in subsequent blocks (dedup).
 *
 * Branch processing order: sorted by `addedAt` (oldest first) so the
 * foundational branch receives full commit output and later branches dedup
 * against it.
 *
 * @param workspacePath - Root directory of the workspace repository.
 * @param cardRepoPath - Root directory of the card repository.
 * @returns Array of `<workspace-repo-log>` block strings, or empty array.
 */
export function buildWorkspaceRepoLogBlocks(workspacePath: string, cardRepoPath: string): string[] {
  const workspace = readWorkspaceData(cardRepoPath);
  if (!workspace) return [];

  const baseBranch = process.env[CARDS_ENV_VARS.BASE_BRANCH] ?? 'main';

  // Sort branches by addedAt (oldest first)
  const sortedBranches = Object.entries(workspace.branches).sort(([, a], [, b]) => a.addedAt.localeCompare(b.addedAt));

  // Partition: each branch includes ALL reachable workspace.commits (may overlap).
  // Rendering dedup handles cross-branch overlap via bare short hashes.
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

  // Render blocks with cross-branch dedup
  const printedShas = new Set<string>();
  const blocks: string[] = [];

  for (const group of groups) {
    const newShas = group.shas.filter((sha) => !printedShas.has(sha));
    const dupShas = group.shas.filter((sha) => printedShas.has(sha));

    // Show most recent N with full detail
    const displayShas = newShas.slice(-MAX_WORKSPACE_COMMITS_PER_BRANCH);
    const mergedShas = new Set(displayShas.filter((sha) => baseReachable.has(sha)));
    const details = resolveWorkspaceCommitDetails(workspacePath, displayShas, mergedShas);

    if (details) {
      for (const sha of displayShas) printedShas.add(sha);
    }

    // Build body: full details first, then bare hashes for dedup
    const bodyParts: string[] = [];
    if (details) bodyParts.push(details);
    if (dupShas.length > 0) {
      bodyParts.push(dupShas.map((sha) => sha.slice(0, 7)).join('\n'));
    }

    if (bodyParts.length === 0) continue;

    // Build XML tag
    const attrs: string[] = [];
    if (group.orphaned) {
      attrs.push('orphaned="true"');
    } else {
      attrs.push(`branch="${group.branchName}"`);
    }
    attrs.push(`count="${group.shas.length}"`);

    blocks.push(`<workspace-repo-log ${attrs.join(' ')}>\n${bodyParts.join('\n')}\n</workspace-repo-log>`);
  }

  return blocks;
}

// ============================================================================
// Combined context
// ============================================================================

/**
 * Builds the combined additional context string for session and subagent hooks.
 *
 * Produces XML blocks: `<card>` (identity + gates + env), `<card-repo>`
 * (directory summary), optionally `<card-repo-log>` (recent card repo commits),
 * and optionally `<workspace-repo-log>` blocks (workspace commits per branch).
 * Let {@link CardRepoAccessError} propagate to the caller for structured
 * error handling.
 *
 * @param actionInput - Parsed action input from the environment.
 * @returns Combined context string with XML blocks.
 * @throws {CardRepoAccessError} When the card repository cannot be read.
 */
export function buildAdditionalContext(actionInput: ActionInput): string {
  const cardBlock = buildCardBlock(actionInput);
  const repoBlock = buildCardRepoBlock(actionInput.cardRepoPath);
  const logBlock = buildCardRepoLogBlock(actionInput.cardRepoPath);
  const workspaceLogBlocks = buildWorkspaceRepoLogBlocks(actionInput.repoRoot, actionInput.cardRepoPath);

  const parts = [cardBlock, repoBlock];
  if (logBlock) parts.push(logBlock);
  parts.push(...workspaceLogBlocks);
  return parts.join('\n\n');
}
