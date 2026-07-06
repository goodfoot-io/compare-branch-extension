/**
 * Tests for .gitignore maintenance.
 *
 * @summary Covers creation, idempotency, and appending to an existing file without a trailing newline.
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ensureGitignoreEntry } from '../../../src/transcript-sync/engine/gitignore.js';

describe('ensureGitignoreEntry', () => {
  let cardRepoPath: string;

  beforeEach(() => {
    cardRepoPath = join(tmpdir(), `gitignore-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(cardRepoPath, { recursive: true });
  });

  afterEach(() => {
    rmSync(cardRepoPath, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  it('creates .gitignore with the entry when none exists', async () => {
    await ensureGitignoreEntry(cardRepoPath);
    expect(readFileSync(join(cardRepoPath, '.gitignore'), 'utf-8')).toBe('streams/**/*.flush\n');
  });

  it('is a no-op when the entry already exists', async () => {
    writeFileSync(join(cardRepoPath, '.gitignore'), 'node_modules\nstreams/**/*.flush\n');
    await ensureGitignoreEntry(cardRepoPath);
    expect(readFileSync(join(cardRepoPath, '.gitignore'), 'utf-8')).toBe('node_modules\nstreams/**/*.flush\n');
  });

  it('appends the entry to an existing file, adding a newline if missing', async () => {
    writeFileSync(join(cardRepoPath, '.gitignore'), 'node_modules');
    await ensureGitignoreEntry(cardRepoPath);
    expect(readFileSync(join(cardRepoPath, '.gitignore'), 'utf-8')).toBe('node_modules\nstreams/**/*.flush\n');
  });
});
