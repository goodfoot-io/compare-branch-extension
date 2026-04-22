/**
 * Integration tests for sentinel file coordination between session-end and transcript-watcher.
 *
 * Uses real filesystem operations to verify that the sentinel file written by
 * `writeSentinelFile` is correctly detected by `sentinelFileExists` and cleaned
 * up by `removeSentinelFile`. No fs mocks are used — that is the whole point.
 *
 * @summary Integration tests: sentinel file coordination between writer and reader
 */

import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Satisfy the import graph for session-end.ts without mocking fs.
vi.mock('@cards/sdk/config', () => ({
  extractActionInput: vi.fn()
}));

vi.mock('@goodfoot/claude-code-hooks', () => ({
  sessionEndHook: vi.fn((_opts: unknown, handler: unknown) => handler),
  sessionEndOutput: vi.fn()
}));

import { removeSentinelFile, sentinelFileExists } from '../../sdk/src/bin/transcript-watcher.js';
import { writeSentinelFile } from '../src/session-end.js';

const SESSION_ID = 'test-session-abc123';

let cardRepoPath: string;

beforeEach(async () => {
  cardRepoPath = await mkdtemp(join(tmpdir(), 'sentinel-test-'));
});

afterEach(async () => {
  await rm(cardRepoPath, { recursive: true, force: true });
});

describe('sentinel file coordination', () => {
  it('Test 1: writeSentinelFile creates a file detectable by sentinelFileExists', async () => {
    await writeSentinelFile(cardRepoPath, SESSION_ID);

    const exists = await sentinelFileExists(cardRepoPath, SESSION_ID);

    expect(exists).toBe(true);
  });

  it('Test 2: removeSentinelFile cleans up the file written by writeSentinelFile', async () => {
    await writeSentinelFile(cardRepoPath, SESSION_ID);
    await removeSentinelFile(cardRepoPath, SESSION_ID);

    const exists = await sentinelFileExists(cardRepoPath, SESSION_ID);
    expect(exists).toBe(false);

    // Verify the file is actually gone on disk using fs.access directly
    const sentinelPath = join(cardRepoPath, 'streams', 'claude-code-session', `${SESSION_ID}.flush`);
    await expect(access(sentinelPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('Test 3: path convention is consistent between writer and reader', async () => {
    await writeSentinelFile(cardRepoPath, SESSION_ID);

    // Verify the actual file exists at the expected path using fs.access directly
    const expectedPath = join(cardRepoPath, 'streams', 'claude-code-session', `${SESSION_ID}.flush`);
    await expect(access(expectedPath)).resolves.toBeUndefined();
  });

  it('Test 4: sentinelFileExists returns false before writeSentinelFile is called', async () => {
    // Fresh temp dir, no sentinel written
    const exists = await sentinelFileExists(cardRepoPath, SESSION_ID);

    expect(exists).toBe(false);
  });

  it('Test 5: removeSentinelFile is idempotent after file already removed', async () => {
    await writeSentinelFile(cardRepoPath, SESSION_ID);
    await removeSentinelFile(cardRepoPath, SESSION_ID);

    // Second removal should not throw
    await expect(removeSentinelFile(cardRepoPath, SESSION_ID)).resolves.toBeUndefined();
  });
});
