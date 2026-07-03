/**
 * Tests for the UserPromptSubmit hook that nudges agents to load the
 * `cards:cards` skill and steers toward the create-card flow when the
 * prompt signals creation intent.
 *
 * @summary Tests for the Codex user-prompt-submit card-nudge hook
 */

import { existsSync } from 'node:fs';
import { hasSessionSkillLoaded } from '@cards.management/sessions/card-repo';
import type { Logger } from '@goodfoot/codex-hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@cards.management/sessions/card-repo', () => ({
  hasSessionSkillLoaded: vi.fn()
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn()
}));

const mockHasSessionSkillLoaded = vi.mocked(hasSessionSkillLoaded);
const mockExistsSync = vi.mocked(existsSync);

const mockLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
} as unknown as Logger;

describe('codex user-prompt-submit card-nudge hook', () => {
  const originalCardId = process.env['CARD_ID'];

  beforeEach(() => {
    mockHasSessionSkillLoaded.mockReset();
    mockHasSessionSkillLoaded.mockReturnValue(false);
    mockExistsSync.mockReset();
    mockExistsSync.mockReturnValue(false);
    vi.mocked(mockLogger.info).mockReset();
    vi.mocked(mockLogger.warn).mockReset();
    delete process.env['CARD_ID'];
  });

  afterEach(() => {
    vi.resetModules();
    if (originalCardId === undefined) {
      delete process.env['CARD_ID'];
    } else {
      process.env['CARD_ID'] = originalCardId;
    }
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

  it('appends the CARD.md pointer once after a single confirmed card ID', async () => {
    mockExistsSync.mockReturnValue(true);

    const result = await runHook('continue card main-369 implementation');
    const context = additionalContextOf(result);

    expect(context).toContain('Card `main-369` is available in the `');
    expect(context).toContain('Read CARD.md in the repository for more information.');
    expect(context?.match(/Read CARD\.md/g)).toHaveLength(1);
  });

  it('lists every confirmed card ID before a single trailing CARD.md pointer', async () => {
    mockExistsSync.mockReturnValue(true);

    const result = await runHook('reconcile card main-369 and card main-370');
    const context = additionalContextOf(result) ?? '';

    expect(context).toContain('Card `main-369` is available in the `');
    expect(context).toContain('Card `main-370` is available in the `');
    expect(context.match(/Read CARD\.md/g)).toHaveLength(1);
    expect(context.indexOf('Card `main-370`')).toBeLessThan(context.indexOf('Read CARD.md'));
  });

  it('does not append a CARD.md pointer when no card ID is confirmed', async () => {
    const result = await runHook('the card system needs work');
    const context = additionalContextOf(result) ?? '';

    expect(context).not.toContain('Read CARD.md');
  });

  it('suppresses the nudge when CARD_ID matches the card ID mentioned in the prompt', async () => {
    mockExistsSync.mockReturnValue(true);
    process.env['CARD_ID'] = 'main-369';

    const result = await runHook('continue card main-369 implementation');

    expect(result).toBeUndefined();
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it('still nudges when CARD_ID is set but does not match the card ID in the prompt', async () => {
    mockExistsSync.mockReturnValue(true);
    process.env['CARD_ID'] = 'main-370';

    const result = await runHook('continue card main-369 implementation');

    expect(additionalContextOf(result)).toContain('Card `main-369` is available');
  });

  it('still nudges when CARD_ID is set but the prompt names no card ID', async () => {
    process.env['CARD_ID'] = 'main-369';

    const result = await runHook('the card system needs work');

    expect(additionalContextOf(result)).toContain('Load the `cards:cards` skill.');
  });
});
