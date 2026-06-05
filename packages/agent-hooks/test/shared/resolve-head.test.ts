/**
 * Tests for resolveHeadFromFiles utility.
 *
 * Uses a real temp directory with a fake .git/ structure — no mocks.
 *
 * @summary Tests for lib/resolve-head
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveHeadFromFiles } from '../../src/shared/resolve-head.js';

const FULL_SHA = 'a'.repeat(40);
const ANOTHER_SHA = 'b'.repeat(40);

let repoPath: string;

beforeEach(() => {
  repoPath = join(tmpdir(), `resolve-head-test-${process.pid}-${Date.now()}`);
  mkdirSync(join(repoPath, '.git'), { recursive: true });
});

afterEach(() => {
  rmSync(repoPath, { recursive: true, force: true });
});

describe('resolveHeadFromFiles', () => {
  it('resolves a loose ref — HEAD points to refs/heads/main with a loose ref file', () => {
    writeFileSync(join(repoPath, '.git', 'HEAD'), 'ref: refs/heads/main\n');
    mkdirSync(join(repoPath, '.git', 'refs', 'heads'), { recursive: true });
    writeFileSync(join(repoPath, '.git', 'refs', 'heads', 'main'), `${FULL_SHA}\n`);

    expect(resolveHeadFromFiles(repoPath)).toBe(FULL_SHA);
  });

  it('falls back to packed-refs when the loose ref file is absent', () => {
    writeFileSync(join(repoPath, '.git', 'HEAD'), 'ref: refs/heads/main\n');
    // No loose ref file — only packed-refs
    writeFileSync(
      join(repoPath, '.git', 'packed-refs'),
      `# pack-refs with: peeled fully-peeled sorted\n${FULL_SHA} refs/heads/main\n`
    );

    expect(resolveHeadFromFiles(repoPath)).toBe(FULL_SHA);
  });

  it('resolves a detached HEAD containing a bare SHA', () => {
    writeFileSync(join(repoPath, '.git', 'HEAD'), `${FULL_SHA}\n`);

    expect(resolveHeadFromFiles(repoPath)).toBe(FULL_SHA);
  });

  it('returns null when .git/HEAD is missing', () => {
    // .git/ exists but HEAD file does not
    expect(resolveHeadFromFiles(repoPath)).toBeNull();
  });

  it('returns null when .git/HEAD contains corrupt content', () => {
    writeFileSync(join(repoPath, '.git', 'HEAD'), 'not-a-sha-or-ref\n');

    expect(resolveHeadFromFiles(repoPath)).toBeNull();
  });

  it('returns null when the ref in HEAD is absent from both loose refs and packed-refs', () => {
    writeFileSync(join(repoPath, '.git', 'HEAD'), 'ref: refs/heads/main\n');
    // No loose ref, no packed-refs file at all

    expect(resolveHeadFromFiles(repoPath)).toBeNull();
  });

  it('returns null when the .git directory itself is missing', () => {
    rmSync(join(repoPath, '.git'), { recursive: true, force: true });

    expect(resolveHeadFromFiles(repoPath)).toBeNull();
  });

  it('picks the correct SHA from packed-refs when multiple refs are present', () => {
    writeFileSync(join(repoPath, '.git', 'HEAD'), 'ref: refs/heads/feature\n');
    writeFileSync(
      join(repoPath, '.git', 'packed-refs'),
      `${[
        '# pack-refs with: peeled fully-peeled sorted',
        `${FULL_SHA} refs/heads/main`,
        `${ANOTHER_SHA} refs/heads/feature`
      ].join('\n')}\n`
    );

    expect(resolveHeadFromFiles(repoPath)).toBe(ANOTHER_SHA);
  });

  it('returns null when packed-refs exists but does not contain the ref', () => {
    writeFileSync(join(repoPath, '.git', 'HEAD'), 'ref: refs/heads/missing-branch\n');
    writeFileSync(
      join(repoPath, '.git', 'packed-refs'),
      `# pack-refs with: peeled fully-peeled sorted\n${FULL_SHA} refs/heads/main\n`
    );

    expect(resolveHeadFromFiles(repoPath)).toBeNull();
  });
});
