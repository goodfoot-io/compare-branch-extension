/**
 * Tests for the Cards Assistant SessionStart hook (Codex).
 *
 * @summary Tests for the Cards Assistant SessionStart hook
 */

import { Logger } from '@goodfoot/codex-hooks';
import { describe, expect, it } from 'vitest';
import hook, { ANNOUNCEMENT } from '../src/session-start.js';

const logger = new Logger();
const context = { logger };

describe('SessionStart Hook', () => {
  it('has correct hookEventName metadata', () => {
    expect(hook.hookEventName).toBe('SessionStart');
  });

  it('startup → systemMessage equals ANNOUNCEMENT and sets no additionalContext', async () => {
    const input = { source: 'startup' } as Parameters<typeof hook>[0];

    const result = await hook(input, context);

    expect(result).toHaveProperty('_type', 'SessionStart');
    const stdout = (result as { stdout: { systemMessage?: string; additionalContext?: string } }).stdout;
    expect(stdout.systemMessage).toBe(ANNOUNCEMENT);
    expect(stdout.additionalContext).toBeUndefined();
  });

  it.each([
    ['resume'],
    ['clear'],
    ['compact']
  ] as const)('%s → empty output (no systemMessage, no additionalContext)', async (source) => {
    const input = { source } as Parameters<typeof hook>[0];

    const result = await hook(input, context);

    expect(result).toHaveProperty('_type', 'SessionStart');
    const stdout = (result as { stdout: { systemMessage?: string; additionalContext?: string } }).stdout;
    expect(stdout.systemMessage).toBeUndefined();
    expect(stdout.additionalContext).toBeUndefined();
  });
});
