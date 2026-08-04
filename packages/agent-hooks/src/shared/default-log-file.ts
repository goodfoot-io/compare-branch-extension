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
 * into all of them. That is not a minority configuration:
 * `_restageAgentInstallersAfterUpgrade()` in the extension performs an
 * unconditional `claude-user` install on every detected upgrade, so the entire
 * user base carries a user-scope record one upgrade later. Scope is read back
 * from the settings files that record the install rather than inferred from
 * `cwd`.
 *
 * Nothing here ever guesses from `process.cwd()`. Diagnostics that arise before
 * the payload identifies a session go to stderr — see {@link mirrorToStderr}.
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

/**
 * Ceiling on the single `git rev-parse` this module spawns.
 *
 * The spawn is memoized per `cwd` and now happens only at handler entry, so a
 * pathological repository (cold network mount, pathological `.git`) costs one
 * invocation at most this much rather than twice it.
 */
const GIT_TIMEOUT_MS = 3000;

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
 * The spawn is cheap in the mean — measured at 4.7 ms in a scratch repository,
 * 14.3 ms from a linked worktree, against a ~57 ms bin runtime — so this is not
 * a latency fix. It is a tail fix: {@link GIT_TIMEOUT_MS} is charged *per*
 * spawn, so every resolution avoided is 3 s of worst-case stall avoided. Git
 * topology cannot change within a single hook invocation, so caching for the
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
      timeout: GIT_TIMEOUT_MS,
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
  } catch (error) {
    // Fail-closed: every failure degrades to no anchor, because guessing a path
    // is worse than logging nowhere. But not every failure is the same kind of
    // event. Exit 128 is git saying "not a repository" — routine, expected on
    // any session outside a checkout, and silent by design. A timeout or a
    // missing `git` is a broken environment: it costs the invocation up to the
    // full 3 s and then produces no log file to explain the delay, so it goes
    // to stderr rather than being swallowed.
    const failure = error as NodeJS.ErrnoException & { status?: number | null; signal?: string | null };
    if (failure.status !== 128) {
      const reason =
        failure.signal === 'SIGTERM' ? `timed out after ${GIT_TIMEOUT_MS} ms` : (failure.code ?? failure.message);
      process.stderr.write(
        `[cards-hooks] could not resolve a log anchor: git rev-parse ${reason}; hook logging is off\n`
      );
    }
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
 * Safe to call repeatedly: each handler calls it with the payload `cwd` as its
 * first statement, which is the earliest moment the session's own anchor is
 * knowable. Until then {@link mirrorToStderr} carries any diagnostics.
 *
 * @param cwd - The hook payload's `cwd`.
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
  fileDestinationInstalled = true;
}

/**
 * Whether anything has claimed a file destination for this process yet.
 *
 * Seeded from the operator override, because upstream resolves that into
 * `logFilePath` at construction — an override means diagnostics are already
 * being filed and need no stderr mirror.
 */
let fileDestinationInstalled = hasOperatorOverride();

/**
 * Mirrors error events to stderr while no file destination exists.
 *
 * The SDK emits its own error entries — a malformed payload produces
 * `Failed to parse stdin JSON` — *before* any handler runs, which is before the
 * payload `cwd` has been read and therefore before the session's log anchor is
 * knowable. The previous shape of this module answered that by installing a
 * default derived from `process.cwd()` at module init. That guessed: a hook that
 * dies while parsing its payload has no idea which session it belongs to, so the
 * one record explaining the failure was filed under whichever repository the
 * process happened to start in — not necessarily the one the operator was
 * working in, and in the reproduced case a repository with no relationship to
 * the session at all.
 *
 * Stderr is the honest destination for a diagnostic that cannot be attributed.
 * It reaches the operator through the agent's own hook output rather than
 * appearing as an untracked file in someone's checkout, and it is the one
 * channel available before the payload is parsed. Once a handler installs the
 * real path the mirror stops, so a healthy invocation writes nothing here.
 *
 * @param event - The error event the logger is delivering.
 * @param event.level - Severity, always `error` for this subscription.
 * @param event.message - The logged message.
 * @param event.error - Structured error detail, when the entry carries one.
 * @param event.error.message - The underlying error's message.
 */
const mirrorToStderr = (event: { level: string; message: string; error?: { message?: string } }): void => {
  if (fileDestinationInstalled) {
    return;
  }
  const detail = event.error?.message === undefined ? '' : `: ${event.error.message}`;
  process.stderr.write(`[cards-hooks] ${event.level}: ${event.message}${detail} (no hook log file resolved)\n`);
};

logger.on('error', mirrorToStderr);
