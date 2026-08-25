/**
 * Tests for the card-mention detection predicates ported for the OpenCode
 * prompt-nudge hook (pure logic — no IO edges).
 *
 * @summary Tests for card-mention detection helpers
 */

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildNudgeContext,
  findCardIds,
  isValidCardId,
  promptHasCardTerm,
  promptHasCreationIntent,
  TASK_NOTIFICATION_RE
} from '../../src/opencode/card-mention.js';

let homeDir: string;

beforeEach(() => {
  homeDir = mkdtempSync(join(tmpdir(), 'card-mention-'));
});

afterEach(() => {
  rmSync(homeDir, { recursive: true, force: true });
});

describe('promptHasCardTerm', () => {
  it.each([
    ['fix the card', true],
    ['organize the cards', true],
    ['Card at start', true],
    ['ends with card', true],
    ['@cards.management/sessions', false],
    ['the card-repo is stale', false],
    ['cardboard box', false]
  ])('detects standalone card terms in %s', (prompt, expected) => {
    expect(promptHasCardTerm(prompt)).toBe(expected);
  });
});

describe('promptHasCreationIntent', () => {
  it('fires when a creation verb sits near a card term', () => {
    expect(promptHasCreationIntent('please create a card for the login bug')).toBe(true);
    // Verbless framing must not fire.
    expect(promptHasCreationIntent('this looks like a card to me')).toBe(false);
    expect(promptHasCreationIntent('file a card about the crash')).toBe(true);
  });
});

describe('isValidCardId / findCardIds', () => {
  it('validates prefix-counter structure', () => {
    expect(isValidCardId('main-453')).toBe(true);
    expect(isValidCardId('-453')).toBe(false);
    expect(isValidCardId('main-0')).toBe(false);
    expect(isValidCardId('main-x')).toBe(false);
  });

  it('returns only card IDs with existing repos on disk', () => {
    mkdirSync(join(homeDir, '.cards', 'cards-repos', 'main-453'), { recursive: true });
    const ids = findCardIds('look at main-453 and ope-age-sup-99 please', homeDir);
    expect(ids).toEqual(['main-453']);
  });
});

describe('TASK_NOTIFICATION_RE', () => {
  it('matches task-notification wrappers regardless of leading whitespace', () => {
    expect(TASK_NOTIFICATION_RE.test('<task-notification>done</task-notification>')).toBe(true);
    expect(TASK_NOTIFICATION_RE.test('\n <task-notification>…')).toBe(true);
    expect(TASK_NOTIFICATION_RE.test('please check the notification')).toBe(false);
  });
});

describe('buildNudgeContext', () => {
  it('builds the generic skill-load nudge with repo paths', () => {
    const context = buildNudgeContext(['main-453'], false, 'cards', homeDir);
    expect(context).toContain('Load the `cards` skill.');
    expect(context).toContain(join(homeDir, '.cards', 'cards-repos', 'main-453'));
    expect(context).toContain('Read CARD.md in the repository for more information.');
    expect(context.startsWith('<cards-extension>')).toBe(true);
    expect(context.endsWith('</cards-extension>')).toBe(true);
  });

  it('builds the stronger creation-intent nudge', () => {
    const context = buildNudgeContext([], true, 'cards', homeDir);
    expect(context).toContain('The user appears to want a new card created.');
    expect(context).not.toContain('is available in the');
  });
});
