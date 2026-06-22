/**
 * Regression test for sdk-rt-01: transcript watcher duplicates partial lines on
 * incremental sync.
 *
 * Drives `appendSyncJsonl` directly across two consecutive calls where the
 * source file grew by completing a previously-partial line. The byte accounting
 * in `appendSyncJsonl` never advances `bytesWritten` for the trailing fragment,
 * so the second call re-reads the fragment region from source and prepends the
 * carried `pendingFragment`, duplicating the fragment text in the destination.
 *
 * @summary Reproduces partial-line duplication in appendSyncJsonl
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { appendSyncJsonl, type FileState } from '../../src/bin/transcript-watcher.js';

describe('appendSyncJsonl partial-line sync (sdk-rt-01)', () => {
  let dir: string;
  let srcPath: string;
  let destPath: string;

  beforeEach(() => {
    dir = join(tmpdir(), `appendSyncJsonl-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
    srcPath = join(dir, 'src.jsonl');
    destPath = join(dir, 'dest.jsonl');
    writeFileSync(destPath, '');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('does not duplicate the fragment when a line is completed across two syncs', async () => {
    const state: FileState = { bytesWritten: 0, pendingFragment: '' };

    // Sync 1: source holds one complete line and a partial trailing line.
    writeFileSync(srcPath, 'line1\npart');
    await appendSyncJsonl(srcPath, destPath, state);

    // Sync 2: the partial trailing line is completed in the source.
    writeFileSync(srcPath, 'line1\npart2\n');
    await appendSyncJsonl(srcPath, destPath, state);

    const dest = readFileSync(destPath, 'utf-8');

    // The destination must reflect the source exactly: two clean lines.
    expect(dest).toBe('line1\npart2\n');
    // And must NOT contain the duplicated-fragment corruption.
    expect(dest).not.toContain('partpart2');
  });
});
