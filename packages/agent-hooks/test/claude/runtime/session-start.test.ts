/**
 * Tests for the SessionStart hook.
 *
 * @summary Tests for the SessionStart hook
 */

import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { findAgentPid } from '@cards/sdk/process-tree';
import { writeSessionHeadSha } from '@cards/sessions/card-repo';
import { TestGitWorkspace } from '@cards/test-utils';
import { Logger } from '@goodfoot/claude-code-hooks';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import hook, { resolveHeadSha } from '../../../src/claude/runtime/session-start.js';

const mockFindClaudePid = vi.mocked(findAgentPid);
const mockWriteSessionHeadSha = vi.mocked(writeSessionHeadSha);

vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
  execFileSync: vi.fn(),
  spawn: vi.fn(() => ({ unref: vi.fn(), on: vi.fn() })),
  spawnSync: vi.fn(() => ({ status: 0 }))
}));

// The launch-mode watcher availability probe (spawnTranscriptWatcher) resolves
// the wrapper by ABSOLUTE path and checks it with `fs.existsSync` — not a
// `spawnSync` PATH probe. The watcher lives under the action's MARKETPLACE_PATH
// (`/tmp/extension/dist/marketplace/...`), which does not exist on disk in this
// test, so `existsSync` is mocked and defaults to "present"; the not-resolvable
// cases flip it to false. Other `node:fs` members (mkdirSync/writeFileSync used
// by beforeAll) keep their real implementations.
vi.mock('node:fs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs')>()),
  existsSync: vi.fn(() => true)
}));

vi.mock('@cards/sdk/process-tree', () => ({
  findAgentPid: vi.fn()
}));

vi.mock('@cards/sessions/card-repo', () => ({
  writeSessionHeadSha: vi.fn()
}));

const logger = new Logger();

const isWin = process.platform === 'win32';

// What the spawn's first argument is, per platform:
// - POSIX: the wrapper script itself (extension-less `transcript-watcher`),
//   exec'd directly.
// - win32: a real `node.exe` interpreter — there is NO `.cmd`/shell hop in the
//   detached tree (it would pop a console window under stock node). The watcher
//   is then `node.exe <transcript-watcher.mjs>`, so the `.mjs` is argv[0] of the
//   args array, and the wrapper-path regex matches that instead.
const WATCHER_PATH_RE = isWin
  ? /[/\\]claude[/\\]cards[/\\]bin[/\\]transcript-watcher\.mjs$/
  : /[/\\]claude[/\\]cards[/\\]bin[/\\]transcript-watcher$/;

// On win32 the detached interpreter is resolved fail-closed (VSCODE_NODE env →
// ~/.cards/VSCODE_NODE → PATH node). Pin it deterministically in tests via the
// env var so resolution does not depend on the host having a ~/.cards file.
const WIN32_TEST_NODE = 'C:\\fake\\node.exe';

/**
 * Returns the spawn first-arg (interpreter on win32, wrapper on POSIX) and the
 * args array the watcher would receive after it (the positional list, with the
 * `.mjs` prepended on win32).
 *
 * @param call - A recorded `spawn` mock call tuple.
 * @returns The spawn first argument, the resolved watcher path, and the
 *   positional argument list passed to the watcher.
 */
function watcherSpawnShape(call: unknown[]): { firstArg: string; watcherPath: string; positional: string[] } {
  const firstArg = call[0] as string;
  const args = call[1] as string[];
  if (isWin) {
    return { firstArg, watcherPath: args[0]!, positional: args.slice(1) };
  }
  return { firstArg, watcherPath: firstArg, positional: args };
}

let testRepo: TestGitWorkspace;
let repoPath: string;

beforeAll(async () => {
  testRepo = new TestGitWorkspace();
  repoPath = await testRepo.create();
  writeFileSync(
    join(repoPath, 'CARD.meta.json'),
    JSON.stringify({
      id: 'card-123',
      title: 'Test card',
      status: 'active',
      gates: { planRequired: false, planApproved: false, mergeRequestRequired: false, mergeApproved: false }
    })
  );
});

afterAll(() => {
  testRepo.destroy();
});

