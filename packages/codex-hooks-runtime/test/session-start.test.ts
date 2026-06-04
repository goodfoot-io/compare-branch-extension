/**
 * Tests for the SessionStart hook.
 *
 * @summary Tests for the SessionStart hook
 */

import { spawn, spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { existsSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { findAgentPid } from '@cards/sdk/process-tree';
import { TestGitWorkspace } from '@cards/test-utils';
import { Logger } from '@goodfoot/codex-hooks';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import hook from '../src/session-start.js';

const mockFindClaudePid = vi.mocked(findAgentPid);

vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
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

// The wrapper is selected by platform: `transcript-watcher.cmd` on win32
// (Windows cannot exec the extension-less POSIX script) and `transcript-watcher`
// elsewhere. Tests that assert the resolved watcher path must accept either.
const WATCHER_PATH_RE =
  process.platform === 'win32'
    ? /[/\\]claude[/\\]cards[/\\]bin[/\\]transcript-watcher\.cmd$/
    : /[/\\]claude[/\\]cards[/\\]bin[/\\]transcript-watcher$/;

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
        WORKSPACE_BRANCH: 'cards/main-1/1'
      };
      for (const [key, value] of Object.entries(ACTION_ENV)) {
        process.env[key] = value;
      }
    });

    afterEach(() => {
      for (const key of Object.keys(ACTION_ENV)) {
        delete process.env[key];
      }
      mockFindClaudePid.mockReset();
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
      const mockInput = {} as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'SessionStart');
      expect(result).toHaveProperty('stdout');

      const stdout = (
        result as { stdout: { systemMessage?: string; hookSpecificOutput?: { additionalContext?: string } } }
      ).stdout;

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

    it('calls findAgentPid when inside action subprocess', async () => {
      mockFindClaudePid.mockReturnValue(42);
      const mockInput = { session_id: 'sess-123', transcript_path: '/tmp/transcript.jsonl' } as Parameters<
        typeof hook
      >[0];
      const context = { logger };

      await hook(mockInput, context);

      expect(mockFindClaudePid).toHaveBeenCalled();
    });

    it('warns and continues when findAgentPid returns null (PID-keyed entry is best-effort)', async () => {
      const warnSpy = vi.spyOn(logger, 'warn');
      mockFindClaudePid.mockReturnValue(null);
      const mockInput = { session_id: 'sess-123', transcript_path: '/tmp/transcript.jsonl' } as Parameters<
        typeof hook
      >[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      expect(mockFindClaudePid).toHaveBeenCalled();

      const stdout = (result as { stdout: { continue?: boolean; systemMessage?: string; stopReason?: string } }).stdout;
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

    it('does not spawn the transcript watcher when transcript_path is null', async () => {
      mockFindClaudePid.mockReturnValue(42);
      const warnSpy = vi.spyOn(logger, 'warn');
      // transcript_path is absent (null / undefined) — watcher guard is false
      const mockInput = { session_id: 'sess-no-transcript' } as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      // Hook must succeed — no throw, normal SessionStart output
      expect(result).toHaveProperty('_type', 'SessionStart');
      const stdout = (result as { stdout: { continue?: boolean; stopReason?: string } }).stdout;
      expect(stdout.continue).not.toBe(false);
      expect(stdout.stopReason).toBeUndefined();

      // Watcher must NOT be spawned
      expect(vi.mocked(spawn)).not.toHaveBeenCalled();

      // A warning must be emitted explaining why the watcher was skipped
      const warnMatch = warnSpy.mock.calls.find(
        ([msg]) => typeof msg === 'string' && /agent PID|transcript watcher/i.test(msg)
      );
      expect(
        warnMatch,
        `expected a warn about skipped watcher; got: ${JSON.stringify(warnSpy.mock.calls)}`
      ).toBeDefined();
      warnSpy.mockRestore();
    });

    it('spawns transcript watcher with correct args', async () => {
      mockFindClaudePid.mockReturnValue(42);
      const mockInput = { session_id: 'sess-123', transcript_path: '/tmp/transcript.jsonl' } as Parameters<
        typeof hook
      >[0];
      const context = { logger };

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
      const mockInput = { session_id: 'sess-abs', transcript_path: '/tmp/transcript.jsonl' } as Parameters<
        typeof hook
      >[0];
      const context = { logger };

      await hook(mockInput, context);

      const watcherArg = vi.mocked(spawn).mock.calls.at(-1)?.[0] as string;
      expect(
        isAbsolute(watcherArg),
        `expected an absolute watcher path resolved from MARKETPLACE_PATH; got: ${watcherArg}`
      ).toBe(true);
      expect(watcherArg).toMatch(WATCHER_PATH_RE);
      // Anchored on the action's MARKETPLACE_PATH (ACTION_ENV).
      expect(watcherArg).toContain(join('/tmp/extension/dist/marketplace', 'claude', 'cards', 'bin'));
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
      const mockInput = { session_id: 'sess-skip', transcript_path: '/tmp/transcript.jsonl' } as Parameters<
        typeof hook
      >[0];
      const context = { logger };

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
      const mockInput = { session_id: 'sess-123', transcript_path: '/tmp/transcript.jsonl' } as Parameters<
        typeof hook
      >[0];
      const context = { logger };

      await hook(mockInput, context);

      expect(vi.mocked(spawn)).toHaveBeenCalledWith(
        expect.stringMatching(WATCHER_PATH_RE),
        ['42', 'sess-123', '/tmp/transcript.jsonl', 'card-123', repoPath],
        expect.objectContaining({ detached: true, stdio: 'ignore' })
      );
    });

    it('logs structured error when spawn emits error event asynchronously', async () => {
      const emitter = new EventEmitter() as EventEmitter & { unref: () => void };
      emitter.unref = vi.fn();
      vi.mocked(spawn).mockReturnValue(emitter as unknown as ReturnType<typeof spawn>);
      const errorSpy = vi.spyOn(logger, 'error');
      mockFindClaudePid.mockReturnValue(42);
      const mockInput = { session_id: 'sess-err', transcript_path: '/tmp/t.jsonl' } as Parameters<typeof hook>[0];
      const context = { logger };

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
      const mockInput = { session_id: 'sess-r', transcript_path: '/tmp/t.jsonl' } as Parameters<typeof hook>[0];
      const context = { logger };

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
      const mockInput = { session_id: 'sess-123', transcript_path: '/tmp/transcript.jsonl' } as Parameters<
        typeof hook
      >[0];
      const context = { logger };

      // Should not throw — watcher spawn is best-effort
      const result = await hook(mockInput, context);
      expect(result).toHaveProperty('_type', 'SessionStart');
    });

    it('returns continue:false with stopReason when card repo is inaccessible', async () => {
      mockFindClaudePid.mockReturnValue(42);
      process.env['CARD_REPO_PATH'] = '/tmp/does-not-exist-xyz-123';
      const mockInput = { session_id: 'sess-123' } as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'SessionStart');
      const stdout = (result as { stdout: { continue?: boolean; systemMessage?: string; stopReason?: string } }).stdout;
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
      const context = { logger };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'SessionStart');
      const stdout = (result as { stdout: { systemMessage?: string } }).stdout;
      expect(stdout.systemMessage).toContain('not running inside an action subprocess');
    });

    it('does not call findAgentPid when outside action subprocess', async () => {
      const mockInput = {} as Parameters<typeof hook>[0];
      const context = { logger };

      await hook(mockInput, context);

      expect(mockFindClaudePid).not.toHaveBeenCalled();
    });
  });
});
