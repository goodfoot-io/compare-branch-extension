/**
 * Tests for card repository filtering and attribution utilities.
 *
 * @summary Tests for isBookkeepingCommit, getUnattributedCommits, and formatCommit
 */

import { describe, expect, it } from 'vitest';
import { formatCommit, getUnattributedCommits, isBookkeepingCommit } from '../../src/client/cardRepoFilters.js';
import type { CardCommit } from '../../src/protocol/index.js';

function makeCommit(files: CardCommit['diff']['files'], overrides: Partial<CardCommit> = {}): CardCommit {
  return {
    hash: 'abcdef1234567890',
    date: '2026-03-20T12:00:00Z',
    message: 'test commit',
    refs: '',
    body: '',
    author_name: 'Bot',
    author_email: 'bot@example.com',
    diff: { changed: files.length, files },
    ...overrides
  };
}

const SHA_1 = '1'.repeat(40);
const SHA_2 = '2'.repeat(40);
const SHA_3 = '3'.repeat(40);

const COMMIT_ENTRY = `commits/${'a'.repeat(40)}`;
const BRANCH_ENTRY = `branches/${encodeURIComponent('cards/main-1/1')}.json`;

describe('isBookkeepingCommit', () => {
  it('returns true for a commits/ entry file only', () => {
    expect(isBookkeepingCommit(makeCommit([{ file: COMMIT_ENTRY, status: 'A', binary: false }]))).toBe(true);
  });

  it('returns true for a branches/ entry file only', () => {
    expect(isBookkeepingCommit(makeCommit([{ file: BRANCH_ENTRY, status: 'A', binary: false }]))).toBe(true);
  });

  it('returns true for session stream files only', () => {
    expect(
      isBookkeepingCommit(
        makeCommit([
          { file: 'streams/claude-code-session/abc.jsonl', status: 'A', binary: false },
          { file: 'streams/claude-code-session/def.jsonl', status: 'M', binary: false }
        ])
      )
    ).toBe(true);
  });

  it('returns true for a mix of all bookkeeping files', () => {
    expect(
      isBookkeepingCommit(
        makeCommit([
          { file: COMMIT_ENTRY, status: 'A', binary: false },
          { file: BRANCH_ENTRY, status: 'A', binary: false },
          { file: 'streams/claude-code-session/abc.jsonl', status: 'A', binary: false }
        ])
      )
    ).toBe(true);
  });

  it('returns false when a user file is present alongside bookkeeping files', () => {
    expect(
      isBookkeepingCommit(
        makeCommit([
          { file: COMMIT_ENTRY, status: 'A', binary: false },
          { file: 'CARD.md', status: 'M', binary: false }
        ])
      )
    ).toBe(false);
  });

  it('returns false for a commit with only user files', () => {
    expect(isBookkeepingCommit(makeCommit([{ file: 'CARD.md', status: 'M', binary: false }]))).toBe(false);
  });

  it('returns true for a commit with zero changed files', () => {
    expect(isBookkeepingCommit(makeCommit([]))).toBe(true);
  });

  it('returns false for streams/ directory that is not claude-code-session', () => {
    expect(
      isBookkeepingCommit(makeCommit([{ file: 'streams/other-stream/file.jsonl', status: 'A', binary: false }]))
    ).toBe(false);
  });
});

describe('getUnattributedCommits', () => {
  it('returns commits not in session set', () => {
    const all = [SHA_1, SHA_2, SHA_3];
    const session = [SHA_1, SHA_3];

    expect(getUnattributedCommits(all, session)).toEqual([SHA_2]);
  });

  it('returns all commits when session is empty', () => {
    const all = [SHA_1, SHA_2];

    expect(getUnattributedCommits(all, [])).toEqual([SHA_1, SHA_2]);
  });

  it('returns empty array when all commits are attributed', () => {
    const all = [SHA_1, SHA_2];
    const session = [SHA_1, SHA_2];

    expect(getUnattributedCommits(all, session)).toEqual([]);
  });

  it('returns empty array when allCommits is empty', () => {
    expect(getUnattributedCommits([], [SHA_1])).toEqual([]);
  });

  it('preserves order of unattributed commits', () => {
    const all = [SHA_3, SHA_2, SHA_1];
    const session = [SHA_2];

    expect(getUnattributedCommits(all, session)).toEqual([SHA_3, SHA_1]);
  });
});

describe('formatCommit', () => {
  it('produces the expected header line with short SHA, author name + email, and message', () => {
    const commit = makeCommit([{ file: 'src/foo.ts', status: 'A', binary: false }], {
      hash: 'abcdef1234567890',
      author_name: 'Alice',
      author_email: 'alice@example.com',
      message: 'Add feature'
    });

    const result = formatCommit(commit);
    const lines = result.split('\n');

    expect(lines[0]).toBe('abcdef1 - Alice <alice@example.com>: Add feature');
    expect(lines[1]).toBe(' A src/foo.ts');
  });

  it('includes the commit body as an indented block under the header', () => {
    const commit = makeCommit([{ file: 'src/foo.ts', status: 'A', binary: false }], {
      hash: 'abcdef1234567890',
      author_name: 'Alice',
      author_email: 'alice@example.com',
      message: 'Add feature',
      body: 'Why this matters.\nSecond detail line.'
    });

    const result = formatCommit(commit);
    const lines = result.split('\n');

    expect(lines[0]).toBe('abcdef1 - Alice <alice@example.com>: Add feature');
    expect(lines[1]).toBe('    Why this matters.');
    expect(lines[2]).toBe('    Second detail line.');
    expect(lines[3]).toBe(' A src/foo.ts');
  });

  it('omits body lines entirely when the body is blank', () => {
    const commit = makeCommit([{ file: 'src/foo.ts', status: 'A', binary: false }], { body: '   \n  ' });
    const lines = formatCommit(commit).split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe(' A src/foo.ts');
  });

  it('falls back to author name only when email is empty', () => {
    const commit = makeCommit([], {
      hash: 'abcdef1234567890',
      author_name: 'Alice',
      author_email: '',
      message: 'Add feature'
    });
    expect(formatCommit(commit)).toBe('abcdef1 - Alice: Add feature');
  });

  it('formats renamed files with the from path', () => {
    const commit = makeCommit([{ file: 'src/bar.ts', status: 'R100', from: 'src/foo.ts', binary: false }]);

    const result = formatCommit(commit);
    const lines = result.split('\n');
    expect(lines[1]).toBe(' R100 src/foo.ts -> src/bar.ts');
  });

  it('handles empty diff.files and empty body with only the header line', () => {
    const commit = makeCommit([], {
      hash: 'abcdef1234567890',
      author_name: 'Alice',
      author_email: 'alice@example.com',
      message: 'Add feature'
    });
    const result = formatCommit(commit);
    expect(result).toBe('abcdef1 - Alice <alice@example.com>: Add feature');
  });

  it('handles multiple changed files', () => {
    const commit = makeCommit([
      { file: 'src/a.ts', status: 'M', binary: false },
      { file: 'src/b.ts', status: 'D', binary: false }
    ]);

    const result = formatCommit(commit);
    const lines = result.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe(' M src/a.ts');
    expect(lines[2]).toBe(' D src/b.ts');
  });
});