describe('resolveHeadSha', () => {
  let realExecFileSync: typeof execFileSync;

  beforeAll(async () => {
    const real = await vi.importActual<typeof import('node:child_process')>('node:child_process');
    realExecFileSync = real.execFileSync;
  });

  beforeEach(() => {
    vi.mocked(execFileSync).mockImplementation(realExecFileSync as typeof execFileSync);
  });

  afterEach(() => {
    vi.mocked(execFileSync).mockReset();
  });

  it('returns trimmed sha on success', async () => {
    const sha = resolveHeadSha(repoPath);
    const expectedSha = (await testRepo.getGit().revparse(['HEAD'])).trim();

    expect(sha).toBe(expectedSha);
    expect(sha).toMatch(/^[0-9a-f]{40}$/);
  });

  it('returns null when git command fails', () => {
    expect(resolveHeadSha('/tmp/not-a-repo')).toBeNull();
  });
});

describe('SessionStart Hook', () => {
  it('exports a valid hook function', () => {
    expect(hook).toBeDefined();
    expect(typeof hook).toBe('function');
  });

  it('has correct hookEventName metadata', () => {
    expect(hook.hookEventName).toBe('SessionStart');
  });

  describe('inside an action subprocess', () => {
    /** Minimal set of env vars required by extractActionInput. */
    let ACTION_ENV: Record<string, string>;

    beforeEach(async () => {
      // Get the real HEAD SHA for assertions
      ACTION_ENV = {
        CARD_ID: 'card-123',
        ACTION_NAME: 'Launch Claude',
        ENVIRONMENT: 'default',
        EXECUTION_MODE: 'background',
        REPO_ROOT: '/workspace',
        CARD_REPO_PATH: repoPath,
        CONFIG_PATH: '/tmp/config',
        EXTENSION_PATH: '/tmp/extension',
        MARKETPLACE_PATH: '/tmp/extension/dist/marketplace',
        WORKSPACE_PATH: '/workspace',
        BASE_BRANCH: 'main',
        WORKSPACE_BRANCH: 'cards/main-1/1',
        // Pins the win32 detached interpreter resolution (no-op on POSIX). The
        // path is existence-checked via fs.existsSync, which is mocked → true.
        VSCODE_NODE: WIN32_TEST_NODE
      };
      for (const [key, value] of Object.entries(ACTION_ENV)) {
        process.env[key] = value;
      }
    });

    afterEach(() => {
      for (const key of Object.keys(ACTION_ENV)) {
        delete process.env[key];
      }
      vi.mocked(execFileSync).mockReset();
      mockFindClaudePid.mockReset();
      mockWriteSessionHeadSha.mockReset();
      // Restore child_process mock defaults so a test that overrides spawn/
      // spawnSync (or one that fails an assertion before its own cleanup) does
      // not leak readiness/spawn state into subsequent tests.
      vi.mocked(spawn).mockReset();
      vi.mocked(spawn).mockReturnValue({ unref: vi.fn(), on: vi.fn() } as unknown as ReturnType<typeof spawn>);
      vi.mocked(spawnSync).mockReset();
      vi.mocked(spawnSync).mockReturnValue({ status: 0 } as unknown as ReturnType<typeof spawnSync>);
      // Restore the watcher-availability probe default (`fs.existsSync` → present)
      // so a not-resolvable test does not leak a false reading into later tests.
      vi.mocked(existsSync).mockReset();
      vi.mocked(existsSync).mockReturnValue(true);
    });

    it('returns XML context blocks in additionalContext', async () => {
      mockFindClaudePid.mockReturnValue(42);
      const realSha = (await testRepo.getGit().revparse(['HEAD'])).trim();
      vi.mocked(execFileSync).mockReturnValue(`${realSha}\n`);
      const mockInput = {} as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'SessionStart');
      expect(result).toHaveProperty('stdout');

      const stdout = result!.stdout as { systemMessage?: string; hookSpecificOutput?: { additionalContext?: string } };

      // Env block with EXECUTION_MODE
      expect(stdout.systemMessage).toMatch(/^```bash\n/);
      expect(stdout.systemMessage).toContain('EXECUTION_MODE=background');
      expect(stdout.systemMessage).toContain(`CARD_REPO_PATH=${repoPath}`);

      // No <card> block — agents read CARD.meta.json directly
      expect(stdout.systemMessage).not.toContain('<card>');
      expect(stdout.systemMessage).not.toContain('</card>');

      // additionalContext mirrors systemMessage
      const additional = stdout.hookSpecificOutput!.additionalContext!;
      expect(additional).toBe(stdout.systemMessage);
    });

    it('persists git HEAD sha via writeSessionHeadSha', async () => {
      mockFindClaudePid.mockReturnValue(42);
      const expectedSha = (await testRepo.getGit().revparse(['HEAD'])).trim();
      vi.mocked(execFileSync).mockReturnValue(`${expectedSha}\n`);
      const mockInput = { session_id: 'sess-sha' } as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      await hook(mockInput, context);

      expect(mockWriteSessionHeadSha).toHaveBeenCalledWith('sess-sha', expectedSha);
    });

    it('does not call writeSessionHeadSha when git fails', async () => {
      mockFindClaudePid.mockReturnValue(42);
      // Use a real directory that exists but is not a git repo
      const tmpDir = join(repoPath, '..', `no-git-${Date.now()}`);
      mkdirSync(tmpDir, { recursive: true });
      writeFileSync(
        join(tmpDir, 'CARD.meta.json'),
        JSON.stringify({
          id: 'card-123',
          title: 'Test',
          status: 'active',
          gates: { planRequired: false, planApproved: false, mergeRequestRequired: false, mergeApproved: false }
        })
      );
      process.env['CARD_REPO_PATH'] = tmpDir;
      const mockInput = {} as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      const result = await hook(mockInput, context);

      expect(mockWriteSessionHeadSha).not.toHaveBeenCalled();
      const stdout = result!.stdout as { systemMessage?: string };
      expect(stdout.systemMessage).not.toContain('HEAD:');
    });

    it('persists CARDS_SESSION_ID via persistEnvVar', async () => {
      mockFindClaudePid.mockReturnValue(42);
      vi.mocked(execFileSync).mockReturnValue('abc123\n');
      const mockInput = { session_id: 'sess-env-test', transcript_path: '/tmp/transcript.jsonl' } as Parameters<
        typeof hook
      >[0];
      const mockPersistEnvVar = vi.fn();
      const context = { logger, persistEnvVar: mockPersistEnvVar, persistEnvVars: vi.fn() };

      await hook(mockInput, context);

      expect(mockPersistEnvVar).toHaveBeenCalledWith('CARDS_SESSION_ID', 'sess-env-test');
    });

    it('calls findAgentPid when inside action subprocess', async () => {
      mockFindClaudePid.mockReturnValue(42);
      vi.mocked(execFileSync).mockReturnValue('abc123\n');
      const mockInput = { session_id: 'sess-123', transcript_path: '/tmp/transcript.jsonl' } as Parameters<
        typeof hook
      >[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      await hook(mockInput, context);

      expect(mockFindClaudePid).toHaveBeenCalled();
    });

    it('warns and continues when findAgentPid returns null (PID-keyed entry is best-effort)', async () => {
      const warnSpy = vi.spyOn(logger, 'warn');
      mockFindClaudePid.mockReturnValue(null);
      vi.mocked(execFileSync).mockReturnValue('abc123\n');
      const mockInput = { session_id: 'sess-123', transcript_path: '/tmp/transcript.jsonl' } as Parameters<
        typeof hook
      >[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      const result = await hook(mockInput, context);

      expect(mockFindClaudePid).toHaveBeenCalled();

      const stdout = result!.stdout as {
        continue?: boolean;
        systemMessage?: string;
        stopReason?: string;
      };
      expect(stdout.continue).not.toBe(false);
      expect(stdout.stopReason).toBeUndefined();

      const warnMatch = warnSpy.mock.calls.find(
        ([msg, meta]) =>
          typeof msg === 'string' &&
          /agent PID/i.test(msg) &&
          meta !== undefined &&
          (meta as Record<string, unknown>)['cardId'] === 'card-123' &&
          (meta as Record<string, unknown>)['cardRepoPath'] === repoPath &&
          (meta as Record<string, unknown>)['actionName'] === 'Launch Claude'
      );
      expect(
        warnMatch,
        `expected diagnostic warn with cardId/cardRepoPath/actionName; got: ${JSON.stringify(warnSpy.mock.calls)}`
      ).toBeDefined();
      warnSpy.mockRestore();
    });

    it('spawns transcript watcher with correct args', async () => {
      mockFindClaudePid.mockReturnValue(42);
      vi.mocked(execFileSync).mockReturnValue('abc123\n');
      const mockInput = { session_id: 'sess-123', transcript_path: '/tmp/transcript.jsonl' } as Parameters<
        typeof hook
      >[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      await hook(mockInput, context);

      expect(vi.mocked(spawn)).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['42', 'sess-123', '/tmp/transcript.jsonl', 'card-123', repoPath]),
        expect.objectContaining({ detached: true, stdio: 'ignore' })
      );
    });

    // Reproduction (main-98): the background Launch action enables only the
    // `runtime` plugin, so the `cards` plugin's bin/ — which publishes the
    // `transcript-watcher` wrapper — is never on PATH. Spawning by bare name
    // therefore exits 127 and the watcher never starts. The hook must instead
    // resolve the watcher by absolute path under the marketplace cards bin.
    it('spawns transcript-watcher by absolute path under the cards plugin bin, not a bare PATH name', async () => {
      vi.mocked(spawn).mockClear();
      mockFindClaudePid.mockReturnValue(42);
      vi.mocked(execFileSync).mockReturnValue('abc123\n');
      const mockInput = { session_id: 'sess-abs', transcript_path: '/tmp/transcript.jsonl' } as Parameters<
        typeof hook
      >[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      await hook(mockInput, context);

      const { firstArg, watcherPath } = watcherSpawnShape(vi.mocked(spawn).mock.calls.at(-1)!);
      // POSIX: the wrapper script is spawned directly. win32: a real node.exe
      // interpreter is the first arg (no `.cmd`/shell hop), and the sibling
      // `.mjs` it runs is the resolved watcher path.
      if (isWin) {
        expect(firstArg).toBe(WIN32_TEST_NODE);
      }
      expect(
        isAbsolute(watcherPath),
        `expected an absolute watcher path resolved from MARKETPLACE_PATH; got: ${watcherPath}`
      ).toBe(true);
      expect(watcherPath).toMatch(WATCHER_PATH_RE);
      // Anchored on the action's MARKETPLACE_PATH (ACTION_ENV).
      expect(watcherPath).toContain(join('/tmp/extension/dist/marketplace', 'claude', 'cards', 'bin'));
    });

    // Reproduction (main-98): spawnWatcher logged "Spawned transcript watcher"
    // unconditionally, even when spawnTranscriptWatcher skipped the spawn (e.g.
    // readiness probe exits non-zero). The success log must only appear when a
    // watcher was actually spawned.
    it('does not log spawn success when the watcher is not resolvable', async () => {
      vi.mocked(spawn).mockClear();
      // Launch mode resolves an absolute path and probes it with fs.existsSync;
      // simulate the wrapper file being absent.
      vi.mocked(existsSync).mockReturnValue(false);
      const infoSpy = vi.spyOn(logger, 'info');
      mockFindClaudePid.mockReturnValue(42);
      vi.mocked(execFileSync).mockReturnValue('abc123\n');
      const mockInput = { session_id: 'sess-skip', transcript_path: '/tmp/transcript.jsonl' } as Parameters<
        typeof hook
      >[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      await hook(mockInput, context);

      const falseSuccess = infoSpy.mock.calls.find(
        ([msg]) => typeof msg === 'string' && /spawned transcript watcher/i.test(msg)
      );
      expect(
        falseSuccess,
        `spawn was skipped (readiness failed) but a success log was emitted: ${JSON.stringify(infoSpy.mock.calls)}`
      ).toBeUndefined();
      expect(vi.mocked(spawn)).not.toHaveBeenCalled();
      infoSpy.mockRestore();
    });

    it('spawns the resolved watcher path with the positional arg list in order', async () => {
      mockFindClaudePid.mockReturnValue(42);
      vi.mocked(execFileSync).mockReturnValue('abc123\n');
      const mockInput = { session_id: 'sess-123', transcript_path: '/tmp/transcript.jsonl' } as Parameters<
        typeof hook
      >[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      await hook(mockInput, context);

      const { firstArg, watcherPath, positional } = watcherSpawnShape(vi.mocked(spawn).mock.calls.at(-1)!);
      expect(watcherPath).toMatch(WATCHER_PATH_RE);
      expect(positional).toEqual(['42', 'sess-123', '/tmp/transcript.jsonl', 'card-123', repoPath]);
      const opts = vi.mocked(spawn).mock.calls.at(-1)![2] as Record<string, unknown>;
      expect(opts).toMatchObject({ detached: true, stdio: 'ignore' });
      // win32: direct node + .mjs, windowsHide on, and NO shell (the whole point —
      // a `.cmd`/shell hop would pop a console window in this detached tree).
      if (isWin) {
        expect(firstArg).toBe(WIN32_TEST_NODE);
        expect(opts['windowsHide']).toBe(true);
        expect(opts['shell']).toBeUndefined();
      }
    });

    it('logs structured error when spawn emits error event asynchronously', async () => {
      const emitter = new EventEmitter() as EventEmitter & { unref: () => void };
      emitter.unref = vi.fn();
      vi.mocked(spawn).mockReturnValue(emitter as unknown as ReturnType<typeof spawn>);
      const errorSpy = vi.spyOn(logger, 'error');
      mockFindClaudePid.mockReturnValue(42);
      vi.mocked(execFileSync).mockReturnValue('abc123\n');
      const mockInput = { session_id: 'sess-err', transcript_path: '/tmp/t.jsonl' } as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      await hook(mockInput, context);
      emitter.emit('error', new Error('ENOENT: watcher missing'));
      await new Promise((r) => setImmediate(r));

      const match = errorSpy.mock.calls.find(
        ([msg, meta]) =>
          typeof msg === 'string' &&
          /watcher/i.test(msg) &&
          meta !== undefined &&
          JSON.stringify(meta).includes('ENOENT')
      );
      expect(
        match,
        `expected a transcript-watcher spawn error log; got: ${JSON.stringify(errorSpy.mock.calls)}`
      ).toBeDefined();
      errorSpy.mockRestore();
    });

    it('logs readiness failure and does not spawn when the resolved watcher file is absent', async () => {
      vi.mocked(spawn).mockClear();
      // Launch mode probes the resolved absolute path with fs.existsSync;
      // simulate the wrapper file being absent.
      vi.mocked(existsSync).mockReturnValue(false);
      const errorSpy = vi.spyOn(logger, 'error');
      mockFindClaudePid.mockReturnValue(42);
      vi.mocked(execFileSync).mockReturnValue('abc123\n');
      const mockInput = { session_id: 'sess-r', transcript_path: '/tmp/t.jsonl' } as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      await hook(mockInput, context);

      const match = errorSpy.mock.calls.find(
        ([msg, meta]) =>
          typeof msg === 'string' &&
          /transcript-watcher/i.test(msg) &&
          meta !== undefined &&
          /transcript-watcher/.test(JSON.stringify(meta))
      );
      expect(match, `expected a readiness error log; got: ${JSON.stringify(errorSpy.mock.calls)}`).toBeDefined();
      expect(vi.mocked(spawn)).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('continues when watcher spawn fails', async () => {
      vi.mocked(spawn).mockImplementation(() => {
        throw new Error('spawn failed');
      });
      mockFindClaudePid.mockReturnValue(42);
      vi.mocked(execFileSync).mockReturnValue('abc123\n');
      const mockInput = { session_id: 'sess-123', transcript_path: '/tmp/transcript.jsonl' } as Parameters<
        typeof hook
      >[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      // Should not throw — watcher spawn is best-effort
      const result = await hook(mockInput, context);
      expect(result).toHaveProperty('_type', 'SessionStart');
    });

    it('returns continue:false with stopReason when card repo is inaccessible', async () => {
      mockFindClaudePid.mockReturnValue(42);
      process.env['CARD_REPO_PATH'] = '/tmp/does-not-exist-xyz-123';
      vi.mocked(execFileSync).mockReturnValue('abc123\n');
      const mockInput = { session_id: 'sess-123' } as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'SessionStart');
      const stdout = result!.stdout as {
        continue?: boolean;
        systemMessage?: string;
        stopReason?: string;
      };
      expect(stdout.continue).toBe(false);
      expect(stdout.stopReason).toMatch(/Card repository inaccessible/);
      expect(stdout.stopReason).toContain('/tmp/does-not-exist-xyz-123');
      expect(stdout.systemMessage).toContain('not accessible');
      expect(stdout.systemMessage).toContain('To resolve:');
      expect(stdout.systemMessage).toContain('CARD_REPO_PATH');
    });
  });

  describe('outside an action subprocess', () => {
    afterEach(() => {
      mockFindClaudePid.mockReset();
    });

    it('returns an error message when action env vars are missing', async () => {
      const mockInput = {} as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'SessionStart');
      const stdout = result!.stdout as { systemMessage?: string };
      expect(stdout.systemMessage).toContain('not running inside an action subprocess');
    });

    it('does not call findAgentPid when outside action subprocess', async () => {
      const mockInput = {} as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      await hook(mockInput, context);

      expect(mockFindClaudePid).not.toHaveBeenCalled();
    });
  });
});
