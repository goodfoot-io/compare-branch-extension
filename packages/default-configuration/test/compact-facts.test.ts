/**
 * Tests for the shared compact-card pure format/fact helpers.
 *
 * `formatCount`/`formatDuration`/`formatDate` are ports of the canonical
 * claude-code-session implementations; `countFact`/`tokenFact`/`plainFact`
 * build the {@link FactModel} data both renderers' adapters feed into the
 * shared `CompactCard` component, so the null-omission contract (zero/absent
 * values drop out of the metrics row) is pinned here.
 *
 * @summary Unit tests for streams/lib/compact-facts
 */

import { describe, expect, it } from 'vitest';
import {
  countFact,
  formatCount,
  formatDate,
  formatDuration,
  plainFact,
  tokenFact
} from '../src/streams/lib/compact-facts';

describe('formatCount', () => {
  it('renders small counts as-is', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(500)).toBe('500');
  });

  it('collapses thousands to a K suffix, rounded', () => {
    expect(formatCount(1500)).toBe('2K');
    expect(formatCount(536_000)).toBe('536K');
  });

  it('collapses millions to an M suffix with at most one decimal', () => {
    expect(formatCount(1_500_000)).toBe('1.5M');
    expect(formatCount(1_900_000)).toBe('1.9M');
    expect(formatCount(2_000_000)).toBe('2M');
    expect(formatCount(12_000_000)).toBe('12M');
  });

  it('formats non-finite input as 0', () => {
    expect(formatCount(Number.NaN)).toBe('0');
    expect(formatCount(Number.POSITIVE_INFINITY)).toBe('0');
  });
});

describe('formatDuration', () => {
  it('formats a zero or non-finite span as the 0s sentinel', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(-100)).toBe('0s');
    expect(formatDuration(Number.NaN)).toBe('0s');
  });

  it('formats sub-minute spans as seconds', () => {
    expect(formatDuration(42_000)).toBe('42s');
  });

  it('formats sub-hour spans as minutes and seconds', () => {
    expect(formatDuration(713_000)).toBe('11m 53s');
  });

  it('formats hour-plus spans as hours and minutes', () => {
    expect(formatDuration(27_180_000)).toBe('7h 33m');
  });
});

describe('formatDate', () => {
  it('returns an empty string for a zero/non-finite timestamp', () => {
    expect(formatDate(0)).toBe('');
    expect(formatDate(Number.NaN)).toBe('');
  });

  it('formats an epoch-ms timestamp as a short Mon D date', () => {
    // Constructed in local time so the assertion is timezone-independent:
    // formatDate reads getMonth()/getDate() in local time too.
    const ms = new Date(2026, 5, 1, 12, 0, 0).getTime();
    expect(formatDate(ms)).toBe('Jun 1');
  });
});

describe('countFact', () => {
  it('returns null for a zero or negative count', () => {
    expect(countFact(0, 'turn')).toBeNull();
    expect(countFact(-1, 'turn')).toBeNull();
  });

  it('pluralizes the noun for any count other than 1', () => {
    expect(countFact(1, 'turn')).toEqual({ key: 'turn', kind: 'value', bold: '1', label: 'turn' });
    expect(countFact(3, 'turn')).toEqual({ key: 'turn', kind: 'value', bold: '3', label: 'turns' });
  });
});

describe('tokenFact', () => {
  it('returns null for a zero or negative total', () => {
    expect(tokenFact(0, 'out')).toBeNull();
    expect(tokenFact(-5, 'out')).toBeNull();
  });

  it('formats the total compactly and keeps the raw label', () => {
    expect(tokenFact(1500, 'out')).toEqual({ key: 'out', kind: 'value', bold: '2K', label: 'out' });
  });
});

describe('plainFact', () => {
  it('returns null for falsy text', () => {
    expect(plainFact('model', '')).toBeNull();
  });

  it('returns a plain-kind fact for non-empty text', () => {
    expect(plainFact('model', 'opus-4-8')).toEqual({ key: 'model', kind: 'plain', text: 'opus-4-8' });
  });
});
