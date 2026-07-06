/**
 * `.gitignore` maintenance for the transcript-sync engine.
 *
 * Ports `ensureGitignoreEntry` from `bin/transcript-watcher.ts` verbatim: the
 * sentinel flush files under `streams/<streamType>/` (see `./commit.ts`) must
 * never be committed, so every card repository the engine writes into needs a
 * `streams/**\/*.flush` `.gitignore` entry.
 *
 * @summary Idempotently ensures the sentinel-ignore entry exists
 * @module
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Ensures the `streams/**\/*.flush` pattern is present in the card repo's
 * `.gitignore`. Idempotent — a no-op if the entry already exists.
 *
 * @param cardRepoPath - Absolute path to the card repository root.
 */
export async function ensureGitignoreEntry(cardRepoPath: string): Promise<void> {
  const gitignorePath = join(cardRepoPath, '.gitignore');
  const entry = 'streams/**/*.flush';

  let existing = '';
  try {
    existing = await readFile(gitignorePath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  const lines = existing.split('\n');
  if (lines.some((line) => line.trim() === entry)) {
    return;
  }

  const newContent = existing.endsWith('\n') || existing === '' ? `${existing}${entry}\n` : `${existing}\n${entry}\n`;

  await writeFile(gitignorePath, newContent);
}
