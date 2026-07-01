/**
 * Tests for the Stop Exit-When-Done hook.
 *
 * @summary Tests for stop-exit-when-done hook
 */

import { extractActionInput } from '@cards.management/sdk/config';
import {
  hasSessionExitWhenDoneNudgeFired,
  markSessionExitWhenDoneNudgeFired
} from '@cards.management/sessions/card-repo';
import { Logger } from '@goodfoot/claude-code-hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import hook from '../../../src/claude/runtime/stop-exit-when-done.js';
import { isSessionIdle } from '../../../src/shared/session-idle.js';

vi.mock('@cards.management/sdk/config', () => ({
  extractActionInput: vi.fn()
}));

vi.mock('@cards.management/sessions/card-repo', () => ({
  hasSessionExitWhenDoneNudgeFired: vi.fn(),
  markSessionExitWhenDoneNudgeFired: vi.fn()
}));

vi.mock('../../../src/shared/session-idle.js', () => ({
  isSessionIdle: vi.fn()
}));

const mockExtractActionInput = vi.mocked(extractActionInput);
const mockHasSessionExitWhenDoneNudgeFired = vi.mocked(hasSessionExitWhenDoneNudgeFired);
const mockMarkSessionExitWhenDoneNudgeFired = vi.mocked(markSessionExitWhenDoneNudgeFired);
const mockIsSessionIdle = vi.mocked(isSessionIdle);

const logger = new Logger();

const baseActionInput = {
  cardId: 'card-123',
  actionName: 'Launch',
  environment: 'default',
  executionMode: 'interactive' as const,
  exitWhenDone: true,
  repoRoot: '/workspace',
  cardRepoPath: '/tmp/card-repos/card-123',
  configPath: '/tmp/config',
  extensionPath: '/tmp/extension',
  switchToInteractiveData: undefined,
  codingAgent: undefined,
  marketplacePath: '/test/marketplace'
};

const mockInput = { session_id: 'sess-abc' } as Parameters<typeof hook>[0];

describe('Stop Exit-When-Done Hook', () => {
  beforeEach(() => {
    mockExtractActionInput.mockReturnValue(baseActionInput);
    mockHasSessionExitWhenDoneNudgeFired.mockReturnValue(false);
    mockMarkSessionExitWhenDoneNudgeFired.mockReturnValue(undefined);
    mockIsSessionIdle.mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has correct hookEventName metadata', () => {
    expect(hook.hookEventName).toBe('Stop');
  });

  describe('trigger fires', () => {
    it('fires with decision:"block" and reason directing to shutdown.md when exitWhenDone is true', async () => {
      const result = await hook(mockInput, { logger });

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('_type', 'Stop');
      const stdout = result!.stdout as { decision?: string; reason?: string };
      expect(stdout.decision).toBe('block');
      expect(stdout.reason).toContain('shutdown.md');
      expect(stdout.reason).toContain('<instructions>');
      expect(mockMarkSessionExitWhenDoneNudgeFired).toHaveBeenCalledWith(mockInput.session_id);
    });

    it('writes marker on first fire; subsequent invocation returns null', async () => {
      const firstResult = await hook(mockInput, { logger });
      expect(firstResult).not.toBeNull();
      expect(mockMarkSessionExitWhenDoneNudgeFired).toHaveBeenCalledWith(mockInput.session_id);

      mockHasSessionExitWhenDoneNudgeFired.mockReturnValue(true);

      const secondResult = await hook(mockInput, { logger });
      expect(secondResult).toBeNull();
    });
  });

  describe('null when exitWhenDone is false', () => {
    it('returns null when exitWhenDone is false', async () => {
      mockExtractActionInput.mockReturnValue({ ...baseActionInput, exitWhenDone: false });

      const result = await hook(mockInput, { logger });

      expect(result).toBeNull();
      expect(mockHasSessionExitWhenDoneNudgeFired).not.toHaveBeenCalled();
      expect(mockMarkSessionExitWhenDoneNudgeFired).not.toHaveBeenCalled();
    });
  });

  describe('once-per-session suppression', () => {
    it('returns null when hasSessionExitWhenDoneNudgeFired is true', async () => {
      mockHasSessionExitWhenDoneNudgeFired.mockReturnValue(true);

      const result = await hook(mockInput, { logger });

      expect(result).toBeNull();
      expect(mockMarkSessionExitWhenDoneNudgeFired).not.toHaveBeenCalled();
    });
  });

  describe('session-idle guard', () => {
    it('returns null when session is not idle (suppresses nudge)', async () => {
      mockIsSessionIdle.mockReturnValue(false);

      const result = await hook(mockInput, { logger });

      expect(result).toBeNull();
      expect(mockHasSessionExitWhenDoneNudgeFired).not.toHaveBeenCalled();
      expect(mockMarkSessionExitWhenDoneNudgeFired).not.toHaveBeenCalled();
    });

    it('fires normally when session is idle', async () => {
      mockIsSessionIdle.mockReturnValue(true);

      const result = await hook(mockInput, { logger });

      expect(result).not.toBeNull();
    });
  });

  describe('fail-open error paths', () => {
    it('returns null (no throw) when extractActionInput throws', async () => {
      mockExtractActionInput.mockImplementation(() => {
        throw new Error('not in action subprocess');
      });

      const result = await hook(mockInput, { logger });

      expect(result).toBeNull();
    });

    it('returns null (no throw) when hasSessionExitWhenDoneNudgeFired throws', async () => {
      mockHasSessionExitWhenDoneNudgeFired.mockImplementation(() => {
        throw new Error('permission denied');
      });

      const result = await hook(mockInput, { logger });

      expect(result).toBeNull();
    });

    it('returns null (no throw) when markSessionExitWhenDoneNudgeFired throws', async () => {
      mockMarkSessionExitWhenDoneNudgeFired.mockImplementation(() => {
        throw new Error('disk full');
      });

      const result = await hook(mockInput, { logger });

      expect(result).toBeNull();
    });
  });
});
