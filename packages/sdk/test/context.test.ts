/**
 * Unit tests for the workspace repo-log context blocks.
 *
 * Exercises the per-file tolerance of the branch-metadata reader behind
 * `buildWorkspaceRepoLogBlocks`: one corrupt branch record must be skipped
 * with a warning instead of blanking the whole `<workspace-repo-log>` output,
 * while total absence of data still yields no blocks.
 *
 * @summary Per-file tolerance tests for workspace repo-log context blocks
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { TestGitWorkspace } from '@cards.management/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildWorkspaceRepoLogBlocks } from '../src/context.js';
import { BRANCHES_DIR, COMMITS_DIR } from '../src/protocol/index.js';

describe('buildWorkspaceRepoLogBlocks per-file tolerance', () => {
  let tmpDir = '';
  let cardRepo = '';
  let workspace: TestGitWorkspace;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'context-test-')));
    cardRepo = path.join(tmpDir, 'card-repo');
    await fs.mkdir(path.join(cardRepo, BRANCHES_DIR), { recursive: true });
    await fs.mkdir(path.join(cardRepo, COMMITS_DIR), { recursive: true });
    workspace = new TestGitWorkspace();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    warnSpy.mockRestore();
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      tmpDir = '';
    }
  });

  /**
   * Commits one tracked file and records it in the card repo's commits/ dir.
   *
   * @param message - Subject line for the commit.
   * @returns The full SHA of the created commit.
   */
  async function seedTrackedCommit(message: string): Promise<string> {
    await workspace.create();
    await workspace.createAndCommitFile('tracked.txt', 'content', message);
    const sha = (await workspace.getGit().revparse(['HEAD'])).trim();
    await fs.writeFile(path.join(cardRepo, COMMITS_DIR, sha), `${sha}\n`);
    return sha;
  }

  it('renders healthy content and skips a corrupt branch record with a warning', async () => {
    const sha = await seedTrackedCommit('Repository adds tracked.txt.');
    await fs.writeFile(
      path.join(cardRepo, BRANCHES_DIR, 'main.json'),
      JSON.stringify({ name: 'main', parentBranch: '', addedAt: '2026-01-01T00:00:00Z' })
    );
    await fs.writeFile(path.join(cardRepo, BRANCHES_DIR, 'corrupt.json'), '{ not json');

    const blocks = buildWorkspaceRepoLogBlocks(workspace.getPath(), cardRepo);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain('branch="main"');
    expect(blocks[0]).toContain(sha.slice(0, 7));
    expect(blocks[0]).toContain('Repository adds tracked.txt.');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[cards-sdk]'),
      expect.stringContaining('corrupt.json'),
      expect.any(String)
    );
  });

  it('renders both sections when every record is healthy', async () => {
    const sha = await seedTrackedCommit('Repository adds tracked.txt.');
    await fs.writeFile(
      path.join(cardRepo, BRANCHES_DIR, 'main.json'),
      JSON.stringify({ name: 'main', parentBranch: '', addedAt: '2026-01-01T00:00:00Z' })
    );

    const blocks = buildWorkspaceRepoLogBlocks(workspace.getPath(), cardRepo);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain('count="1"');
    expect(blocks[0]).toContain(sha.slice(0, 7));
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('yields no blocks when every branch record is corrupt', async () => {
    await fs.writeFile(path.join(cardRepo, BRANCHES_DIR, 'corrupt-a.json'), '{ not json');
    await fs.writeFile(path.join(cardRepo, BRANCHES_DIR, 'corrupt-b.json'), 'not json at all');

    const blocks = buildWorkspaceRepoLogBlocks(path.join(tmpDir, 'unused-workspace'), cardRepo);

    expect(blocks).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[cards-sdk]'),
      expect.stringContaining('corrupt-a.json'),
      expect.any(String)
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[cards-sdk]'),
      expect.stringContaining('corrupt-b.json'),
      expect.any(String)
    );
  });
});
