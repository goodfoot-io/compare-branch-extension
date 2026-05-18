/**
 * Tests for the session-resolver precedence chain.
 *
 * @summary Tests for resolveSessionId precedence, empty-string handling, and PID fallback
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/process-tree.js', () => ({
  findAgentPid: vi.fn()
}));

import { findAgentPid } from '../src/process-tree.js';
import { resolveSessionId } from '../src/session-resolver.js';

const mockFindAgentPid = vi.mocked(findAgentPid);

const ENV_VARS = [
  'CARDS_SESSION_ID',
  'CLAUDE_CODE_SESSION_ID',
  'CODEX_THREAD_ID',
  'OPENCODE_RUN_ID',
  'CURSOR_TRACE_ID'
] as const;

describe('resolveSessionId', () => {
  let savedEnv: Partial<Record<string, string>>;

  beforeEach(() => {
    // Save and clear all relevant env vars
    savedEnv = {};
    for (const name of ENV_VARS) {
      savedEnv[name] = process.env[name];
      delete process.env[name];
    }
    mockFindAgentPid.mockReset();
    mockFindAgentPid.mockReturnValue(null);
  });

  afterEach(() => {
    for (const name of ENV_VARS) {
      if (savedEnv[name] === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = savedEnv[name];
      }
    }
  });

  describe('env var precedence', () => {
    it('resolves CARDS_SESSION_ID when set', async () => {
      process.env['CARDS_SESSION_ID'] = 'cards-session-abc';
      expect(await resolveSessionId()).toBe('cards-session-abc');
    });

    it('resolves CLAUDE_CODE_SESSION_ID when CARDS_SESSION_ID is absent', async () => {
      process.env['CLAUDE_CODE_SESSION_ID'] = 'claude-session-xyz';
      expect(await resolveSessionId()).toBe('claude-session-xyz');
    });

    it('resolves CODEX_THREAD_ID when higher-precedence vars are absent', async () => {
      process.env['CODEX_THREAD_ID'] = 'codex-thread-123';
      expect(await resolveSessionId()).toBe('codex-thread-123');
    });

    it('resolves OPENCODE_RUN_ID when higher-precedence vars are absent', async () => {
      process.env['OPENCODE_RUN_ID'] = 'opencode-run-456';
      expect(await resolveSessionId()).toBe('opencode-run-456');
    });

    it('resolves CURSOR_TRACE_ID when higher-precedence vars are absent', async () => {
      process.env['CURSOR_TRACE_ID'] = 'cursor-trace-789';
      expect(await resolveSessionId()).toBe('cursor-trace-789');
    });

    it('CARDS_SESSION_ID takes precedence over all others', async () => {
      for (const name of ENV_VARS) {
        process.env[name] = `value-for-${name}`;
      }
      expect(await resolveSessionId()).toBe('value-for-CARDS_SESSION_ID');
    });
  });

  describe('empty-string and whitespace handling (B2)', () => {
    it('falls through an empty CARDS_SESSION_ID to the next tier', async () => {
      process.env['CARDS_SESSION_ID'] = '';
      process.env['CLAUDE_CODE_SESSION_ID'] = 'fallback-id';
      expect(await resolveSessionId()).toBe('fallback-id');
    });

    it('falls through a whitespace-only CARDS_SESSION_ID to the next tier', async () => {
      process.env['CARDS_SESSION_ID'] = '   ';
      process.env['CLAUDE_CODE_SESSION_ID'] = 'fallback-id';
      expect(await resolveSessionId()).toBe('fallback-id');
    });

    it('falls through empty strings in all env tiers to the PID tier', async () => {
      for (const name of ENV_VARS) {
        process.env[name] = '';
      }
      mockFindAgentPid.mockReturnValue(42000);
      expect(await resolveSessionId()).toBe('42000');
    });

    it('falls through whitespace-only strings in all env tiers to the PID tier', async () => {
      for (const name of ENV_VARS) {
        process.env[name] = '\t  \n';
      }
      mockFindAgentPid.mockReturnValue(99999);
      expect(await resolveSessionId()).toBe('99999');
    });
  });

  describe('PID fallback tier', () => {
    it('calls findAgentPid when all env vars are absent', async () => {
      mockFindAgentPid.mockReturnValue(12345);
      expect(await resolveSessionId()).toBe('12345');
      expect(mockFindAgentPid).toHaveBeenCalledOnce();
    });

    it('returns the PID as a string', async () => {
      mockFindAgentPid.mockReturnValue(5000);
      const result = await resolveSessionId();
      expect(typeof result).toBe('string');
      expect(result).toBe('5000');
    });

    it('returns null when all env vars absent and findAgentPid returns null', async () => {
      mockFindAgentPid.mockReturnValue(null);
      expect(await resolveSessionId()).toBeNull();
    });
  });
});
