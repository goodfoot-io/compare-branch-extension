/**
 * Tests for the UserPromptSubmit hook that nudges agents to load the
 * `cards:cards` skill and steers toward the create-card flow when the
 * prompt signals creation intent.
 *
 * @summary Tests for the Codex user-prompt-submit card-nudge hook
 */

import { hasSessionSkillLoaded } from '@cards.management/sessions/card-repo';
import type { Logger } from '@goodfoot/codex-hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@cards.management/sessions/card-repo', () => ({
  hasSessionSkillLoaded: vi.fn()
}));

const mockHasSessionSkillLoaded = vi.mocked(hasSessionSkillLoaded);

const mockLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
} as unknown as Logger;

describe('codex user-prompt-submit card-nudge hook', () => {
  beforeEach(() => {
    mockHasSessionSkillLoaded.mockReset();
    mockHasSessionSkillLoaded.mockReturnValue(false);
    vi.mocked(mockLogger.info).mockReset();
    vi.mocked(mockLogger.warn).mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  async function runHook(prompt: string, sessionId = 'sess-abc') {
    const hookFn = (await import('../../../src/codex/core/user-prompt-submit.js')).default;
    return hookFn({ session_id: sessionId, prompt } as Parameters<typeof hookFn>[0], { logger: mockLogger });
  }

  function additionalContextOf(result: Awaited<ReturnType<typeof runHook>>): string | undefined {
    if (!result || typeof result === 'string') return undefined;
    const hookSpecificOutput = result.stdout.hookSpecificOutput;
    return hookSpecificOutput && 'additionalContext' in hookSpecificOutput
      ? hookSpecificOutput.additionalContext
      : undefined;
  }

  it('returns undefined when no card term, creation intent, or card ID is present', async () => {
    const result = await runHook('what is the weather like today');

    expect(result).toBeUndefined();
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it('nudges with the generic instruction on a passive plural mention', async () => {
    const result = await runHook('the cards system needs work');

    expect(additionalContextOf(result)).toContain('Load the `cards:cards` skill.');
    expect(additionalContextOf(result)).not.toContain('wants a new card created');
  });

  it('nudges with the generic instruction on a passive singular mention', async () => {
    const result = await runHook('the card system needs work');

    expect(additionalContextOf(result)).toContain('Load the `cards:cards` skill.');
    expect(additionalContextOf(result)).not.toContain('wants a new card created');
  });

  it('does not fire on a compound word like card-repo', async () => {
    const result = await runHook('the card-repo module needs a refactor');

    expect(result).toBeUndefined();
  });

  it('does not fire on a package path like @cards.management/sessions', async () => {
    const result = await runHook('fix the import in @cards.management/sessions/card-repo');

    expect(result).toBeUndefined();
  });

  it.each([
    'Create a new card for the staffUserIds production issue',
    'Can you file a card for this bug',
    'please log a card about the outage',
    'make a card to track this',
    'open a card for the regression'
  ])('nudges with creation-intent steer for %s', async (prompt) => {
    const result = await runHook(prompt);

    expect(additionalContextOf(result)).toContain(
      'The user appears to want a new card created. Load the `cards:cards` skill and follow its create-card flow.'
    );
  });

  it('does not fire creation intent when a creation verb is far from the card term', async () => {
    const result = await runHook(
      'create a plan for the sprint and separately look at whether the card system needs work'
    );

    expect(additionalContextOf(result)).not.toContain('wants a new card created');
  });

  it('does not fire creation intent on prose that only discusses cards', async () => {
    const result = await runHook('the card system architecture is documented in the wiki');

    expect(additionalContextOf(result)).not.toContain('wants a new card created');
  });

  it('short-circuits when the skill was already loaded this session', async () => {
    mockHasSessionSkillLoaded.mockReturnValue(true);

    const result = await runHook('create a new card for this bug');

    expect(result).toBeUndefined();
    expect(mockLogger.info).not.toHaveBeenCalled();
  });
});
