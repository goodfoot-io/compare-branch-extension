/**
 * Newline-complete JSONL tailing for the transcript-sync engine.
 *
 * Ports `appendSyncJsonl`'s semantics from `bin/transcript-watcher.ts` exactly
 * (append only newline-complete lines; carry an incomplete trailing fragment
 * forward; consume fragment bytes immediately rather than re-reading them; and
 * append to the destination BEFORE advancing the cursor so a failed append
 * never loses lines) with one improvement: reads are taken from an open file
 * descriptor at the stored byte offset instead of re-reading the entire source
 * file on every sync, so per-sync cost is proportional to the newly-arrived
 * bytes rather than the whole transcript.
 *
 * @summary fd-offset-based JSONL tail-append with fragment carry
 * @module
 */

import type { FileHandle } from 'node:fs/promises';
import { appendFile, open } from 'node:fs/promises';

/**
 * Mutable per-file sync cursor. `offset` is the number of source bytes
 * already consumed (including any trailing fragment's bytes — the fragment
 * region is never re-read); `pendingFragment` is the trailing partial line
 * carried forward, as text, until its completing newline arrives.
 */
export interface TailerCursor {
  /** Source byte offset already consumed. */
  offset: number;
  /** Trailing partial line read but not yet terminated by a newline. */
  pendingFragment: string;
}

/**
 * Appends newly-arrived, newline-complete JSONL lines from `srcPath` to
 * `destPath`, carrying any trailing partial line forward in `cursor` until it
 * is completed by a later call.
 *
 * Reads only the byte range `[cursor.offset, sourceSize)` via an open file
 * descriptor rather than the whole file. Every call consumes all source bytes
 * beyond the recorded offset — including the trailing fragment's bytes — so
 * the fragment region is never re-read on a subsequent sync; the fragment text
 * itself is carried in `cursor.pendingFragment` and prepended once its
 * completing bytes arrive.
 *
 * A missing source file (`ENOENT`) is tolerated as a transient race and
 * returns without modifying `cursor` or `destPath`.
 *
 * @param srcPath - Source JSONL file being tailed.
 * @param destPath - Destination JSONL file to append completed lines to.
 * @param cursor - Mutable sync cursor; updated in place across calls.
 */
export async function tailAppend(srcPath: string, destPath: string, cursor: TailerCursor): Promise<void> {
  let fd: FileHandle;
  try {
    fd = await open(srcPath, 'r');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }

  try {
    const stats = await fd.stat();
    const totalSrcBytes = stats.size;
    if (totalSrcBytes <= cursor.offset) {
      return;
    }

    const length = totalSrcBytes - cursor.offset;
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await fd.read(buffer, 0, length, cursor.offset);
    const newBytes = buffer.subarray(0, bytesRead);
    const text = cursor.pendingFragment + newBytes.toString('utf-8');

    const lastNl = text.lastIndexOf('\n');
    if (lastNl < 0) {
      // No complete line yet: carry the whole text forward as the fragment,
      // but still consume the source bytes so they are not re-read next call.
      cursor.pendingFragment = text;
      cursor.offset += bytesRead;
      return;
    }

    const completeLines = text.slice(0, lastNl + 1);

    // Write before advancing the cursor so a failed append does not lose lines.
    await appendFile(destPath, completeLines, { flag: 'a' });

    // Consume every source byte read this call. The trailing fragment's bytes
    // are counted here (not deferred), so the next sync starts past them and
    // reads only genuinely new content; the fragment text is carried in
    // cursor.pendingFragment.
    cursor.offset += bytesRead;
    cursor.pendingFragment = text.slice(lastNl + 1);
  } finally {
    await fd.close();
  }
}
