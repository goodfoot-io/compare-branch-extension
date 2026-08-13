/**
 * Contract tests for the `claude-core` bundle's computed default log path.
 *
 * The compiled hook bins used to be told where to log by
 * `CARDS_CLAUDE_CODE_HOOKS_LOG_FILE`, written into `.claude/settings.json` at
 * install time by a *scope-aware* installer: per-repo installs pointed at the
 * repository, user-scope installs at the home directory. The bins now compute
 * the same path themselves, so these tests pin the properties that keeps
 * honest — above all the **destination per install scope**, since a scope-blind
 * default drops an untracked `.cards/logs/` into every repository a user-scope
 * install touches.
 *
 * @summary Computed default hooks log path resolution, scoping, and layering
 */

import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '@goodfoot/claude-code-hooks';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { targets } from '../../../scripts/build.mjs';
import {
  applyDefaultLogFile,
  DEFAULT_LOG_FILE_ENV_VAR,
  resolveDefaultApiHooksLogPath
} from '../../../src/shared/default-log-file.js';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const repoRoot = path.resolve(packageDir, '..', '..', '..');

const LOG_ENV_VAR_INDIRECTION = 'CLAUDE_CODE_HOOKS_LOG_ENV_VAR';

/**
 * Local replica of `cardsApiHooksLogPath()` from
 * `packages/extension/src/services/ClaudeSettingsService.ts`. The extension is
 * not importable from this package (it pulls in `vscode`), so the replica is
 * pinned against the real source by {@link expectedSourceExpression} below.
 *
 * @param workspaceRoot - Absolute path to the anchor directory.
 * @returns Absolute path to the hooks log file.
 */
function cardsApiHooksLogPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, '.cards', 'logs', 'claude-code-cards-api-hooks.log');
}

/** The exact expression the extension's `cardsApiHooksLogPath()` must contain. */
const expectedSourceExpression = "path.join(workspaceRoot, '.cards', 'logs', 'claude-code-cards-api-hooks.log')";

let scratchDir: string;
let projectRepo: string;
let localRepo: string;
let plainRepo: string;
let projectWorktree: string;
let plainWorktree: string;
let disabledRepo: string;
let malformedRepo: string;
let commentedRepo: string;
let trailingCommaRepo: string;
let noMarketplaceRepo: string;
let gitMarketplaceRepo: string;
let urlInStringRepo: string;
let nonRepoDir: string;
let fakeHome: string;
let userConfigDir: string;

const savedEnv: Record<string, string | undefined> = {};

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

/**
 * Creates an initialized git repository with one empty commit.
 *
 * @param name - Directory name under the scratch dir.
 * @returns Absolute path to the new repository.
 */
function makeRepo(name: string): string {
  const dir = path.join(scratchDir, name);
  execFileSync('git', ['init', '-b', 'main', dir], { stdio: 'ignore' });
  git(dir, 'commit', '--allow-empty', '-m', 'init');
  return dir;
}

/**
 * Writes a Claude settings file recording an install of the Cards plugin, in
 * the exact shape the installer writes and `mergeClaudeSettingsChain()` reads.
 *
 * @param settingsFile - Absolute path to the settings file to write.
 * @param overrides - Partial settings merged over the install shape.
 */
function writeCardsSettings(settingsFile: string, overrides: Record<string, unknown> = {}): void {
  mkdirSync(path.dirname(settingsFile), { recursive: true });
  writeFileSync(
    settingsFile,
    JSON.stringify(
      {
        extraKnownMarketplaces: {
          'cards.management': { source: { source: 'directory', path: path.join(scratchDir, 'marketplace') } }
        },
        enabledPlugins: { 'cards@cards.management': true },
        ...overrides
      },
      null,
      2
    )
  );
}

/**
 * Writes a settings file verbatim, without round-tripping it through
 * `JSON.stringify` — the point of these fixtures is the exact bytes on disk.
 *
 * @param settingsFile - Absolute path to the settings file to write.
 * @param contents - Raw file contents.
 */
function writeJsoncSettings(settingsFile: string, contents: string): void {
  mkdirSync(path.dirname(settingsFile), { recursive: true });
  writeFileSync(settingsFile, contents);
}

