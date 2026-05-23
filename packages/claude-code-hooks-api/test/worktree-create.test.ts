/**
 * Tests for the WorktreeCreate hook handler.
 *
 * Mocks createWorktree to avoid real git operations. Verifies CARD_ID forwarding,
 * settle-awaiting, error propagation, and output shape.
 *
 * @summary WorktreeCreate hook handler tests
 */

import type { Logger } from '@goodfoot/claude-code-hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@cards/sdk/worktree', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cards/sdk/worktree')>();
  return {
    ...actual,
    createWorktree: vi.fn()
  };
});

vi.mock('@cards/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cards/sdk')>();
  return {
    ...actual,
    resolveExtensionPath: vi.fn(),
    resolveSessionId: vi.fn()
  };
});

vi.mock('@cards/sessions/card-repo', () => ({
  readSessionCardId: vi.fn()
}));

import { resolveExtensionPath, resolveSessionId } from '@cards/sdk';
import { createWorktree } from '@cards/sdk/worktree';
import { readSessionCardId } from '@cards/sessions/card-repo';
import hookFn from '../src/worktree-create.js';

describe('WorktreeCreate hook', () => {
  const originalEnv = process.env;
  const mockCreateWorktree = vi.mocked(createWorktree);
  const mockLogger = {
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  };

  const baseInput = {
    session_id: 'test-session',
    transcript_path: '/tmp/transcript.jsonl',
    cwd: '/test/workspace',
    hook_event_name: 'WorktreeCreate' as const,
    name: 'feature/test-branch'
  };

  beforeEach(() => {
    process.env = { ...originalEnv };
    mockCreateWorktree.mockReset();
    vi.mocked(resolveExtensionPath).mockReset();
    // Default: extension path resolves so card-bound tests that don't override
    // it still produce valid compiledScriptPaths.
    vi.mocked(resolveExtensionPath).mockResolvedValue('/ext/install');
    // Default: no session binding, so the env CARD_ID path is exercised in
    // isolation unless a test opts into the session fallback.
    vi.mocked(resolveSessionId).mockReset();
    vi.mocked(resolveSessionId).mockResolvedValue(null);
    vi.mocked(readSessionCardId).mockReset();
    vi.mocked(readSessionCardId).mockReturnValue(null);
    mockLogger.debug.mockReset();
    mockLogger.warn.mockReset();
    mockLogger.info.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('has correct hookEventName', () => {
    expect(hookFn.hookEventName).toBe('WorktreeCreate');
  });

  it('returns worktreePath in output after settle resolves', async () => {
    const worktreePath = '/worktrees/test/feature/test-branch';
    const settleResult = {
      branch: 'feature/test-branch',
      worktree: worktreePath,
      baseSha: 'abc123',
      copiedFromInclude: 0,
      reroutedSymlinks: 5
    };
    mockCreateWorktree.mockResolvedValue({
      path: worktreePath,
      settle: Promise.resolve(settleResult)
    });

    const result = await hookFn(baseInput, { logger: mockLogger as unknown as Logger });

    expect(result).not.toBeNull();
    // WorktreeCreate is a command hook: the path is written to stdout as plain
    // text via rawStdout so Claude Code can chdir into it; the JSON stdout is empty.
    expect((result as { rawStdout: string }).rawStdout).toBe(worktreePath);
  });

  it('calls createWorktree with cardId from CARD_ID env when set', async () => {
    process.env['CARD_ID'] = 'main-42';
    const worktreePath = '/worktrees/test/feature/test-branch';
    mockCreateWorktree.mockResolvedValue({
      path: worktreePath,
      settle: Promise.resolve({
        branch: 'feature/test-branch',
        worktree: worktreePath,
        baseSha: 'abc123',
        copiedFromInclude: 0,
        reroutedSymlinks: 0
      })
    });

    await hookFn(baseInput, { logger: mockLogger as unknown as Logger });

    expect(mockCreateWorktree).toHaveBeenCalledWith(
      'feature/test-branch',
      expect.objectContaining({ cardId: 'main-42', cwd: '/test/workspace' })
    );
  });

  it('calls createWorktree without cardId when CARD_ID is not set', async () => {
    delete process.env['CARD_ID'];
    const worktreePath = '/worktrees/test/feature/test-branch';
    mockCreateWorktree.mockResolvedValue({
      path: worktreePath,
      settle: Promise.resolve({
        branch: 'feature/test-branch',
        worktree: worktreePath,
        baseSha: 'abc123',
        copiedFromInclude: 0,
        reroutedSymlinks: 0
      })
    });

    await hookFn(baseInput, { logger: mockLogger as unknown as Logger });

    const call = mockCreateWorktree.mock.calls[0]!;
    expect((call[1] as Record<string, unknown> | undefined)?.['cardId']).toBeUndefined();
  });

  it('calls createWorktree without cardId when CARD_ID is empty string', async () => {
    process.env['CARD_ID'] = '';
    const worktreePath = '/worktrees/test/feature/test-branch';
    mockCreateWorktree.mockResolvedValue({
      path: worktreePath,
      settle: Promise.resolve({
        branch: 'feature/test-branch',
        worktree: worktreePath,
        baseSha: 'abc123',
        copiedFromInclude: 0,
        reroutedSymlinks: 0
      })
    });

    await hookFn(baseInput, { logger: mockLogger as unknown as Logger });

    const call = mockCreateWorktree.mock.calls[0]!;
    expect((call[1] as Record<string, unknown> | undefined)?.['cardId']).toBeUndefined();
  });

  it('uses input.cwd as cwd for createWorktree', async () => {
    const worktreePath = '/worktrees/test/feature/test-branch';
    mockCreateWorktree.mockResolvedValue({
      path: worktreePath,
      settle: Promise.resolve({
        branch: 'feature/test-branch',
        worktree: worktreePath,
        baseSha: 'abc123',
        copiedFromInclude: 0,
        reroutedSymlinks: 0
      })
    });

    await hookFn({ ...baseInput, cwd: '/custom/cwd' }, { logger: mockLogger as unknown as Logger });

    expect(mockCreateWorktree).toHaveBeenCalledWith(
      'feature/test-branch',
      expect.objectContaining({ cwd: '/custom/cwd' })
    );
  });

  it('logs completion with cardId when CARD_ID env is set', async () => {
    process.env['CARD_ID'] = 'main-99';
    const worktreePath = '/worktrees/test/feature/test-branch';
    mockCreateWorktree.mockResolvedValue({
      path: worktreePath,
      settle: Promise.resolve({
        branch: 'feature/test-branch',
        worktree: worktreePath,
        baseSha: 'abc123',
        copiedFromInclude: 0,
        reroutedSymlinks: 0
      })
    });

    await hookFn(baseInput, { logger: mockLogger as unknown as Logger });

    expect(mockLogger.info).toHaveBeenCalledWith(
      'WorktreeCreate complete',
      expect.objectContaining({ cardId: 'main-99', elapsedMs: expect.any(Number) })
    );
  });

  it('logs null cardId in completion when CARD_ID is not set', async () => {
    delete process.env['CARD_ID'];
    const worktreePath = '/worktrees/test/feature/test-branch';
    mockCreateWorktree.mockResolvedValue({
      path: worktreePath,
      settle: Promise.resolve({
        branch: 'feature/test-branch',
        worktree: worktreePath,
        baseSha: 'abc123',
        copiedFromInclude: 0,
        reroutedSymlinks: 0
      })
    });

    await hookFn(baseInput, { logger: mockLogger as unknown as Logger });

    expect(mockLogger.info).toHaveBeenCalledWith(
      'WorktreeCreate complete',
      expect.objectContaining({ cardId: null, elapsedMs: expect.any(Number) })
    );
  });

  it('throws when settle rejects (does not swallow)', async () => {
    mockCreateWorktree.mockResolvedValue({
      path: '/some/path',
      settle: Promise.reject(new Error('settle failed'))
    });

    await expect(hookFn(baseInput, { logger: mockLogger as unknown as Logger })).rejects.toThrow('settle failed');
  });

  it('passes compiledScriptPaths resolved from extension path when CARD_ID is set', async () => {
    process.env['CARD_ID'] = 'main-42';
    vi.mocked(resolveExtensionPath).mockResolvedValue('/ext/install');
    const worktreePath = '/worktrees/test/feature/test-branch';
    mockCreateWorktree.mockResolvedValue({
      path: worktreePath,
      settle: Promise.resolve({
        branch: 'feature/test-branch',
        worktree: worktreePath,
        baseSha: 'abc123',
        copiedFromInclude: 0,
        reroutedSymlinks: 0
      })
    });

    await hookFn(baseInput, { logger: mockLogger as unknown as Logger });

    expect(resolveExtensionPath).toHaveBeenCalledOnce();
    expect(mockCreateWorktree).toHaveBeenCalledWith(
      'feature/test-branch',
      expect.objectContaining({
        cardId: 'main-42',
        compiledScriptPaths: {
          'pre-commit': '/ext/install/dist/git-hooks/pre-commit.mjs',
          'post-commit': '/ext/install/dist/git-hooks/post-commit.mjs',
          'post-rewrite': '/ext/install/dist/git-hooks/post-rewrite.mjs'
        }
      })
    );
  });

  it('does not resolve extension path when CARD_ID is unset', async () => {
    delete process.env['CARD_ID'];
    const worktreePath = '/worktrees/test/feature/test-branch';
    mockCreateWorktree.mockResolvedValue({
      path: worktreePath,
      settle: Promise.resolve({
        branch: 'feature/test-branch',
        worktree: worktreePath,
        baseSha: 'abc123',
        copiedFromInclude: 0,
        reroutedSymlinks: 0
      })
    });

    await hookFn(baseInput, { logger: mockLogger as unknown as Logger });

    expect(resolveExtensionPath).not.toHaveBeenCalled();
    const call = mockCreateWorktree.mock.calls[0]!;
    expect((call[1] as Record<string, unknown> | undefined)?.['compiledScriptPaths']).toBeUndefined();
  });

  it('falls back to the session-bound card when CARD_ID is unset', async () => {
    delete process.env['CARD_ID'];
    vi.mocked(resolveSessionId).mockResolvedValue('sess-123');
    vi.mocked(readSessionCardId).mockReturnValue('main-77');
    const worktreePath = '/worktrees/test/feature/test-branch';
    mockCreateWorktree.mockResolvedValue({
      path: worktreePath,
      settle: Promise.resolve({
        branch: 'feature/test-branch',
        worktree: worktreePath,
        baseSha: 'abc123',
        copiedFromInclude: 0,
        reroutedSymlinks: 0
      })
    });

    await hookFn(baseInput, { logger: mockLogger as unknown as Logger });

    expect(readSessionCardId).toHaveBeenCalledWith('sess-123');
    expect(mockCreateWorktree).toHaveBeenCalledWith(
      'feature/test-branch',
      expect.objectContaining({
        cardId: 'main-77',
        compiledScriptPaths: {
          'pre-commit': '/ext/install/dist/git-hooks/pre-commit.mjs',
          'post-commit': '/ext/install/dist/git-hooks/post-commit.mjs',
          'post-rewrite': '/ext/install/dist/git-hooks/post-rewrite.mjs'
        }
      })
    );
  });

  it('does not consult the session binding when CARD_ID is set', async () => {
    process.env['CARD_ID'] = 'main-42';
    const worktreePath = '/worktrees/test/feature/test-branch';
    mockCreateWorktree.mockResolvedValue({
      path: worktreePath,
      settle: Promise.resolve({
        branch: 'feature/test-branch',
        worktree: worktreePath,
        baseSha: 'abc123',
        copiedFromInclude: 0,
        reroutedSymlinks: 0
      })
    });

    await hookFn(baseInput, { logger: mockLogger as unknown as Logger });

    expect(resolveSessionId).not.toHaveBeenCalled();
    expect(readSessionCardId).not.toHaveBeenCalled();
    expect(mockCreateWorktree).toHaveBeenCalledWith(
      'feature/test-branch',
      expect.objectContaining({ cardId: 'main-42' })
    );
  });

  it('creates without cardId when CARD_ID is unset and the session has no binding', async () => {
    delete process.env['CARD_ID'];
    vi.mocked(resolveSessionId).mockResolvedValue('sess-empty');
    vi.mocked(readSessionCardId).mockReturnValue(null);
    const worktreePath = '/worktrees/test/feature/test-branch';
    mockCreateWorktree.mockResolvedValue({
      path: worktreePath,
      settle: Promise.resolve({
        branch: 'feature/test-branch',
        worktree: worktreePath,
        baseSha: 'abc123',
        copiedFromInclude: 0,
        reroutedSymlinks: 0
      })
    });

    await hookFn(baseInput, { logger: mockLogger as unknown as Logger });

    expect(resolveExtensionPath).not.toHaveBeenCalled();
    const call = mockCreateWorktree.mock.calls[0]!;
    expect((call[1] as Record<string, unknown> | undefined)?.['cardId']).toBeUndefined();
  });

  it('propagates resolveExtensionPath failure (fail-closed) when CARD_ID is set', async () => {
    process.env['CARD_ID'] = 'main-42';
    vi.mocked(resolveExtensionPath).mockRejectedValue(
      new Error('Cannot resolve extension path: EXTENSION_PATH env var is not set')
    );

    await expect(hookFn(baseInput, { logger: mockLogger as unknown as Logger })).rejects.toThrow(
      'Cannot resolve extension path'
    );
    expect(mockCreateWorktree).not.toHaveBeenCalled();
  });
});
