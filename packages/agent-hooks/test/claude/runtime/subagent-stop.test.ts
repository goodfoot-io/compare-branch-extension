/**
 * Tests for the SubagentStop hook.
 *
 * @summary Tests for the SubagentStop hook
 */

import { Logger } from '@goodfoot/agent-hooks/claude-code';
import { describe, expect, it } from 'vitest';
import hook from '../../../src/claude/runtime/subagent-stop.js';

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
};

const context = { logger };

describe('SubagentStop Hook', () => {
  it('exports valid hook with hookEventName SubagentStop', () => {
    expect(hook).toBeDefined();
    expect(typeof hook).toBe('function');
    expect(hook.eventName).toBe('SubagentStop');
  });

  it('returns null', async () => {
    const result = await hook(baseInput, context);

    expect(result).toBeNull();
  });
});
