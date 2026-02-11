import type { Logger } from '@goodfoot/claude-code-hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/process-tree.js', () => ({
  findClaudePid: vi.fn()
}));

vi.mock('../src/lib/claude-sessions.js', () => ({
  removePidEntry: vi.fn()
}));

import { removePidEntry } from '../src/lib/claude-sessions.js';
import { findClaudePid } from '../src/lib/process-tree.js';
import hookFn from '../src/stop.js';

describe('cards stop hook', () => {
  const originalEnv = process.env;
  const mockFindClaudePid = vi.mocked(findClaudePid);
  const mockRemovePidEntry = vi.mocked(removePidEntry);
  const mockLogger = {
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  };

  const baseInput = {
    transcript_path: '/tmp/transcript.jsonl',
    cwd: '/test/workspace',
    hook_event_name: 'Stop' as const,
    stop_hook_active: true
  };

  beforeEach(() => {
    process.env = { ...originalEnv };
    mockFindClaudePid.mockReset();
    mockRemovePidEntry.mockReset();
    mockLogger.debug.mockReset();
    mockLogger.warn.mockReset();
    mockLogger.info.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('has correct hookEventName', () => {
    expect(hookFn.hookEventName).toBe('Stop');
  });

  it('approves when CARD_ID is set', async () => {
    process.env.CARD_ID = 'card-123';
    const result = await hookFn(
      { ...baseInput, session_id: 'test-session' },
      { logger: mockLogger as unknown as Logger }
    );
    expect(result.stdout.decision).toBe('approve');
    expect(mockFindClaudePid).not.toHaveBeenCalled();
    expect(mockRemovePidEntry).not.toHaveBeenCalled();
  });

  it('calls findClaudePid when CARD_ID not set', async () => {
    process.env.CARD_ID = undefined;
    mockFindClaudePid.mockReturnValue(12345);
    mockRemovePidEntry.mockResolvedValue(null);

    const result = await hookFn(
      { ...baseInput, session_id: 'test-session' },
      { logger: mockLogger as unknown as Logger }
    );
    expect(result.stdout.decision).toBe('approve');
    expect(mockFindClaudePid).toHaveBeenCalled();
    expect(mockRemovePidEntry).toHaveBeenCalledWith(12345, mockLogger);
  });

  it('approves when findClaudePid returns null', async () => {
    process.env.CARD_ID = undefined;
    mockFindClaudePid.mockReturnValue(null);

    const result = await hookFn(
      { ...baseInput, session_id: 'test-session' },
      { logger: mockLogger as unknown as Logger }
    );
    expect(result.stdout.decision).toBe('approve');
    expect(mockRemovePidEntry).not.toHaveBeenCalled();
  });

  it('approves even when removePidEntry throws', async () => {
    process.env.CARD_ID = undefined;
    mockFindClaudePid.mockReturnValue(12345);
    mockRemovePidEntry.mockRejectedValue(new Error('Registry error'));

    const result = await hookFn(
      { ...baseInput, session_id: 'test-session' },
      { logger: mockLogger as unknown as Logger }
    );
    expect(result.stdout.decision).toBe('approve');
  });

  it('always returns decision approve', async () => {
    process.env.CARD_ID = undefined;
    mockFindClaudePid.mockImplementation(() => {
      throw new Error('Process error');
    });

    const result = await hookFn(
      { ...baseInput, session_id: 'test-session' },
      { logger: mockLogger as unknown as Logger }
    );
    expect(result.stdout.decision).toBe('approve');
  });
});
