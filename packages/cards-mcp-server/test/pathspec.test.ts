/**
 * Tests for the bookkeeping pathspec exclusion filter.
 *
 * @summary Tests for the bookkeeping pathspec exclusion filter
 * @module cards-mcp-server/test/pathspec
 */

import type { CardCommit } from '@cards/sdk/protocol';
import { describe, expect, it } from 'vitest';
import { isBookkeepingCommit } from '../src/pathspec.js';

function makeCommit(files: CardCommit['diff']['files']): CardCommit {
  return {
    hash: 'abc1234567890',
    date: '2026-03-20T12:00:00Z',
    message: 'test commit',
    refs: '',
    body: '',
    author_name: 'Bot',
    author_email: 'bot@example.com',
    diff: { changed: files.length, files }
  };
}

describe('isBookkeepingCommit', () => {
  it('returns true for commits.csv only', () => {
    expect(isBookkeepingCommit(makeCommit([{ file: 'commits.csv', status: 'M', binary: false }]))).toBe(true);
  });

  it('returns true for branches.json only', () => {
    expect(isBookkeepingCommit(makeCommit([{ file: 'branches.json', status: 'M', binary: false }]))).toBe(true);
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
          { file: 'commits.csv', status: 'M', binary: false },
          { file: 'branches.json', status: 'M', binary: false },
          { file: 'streams/claude-code-session/abc.jsonl', status: 'A', binary: false }
        ])
      )
    ).toBe(true);
  });

  it('returns false when a user file is present alongside bookkeeping files', () => {
    expect(
      isBookkeepingCommit(
        makeCommit([
          { file: 'commits.csv', status: 'M', binary: false },
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
});