/**
 * Captures everything the module writes to stderr while `body` runs.
 *
 * @param body - Code to run with stderr captured.
 * @returns The captured stderr text.
 */
function captureStderr(body: () => void): string {
  let captured = '';
  const write = vi.spyOn(process.stderr, 'write').mockImplementation((chunk: string | Uint8Array) => {
    captured += String(chunk);
    return true;
  });
  try {
    body();
  } finally {
    write.mockRestore();
  }
  return captured;
}

/**
 * Points the process at a fake home with no user-scope Cards install, so a test
 * that expects a repo anchor cannot pass by accident.
 */
function withoutUserScopeInstall(): void {
  process.env['HOME'] = fakeHome;
  process.env['CLAUDE_CONFIG_DIR'] = path.join(scratchDir, 'empty-claude-config');
}

/** Points the process at a fake home whose config dir records a user install. */
function withUserScopeInstall(): void {
  process.env['HOME'] = fakeHome;
  process.env['CLAUDE_CONFIG_DIR'] = userConfigDir;
}

beforeAll(() => {
  for (const key of ['HOME', 'CLAUDE_CONFIG_DIR', DEFAULT_LOG_FILE_ENV_VAR, LOG_ENV_VAR_INDIRECTION, 'MY_HOOK_LOG']) {
    savedEnv[key] = process.env[key];
  }

  scratchDir = realpathSync(mkdtempSync(path.join(tmpdir(), 'cards-default-log-')));

  // claude-project scope: install recorded in .claude/settings.json.
  projectRepo = makeRepo('project-scope');
  writeCardsSettings(path.join(projectRepo, '.claude', 'settings.json'));
  projectWorktree = path.join(scratchDir, 'project-scope-worktree');
  git(projectRepo, 'worktree', 'add', '-b', 'feature', projectWorktree);

  // claude-local scope: install recorded in .claude/settings.local.json.
  localRepo = makeRepo('local-scope');
  writeCardsSettings(path.join(localRepo, '.claude', 'settings.local.json'));

  // No per-repo install at all — the repository a user-scope install must not
  // pollute. Its worktree carries the install instead, for the collapse test.
  plainRepo = makeRepo('plain');
  plainWorktree = path.join(scratchDir, 'plain-worktree');
  git(plainRepo, 'worktree', 'add', '-b', 'feature', plainWorktree);

  // Plugin listed but disabled, and a settings file that is not valid JSON.
  disabledRepo = makeRepo('disabled');
  writeCardsSettings(path.join(disabledRepo, '.claude', 'settings.json'), {
    enabledPlugins: { 'cards@cards.management': false }
  });
  malformedRepo = makeRepo('malformed');
  mkdirSync(path.join(malformedRepo, '.claude'), { recursive: true });
  writeFileSync(path.join(malformedRepo, '.claude', 'settings.json'), '{ not json ');

  // JSONC: the extension reads and writes these files through `comment-json`
  // specifically so hand-written comments survive, so a settings file carrying
  // one is a shape the product itself produces — not user error.
  commentedRepo = makeRepo('jsonc-comment');
  writeJsoncSettings(
    path.join(commentedRepo, '.claude', 'settings.json'),
    `{
  // Cards plugin, injected by the VS Code extension
  "enabledPlugins": { "cards@cards.management": true },
  /* the marketplace the extension registered */
  "extraKnownMarketplaces": {
    "cards.management": { "source": { "source": "directory", "path": "/opt/cards" } }
  }
}`
  );

  trailingCommaRepo = makeRepo('jsonc-trailing-comma');
  writeJsoncSettings(
    path.join(trailingCommaRepo, '.claude', 'settings.json'),
    `{
  "enabledPlugins": { "cards@cards.management": true, },
  "extraKnownMarketplaces": {
    "cards.management": { "source": { "source": "directory", "path": "/opt/cards" } },
  },
}`
  );

  // Adjacent cases that used to fail the same silent way: a plugin enabled with
  // no marketplace entry, and a git-sourced marketplace carrying `url`.
  noMarketplaceRepo = makeRepo('no-marketplace');
  writeJsoncSettings(
    path.join(noMarketplaceRepo, '.claude', 'settings.json'),
    '{ "enabledPlugins": { "cards@cards.management": true } }'
  );

  gitMarketplaceRepo = makeRepo('git-marketplace');
  writeJsoncSettings(
    path.join(gitMarketplaceRepo, '.claude', 'settings.json'),
    `{
  "enabledPlugins": { "cards@cards.management": true },
  "extraKnownMarketplaces": {
    "cards.management": { "source": { "source": "git", "url": "https://example.com/cards.git" } }
  }
}`
  );

  // A value containing `//` — the comment scanner must not touch it.
  urlInStringRepo = makeRepo('url-in-string');
  writeJsoncSettings(
    path.join(urlInStringRepo, '.claude', 'settings.json'),
    `{
  "enabledPlugins": { "cards@cards.management": true },
  "extraKnownMarketplaces": {
    "cards.management": { "source": { "source": "directory", "path": "https://example.com/a//b" } }
  }
}`
  );

  nonRepoDir = path.join(scratchDir, 'no-repo');
  mkdirSync(nonRepoDir, { recursive: true });

  fakeHome = path.join(scratchDir, 'home');
  mkdirSync(fakeHome, { recursive: true });
  userConfigDir = path.join(fakeHome, '.claude');
  writeCardsSettings(path.join(userConfigDir, 'settings.json'));

  withoutUserScopeInstall();
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env[DEFAULT_LOG_FILE_ENV_VAR];
  delete process.env[LOG_ENV_VAR_INDIRECTION];
  delete process.env['MY_HOOK_LOG'];
  withoutUserScopeInstall();
});

