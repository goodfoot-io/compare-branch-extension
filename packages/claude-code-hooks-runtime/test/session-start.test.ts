/**
 * Tests for the SessionStart hook.
 *
 * @summary Tests for the SessionStart hook
 */

import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { findAgentPid, registerSession } from '@cards/sessions';
import { writeSessionHeadSha } from '@cards/sessions/card-repo';
import { TestGitWorkspace } from '@cards/test-utils';
import { Logger } from '@goodfoot/claude-code-hooks';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import hook, { resolveHeadSha } from '../src/session-start.js';

const mockFindClaudePid = vi.mocked(findAgentPid);
const mockRegisterSession = vi.mocked(registerSession);
const mockWriteSessionHeadSha = vi.mocked(writeSessionHeadSha);

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
  spawn: vi.fn(() => ({ unref: vi.fn(), on: vi.fn() })),
  spawnSync: vi.fn(() => ({ status: 0 }))
}));

vi.mock('@cards/sessions', () => ({
  findAgentPid: vi.fn(),
  registerSession: vi.fn()
}));

vi.mock('@cards/sessions/card-repo', () => ({
  writeSessionHeadSha: vi.fn()
}));

const logger = new Logger();

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
      vi.mocked(execFileSync).mockReset();
      mockFindClaudePid.mockReset();
      mockRegisterSession.mockReset();
      mockWriteSessionHeadSha.mockReset();
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

    it('calls findAgentPid and registerSession with correct args when inside action subprocess', async () => {
      mockFindClaudePid.mockReturnValue(42);
      vi.mocked(execFileSync).mockReturnValue('abc123\n');
      const mockInput = { session_id: 'sess-123', transcript_path: '/tmp/transcript.jsonl' } as Parameters<
        typeof hook
      >[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      await hook(mockInput, context);

      expect(mockFindClaudePid).toHaveBeenCalled();
      expect(mockRegisterSession).toHaveBeenCalledWith(42, 'sess-123');
    });

    it('returns continue:false when findAgentPid returns null (catastrophic failure)', async () => {
      mockFindClaudePid.mockReturnValue(null);
      vi.mocked(execFileSync).mockReturnValue('abc123\n');
      const mockInput = { session_id: 'sess-123', transcript_path: '/tmp/transcript.jsonl' } as Parameters<
        typeof hook
      >[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      const result = await hook(mockInput, context);

      expect(mockFindClaudePid).toHaveBeenCalled();
      expect(mockRegisterSession).not.toHaveBeenCalled();

      const stdout = result!.stdout as {
        continue?: boolean;
        systemMessage?: string;
        stopReason?: string;
      };
      expect(stdout.continue).toBe(false);
      expect(stdout.stopReason).toContain('Could not find agent PID');
      expect(stdout.stopReason).toContain('sess-123');
      expect(stdout.systemMessage).toContain('Could not locate a supported agent process');
      expect(stdout.systemMessage).toContain('sess-123');
      expect(stdout.systemMessage).toContain('To resolve:');
    });

    it('returns continue:false with stopReason when registerSession throws', async () => {
      mockFindClaudePid.mockReturnValue(42);
      mockRegisterSession.mockRejectedValue(new Error('disk full'));
      vi.mocked(execFileSync).mockReturnValue('abc123\n');
      const mockInput = { session_id: 'sess-123', transcript_path: '/tmp/transcript.jsonl' } as Parameters<
        typeof hook
      >[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'SessionStart');
      const stdout = result!.stdout as {
        continue?: boolean;
        systemMessage?: string;
        stopReason?: string;
      };
      expect(stdout.continue).toBe(false);
      expect(stdout.stopReason).toMatch(/Session registration failed/);
      expect(stdout.stopReason).toContain('disk full');
      expect(stdout.systemMessage).toContain('PID 42');
      expect(stdout.systemMessage).toContain('sess-123');
      expect(stdout.systemMessage).toContain('To resolve:');
    });

    it('spawns transcript watcher with correct args after successful registration', async () => {
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

    it('spawns watcher binary by name so PATH resolution locates it', async () => {
      mockFindClaudePid.mockReturnValue(42);
      vi.mocked(execFileSync).mockReturnValue('abc123\n');
      const mockInput = { session_id: 'sess-123', transcript_path: '/tmp/transcript.jsonl' } as Parameters<
        typeof hook
      >[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      await hook(mockInput, context);

      expect(vi.mocked(spawn)).toHaveBeenCalledWith(
        'transcript-watcher',
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

    it('logs readiness failure and does not spawn when transcript-watcher is not on PATH', async () => {
      vi.mocked(spawn).mockClear();
      vi.mocked(spawnSync).mockReturnValue({ status: 1 } as unknown as ReturnType<typeof spawnSync>);
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
          /PATH|status/.test(JSON.stringify(meta))
      );
      expect(match, `expected a readiness error log; got: ${JSON.stringify(errorSpy.mock.calls)}`).toBeDefined();
      expect(vi.mocked(spawn)).not.toHaveBeenCalled();
      errorSpy.mockRestore();
      vi.mocked(spawnSync).mockReturnValue({ status: 0 } as unknown as ReturnType<typeof spawnSync>);
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
      mockRegisterSession.mockReset();
    });

    it('returns an error message when action env vars are missing', async () => {
      const mockInput = {} as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'SessionStart');
      const stdout = result!.stdout as { systemMessage?: string };
      expect(stdout.systemMessage).toContain('not running inside an action subprocess');
    });

    it('does not call findAgentPid or registerSession when outside action subprocess', async () => {
      const mockInput = {} as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      await hook(mockInput, context);

      expect(mockFindClaudePid).not.toHaveBeenCalled();
      expect(mockRegisterSession).not.toHaveBeenCalled();
    });
  });
});
