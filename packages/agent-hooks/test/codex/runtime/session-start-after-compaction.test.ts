/**
 * Tests for the post-compaction SessionStart hook.
 *
 * After PID-registry removal the hook unconditionally injects the routing
 * reminder; attach-mode watcher rotation no longer exists.
 *
 * @summary Tests for session-start-after-compaction hook
 */

import { Logger } from '@goodfoot/codex-hooks';
import { describe, expect, it } from 'vitest';
import hook from '../../../src/codex/runtime/session-start-after-compaction.js';

const logger = new Logger();

const BASE_INPUT = {
  session_id: 'new-session-id',
  transcript_path: '/tmp/new-session.jsonl'
} as Parameters<typeof hook>[0];

function makeContext() {
  return { logger };
}

describe('session-start-after-compaction hook', () => {
  it('has SessionStart hookEventName', () => {
    expect(hook.hookEventName).toBe('SessionStart');
  });

  it('returns the routing reminder in systemMessage and additionalContext', async () => {
    const result = await hook(BASE_INPUT, makeContext());

    const stdout = (
      result as { stdout: { systemMessage?: string; hookSpecificOutput?: { additionalContext?: string } } }
    ).stdout;
    expect(stdout.systemMessage).toContain('IMPORTANT');
    expect(stdout.systemMessage).toContain('<routing-instructions>');
    expect(stdout.hookSpecificOutput!.additionalContext).toBe(stdout.systemMessage);
  });
});
