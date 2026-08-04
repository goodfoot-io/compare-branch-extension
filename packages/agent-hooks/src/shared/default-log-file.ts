/**
 * Computed default log file path for the Claude `core` hook bundle.
 *
 * The upstream `@goodfoot/claude-code-hooks` logger singleton resolves its file
 * path as `config.logFilePath ?? process.env[config.logEnvVar] ?? null` — it has
 * no computed default, so with no env var set file logging is simply off. This
 * module layers a Cards-shaped default underneath that: the same
 * `<anchor>/.cards/logs/claude-code-cards-api-hooks.log` the VS Code installer
 * used to write into `.claude/settings.json` as
 * `CARDS_CLAUDE_CODE_HOOKS_LOG_FILE`, computed by the bundle itself.
 *
 * The anchor is **the install scope**, not the session's directory. A per-repo
 * install (`claude-local` / `claude-project`) anchors on the repository that
 * carries it; a user-scope install (`claude-user`) anchors on the home
 * directory, exactly as the installer's old
 * `isUserScope ? os.homedir() : repoRoot` did. That distinction is load-bearing:
 * a user-scope install makes the plugin fire in *every* repository the user runs
 * `claude` in, and a scope-blind default would drop an untracked `.cards/logs/`
 * into all of them. Scope is read back from the settings files that record the
 * install rather than inferred from `cwd`.
 *
 * @summary Install the computed default hooks log file under the upstream logger
 * @module default-log-file
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { logger } from '@goodfoot/claude-code-hooks';

/**
 * Environment variable the upstream logger singleton falls back to by default.
 *
 * With `logEnvVar: null` for the `claude-core` build target the compiled bins no
 * longer stamp a Cards-specific name, so this is the name the singleton reads —
 * unless an operator redirects it through {@link LOG_ENV_VAR_INDIRECTION}. That
 * pairing is pinned by a test against the build manifest, so restoring a stamped
 * name cannot silently leave this gate reading the wrong variable.
 */
export const DEFAULT_LOG_FILE_ENV_VAR = 'CLAUDE_CODE_HOOKS_LOG_FILE';

/**
 * Indirection the upstream singleton itself honours: it constructs with
 * `logEnvVar: process.env.CLAUDE_CODE_HOOKS_LOG_ENV_VAR ?? 'CLAUDE_CODE_HOOKS_LOG_FILE'`.
 * The gate below must follow the same indirection, otherwise an operator who
 * points the logger at their own variable name gets that path overwritten by our
 * default.
 */
const LOG_ENV_VAR_INDIRECTION = 'CLAUDE_CODE_HOOKS_LOG_ENV_VAR';

/** Log file name, byte-identical to the extension's `cardsApiHooksLogPath()`. */
const LOG_FILE_NAME = 'claude-code-cards-api-hooks.log';

/** Marketplace key the installer writes into `extraKnownMarketplaces`. */
const MARKETPLACE_NAME = 'cards.management';

/** Plugin key the installer writes into `enabledPlugins`. */
const PLUGIN_ID = 'cards@cards.management';

/** The two git roots a hook `cwd` resolves to; equal outside a linked worktree. */
interface GitRoots {
  /** Root of the checkout `cwd` lives in — a linked worktree keeps its own. */
  worktreeRoot: string;
  /** Root of the repository that owns it; a linked worktree collapses to this. */
  mainRepoRoot: string;
}

/**
 * Memoized {@link resolveGitRoots} results, keyed by `cwd`.
 *
 * `git rev-parse` costs ~24 ms against a ~70 ms bin runtime, and the module-init
 * default plus the handler's own call would otherwise pay it twice — for the
 * same directory, in the common case where the payload `cwd` is the process cwd.
 * Git topology cannot change within a single hook invocation, so caching for the
 * process lifetime is safe.
 */
const gitRootsCache = new Map<string, GitRoots | null>();