afterAll(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  rmSync(scratchDir, { recursive: true, force: true });
});

describe('resolveDefaultApiHooksLogPath — per-repo install scope', () => {
  it('anchors on the repository for a claude-project install', () => {
    expect(resolveDefaultApiHooksLogPath(projectRepo)).toBe(cardsApiHooksLogPath(projectRepo));
  });

  it('anchors on the repository for a claude-local install', () => {
    expect(resolveDefaultApiHooksLogPath(localRepo)).toBe(cardsApiHooksLogPath(localRepo));
  });

  it('matches the extension cardsApiHooksLogPath() shape for the same anchor', () => {
    const source = readFileSync(
      path.join(repoRoot, 'packages', 'extension', 'src', 'services', 'ClaudeSettingsService.ts'),
      'utf8'
    );
    expect(source).toContain(expectedSourceExpression);
  });

  it('collapses a linked worktree to the main repo root', () => {
    expect(resolveDefaultApiHooksLogPath(projectWorktree)).toBe(cardsApiHooksLogPath(projectRepo));
  });

  it('collapses to the main repo root when only the worktree carries the install', () => {
    writeCardsSettings(path.join(plainWorktree, '.claude', 'settings.local.json'));
    try {
      expect(resolveDefaultApiHooksLogPath(plainWorktree)).toBe(cardsApiHooksLogPath(plainRepo));
    } finally {
      rmSync(path.join(plainWorktree, '.claude'), { recursive: true, force: true });
    }
  });
});

describe('resolveDefaultApiHooksLogPath — user install scope', () => {
  it('anchors on the home directory, not the repository the session runs in', () => {
    withUserScopeInstall();

    expect(resolveDefaultApiHooksLogPath(plainRepo)).toBe(cardsApiHooksLogPath(fakeHome));
  });

  it('never yields a path inside an unrelated repository', () => {
    withUserScopeInstall();

    const resolved = resolveDefaultApiHooksLogPath(plainRepo);

    expect(resolved).not.toBeNull();
    expect(resolved?.startsWith(`${plainRepo}${path.sep}`)).toBe(false);
    expect(existsSync(path.join(plainRepo, '.cards'))).toBe(false);
  });

  it('still anchors on the repository when both scopes are installed', () => {
    withUserScopeInstall();

    expect(resolveDefaultApiHooksLogPath(projectRepo)).toBe(cardsApiHooksLogPath(projectRepo));
  });

  it('anchors on the home directory outside any repository', () => {
    withUserScopeInstall();

    expect(resolveDefaultApiHooksLogPath(nonRepoDir)).toBe(cardsApiHooksLogPath(fakeHome));
  });
});

