/**
 * Tests for the SessionStart hook that persists session identity env vars.
 *
 * Verifies that the hook persists CARDS_SESSION_ID and CARDS_TRANSCRIPT_PATH
 * via persistEnvVar on every session. CLI tools reach sessions through the
 * `dist/bin`-on-PATH mechanism, so the hook no longer resolves any wrapper path.
 *
 * @summary Tests for the session-identity SessionStart hook
 */

import type { Logger } from '@goodfoot/claude-code-hooks';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('session-start hook', () => {
  const mockPersistEnvVar = vi.fn();
  const mockPersistEnvVars = vi.fn();
  const mockLogger: Logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  } as unknown as Logger;

  const baseInput = {
    session_id: 'test-session-123',
    transcript_path: '/tmp/transcript.jsonl',
    cwd: '/test/workspace',
    hook_event_name: 'SessionStart' as const,
    source: 'startup' as const
  };

  beforeEach(() => {
    mockPersistEnvVar.mockReset();
    mockPersistEnvVars.mockReset();
    vi.mocked(mockLogger.info).mockReset();
    vi.mocked(mockLogger.warn).mockReset();
  });

  function runHook() {
    return import('../../../src/claude/core/session-start.js').then((m) =>
      m.default(baseInput, {
        logger: mockLogger,
        persistEnvVar: mockPersistEnvVar,
        persistEnvVars: mockPersistEnvVars
      })
    );
  }

  it('has correct hookEventName', async () => {
    const hookFn = (await import('../../../src/claude/core/session-start.js')).default;
    expect(hookFn.hookEventName).toBe('SessionStart');
  });

  it('persists session identity env vars and returns null', async () => {
    const result = await runHook();

    expect(mockPersistEnvVar).toHaveBeenCalledWith('CARDS_SESSION_ID', baseInput.session_id);
    expect(mockPersistEnvVar).toHaveBeenCalledWith('CARDS_TRANSCRIPT_PATH', baseInput.transcript_path);
    expect(result).toBeNull();
  });
});