/**
 * Resolves the worktree root and owning main repository root for `cwd`.
 *
 * A single `git rev-parse` returns both: `--git-common-dir` collapses a linked
 * worktree back to its owning main repo (`--git-dir` would yield the worktree's
 * own git dir), and `--show-toplevel` names the checkout `cwd` actually sits in.
 * `--path-format=absolute` makes `dirname` meaningful regardless of cwd.
 *
 * Deliberately does **not** consult `REPO_ROOT`: hook invocations inherit that
 * variable from card sessions where it names the card repository rather than the
 * workspace.
 *
 * A basename guard rejects non-standard layouts (bare repo, submodule,
 * separate-git-dir) whose common dir is not named `.git`, so those degrade to
 * "not a repo" rather than a wrong path.
 *
 * @param cwd - Directory to resolve from, i.e. the hook payload's `cwd`.
 * @returns Both roots, or `null` when `cwd` is not in a usable git repository.
 */
function resolveGitRoots(cwd: string): GitRoots | null {
  const cached = gitRootsCache.get(cwd);
  if (cached !== undefined) {
    return cached;
  }

  const roots = computeGitRoots(cwd);
  gitRootsCache.set(cwd, roots);
  return roots;
}

/**
 * Uncached body of {@link resolveGitRoots}.
 *
 * @param cwd - Directory to resolve from.
 * @returns Both roots, or `null` when `cwd` is not in a usable git repository.
 */
function computeGitRoots(cwd: string): GitRoots | null {
  try {
    const output = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir', '--show-toplevel'], {
      cwd,
      encoding: 'utf8',
      timeout: 3000,
      stdio: ['ignore', 'pipe', 'ignore']
    });

    const [commonDir, worktreeRoot] = output.trim().split('\n');
    if (commonDir === undefined || worktreeRoot === undefined) {
      return null;
    }
    if (commonDir.length === 0 || worktreeRoot.length === 0) {
      return null;
    }
    if (basename(commonDir) !== '.git') {
      return null;
    }

    return { worktreeRoot, mainRepoRoot: dirname(commonDir) };
  } catch {
    // Fail-closed: any failure (missing git, non-repo cwd, timeout) degrades to
    // no anchor. Guessing a path is worse than logging nowhere.
    return null;
  }
}

/**
 * Directory the Claude Code CLI keeps user-level settings in.
 *
 * Mirrors `resolveClaudeConfigDir()` in the extension: `$CLAUDE_CONFIG_DIR`
 * replaces the default outright when set, so the hook reads the same file the
 * installer wrote.
 *
 * @returns Absolute path to the Claude config directory.
 */
function claudeConfigDir(): string {
  const configured = process.env['CLAUDE_CONFIG_DIR'];
  if (configured !== undefined && configured.length > 0) {
    return configured;
  }
  return join(homedir(), '.claude');
}

/**
 * Reports whether a Claude settings file records a Cards plugin install.
 *
 * Applies the same content check as `mergeClaudeSettingsChain()` in the
 * extension's `agentDetection.ts` — `enabledPlugins['cards@cards.management']`
 * is `true` **and** `extraKnownMarketplaces['cards.management'].source.path` is
 * a non-empty string — minus that function's on-disk verification of the
 * marketplace path, which the hook has no reason to pay for. Any read or parse
 * failure means "no install recorded here".
 *
 * @param settingsFile - Absolute path to a Claude `settings*.json`.
 * @returns `true` when this file installs the Cards plugin.
 */
function recordsCardsInstall(settingsFile: string): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(settingsFile, 'utf8'));
  } catch {
    // Missing, unreadable, or not JSON — no install recorded here.
    return false;
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return false;
  }

  const settings = parsed as {
    extraKnownMarketplaces?: Record<string, { source?: { path?: unknown } }>;
    enabledPlugins?: Record<string, unknown>;
  };

  if (settings.enabledPlugins?.[PLUGIN_ID] !== true) {
    return false;
  }

  const marketplacePath = settings.extraKnownMarketplaces?.[MARKETPLACE_NAME]?.source?.path;
  return typeof marketplacePath === 'string' && marketplacePath.length > 0;
}

/**
 * Reports whether a repository root carries a per-repo Cards install.
 *
 * Checks both per-repo settings layers: `.claude/settings.local.json`
 * (`claude-local`) and `.claude/settings.json` (`claude-project`).
 *
 * @param root - Absolute repository (or worktree) root.
 * @returns `true` when either per-repo settings file installs the plugin.
 */
