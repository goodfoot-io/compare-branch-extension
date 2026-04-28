/**
 * Tests for the WorktreeRemove hook handler.
 *
 * Mocks removeWorktree to avoid real git operations. Verifies that the hook
 * invokes removeWorktree with the input path, logs success/failure, and never
 * throws on removeWorktree failure (harness ignores the output).
 *
 * @summary WorktreeRemove hook handler tests
 */

import type { Logger } from '@goodfoot/claude-code-hooks';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@cards/sdk/worktree', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cards/sdk/worktree')>();
  return {
    ...actual,
    removeWorktree: vi.fn()
  };
});

import { removeWorktree } from '@cards/sdk/worktree';
import hookFn from '../src/worktree-remove.js';

describe('WorktreeRemove hook', () => {
  const mockRemoveWorktree = vi.mocked(removeWorktree);
  const mockLogger = {
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  };

  const baseInput = {
    session_id: 'test-session',
    transcript_path: '/tmp/transcript.jsonl',
    cwd: '/test/workspace',
    hook_event_name: 'WorktreeRemove' as const,
    worktree_path: '/worktrees/test/feature/test-branch'
  };

  function resetMocks() {
    mockRemoveWorktree.mockReset();
    mockLogger.debug.mockReset();
    mockLogger.warn.mockReset();
    mockLogger.info.mockReset();
  }

  it('has correct hookEventName', () => {
    expect(hookFn.hookEventName).toBe('WorktreeRemove');
  });

  it('invokes removeWorktree with input.worktree_path', async () => {
    resetMocks();
    mockRemoveWorktree.mockResolvedValue(undefined);

    await hookFn(baseInput, { logger: mockLogger as unknown as Logger });

    expect(mockRemoveWorktree).toHaveBeenCalledWith('/worktrees/test/feature/test-branch');
  });

  it('logs success and elapsed time on completion', async () => {
    resetMocks();
    mockRemoveWorktree.mockResolvedValue(undefined);

    await hookFn(baseInput, { logger: mockLogger as unknown as Logger });

    expect(mockLogger.info).toHaveBeenCalledWith(
      'WorktreeRemove complete',
      expect.objectContaining({
        worktree_path: '/worktrees/test/feature/test-branch',
        elapsedMs: expect.any(Number)
      })
    );
  });

  it('logs but does not throw when removeWorktree fails', async () => {
    resetMocks();
    mockRemoveWorktree.mockRejectedValue(new Error('git failure'));

    await expect(hookFn(baseInput, { logger: mockLogger as unknown as Logger })).resolves.not.toThrow();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'WorktreeRemove failed',
      expect.objectContaining({
        worktree_path: '/worktrees/test/feature/test-branch',
        error: expect.stringContaining('git failure')
      })
    );
  });
});
