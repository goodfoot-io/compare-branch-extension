/**
 * Tests for `firstLinePreview` — the pure helper behind the collapsed
 * `ReasoningPart` header's one-line preview.
 *
 * The bug: the collapsed preview showed literal markdown syntax
 * (`**active**`, backticks, `[text](url)`) instead of plain text. The
 * expanded body still renders full markdown via `renderMarkdownNodes`; only
 * this preview line strips markup.
 *
 * @summary Unit tests for the reasoning-preview markup-stripping helper
 */

import { describe, expect, it } from 'vitest';
import { firstLinePreview } from '../src/streams/lib/aui/ReasoningPart.js';

describe('firstLinePreview', () => {
  it('strips bold markers from the preview', () => {
    expect(firstLinePreview('The agent is **active** right now.')).toBe('The agent is active right now.');
  });

  it('strips inline-code spans (backticks and content) from the preview', () => {
    // Matches `stripMarkup`'s existing behavior elsewhere (e.g. attachment
    // one-line summaries) — a code span is removed entirely, not unwrapped.
    expect(firstLinePreview('Reading `package.json` for scripts.')).toBe('Reading for scripts.');
  });

  it('replaces link syntax with the link text', () => {
    expect(firstLinePreview('See [the docs](https://example.com) for details.')).toBe('See the docs for details.');
  });

  it('strips heading markers', () => {
    expect(firstLinePreview('## Plan\nDo the thing.')).toBe('Plan');
  });

  it('takes the first non-empty line, ignoring leading blank lines', () => {
    expect(firstLinePreview('\n\n  \nActual first line.\nSecond line.')).toBe('Actual first line.');
  });

  it('truncates a long line to ~80 chars', () => {
    const line = 'x'.repeat(200);
    const preview = firstLinePreview(line);
    expect(preview.endsWith('…')).toBe(true);
    expect(preview.length).toBe(81);
  });

  it('returns an empty string for blank text', () => {
    expect(firstLinePreview('   \n\n  ')).toBe('');
  });
});