function hasRepoScopeInstall(root: string): boolean {
  return (
    recordsCardsInstall(join(root, '.claude', 'settings.local.json')) ||
    recordsCardsInstall(join(root, '.claude', 'settings.json'))
  );
}

/**
 * Resolves the directory the `.cards/logs/` tree hangs off for this invocation.
 *
 * Restores the install-scope dimension the installer used to encode when it
 * stamped the log path at install time:
 *
 * - a per-repo install anchors on the **main repository root**, so a linked
 *   worktree logs alongside its main repo rather than into the worktree (the
 *   per-repo settings file is looked for in both, since the installer writes it
 *   to whichever checkout the workspace has open);
 * - a user-scope install anchors on the **home directory**, so running `claude`
 *   in an unrelated repository does not create a `.cards/` directory there;
 * - no recorded install at all anchors nowhere, leaving file logging off.
 *
 * @param cwd - The hook payload's `cwd` (or `process.cwd()` provisionally).
 * @returns Absolute anchor directory, or `null` when no install is recorded.
 */
export function resolveLogAnchorRoot(cwd: string): string | null {
  const roots = resolveGitRoots(cwd);
  if (roots !== null) {
    if (hasRepoScopeInstall(roots.worktreeRoot) || hasRepoScopeInstall(roots.mainRepoRoot)) {
      return roots.mainRepoRoot;
    }
  }

  if (recordsCardsInstall(join(claudeConfigDir(), 'settings.json'))) {
    return homedir();
  }

  return null;
}

/**
 * Computes the default Cards API hooks log path for a hook invocation.
 *
 * Produces exactly what `cardsApiHooksLogPath()` in the extension's
 * `ClaudeSettingsService` produces for the same anchor, so the log file's
 * location and name are unchanged by moving the computation into the bundle.
 *
 * @param cwd - The hook payload's `cwd` (or `process.cwd()` provisionally).
 * @returns Absolute log file path, or `null` when no anchor resolves.
 */
export function resolveDefaultApiHooksLogPath(cwd: string): string | null {
  const anchor = resolveLogAnchorRoot(cwd);
  if (anchor === null) {
    return null;
  }
  return join(anchor, '.cards', 'logs', LOG_FILE_NAME);
}

/**
 * Reports whether the operator has already decided where hook logs go.
 *
 * Follows the singleton's own resolution rather than a hardcoded variable name:
 * `CLAUDE_CODE_HOOKS_LOG_ENV_VAR` redirects it to another variable, and an
 * **empty** value of whichever variable it lands on means "file logging off"
 * upstream (the logger guards on `if (!this.logFilePath)`). Both cases are the
 * operator having decided, so the default must stand down for both — treating an
 * empty value as "unset" would turn logging back on against their wishes.
 *
 * The logger cannot be asked directly: it exposes no `isFileLoggingEnabled()`,
 * `logFilePath` is `private`, and `hasDestinations()` conflates event handlers
 * with file output.
 *
 * @returns `true` when an operator-set value is present.
 */
function hasOperatorOverride(): boolean {
  const indirection = process.env[LOG_ENV_VAR_INDIRECTION];
  const envVarName = indirection !== undefined && indirection.length > 0 ? indirection : DEFAULT_LOG_FILE_ENV_VAR;
  return process.env[envVarName] !== undefined;
}

/**
 * Installs the computed default log file on the logger singleton.
 *
 * No-op under an operator override (see {@link hasOperatorOverride}) and no-op
 * when no anchor resolves from `cwd`, leaving file logging off rather than
 * guessing a location.
 *
 * Safe to call repeatedly: each handler calls it with the payload `cwd`, which
 * re-points the provisional `process.cwd()` default installed at module init.
 *
 * @param cwd - The hook payload's `cwd` (or `process.cwd()` provisionally).
 */
export function applyDefaultLogFile(cwd: string): void {
  if (hasOperatorOverride()) {
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
// it from the payload `cwd`.
//
// This creates nothing on disk: `setLogFile()` only records the path, and the
// logger `mkdir`s and opens the file lazily on its first actual write. And
// because the anchor is scope-derived, a process cwd in a repository that has no
// Cards install can never select that repository — the worst case is a
// pre-handler error landing under the *user* anchor, or under another Cards
// workspace whose per-repo install the process cwd sits in.
applyDefaultLogFile(process.cwd());
