/**
 * Tests for the session attribution filter.
 *
 * @summary Tests for the session attribution filter
 * @module cards-mcp-server/test/filter
 */

import { describe, expect, it, vi } from 'vitest';
import { isSessionCommit } from '../src/filter.js';

vi.mock('@cards/claude-code-sessions/card-repo', () => ({
  getSessionCommits: (sessionId: string): string[] => {
    if (sessionId === 'session-with-commits') {
      return ['abc1234', 'def5678'];
    }
    return [];
  }
}));

describe('isSessionCommit', () => {
  it('returns true when the commit SHA is in the session CSV', () => {
    expect(isSessionCommit('session-with-commits', 'abc1234')).toBe(true);
  });

  it('returns false when the commit SHA is not in the session CSV', () => {
    expect(isSessionCommit('session-with-commits', 'deadbeef')).toBe(false);
  });

  it('returns false when the session has no CSV (getSessionCommits returns [])', () => {
    expect(isSessionCommit('session-with-no-csv', 'abc1234')).toBe(false);
  });
});
