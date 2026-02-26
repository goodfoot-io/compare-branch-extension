/**
 * Tests for shared context-building utilities.
 *
 * @summary Tests for lib/context
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
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
    workspacePath: '/workspace',
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

  it('includes id, status, action, and mode attributes', () => {
    const result = buildCardBlock(makeActionInput());

    expect(result).toMatch(/^<card id="card-123"/);
    expect(result).toContain('action="Launch"');
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
        status: 'in_progress',
        gates: {
          planRequired: true,
          planApproved: true,
          reviewRequired: true,
          reviewApproved: false
        }
      })
    );

    const result = buildCardBlock(makeActionInput({ cardRepoPath: tmpDir }));

    expect(result).toContain('id="test-1"');
    expect(result).toContain('status="in_progress"');
    expect(result).toContain('Test card title');
    expect(result).toContain('planRequired=true');
    expect(result).toContain('planApproved=true');
    expect(result).toContain('reviewRequired=true');
    expect(result).toContain('reviewApproved=false');
  });

  it('falls back to actionInput.cardId when CARD.meta.json is missing', () => {
    const tmpDir = join(repoPath, '..', `card-block-no-meta-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });

    const result = buildCardBlock(makeActionInput({ cardRepoPath: tmpDir }));

    expect(result).toContain('id="card-123"');
  });

  it('includes env vars with resolved paths', () => {
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
    // TestGitWorkspace creates an "Initial commit"
    expect(result).toContain('Initial commit');
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

  /** Creates a temp card repo dir with CARD.meta.json containing the given workspace block. */
  function makeCardRepo(workspaceBlock: Record<string, unknown>): string {
    const dir = join(workspacePath, '..', `card-repo-ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'CARD.meta.json'), JSON.stringify({ id: 'card-123', workspace: workspaceBlock }));
    return dir;
  }

  it('returns empty array when CARD.meta.json has no workspace block', () => {
    const dir = join(workspacePath, '..', `no-ws-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'CARD.meta.json'), JSON.stringify({ id: 'card-123' }));

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);

    expect(blocks).toEqual([]);
  });

  it('returns empty array when workspace.commits is empty', () => {
    const dir = makeCardRepo({ branches: {}, commits: [] });

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);

    expect(blocks).toEqual([]);
  });

  it('renders a single branch block with correct attributes', () => {
    const dir = makeCardRepo({
      branches: {
        'cards/card-123/1': { parentBranch: 'main', addedAt: '2025-01-15T10:30:00Z' }
      },
      commits: [branch1CommitSha1, branch1CommitSha2]
    });

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
    const dir = makeCardRepo({
      branches: {
        'cards/card-123/1': { parentBranch: 'main', addedAt: '2025-01-15T10:30:00Z' }
      },
      commits: [branch1CommitSha1]
    });

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain('src/auth.ts');
  });

  it('deduplicates shared commits across branches with bare short hashes', () => {
    // mainCommitSha is reachable from both branches
    const dir = makeCardRepo({
      branches: {
        'cards/card-123/1': { parentBranch: 'main', addedAt: '2025-01-15T10:30:00Z' },
        'cards/card-123/2': { parentBranch: 'main', addedAt: '2025-01-16T14:00:00Z' }
      },
      commits: [mainCommitSha, branch1CommitSha1, branch2CommitSha]
    });

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
    const dir = makeCardRepo({
      branches: {},
      commits: [mainCommitSha]
    });

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

    const dir = makeCardRepo({
      branches: {},
      commits: [branch1CommitSha1]
    });

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
    const dir = makeCardRepo({
      branches: {},
      commits: [fakeSha]
    });

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);

    expect(blocks).toEqual([]);
  });

  it('handles deleted branch gracefully (commits fall through to base)', () => {
    process.env['BASE_BRANCH'] = 'main';

    const dir = makeCardRepo({
      branches: {
        'deleted-branch-xyz': { parentBranch: 'main', addedAt: '2025-01-10T00:00:00Z' }
      },
      commits: [mainCommitSha]
    });

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);

    // 'deleted-branch-xyz' doesn't exist, so mainCommitSha falls through to base
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain('branch="main"');
  });

  it('sorts branches by addedAt (oldest first gets full output)', () => {
    // Branch 2 (newer) should dedup against branch 1 (older)
    const dir = makeCardRepo({
      branches: {
        'cards/card-123/2': { parentBranch: 'main', addedAt: '2025-01-16T14:00:00Z' },
        'cards/card-123/1': { parentBranch: 'main', addedAt: '2025-01-15T10:30:00Z' }
      },
      commits: [mainCommitSha, branch1CommitSha1, branch2CommitSha]
    });

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);

    // Branch 1 should be first despite being listed second in the object
    expect(blocks[0]).toContain('branch="cards/card-123/1"');
  });

  it('returns empty array when workspacePath is not a git repo', () => {
    const fakeWorkspace = join(workspacePath, '..', `not-git-${Date.now()}`);
    mkdirSync(fakeWorkspace, { recursive: true });
    const dir = makeCardRepo({
      branches: { 'some-branch': { parentBranch: 'main', addedAt: '2025-01-15T10:30:00Z' } },
      commits: [branch1CommitSha1]
    });

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
    workspacePath: '/workspace',
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
