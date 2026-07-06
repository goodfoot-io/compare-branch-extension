/**
 * Restart recovery for the transcript-sync engine.
 *
 * The engine persists no sync state across process restarts — cursors live
 * only in memory. On restart, a pre-existing destination file's cursor is
 * recovered by trusting the destination's length and spot-verifying it against
 * the source, rather than replaying any on-disk log of prior sync progress.
 *
 * INVARIANT — this recovery strategy depends on it, and it must hold for
 * correctness: **the destination file is always a byte-for-byte prefix of the
 * source file.** This is guaranteed by two properties enforced elsewhere:
 * 1. {@link module:transcript-sync/engine/tailer} only ever appends
 *    newline-complete lines, and always appends to the destination BEFORE
 *    advancing its cursor — so a crash mid-sync can under-consume the source
 *    but can never write bytes to the destination that don't exist, verbatim,
 *    at the same offset in the source.
 * 2. Sources are append-only for the lifetime of a watched session (JSONL
 *    transcripts and rollout files are never rewritten in place).
 *
 * If this invariant is ever violated (a source is truncated/rewritten, or a
 * destination is edited out-of-band), recovery-by-length is unsound and this
 * module detects the resulting mismatch and fails closed rather than guessing.
 *
 * @summary Restart-safe cursor recovery, no persisted sync state
 * @module
 */

import { open, stat } from 'node:fs/promises';

/** Number of trailing bytes compared between source and destination during verification. */
export const RECOVERY_VERIFY_TAIL_BYTES = 4096;

/** Successful recovery: the byte offset at which syncing should resume. */
export interface RecoveredCursor {
  cursor: number;
}

/** Failed recovery: a human-readable reason the file must be excluded from syncing. */
export interface RecoveryFailure {
  error: string;
}

/**
 * Recovers the sync cursor for a single file after a process restart.
 *
 * The cursor is simply the destination file's size (0 if the destination does
 * not exist yet — nothing to recover). To catch a corrupted or stale
 * destination — or a source that was truncated/rewritten out from under a
 * previous sync — the last `min(4096, destSize)` bytes of the destination are
 * compared byte-for-byte against the same byte range of the source
 * (`[destSize - K, destSize)`). Any mismatch, or a source that has become
 * smaller than the destination, fails recovery: this is a detect-and-fatal
 * condition with no recovery machinery — the caller must emit an error event
 * and exclude the file from further syncing rather than guess at a cursor.
 *
 * @param srcPath - Absolute path to the source file.
 * @param destPath - Absolute path to the destination file.
 * @returns The recovered cursor, or a descriptive failure.
 */
export async function recoverCursor(srcPath: string, destPath: string): Promise<RecoveredCursor | RecoveryFailure> {
  let destSize: number;
  try {
    destSize = (await stat(destPath)).size;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { cursor: 0 };
    }
    throw error;
  }

  if (destSize === 0) {
    return { cursor: 0 };
  }

  let srcSize: number;
  try {
    srcSize = (await stat(srcPath)).size;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        error: `recovery failed: source "${srcPath}" is missing while destination "${destPath}" has ${destSize} bytes`
      };
    }
    throw error;
  }

  if (srcSize < destSize) {
    return {
      error: `recovery failed: source "${srcPath}" (${srcSize} bytes) is smaller than destination "${destPath}" (${destSize} bytes) — source was truncated or destination was corrupted`
    };
  }

  const verifyLength = Math.min(RECOVERY_VERIFY_TAIL_BYTES, destSize);
  const verifyStart = destSize - verifyLength;

  const [destTail, srcTail] = await Promise.all([
    readRange(destPath, verifyStart, verifyLength),
    readRange(srcPath, verifyStart, verifyLength)
  ]);

  if (!destTail.equals(srcTail)) {
    return {
      error: `recovery failed: destination "${destPath}" tail does not match source "${srcPath}" at byte range [${verifyStart}, ${destSize}) — the destination-is-a-prefix-of-source invariant does not hold`
    };
  }

  return { cursor: destSize };
}

async function readRange(path: string, position: number, length: number): Promise<Buffer> {
  const fd = await open(path, 'r');
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await fd.read(buffer, 0, length, position);
    return buffer.subarray(0, bytesRead);
  } finally {
    await fd.close();
  }
}
