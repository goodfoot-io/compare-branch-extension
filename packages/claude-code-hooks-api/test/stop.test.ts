import type { Logger } from '@goodfoot/claude-code-hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import hookFn from '../src/stop.js';

/**
 * Exercises the Stop hook, which is now a no-op after PID-registry removal.
 *
 * @summary Tests the no-op Stop hook
 */
describe('cards stop hook', () => {
  const originalEnv = process.env;
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

  it('returns null when CARD_ID is set', async () => {
    process.env['CARD_ID'] = 'card-123';
    const result = await hookFn(
      { ...baseInput, session_id: 'test-session' },
      { logger: mockLogger as unknown as Logger }
    );
    expect(result).toBeNull();
  });

  it('returns null when CARD_ID is not set', async () => {
    delete process.env['CARD_ID'];
    const result = await hookFn(
      { ...baseInput, session_id: 'test-session' },
      { logger: mockLogger as unknown as Logger }
    );
    expect(result).toBeNull();
  });
});
