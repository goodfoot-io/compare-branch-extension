/**
 * Contract tests for the `claude-core` bundle's computed default log path.
 *
 * The compiled hook bins used to be told where to log by
 * `CARDS_CLAUDE_CODE_HOOKS_LOG_FILE`, written into `.claude/settings.json` at
 * install time. They now compute the same path themselves, so these tests pin
 * the two properties that keeps honest: the path is byte-identical to what the
 * extension's `cardsApiHooksLogPath()` produces for the same root, and an
 * explicit operator override still wins.
 *
 * @summary Computed default hooks log path resolution and layering
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '@goodfoot/claude-code-hooks';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { applyDefaultLogFile, resolveDefaultApiHooksLogPath } from '../../../src/shared/default-log-file.js';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const repoRoot = path.resolve(packageDir, '..', '..', '..');

const LOG_FILE_ENV_VAR = 'CLAUDE_CODE_HOOKS_LOG_FILE';

/**
 * Local replica of `cardsApiHooksLogPath()` from
 * `packages/extension/src/services/ClaudeSettingsService.ts`. The extension is
 * not importable from this package (it pulls in `vscode`), so the replica is
 * pinned against the real source by {@link expectedSourceExpression} below.
 *
 * @param workspaceRoot - Absolute path to the repository root.
 * @returns Absolute path to the hooks log file.
 */
function cardsApiHooksLogPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, '.cards', 'logs', 'claude-code-cards-api-hooks.log');
}

/** The exact expression the extension's `cardsApiHooksLogPath()` must contain. */
const expectedSourceExpression = "path.join(workspaceRoot, '.cards', 'logs', 'claude-code-cards-api-hooks.log')";

let scratchDir: string;
let mainRepo: string;
let linkedWorktree: string;
let nonRepoDir: string;
let savedOverride: string | undefined;

/**
 * Runs a git command in `cwd`, failing the test on a non-zero exit.
 *
 * @param cwd - Directory to run the command in.
 * @param args - Git arguments.
 */
function git(cwd: string, ...args: string[]): void {
  execFileSync('git', args, {
    cwd,
    stdio: 'ignore',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'Test',
      GIT_COMMITTER_EMAIL: 'test@example.com'
    }
  });
}

beforeAll(() => {
  savedOverride = process.env[LOG_FILE_ENV_VAR];
  delete process.env[LOG_FILE_ENV_VAR];

  scratchDir = realpathSync(mkdtempSync(path.join(tmpdir(), 'cards-default-log-')));

  mainRepo = path.join(scratchDir, 'main');
  execFileSync('git', ['init', '-b', 'main', mainRepo], { stdio: 'ignore' });
  git(mainRepo, 'commit', '--allow-empty', '-m', 'init');

  linkedWorktree = path.join(scratchDir, 'linked');
  git(mainRepo, 'worktree', 'add', '-b', 'feature', linkedWorktree);

  // A directory that is not inside any git repository at all.
  nonRepoDir = path.join(scratchDir, 'no-repo');
  mkdirSync(nonRepoDir, { recursive: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env[LOG_FILE_ENV_VAR];
});

afterAll(() => {
  if (savedOverride === undefined) {
    delete process.env[LOG_FILE_ENV_VAR];
  } else {
    process.env[LOG_FILE_ENV_VAR] = savedOverride;
  }
  rmSync(scratchDir, { recursive: true, force: true });
});

describe('resolveDefaultApiHooksLogPath', () => {
  it('matches the extension cardsApiHooksLogPath() shape for the same root', () => {
    expect(resolveDefaultApiHooksLogPath(mainRepo)).toBe(cardsApiHooksLogPath(mainRepo));
  });

  it('pins the replica against the extension source it mirrors', () => {
    const source = readFileSync(
      path.join(repoRoot, 'packages', 'extension', 'src', 'services', 'ClaudeSettingsService.ts'),
      'utf8'
    );
    expect(source).toContain(expectedSourceExpression);
  });

  it('resolves a linked worktree to the main repo root, not the worktree', () => {
    expect(resolveDefaultApiHooksLogPath(linkedWorktree)).toBe(cardsApiHooksLogPath(mainRepo));
  });

  it('returns null when no main repo root resolves, rather than throwing', () => {
    expect(resolveDefaultApiHooksLogPath(nonRepoDir)).toBeNull();
  });

  it('returns null for a nonexistent directory rather than throwing', () => {
    expect(resolveDefaultApiHooksLogPath(path.join(scratchDir, 'does-not-exist'))).toBeNull();
  });
});

describe('applyDefaultLogFile', () => {
  it('installs the computed default when no override is set', () => {
    const setLogFile = vi.spyOn(logger, 'setLogFile').mockImplementation(() => undefined);

    applyDefaultLogFile(mainRepo);

    expect(setLogFile).toHaveBeenCalledWith(cardsApiHooksLogPath(mainRepo));
  });

  it('leaves an explicit CLAUDE_CODE_HOOKS_LOG_FILE untouched', () => {
    process.env[LOG_FILE_ENV_VAR] = path.join(scratchDir, 'operator-override.log');
    const setLogFile = vi.spyOn(logger, 'setLogFile').mockImplementation(() => undefined);

    applyDefaultLogFile(mainRepo);

    expect(setLogFile).not.toHaveBeenCalled();
  });

  it('leaves file logging off when no root resolves', () => {
    const setLogFile = vi.spyOn(logger, 'setLogFile').mockImplementation(() => undefined);

    applyDefaultLogFile(nonRepoDir);

    expect(setLogFile).not.toHaveBeenCalled();
  });

  it('re-points the provisional default when the payload cwd names another repo', () => {
    // The spike observed process.cwd() as `/` while the payload carried the real
    // workspace path: the provisional default must yield to the payload anchor.
    const provisional = resolveDefaultApiHooksLogPath(process.cwd());
    expect(provisional).not.toBe(cardsApiHooksLogPath(mainRepo));

    const setLogFile = vi.spyOn(logger, 'setLogFile').mockImplementation(() => undefined);
    applyDefaultLogFile(mainRepo);

    expect(setLogFile).toHaveBeenCalledWith(cardsApiHooksLogPath(mainRepo));
  });

  it('produces no stray path from a process cwd outside any repo', () => {
    expect(resolveDefaultApiHooksLogPath('/')).toBeNull();
  });
});