describe('resolveDefaultApiHooksLogPath — no recorded install', () => {
  it('returns null in a repository with no install and no user install', () => {
    expect(resolveDefaultApiHooksLogPath(plainRepo)).toBeNull();
  });

  it('returns null when the plugin is present but disabled', () => {
    expect(resolveDefaultApiHooksLogPath(disabledRepo)).toBeNull();
  });

  it('returns null when a settings file cannot be parsed', () => {
    expect(captureStderr(() => expect(resolveDefaultApiHooksLogPath(malformedRepo)).toBeNull())).toContain(
      'could not read'
    );
  });

  it('returns null outside any repository, rather than throwing', () => {
    expect(resolveDefaultApiHooksLogPath(nonRepoDir)).toBeNull();
  });

  it('returns null for a nonexistent directory rather than throwing', () => {
    const captured = captureStderr(() => {
      expect(resolveDefaultApiHooksLogPath(path.join(scratchDir, 'does-not-exist'))).toBeNull();
    });

    expect(captured).toContain('git rev-parse ENOENT');
  });

  it('returns null for a process cwd outside any repository', () => {
    expect(resolveDefaultApiHooksLogPath('/')).toBeNull();
  });
});

describe('resolveDefaultApiHooksLogPath — JSONC settings files', () => {
  // The extension reads and writes these files through `comment-json` so that
  // hand-written comments survive plugin injection. A reader that cannot cope
  // with a comment silently disables logging for a file the product produced.

  it('reads an install through a line comment', () => {
    expect(resolveDefaultApiHooksLogPath(commentedRepo)).toBe(cardsApiHooksLogPath(commentedRepo));
  });

  it('reads an install through a trailing comma', () => {
    expect(resolveDefaultApiHooksLogPath(trailingCommaRepo)).toBe(cardsApiHooksLogPath(trailingCommaRepo));
  });

  it('does not mistake // inside a string value for a comment', () => {
    expect(resolveDefaultApiHooksLogPath(urlInStringRepo)).toBe(cardsApiHooksLogPath(urlInStringRepo));
  });

  it('reports an unparseable settings file on stderr instead of silently ignoring it', () => {
    const captured = captureStderr(() => {
      expect(resolveDefaultApiHooksLogPath(malformedRepo)).toBeNull();
    });

    expect(captured).toContain(path.join(malformedRepo, '.claude', 'settings.json'));
    expect(captured).toContain('resolving the hook log anchor');
    // Outside a linked worktree the same file must not be read — or reported — twice.
    expect(captured.trimEnd().split('\n')).toHaveLength(1);
  });
});

describe('resolveDefaultApiHooksLogPath — install records without a usable marketplace path', () => {
  // `mergeClaudeSettingsChain()` additionally requires a non-empty
  // `source.path` because it goes on to `fs.stat` it. That requirement answers
  // "may the extension treat this install as live", not "where does the log
  // go", so applying it here only disabled logging for valid installs.

  it('anchors on an install recorded without any extraKnownMarketplaces entry', () => {
    expect(resolveDefaultApiHooksLogPath(noMarketplaceRepo)).toBe(cardsApiHooksLogPath(noMarketplaceRepo));
  });

  it('anchors on a git-sourced marketplace carrying url instead of path', () => {
    expect(resolveDefaultApiHooksLogPath(gitMarketplaceRepo)).toBe(cardsApiHooksLogPath(gitMarketplaceRepo));
  });
});

describe('resolveDefaultApiHooksLogPath — git resolution is memoized per cwd', () => {
  it('answers from cache after the repository is gone', () => {
    const throwaway = makeRepo('memoized');
    writeCardsSettings(path.join(throwaway, '.claude', 'settings.json'));

    expect(resolveDefaultApiHooksLogPath(throwaway)).toBe(cardsApiHooksLogPath(throwaway));

    // Only the git roots are cached, so removing .git — which is all a second
    // `git rev-parse` would consult — must not change the answer.
    rmSync(path.join(throwaway, '.git'), { recursive: true, force: true });

    expect(resolveDefaultApiHooksLogPath(throwaway)).toBe(cardsApiHooksLogPath(throwaway));
  });
});

