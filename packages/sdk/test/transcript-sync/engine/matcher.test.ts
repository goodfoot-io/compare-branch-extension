/**
 * Tests for source-pattern matching and glob-metacharacter rejection.
 *
 * @summary Covers literal matches, non-crossing '*' wildcards, first-match-wins order, and fail-closed rejection.
 */

import { describe, expect, it } from 'vitest';
import {
  assertSupportedPatterns,
  matchSource,
  UnsupportedPatternError
} from '../../../src/transcript-sync/engine/matcher.js';
import type { SourceSpec } from '../../../src/transcript-sync/manifest.js';

function source(
  pattern: string,
  role: SourceSpec['role'] = 'main',
  mode: SourceSpec['mode'] = 'jsonl-tail'
): SourceSpec {
  return { pattern, role, mode };
}

describe('matchSource', () => {
  it('matches a literal path exactly', () => {
    const sources = [source('session-1.jsonl')];
    expect(matchSource('session-1.jsonl', sources)).toBe(sources[0]);
    expect(matchSource('session-2.jsonl', sources)).toBeNull();
  });

  it('matches "*" within a single path segment', () => {
    const sources = [source('session-1/subagents/*.jsonl', 'subagent', 'jsonl-tail')];
    expect(matchSource('session-1/subagents/foo.jsonl', sources)).toBe(sources[0]);
    expect(matchSource('session-1/subagents/bar-baz.jsonl', sources)).toBe(sources[0]);
  });

  it('does not let "*" cross a "/" segment boundary', () => {
    const sources = [source('session-1/subagents/*.jsonl', 'subagent', 'jsonl-tail')];
    expect(matchSource('session-1/subagents/nested/foo.jsonl', sources)).toBeNull();
  });

  it('resolves ties by manifest order, first match wins', () => {
    const specific = source('session-1.jsonl', 'main');
    const broad = source('*.jsonl', 'auxiliary', 'copy');
    expect(matchSource('session-1.jsonl', [specific, broad])).toBe(specific);
    expect(matchSource('session-1.jsonl', [broad, specific])).toBe(broad);
  });

  it('returns null when no source matches', () => {
    const sources = [source('session-1.jsonl')];
    expect(matchSource('unrelated-file.txt', sources)).toBeNull();
  });

  it('escapes regex-significant characters in literal segments', () => {
    const sources = [source('session.1+2.jsonl')];
    expect(matchSource('session.1+2.jsonl', sources)).toBe(sources[0]);
    // A literal '.' must not act as a regex wildcard for an unrelated character.
    expect(matchSource('sessionX1+2.jsonl', sources)).toBeNull();
  });
});

describe('assertSupportedPatterns', () => {
  it('accepts literal and "*"-only patterns', () => {
    expect(() => assertSupportedPatterns([source('a.jsonl'), source('b/*.jsonl')])).not.toThrow();
  });

  it.each([
    'a?.jsonl',
    'a[0-9].jsonl',
    'a{b,c}.jsonl'
  ])('rejects a pattern containing an unsupported metacharacter: %s', (pattern) => {
    expect(() => assertSupportedPatterns([source(pattern)])).toThrow(UnsupportedPatternError);
  });

  it('includes the offending pattern in the error message', () => {
    expect(() => assertSupportedPatterns([source('weird[1].jsonl')])).toThrow(/weird\[1\]\.jsonl/);
  });
});
