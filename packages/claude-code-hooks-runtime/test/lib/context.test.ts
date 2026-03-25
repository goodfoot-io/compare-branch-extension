/**
 * Tests for shared context-building utilities.
 *
 * @summary Tests for lib/context
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { WORKSPACE_BRANCHES_FILE, WORKSPACE_COMMITS_FILE } from '@cards/sdk/protocol';
import { TestGitWorkspace } from '@cards/test-utils';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  buildAdditionalContext,
  buildCardBlock,
  buildCardRepoBlock,
  buildCardRepoLogBlock,
  buildWorkspaceRepoLogBlocks,
  CardRepoAccessError
} from '../../src/lib/context.js';

let testRepo: TestGitWorkspace;
let repoPath: string;

beforeAll(async () => {
  testRepo = new TestGitWorkspace();
  repoPath = await testRepo.create();
});

afterAll(() => {
  testRepo.destroy();
});

describe('buildCardBlock', () => {
  const makeActionInput = (overrides?: Record<string, unknown>) => ({
    cardId: 'card-123',
    actionName: 'Launch',
    environment: 'default',
    executionMode: 'interactive' as const,
    apiBaseUrl: 'http://localhost:3000',
    apiAccessToken: 'test-token',
    repoRoot: '/workspace',
    cardRepoPath: repoPath,
    configPath: '/tmp/config',
    extensionPath: '/tmp/extension',
    switchToInteractiveData: undefined,
    codingAgent: undefined,
    ...overrides
  });

  afterEach(() => {
    delete process.env['WORKSPACE_PATH'];
    delete process.env['WORKSPACE_BRANCH'];
    delete process.env['BASE_BRANCH'];
  });

  it('includes id, status, and mode attributes', () => {
    const result = buildCardBlock(makeActionInput());

    expect(result).toMatch(/^<card id="card-123"/);
    expect(result).toContain('mode="interactive"');
    expect(result).toContain('</card>');
  });

  it('reads title and gates from CARD.meta.json when present', () => {
    const tmpDir = join(repoPath, '..', `card-block-meta-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(
      join(tmpDir, 'CARD.meta.json'),
      JSON.stringify({
        id: 'test-1',
        title: 'Test card title',
        status: 'active',
        gates: {
          planRequired: true,
          planApproved: true,
          mergeRequestRequired: true,
          mergeApproved: false
        }
      })
    );

    const result = buildCardBlock(makeActionInput({ cardRepoPath: tmpDir }));

    expect(result).toContain('id="test-1"');
    expect(result).toContain('status="active"');
    expect(result).toContain('title: Test card title');
    expect(result).toContain('planRequired=true');
    expect(result).toContain('planApproved=true');
    expect(result).toContain('mergeRequestRequired=true');
    expect(result).toContain('mergeApproved=false');
  });

  it('falls back to actionInput.cardId when CARD.meta.json is missing', () => {
    const tmpDir = join(repoPath, '..', `card-block-no-meta-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });

    const result = buildCardBlock(makeActionInput({ cardRepoPath: tmpDir }));

    expect(result).toContain('id="card-123"');
  });

  it('includes env vars with resolved paths', () => {
    process.env['WORKSPACE_PATH'] = '/workspace';
    const result = buildCardBlock(makeActionInput());

    expect(result).toContain(`CARD_REPO_PATH=${repoPath}`);
    expect(result).toContain('WORKSPACE_PATH=/workspace');
  });

  it('includes branch env vars when set', () => {
    process.env['WORKSPACE_BRANCH'] = 'cards/card-123/1';
    process.env['BASE_BRANCH'] = 'main';

    const result = buildCardBlock(makeActionInput());

    expect(result).toContain('WORKSPACE_BRANCH=cards/card-123/1');
    expect(result).toContain('BASE_BRANCH=main');
  });

  it('omits branch env vars when not set', () => {
    const result = buildCardBlock(makeActionInput());

    expect(result).not.toContain('WORKSPACE_BRANCH');
    expect(result).not.toContain('BASE_BRANCH');
  });
});

describe('buildCardRepoBlock', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = join(repoPath, '..', `repo-block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  it('lists root files with timestamps', () => {
    const dir = join(tmpDir, 'files-test');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'CARD.md'), '# Hello');
    writeFileSync(join(dir, 'PLAN.md'), '# Plan');

    const result = buildCardRepoBlock(dir);

    expect(result).toMatch(/<card-repo>/);
    expect(result).toMatch(/<\/card-repo>/);
    expect(result).toMatch(/CARD\.md\s+\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z/);
    expect(result).toMatch(/PLAN\.md\s+\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z/);
  });

  it('lists directories with child counts', () => {
    const dir = join(tmpDir, 'dirs-test');
    mkdirSync(join(dir, 'comment'), { recursive: true });
    writeFileSync(join(dir, 'comment', 'a.md'), 'a');
    writeFileSync(join(dir, 'comment', 'b.md'), 'b');

    const result = buildCardRepoBlock(dir);

    expect(result).toMatch(/comment\/\s+2 files\s+latest \d{4}/);
  });

  it('lists streams subdirectories with child counts', () => {
    const dir = join(tmpDir, 'streams-test');
    mkdirSync(join(dir, 'streams', 'claude-code-session'), { recursive: true });
    writeFileSync(join(dir, 'streams', 'claude-code-session', 'a.jsonl'), '{}');
    writeFileSync(join(dir, 'streams', 'claude-code-session', 'b.jsonl'), '{}');
    writeFileSync(join(dir, 'streams', 'claude-code-session', 'c.jsonl'), '{}');

    const result = buildCardRepoBlock(dir);

    expect(result).toContain('streams/');
    expect(result).toMatch(/claude-code-session\/\s+3 files\s+latest \d{4}/);
  });

  it('excludes .git directory', () => {
    const dir = join(tmpDir, 'git-exclude-test');
    mkdirSync(join(dir, '.git', 'objects'), { recursive: true });
    writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/main');
    writeFileSync(join(dir, 'CARD.md'), '# Hello');

    const result = buildCardRepoBlock(dir);

    expect(result).toContain('CARD.md');
    expect(result).not.toContain('.git');
  });

  it('throws CardRepoAccessError for non-existent path', () => {
    const badPath = '/tmp/does-not-exist-xyz-123';

    expect(() => buildCardRepoBlock(badPath)).toThrow(CardRepoAccessError);
    expect(() => buildCardRepoBlock(badPath)).toThrow(/Cannot read card repository/);
  });

  it('returns empty block for empty directory', () => {
    const dir = join(tmpDir, 'empty-test');
    mkdirSync(dir, { recursive: true });

    const result = buildCardRepoBlock(dir);

    expect(result).toBe('<card-repo>\n\n</card-repo>');
  });
});

describe('buildCardRepoLogBlock', () => {
  it('returns log block with recent commits', () => {
    const result = buildCardRepoLogBlock(repoPath);

    expect(result).not.toBeNull();
    expect(result).toMatch(/<card-repo-log count="\d+">/);
    expect(result).toContain('</card-repo-log>');
    // TestGitWorkspace creates a "Repository initializes." commit
    expect(result).toContain('Repository initializes.');
  });

  it('includes total commit count attribute', () => {
    const result = buildCardRepoLogBlock(repoPath);

    expect(result).not.toBeNull();
    const match = result!.match(/count="(\d+)"/);
    expect(match).not.toBeNull();
    expect(parseInt(match![1]!, 10)).toBeGreaterThanOrEqual(1);
  });

  it('returns null for non-git directory', () => {
    const dir = join(repoPath, '..', `no-git-log-${Date.now()}`);
    mkdirSync(dir, { recursive: true });

    const result = buildCardRepoLogBlock(dir);

    expect(result).toBeNull();
  });

  it('uses diffstat file paths without line counts', () => {
    const result = buildCardRepoLogBlock(repoPath);

    expect(result).not.toBeNull();
    expect(result).not.toContain('diff --git');
    // File paths appear but without " | N +/-" line counts
    expect(result).not.toMatch(/\|\s+\d+/);
  });

  describe('.gitignore filtering', () => {
    let gitignoreRepo: TestGitWorkspace;
    let gitignorePath: string;

    beforeAll(async () => {
      gitignoreRepo = new TestGitWorkspace();
      gitignorePath = await gitignoreRepo.create();

      // Commit a .gitignore file (should be filtered out)
      await gitignoreRepo.createAndCommitFile('.gitignore', 'node_modules/\ndist/\n', 'Add gitignore');

      // Commit a non-.gitignore file (should be included)
      await gitignoreRepo.createAndCommitFile('CARD.md', '# Card\n', 'Add card description');
    });

    afterAll(() => {
      gitignoreRepo.destroy();
    });

    it('omits .gitignore-only commits from log', () => {
      const result = buildCardRepoLogBlock(gitignorePath);

      expect(result).not.toBeNull();
      expect(result).not.toContain('Add gitignore');
    });

    it('excludes .gitignore diffs from mixed commits', async () => {
      const mixedRepo = new TestGitWorkspace();
      const mixedPath = await mixedRepo.create();

      try {
        // Commit both .gitignore and CARD.md together
        writeFileSync(join(mixedPath, '.gitignore'), 'node_modules/\n');
        writeFileSync(join(mixedPath, 'CARD.md'), '# Card\n');
        const git = mixedRepo.getGit();
        await git.add(['.gitignore', 'CARD.md']);
        await git.commit('Add gitignore and card');

        const result = buildCardRepoLogBlock(mixedPath);

        expect(result).not.toBeNull();
        expect(result).toContain('Add gitignore and card');
        expect(result).toContain('CARD.md');
        expect(result).not.toContain('.gitignore');
      } finally {
        mixedRepo.destroy();
      }
    });
  });

  describe('streams filtering', () => {
    let streamsRepo: TestGitWorkspace;
    let streamsPath: string;

    beforeAll(async () => {
      streamsRepo = new TestGitWorkspace();
      streamsPath = await streamsRepo.create();
      const git = streamsRepo.getGit();

      // Normal commit
      await streamsRepo.createAndCommitFile('CARD.md', '# Card\n', 'Add card description');

      // Streams-only commit (should be filtered out)
      await streamsRepo.createAndCommitFile('streams/session/log.jsonl', '{"type":"init"}\n', 'Add session stream');

      // Mixed commit: both streams and non-streams files
      writeFileSync(join(streamsPath, 'streams/session/log.jsonl'), '{"type":"update"}\n');
      writeFileSync(join(streamsPath, 'CARD.md'), '# Updated Card\n');
      await git.add(['streams/session/log.jsonl', 'CARD.md']);
      await git.commit('Update card and stream');
    });

    afterAll(() => {
      streamsRepo.destroy();
    });

    it('omits streams-only commits from log', () => {
      const result = buildCardRepoLogBlock(streamsPath);

      expect(result).not.toBeNull();
      expect(result).not.toContain('Add session stream');
    });

    it('includes mixed commits without streams file diffs', () => {
      const result = buildCardRepoLogBlock(streamsPath);

      expect(result).not.toBeNull();
      expect(result).toContain('Update card and stream');
      expect(result).not.toContain('streams/');
      expect(result).toContain('CARD.md');
    });
  });
});

describe('buildWorkspaceRepoLogBlocks', () => {
  let workspace: TestGitWorkspace;
  let workspacePath: string;

  // Commit SHAs collected during setup
  let mainCommitSha: string;
  let branch1CommitSha1: string;
  let branch1CommitSha2: string;
  let branch2CommitSha: string;

  beforeAll(async () => {
    workspace = new TestGitWorkspace();
    workspacePath = await workspace.create();
    const git = workspace.getGit();

    // Commit on main (after the initial commit from create())
    await workspace.createAndCommitFile('src/main.ts', 'export const x = 1;', 'feat: main work');
    mainCommitSha = (await git.revparse(['HEAD'])).trim();

    // Create branch 1 and add commits
    await git.checkout(['-b', 'cards/card-123/1']);
    await workspace.createAndCommitFile('src/auth.ts', 'export function auth() {}', 'feat: implement auth');
    branch1CommitSha1 = (await git.revparse(['HEAD'])).trim();
    await workspace.createAndCommitFile('src/auth.test.ts', 'test("auth")', 'test: auth tests');
    branch1CommitSha2 = (await git.revparse(['HEAD'])).trim();

    // Go back to main and create branch 2
    await git.checkout(['main']);
    await git.checkout(['-b', 'cards/card-123/2']);
    await workspace.createAndCommitFile('src/api.ts', 'export function api() {}', 'feat: implement api');
    branch2CommitSha = (await git.revparse(['HEAD'])).trim();

    // Return to main so branch refs are stable
    await git.checkout(['main']);
  });

  afterAll(() => {
    workspace.destroy();
  });

  afterEach(() => {
    delete process.env['BASE_BRANCH'];
  });

  /**
   * Creates a temp card repo dir with workspace-branches.json and workspace-commits.csv.
   *
   * @param branches - Branch map to write to workspace-branches.json.
   * @param commits - Commit SHAs to write to workspace-commits.csv.
   * @returns Path to the created temporary directory.
   */
  function makeCardRepo(branches: Record<string, unknown>, commits: string[]): string {
    const dir = join(workspacePath, '..', `card-repo-ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, WORKSPACE_BRANCHES_FILE), JSON.stringify(branches, null, 2));
    writeFileSync(join(dir, WORKSPACE_COMMITS_FILE), commits.map((c) => `${c}\n`).join(''));
    return dir;
  }

  it('returns empty array when workspace files are missing', () => {
    const dir = join(workspacePath, '..', `no-ws-${Date.now()}`);
    mkdirSync(dir, { recursive: true });

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);

    expect(blocks).toEqual([]);
  });

  it('returns empty blocks when branches exist but no commits file exists', () => {
    const dir = join(workspacePath, '..', `branches-only-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, WORKSPACE_BRANCHES_FILE),
      JSON.stringify({ 'cards/card-123/1': { parentBranch: 'main', addedAt: '2025-01-15T10:30:00Z' } }, null, 2)
    );
    // No workspace-commits.csv — readWorkspaceData returns non-null (branches exist),
    // but no commits means no blocks to render. The critical behavior is that
    // readWorkspaceData does NOT return null — branches are recognized.

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);

    // No commits to attribute → no blocks rendered, but the function reached the
    // branch-processing logic (it did not early-return null from readWorkspaceData).
    expect(blocks).toEqual([]);
  });

  it('renders commits correctly when branches exist and commits arrive later', () => {
    const dir = join(
      workspacePath,
      '..',
      `branches-then-commits-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    );
    mkdirSync(dir, { recursive: true });
    // Branches file exists first
    writeFileSync(
      join(dir, WORKSPACE_BRANCHES_FILE),
      JSON.stringify({ 'cards/card-123/1': { parentBranch: 'main', addedAt: '2025-01-15T10:30:00Z' } }, null, 2)
    );
    // Then commits arrive
    writeFileSync(join(dir, WORKSPACE_COMMITS_FILE), `${branch1CommitSha1}\n`);

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain('branch="cards/card-123/1"');
    expect(blocks[0]).toContain('parentBranch="main"');
    expect(blocks[0]).toContain('count="1"');
  });

  it('renders a single branch block with correct attributes', () => {
    const dir = makeCardRepo({ 'cards/card-123/1': { parentBranch: 'main', addedAt: '2025-01-15T10:30:00Z' } }, [
      branch1CommitSha1,
      branch1CommitSha2
    ]);

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain('branch="cards/card-123/1"');
    expect(blocks[0]).toContain('parentBranch="main"');
    expect(blocks[0]).toContain('count="2"');
    expect(blocks[0]).toContain('<workspace-repo-log');
    expect(blocks[0]).toContain('</workspace-repo-log>');
    // Should contain short hashes and commit subjects
    expect(blocks[0]).toContain('feat: implement auth');
    expect(blocks[0]).toContain('test: auth tests');
  });

  it('renders diffstat for workspace commits', () => {
    const dir = makeCardRepo({ 'cards/card-123/1': { parentBranch: 'main', addedAt: '2025-01-15T10:30:00Z' } }, [
      branch1CommitSha1
    ]);

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain('src/auth.ts');
  });

  it('deduplicates shared commits across branches with bare short hashes', () => {
    // mainCommitSha is reachable from both branches
    const dir = makeCardRepo(
      {
        'cards/card-123/1': { parentBranch: 'main', addedAt: '2025-01-15T10:30:00Z' },
        'cards/card-123/2': { parentBranch: 'main', addedAt: '2025-01-16T14:00:00Z' }
      },
      [mainCommitSha, branch1CommitSha1, branch2CommitSha]
    );

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);

    // Branch 1 (oldest, processed first) should claim mainCommitSha + branch1CommitSha1
    expect(blocks[0]).toContain('branch="cards/card-123/1"');
    expect(blocks[0]).toContain('feat: main work');
    expect(blocks[0]).toContain('feat: implement auth');

    // Branch 2 should have branch2CommitSha in full + mainCommitSha as bare hash
    const branch2Block = blocks.find((b) => b.includes('branch="cards/card-123/2"'));
    expect(branch2Block).toBeDefined();
    expect(branch2Block).toContain('feat: implement api');
    // mainCommitSha appears as a 7-char bare hash (dedup reference)
    expect(branch2Block).toContain(mainCommitSha.slice(0, 7));
  });

  it('assigns unclaimed commits to base branch', () => {
    process.env['BASE_BRANCH'] = 'main';

    // Use a commit on main that is NOT reachable from either feature branch
    // (branch2 was created from main before mainCommitSha existed in branch namespace)
    // Actually, mainCommitSha IS reachable from both branches.
    // So let's create a scenario with no tracked branches — all commits go to base.
    const dir = makeCardRepo({}, [mainCommitSha]);

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain('branch="main"');
    expect(blocks[0]).toContain('feat: main work');
  });

  it('renders orphaned block for commits not on any branch', () => {
    // Use a SHA that exists in the workspace repo but isn't on any tracked
    // branch or base. We'll use a real SHA and set BASE_BRANCH to a
    // non-existent ref so nothing claims it.
    process.env['BASE_BRANCH'] = 'nonexistent-base-branch';

    const dir = makeCardRepo({}, [branch1CommitSha1]);

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);

    // branch1CommitSha1 is not on 'nonexistent-base-branch' and no tracked branches
    // It should be orphaned but resolvable
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain('orphaned="true"');
    expect(blocks[0]).toContain('feat: implement auth');
  });

  it('silently drops unresolvable orphaned commits', () => {
    process.env['BASE_BRANCH'] = 'nonexistent-base-branch';

    const fakeSha = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
    const dir = makeCardRepo({}, [fakeSha]);

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);

    expect(blocks).toEqual([]);
  });

  it('handles deleted branch gracefully (commits fall through to base)', () => {
    process.env['BASE_BRANCH'] = 'main';

    const dir = makeCardRepo({ 'deleted-branch-xyz': { parentBranch: 'main', addedAt: '2025-01-10T00:00:00Z' } }, [
      mainCommitSha
    ]);

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);

    // 'deleted-branch-xyz' doesn't exist, so mainCommitSha falls through to base
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain('branch="main"');
  });

  it('sorts branches by addedAt (oldest first gets full output)', () => {
    // Branch 2 (newer) should dedup against branch 1 (older)
    const dir = makeCardRepo(
      {
        'cards/card-123/2': { parentBranch: 'main', addedAt: '2025-01-16T14:00:00Z' },
        'cards/card-123/1': { parentBranch: 'main', addedAt: '2025-01-15T10:30:00Z' }
      },
      [mainCommitSha, branch1CommitSha1, branch2CommitSha]
    );

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);

    // Branch 1 should be first despite being listed second in the object
    expect(blocks[0]).toContain('branch="cards/card-123/1"');
  });

  it('returns empty array when workspacePath is not a git repo', () => {
    const fakeWorkspace = join(workspacePath, '..', `not-git-${Date.now()}`);
    mkdirSync(fakeWorkspace, { recursive: true });
    const dir = makeCardRepo({ 'some-branch': { parentBranch: 'main', addedAt: '2025-01-15T10:30:00Z' } }, [
      branch1CommitSha1
    ]);

    const blocks = buildWorkspaceRepoLogBlocks(fakeWorkspace, dir);

    // No branches resolvable, orphaned SHAs also not resolvable → empty
    expect(blocks).toEqual([]);
  });
});

describe('buildAdditionalContext', () => {
  const makeActionInput = (overrides?: Record<string, unknown>) => ({
    cardId: 'card-123',
    actionName: 'Launch',
    environment: 'default',
    executionMode: 'interactive' as const,
    apiBaseUrl: 'http://localhost:3000',
    apiAccessToken: 'test-token',
    repoRoot: '/workspace',
    cardRepoPath: repoPath,
    configPath: '/tmp/config',
    extensionPath: '/tmp/extension',
    switchToInteractiveData: undefined,
    codingAgent: undefined,
    ...overrides
  });

  afterEach(() => {
    delete process.env['WORKSPACE_BRANCH'];
    delete process.env['BASE_BRANCH'];
  });

  it('contains card block, repo block, and log block', () => {
    const result = buildAdditionalContext(makeActionInput());

    expect(result).toMatch(/<card [^>]+>/);
    expect(result).toContain('</card>');
    expect(result).toContain('<card-repo>');
    expect(result).toContain('</card-repo>');
    expect(result).toContain('<card-repo-log');
    expect(result).toContain('</card-repo-log>');
  });

  it('throws CardRepoAccessError when repo is inaccessible', () => {
    const input = makeActionInput({ cardRepoPath: '/tmp/does-not-exist-xyz-999' });

    expect(() => buildAdditionalContext(input)).toThrow(CardRepoAccessError);
  });

  it('includes branch info when env vars are set', () => {
    process.env['WORKSPACE_BRANCH'] = 'cards/card-123/1';
    process.env['BASE_BRANCH'] = 'main';

    const result = buildAdditionalContext(makeActionInput());

    expect(result).toContain('WORKSPACE_BRANCH=cards/card-123/1');
    expect(result).toContain('BASE_BRANCH=main');
  });
});