describe('applyDefaultLogFile', () => {
  it('installs the computed default when no override is set', () => {
    const setLogFile = vi.spyOn(logger, 'setLogFile').mockImplementation(() => undefined);

    applyDefaultLogFile(projectRepo);

    expect(setLogFile).toHaveBeenCalledWith(cardsApiHooksLogPath(projectRepo));
  });

  it('leaves an explicit log file path untouched', () => {
    process.env[DEFAULT_LOG_FILE_ENV_VAR] = path.join(scratchDir, 'operator-override.log');
    const setLogFile = vi.spyOn(logger, 'setLogFile').mockImplementation(() => undefined);

    applyDefaultLogFile(projectRepo);

    expect(setLogFile).not.toHaveBeenCalled();
  });

  it('treats an empty log file path as file logging deliberately off', () => {
    // Upstream guards on `if (!this.logFilePath)`, so an empty value means off.
    process.env[DEFAULT_LOG_FILE_ENV_VAR] = '';
    const setLogFile = vi.spyOn(logger, 'setLogFile').mockImplementation(() => undefined);

    applyDefaultLogFile(projectRepo);

    expect(setLogFile).not.toHaveBeenCalled();
  });

  it('honours the log env var indirection the logger itself follows', () => {
    process.env[LOG_ENV_VAR_INDIRECTION] = 'MY_HOOK_LOG';
    process.env['MY_HOOK_LOG'] = path.join(scratchDir, 'redirected.log');
    const setLogFile = vi.spyOn(logger, 'setLogFile').mockImplementation(() => undefined);

    applyDefaultLogFile(projectRepo);

    expect(setLogFile).not.toHaveBeenCalled();
  });

  it('ignores the default env var when the indirection points elsewhere', () => {
    // The singleton would read MY_HOOK_LOG and find nothing, so file logging is
    // unset and the default applies — the stale default-named value is not an
    // override at all.
    process.env[LOG_ENV_VAR_INDIRECTION] = 'MY_HOOK_LOG';
    process.env[DEFAULT_LOG_FILE_ENV_VAR] = path.join(scratchDir, 'stale.log');
    const setLogFile = vi.spyOn(logger, 'setLogFile').mockImplementation(() => undefined);

    applyDefaultLogFile(projectRepo);

    expect(setLogFile).toHaveBeenCalledWith(cardsApiHooksLogPath(projectRepo));
  });

  it('leaves file logging off when no anchor resolves', () => {
    const setLogFile = vi.spyOn(logger, 'setLogFile').mockImplementation(() => undefined);

    applyDefaultLogFile(plainRepo);

    expect(setLogFile).not.toHaveBeenCalled();
  });

  it('re-points when a later payload cwd names another anchor', () => {
    const setLogFile = vi.spyOn(logger, 'setLogFile').mockImplementation(() => undefined);

    applyDefaultLogFile(localRepo);
    applyDefaultLogFile(projectRepo);

    expect(setLogFile).toHaveBeenNthCalledWith(1, cardsApiHooksLogPath(localRepo));
    expect(setLogFile).toHaveBeenNthCalledWith(2, cardsApiHooksLogPath(projectRepo));
  });

  it('reads the env var name the compiled claude-core bin actually stamps', () => {
    // build.mjs stamps `CLAUDE_CODE_HOOKS_LOG_ENV_VAR` into the bundle when the
    // target sets `logEnvVar`; a null target leaves the singleton on its own
    // default. Either way the gate must read the same name the singleton does.
    const coreTarget = targets.find((t: { name: string }) => t.name === 'claude-core') as
      | { logEnvVar: string | null }
      | undefined;

    expect(coreTarget).toBeDefined();
    expect(coreTarget?.logEnvVar ?? DEFAULT_LOG_FILE_ENV_VAR).toBe(DEFAULT_LOG_FILE_ENV_VAR);
  });
});

