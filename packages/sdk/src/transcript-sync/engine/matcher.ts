/**
 * Relative-path matching against a manifest's `SourceSpec.pattern`s.
 *
 * Supports literal paths and `*` wildcards only, where `*` matches any run of
 * characters within a single path segment (it never crosses a `/`). Any
 * pattern containing `?`, `[`, or `{` is rejected — the transcript-sync
 * adapters (see `../adapters/`) only ever emit `*`, so a pattern using richer
 * glob syntax indicates either a bug or an untrusted manifest; failing closed
 * at engine startup is safer than silently matching (or silently failing to
 * match) something unintended.
 *
 * @summary Literal/`*`-only relative-path matching, fail-closed on richer globs
 * @module
 */

import type { SourceSpec } from '../manifest.js';

const REJECTED_GLOB_METACHARACTERS = /[?[{]/;

/**
 * Thrown by {@link assertSupportedPatterns} when a source pattern uses a glob
 * metacharacter this engine does not support.
 */
export class UnsupportedPatternError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedPatternError';
  }
}

/**
 * Validates that every source's pattern uses only literal path segments and
 * `*` wildcards, failing closed on `?`, `[`, or `{`.
 *
 * Call once at engine startup, before any matching is attempted.
 *
 * @param sources - The manifest's source specs.
 * @throws {UnsupportedPatternError} When any pattern contains `?`, `[`, or `{`.
 */
export function assertSupportedPatterns(sources: readonly SourceSpec[]): void {
  for (const source of sources) {
    if (REJECTED_GLOB_METACHARACTERS.test(source.pattern)) {
      throw new UnsupportedPatternError(
        `source pattern "${source.pattern}" uses an unsupported glob metacharacter ('?', '[', or '{'); the transcript-sync engine supports only literal path segments and '*' wildcards`
      );
    }
  }
}

const ESCAPE_REGEXP_CHARS = /[.+^${}()|[\]\\]/g;

function patternToRegExp(pattern: string): RegExp {
  // Escape every regex-significant character, then re-expand '*' to a
  // non-'/' -crossing wildcard. Splitting on '*' first and escaping each
  // literal segment independently keeps '*' itself from being escaped.
  const segments = pattern.split('*').map((segment) => segment.replace(ESCAPE_REGEXP_CHARS, '\\$&'));
  return new RegExp(`^${segments.join('[^/]*')}$`);
}

/**
 * Matches a source-relative path against a manifest's sources, in manifest
 * order, first-match-wins.
 *
 * @param relPath - Path relative to the manifest's `watchRoot`, using forward slashes.
 * @param sources - The manifest's source specs, checked in order.
 * @returns The first matching {@link SourceSpec}, or `null` if none match.
 */
export function matchSource(relPath: string, sources: readonly SourceSpec[]): SourceSpec | null {
  for (const source of sources) {
    if (patternToRegExp(source.pattern).test(relPath)) {
      return source;
    }
  }
  return null;
}
