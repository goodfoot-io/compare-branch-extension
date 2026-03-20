/**
 * Tests for the commit formatter.
 *
 * @summary Tests for the commit formatter
 * @module cards-mcp-server/test/format
 */

import type { CardCommit } from '@cards/sdk/protocol';
import { describe, expect, it } from 'vitest';
import { formatCommit } from '../src/format.js';

function makeCommit(overrides: Partial<CardCommit> = {}): CardCommit {
  return {
    hash: 'abcdef1234567890',
    date: '2026-03-20T12:00:00Z',
    message: 'Add feature',
    refs: '',
    body: '',
    author_name: 'Alice',
    author_email: 'alice@example.com',
    diff: { changed: 0, files: [] },
    ...overrides
  };
}

describe('formatCommit', () => {
  it('produces the expected header line with short SHA, author, and message', () => {
    const commit = makeCommit({
      hash: 'abcdef1234567890',
      author_name: 'Alice',
      message: 'Add feature',
      diff: { changed: 1, files: [{ file: 'src/foo.ts', status: 'A', binary: false }] }
    });

    const result = formatCommit(commit);
    const lines = result.split('\n');

    expect(lines[0]).toBe('abcdef1 - Alice: Add feature');
    expect(lines[1]).toBe(' A src/foo.ts');
  });

  it('formats renamed files with the from path', () => {
    const commit = makeCommit({
      diff: {
        changed: 1,
        files: [{ file: 'src/bar.ts', status: 'R100', from: 'src/foo.ts', binary: false }]
      }
    });

    const result = formatCommit(commit);
    const lines = result.split('\n');
    expect(lines[1]).toBe(' R100 src/foo.ts -> src/bar.ts');
  });

  it('handles empty diff.files with only the header line', () => {
    const commit = makeCommit({ diff: { changed: 0, files: [] } });
    const result = formatCommit(commit);
    expect(result).toBe('abcdef1 - Alice: Add feature');
  });

  it('handles multiple changed files', () => {
    const commit = makeCommit({
      diff: {
        changed: 2,
        files: [
          { file: 'src/a.ts', status: 'M', binary: false },
          { file: 'src/b.ts', status: 'D', binary: false }
        ]
      }
    });

    const result = formatCommit(commit);
    const lines = result.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe(' M src/a.ts');
    expect(lines[2]).toBe(' D src/b.ts');
  });
});
