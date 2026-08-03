/**
 * Computed default log file path for the Claude `core` hook bundle.
 *
 * The upstream `@goodfoot/claude-code-hooks` logger singleton resolves its file
 * path as `config.logFilePath ?? process.env[config.logEnvVar] ?? null` — it has
 * no computed default, so with no env var set file logging is simply off. This
 * module layers a Cards-shaped default underneath that: the same
 * `<mainRepoRoot>/.cards/logs/claude-code-cards-api-hooks.log` the VS Code
 * installer used to write into `.claude/settings.json` as
 * `CARDS_CLAUDE_CODE_HOOKS_LOG_FILE`, computed by the bundle itself.
 *
 * @summary Install the computed default hooks log file under the upstream logger
 * @module default-log-file
 */

import { execFileSync } from 'node:child_process';
import { basename, dirname, join } from 'node:path';
import { logger } from '@goodfoot/claude-code-hooks';

/**
 * Environment variable the upstream logger singleton itself falls back to.
 *
 * With `logEnvVar: null` for the `claude-core` build target, the compiled bins
 * no longer stamp a Cards-specific name, so this is the operator override the
 * singleton reads — and therefore the only correct gate for the default. The
 * logger exposes no `isFileLoggingEnabled()`, `logFilePath` is `private`, and
 * `hasDestinations()` conflates event handlers with file output, so the
 * environment is the only thing that can answer "was a path already set?".
 */
const LOG_FILE_ENV_VAR = 'CLAUDE_CODE_HOOKS_LOG_FILE';

/** Log file name, byte-identical to the extension's `cardsApiHooksLogPath()`. */
const LOG_FILE_NAME = 'claude-code-cards-api-hooks.log';

/**
 * Resolves the main repository root that owns `cwd`.
 *
 * Mirrors `resolveMainRepoRoot()` in the Cards SDK logger: computes
 * `dirname(git rev-parse --path-format=absolute --git-common-dir)`, which
 * collapses a linked worktree back to its owning main repo. `--git-common-dir`
 * is required (not `--git-dir`, which yields the worktree's own git dir), and
 * `--path-format=absolute` makes `dirname` meaningful regardless of cwd.
 *
 * Unlike the SDK version this deliberately does **not** consult `REPO_ROOT`:
 * hook invocations inherit that variable from card sessions where it names the
 * card repository rather than the workspace, and the hook payload `cwd` is the
 * only anchor verified to identify the session's workspace.
 *
 * A basename guard rejects non-standard layouts (bare repo, submodule,
 * separate-git-dir) whose common dir is not named `.git`, so those degrade to
 * disabled file output rather than a wrong path.
 *
 * @param cwd - Directory to resolve from, i.e. the hook payload's `cwd`.
 * @returns Absolute main repo root, or `null` when it cannot be resolved.
 */
function resolveMainRepoRoot(cwd: string): string | null {
  try {
    const commonDir = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
      cwd,
      encoding: 'utf8',
      timeout: 3000,
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();

    if (commonDir.length === 0) {
      return null;
    }

    if (basename(commonDir) !== '.git') {
      return null;
    }

    return dirname(commonDir);
  } catch {
    // Fail-closed: any failure (missing git, non-repo cwd, timeout) degrades to
    // disabled file output. Guessing a path is worse than logging nowhere.
    return null;
  }
}

/**
 * Computes the default Cards API hooks log path for a hook invocation.
 *
 * Produces exactly what `cardsApiHooksLogPath()` in the extension's
 * `ClaudeSettingsService` produces for the same root, so the log file's location
 * and name are unchanged by moving the computation into the bundle.
 *
 * @param cwd - The hook payload's `cwd` (or `process.cwd()` provisionally).
 * @returns Absolute log file path, or `null` when no main repo root resolves.
 */
export function resolveDefaultApiHooksLogPath(cwd: string): string | null {
  const mainRepoRoot = resolveMainRepoRoot(cwd);
  if (mainRepoRoot === null) {
    return null;
  }
  return join(mainRepoRoot, '.cards', 'logs', LOG_FILE_NAME);
}

/**
 * Installs the computed default log file on the logger singleton.
 *
 * No-op when {@link LOG_FILE_ENV_VAR} is set — an explicit operator override
 * always wins — and no-op when no main repo root resolves from `cwd`, leaving
 * file logging off rather than guessing a location.
 *
 * Safe to call repeatedly: each handler calls it with the payload `cwd`, which
 * re-points the provisional `process.cwd()` default installed at module init.
 *
 * @param cwd - The hook payload's `cwd` (or `process.cwd()` provisionally).
 */
export function applyDefaultLogFile(cwd: string): void {
  const override = process.env[LOG_FILE_ENV_VAR];
  if (override !== undefined && override.length > 0) {
    return;
  }

  const logFilePath = resolveDefaultApiHooksLogPath(cwd);
  if (logFilePath === null) {
    return;
  }

  logger.setLogFile(logFilePath);
}

// Provisional default, installed at module init so the SDK's own error entries —
// which it emits before any handler runs — are not lost. Each handler re-points
// it from the payload `cwd`. A process cwd that resolves to no repo root (the
// spike observed `/`) yields no path at all, so this never creates a stray file.
applyDefaultLogFile(process.cwd());
