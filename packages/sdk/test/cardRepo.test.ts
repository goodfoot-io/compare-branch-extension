/**
 * Tests for Node-only card repository utilities.
 *
 * @summary Tests for getCommitsSince
 */

import { execFileSync } from 'node:child_process';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCommitsSince } from '../src/cardRepo.js';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn()
}));

const mockExecFileSync = vi.mocked(execFileSync);

const START_SHA = 'a'.repeat(40);
const SHA_1 = '1'.repeat(40);
const SHA_2 = '2'.repeat(40);

describe('getCommitsSince', () => {
  beforeEach(() => {
    mockExecFileSync.mockReset();
  });
  it('returns commit SHAs from git log output', () => {
    mockExecFileSync.mockReturnValue(`${SHA_1}\n${SHA_2}\n`);
    const result = getCommitsSince('/repo', START_SHA);

    expect(result).toEqual([SHA_1, SHA_2]);
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'git',
      [
        'log',
        '--format=%H',
        `${START_SHA}..HEAD`,
        '--',
        '.',
        ':!streams/claude-code-session/',
        ':!commits.csv',
        ':!branches.json'
      ],
      expect.objectContaining({ cwd: '/repo' })
    );
  });

  it('returns empty array when no commits', () => {
    mockExecFileSync.mockReturnValue('');
    const result = getCommitsSince('/repo', START_SHA);

    expect(result).toEqual([]);
  });

  it('throws for invalid baseline SHA', () => {
    expect(() => getCommitsSince('/repo', 'not-a-sha')).toThrow('Invalid since SHA');
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('propagates errors from execFileSync', () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('not a git repo');
    });

    expect(() => getCommitsSince('/repo', START_SHA)).toThrow('not a git repo');
  });

  it('validates each returned SHA and throws on invalid output', () => {
    mockExecFileSync.mockReturnValue('not-a-valid-sha\n');

    expect(() => getCommitsSince('/repo', START_SHA)).toThrow('Invalid commit SHA');
  });
});