describe('log destination on disk', () => {
  /**
   * Writes one log entry through the real logger and returns whether the file
   * appeared, restoring the singleton afterwards.
   *
   * @param cwd - The hook payload `cwd` to resolve the default from.
   * @returns The path the default resolved to, or null.
   */
  function emitOneEntry(cwd: string): string | null {
    // Start from "no file destination" so a no-op apply writes nowhere at all,
    // rather than inheriting a path an earlier case (or module init) installed.
    logger.setLogFile(null);
    try {
      applyDefaultLogFile(cwd);
      logger.info('destination probe');
      return resolveDefaultApiHooksLogPath(cwd);
    } finally {
      logger.setLogFile(null);
    }
  }

  it('writes into the repository for a per-repo install', () => {
    const destination = emitOneEntry(localRepo);

    expect(destination).toBe(cardsApiHooksLogPath(localRepo));
    expect(readFileSync(cardsApiHooksLogPath(localRepo), 'utf8')).toContain('destination probe');
  });

  it('writes into the home directory for a user-scope install, leaving the repo clean', () => {
    withUserScopeInstall();

    const destination = emitOneEntry(plainRepo);

    expect(destination).toBe(cardsApiHooksLogPath(fakeHome));
    expect(readFileSync(cardsApiHooksLogPath(fakeHome), 'utf8')).toContain('destination probe');
    expect(existsSync(path.join(plainRepo, '.cards'))).toBe(false);
  });

  it('creates nothing at all when no install is recorded', () => {
    const destination = emitOneEntry(plainRepo);

    expect(destination).toBeNull();
    expect(existsSync(path.join(plainRepo, '.cards'))).toBe(false);
  });
});

describe('diagnostics with no file destination', () => {
  /**
   * Imports a fresh copy of the module, standing in for a fresh hook process.
   *
   * "Has anything claimed a file destination yet" is per-process state that a
   * real bin sets at most once, so these cases need module init, not the
   * already-latched instance the rest of this file shares.
   *
   * @returns The freshly evaluated module.
   */
  async function freshModule(): Promise<typeof import('../../../src/shared/default-log-file.js')> {
    vi.resetModules();
    return import('../../../src/shared/default-log-file.js');
  }

  it('mirrors an error to stderr rather than filing it under an unrelated repository', async () => {
    // The reproduced failure: the SDK emits `Failed to parse stdin JSON` before
    // any handler has read the payload, so no session anchor exists yet.
    const fresh = await freshModule();
    logger.setLogFile(null);

    try {
      const captured = captureStderr(() => {
        logger.error('Failed to parse stdin JSON');
      });

      expect(captured).toContain('Failed to parse stdin JSON');
      expect(existsSync(path.join(plainRepo, '.cards'))).toBe(false);
    } finally {
      // Each fresh instance stays subscribed to the shared singleton for the
      // rest of the file, so latch this one before leaving or it keeps
      // mirroring into later cases. A real bin has exactly one instance.
      fresh.applyDefaultLogFile(localRepo);
      logger.setLogFile(null);
    }
  });

  it('stops mirroring once a handler installs the real destination', async () => {
    const fresh = await freshModule();
    logger.setLogFile(null);
    fresh.applyDefaultLogFile(localRepo);

    try {
      const captured = captureStderr(() => {
        logger.error('handler-time failure');
      });

      expect(captured).toBe('');
      expect(readFileSync(cardsApiHooksLogPath(localRepo), 'utf8')).toContain('handler-time failure');
    } finally {
      logger.setLogFile(null);
    }
  });

  it('reports a broken git environment instead of stalling silently', () => {
    // A `git` that never returns is the 3s-stall-with-no-explanation case: the
    // routine "not a repository" exit stays silent, this must not.
    const stubDir = path.join(scratchDir, 'stub-bin');
    mkdirSync(stubDir, { recursive: true });
    const stub = path.join(stubDir, 'git');
    writeFileSync(stub, '#!/bin/sh\nexit 3\n');
    chmodSync(stub, 0o755);

    const savedPath = process.env['PATH'];
    process.env['PATH'] = stubDir;
    try {
      const captured = captureStderr(() => {
        expect(resolveDefaultApiHooksLogPath(path.join(scratchDir, 'broken-git-probe'))).toBeNull();
      });

      expect(captured).toContain('could not resolve a log anchor');
    } finally {
      process.env['PATH'] = savedPath;
    }
  });

  it('stays silent for the routine not-a-repository exit', () => {
    const captured = captureStderr(() => {
      expect(resolveDefaultApiHooksLogPath(nonRepoDir)).toBeNull();
    });

    expect(captured).toBe('');
  });
});
