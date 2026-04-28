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

import { createWorktree } from '@cards/sdk/worktree';
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
    const stdout = (result as NonNullable<typeof result>).stdout;
    expect((stdout as Record<string, unknown>)['hookSpecificOutput']).toMatchObject({
      hookEventName: 'WorktreeCreate',
      worktreePath
    });
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
});
