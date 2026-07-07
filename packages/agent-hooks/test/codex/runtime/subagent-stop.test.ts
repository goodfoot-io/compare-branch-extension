/**
 * Tests for the SubagentStop hook.
 *
 * @summary Tests for the SubagentStop hook
 */

import { rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { removeActiveSubagent } from '@cards.management/sessions/card-repo';
import { Logger } from '@goodfoot/codex-hooks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import hook from '../../../src/codex/runtime/subagent-stop.js';

vi.mock('@cards.management/sessions/card-repo', () => ({
  removeActiveSubagent: vi.fn()
}));

vi.mock('node:fs', () => ({
  rmSync: vi.fn()
}));

const mockRemoveActiveSubagent = vi.mocked(removeActiveSubagent);
const mockRmSync = vi.mocked(rmSync);

const logger = new Logger();

const baseInput = {
  session_id: 'sess-abc',
  agent_id: 'agent-xyz',
  agent_type: 'general-purpose',
  agent_transcript_path: '/tmp/agent-transcript-xyz.jsonl',
  stop_hook_active: false,
  transcript_path: '/tmp/transcript-abc.jsonl',
  cwd: '/workspace',
  hook_event_name: 'SubagentStop' as const
} as Parameters<typeof hook>[0];

const context = { logger };

beforeEach(() => {
  vi.clearAllMocks();
  mockRemoveActiveSubagent.mockResolvedValue(undefined);
});

describe('SubagentStop Hook', () => {
  it('exports valid hook with hookEventName SubagentStop', () => {
    expect(hook).toBeDefined();
    expect(typeof hook).toBe('function');
    expect(hook.hookEventName).toBe('SubagentStop');
  });

  it('removes the active subagent using the session and agent IDs from the input', async () => {
    await hook(baseInput, context);

    expect(mockRemoveActiveSubagent).toHaveBeenCalledWith('sess-abc', 'agent-xyz');
  });

  it('returns undefined on success', async () => {
    const result = await hook(baseInput, context);

    expect(result).toBeUndefined();
  });

  it('logs a warning and returns undefined when removeActiveSubagent fails', async () => {
    const warnSpy = vi.spyOn(logger, 'warn');
    mockRemoveActiveSubagent.mockRejectedValue(new Error('lock held'));

    const result = await hook(baseInput, context);

    expect(result).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith('Failed to remove active subagent', {
      sessionId: 'sess-abc',
      agentId: 'agent-xyz',
      error: 'lock held'
    });
  });

  it('unlinks the whole subagents file as recovery when removeActiveSubagent fails', async () => {
    mockRemoveActiveSubagent.mockRejectedValue(new Error('lock held'));

    await hook(baseInput, context);

    expect(mockRmSync).toHaveBeenCalledWith(join(homedir(), '.cards', 'card-repo-commits', 'sess-abc.subagents'), {
      force: true
    });
  });

  it('logs a second warning when the recovery unlink also fails', async () => {
    const warnSpy = vi.spyOn(logger, 'warn');
    mockRemoveActiveSubagent.mockRejectedValue(new Error('lock held'));
    mockRmSync.mockImplementation(() => {
      throw new Error('permission denied');
    });

    const result = await hook(baseInput, context);

    expect(result).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      'Recovery unlink of subagents file also failed — session may be stuck',
      expect.objectContaining({ sessionId: 'sess-abc', error: 'permission denied' })
    );
  });
});
