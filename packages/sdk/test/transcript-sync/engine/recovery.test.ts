/**
 * Tests for restart cursor recovery.
 *
 * @summary Covers empty destination, exact prefix, mismatch, and shrink cases.
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { recoverCursor } from '../../../src/transcript-sync/engine/recovery.js';

describe('recoverCursor', () => {
  let dir: string;
  let srcPath: string;
  let destPath: string;

  beforeEach(() => {
    dir = join(tmpdir(), `recovery-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
    srcPath = join(dir, 'src.jsonl');
    destPath = join(dir, 'dest.jsonl');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  it('recovers cursor 0 when the destination does not exist', async () => {
    writeFileSync(srcPath, 'line1\nline2\n');
    const result = await recoverCursor(srcPath, destPath);
    expect(result).toEqual({ cursor: 0 });
  });

  it('recovers cursor 0 when the destination exists but is empty', async () => {
    writeFileSync(srcPath, 'line1\n');
    writeFileSync(destPath, '');
    const result = await recoverCursor(srcPath, destPath);
    expect(result).toEqual({ cursor: 0 });
  });

  it('recovers the destination size when the destination is an exact byte-for-byte prefix of the source', async () => {
    writeFileSync(destPath, 'line1\nline2\n');
    writeFileSync(srcPath, 'line1\nline2\nline3\n');
    const result = await recoverCursor(srcPath, destPath);
    expect(result).toEqual({ cursor: 'line1\nline2\n'.length });
  });

  it('recovers when destination equals source exactly (fully caught up)', async () => {
    const content = 'line1\nline2\n';
    writeFileSync(destPath, content);
    writeFileSync(srcPath, content);
    const result = await recoverCursor(srcPath, destPath);
    expect(result).toEqual({ cursor: content.length });
  });

  it('fails when the destination tail does not match the source at the same byte range', async () => {
    writeFileSync(destPath, 'line1\nCORRUPTED\n');
    writeFileSync(srcPath, 'line1\nline2\nline3\n');
    const result = await recoverCursor(srcPath, destPath);
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toMatch(/does not match/);
    }
  });

  it('fails when the source has shrunk below the destination size', async () => {
    writeFileSync(destPath, 'line1\nline2\nline3\n');
    writeFileSync(srcPath, 'line1\n');
    const result = await recoverCursor(srcPath, destPath);
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toMatch(/smaller than destination/);
    }
  });

  it('fails when the source is missing but the destination has content', async () => {
    writeFileSync(destPath, 'line1\n');
    const result = await recoverCursor(srcPath, destPath);
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toMatch(/missing/);
    }
  });

  it('verifies only the tail window (leading bytes outside the window may differ without failing recovery)', async () => {
    // destSize = 10010, so the verify window is the last 4096 bytes:
    // [5914, 10010). Bytes before that window are allowed to differ between
    // source and destination without failing recovery, since the check only
    // compares the window — proving recovery does not do a full re-read.
    const destContent = `${'X'.repeat(10_000)}${'line-tail\n'}`; // 10010 bytes
    const windowStart = destContent.length - 4096; // 5914
    const srcContent = `${'Y'.repeat(windowStart)}${destContent.slice(windowStart)}more-after\n`;

    writeFileSync(destPath, destContent);
    writeFileSync(srcPath, srcContent);

    const result = await recoverCursor(srcPath, destPath);
    expect(result).toEqual({ cursor: destContent.length });
  });

  it('fails when the mismatch falls inside the verify window even if outside bytes agree', async () => {
    const destContent = `${'X'.repeat(10_000)}${'line-tail\n'}`;
    const windowStart = destContent.length - 4096;
    // Corrupt one byte just inside the window (not at the very start, where
    // outside-window agreement would be irrelevant).
    const corruptedWindow = `Z${destContent.slice(windowStart + 1)}`;
    const srcContent = `${destContent.slice(0, windowStart)}${corruptedWindow}more-after\n`;

    writeFileSync(destPath, destContent);
    writeFileSync(srcPath, srcContent);

    const result = await recoverCursor(srcPath, destPath);
    expect('error' in result).toBe(true);
  });
});
