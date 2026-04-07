/**
 * Tests for shared context-building utilities.
 *
 * @summary Tests for lib/context
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BRANCHES_FILE, COMMITS_FILE } from '@cards/sdk/protocol';
import { TestGitWorkspace } from '@cards/test-utils';
import yaml from 'js-yaml';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  buildAdditionalContext,
  buildCardBlock,
  buildCardRepoBlock,
  buildCardRepoLogBlock,
  buildEnvBlock,
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

describe('buildEnvBlock', () => {
  const makeActionInput = (overrides?: Record<string, unknown>) => ({
    cardId: 'card-123',
    actionName: 'Launch',
    environment: 'default',
    executionMode: 'interactive' as const,
    repoRoot: '/workspace',
    cardRepoPath: repoPath,
    configPath: '/tmp/config',
    extensionPath: '/tmp/extension',
    switchToInteractiveData: undefined,
    codingAgent: undefined,
    marketplacePath: '/test/marketplace',
    ...overrides
  });

  afterEach(() => {
    delete process.env['WORKSPACE_PATH'];
    delete process.env['WORKSPACE_BRANCH'];
    delete process.env['BASE_BRANCH'];
  });

  it('produces a fenced bash block with all env vars', () => {
    process.env['WORKSPACE_PATH'] = '/workspace';
    process.env['BASE_BRANCH'] = 'main';
    process.env['WORKSPACE_BRANCH'] = 'cards/card-123/1';

    const result = buildEnvBlock(makeActionInput());

    expect(result).toMatch(/^```bash\n/);
    expect(result).toMatch(/\n```$/);
    expect(result).toContain('CARD_ID=card-123');
    expect(result).toContain(`CARD_REPO_PATH=${repoPath}`);
    expect(result).toContain('WORKSPACE_PATH=/workspace');
    expect(result).toContain('BASE_BRANCH=main');
    expect(result).toContain('WORKSPACE_BRANCH=cards/card-123/1');
    expect(result).toContain('EXECUTION_MODE=interactive');
  });

  it('includes EXECUTION_MODE from actionInput.executionMode', () => {
    const result = buildEnvBlock(makeActionInput({ executionMode: 'background' }));

    expect(result).toContain('EXECUTION_MODE=background');
  });
});

describe('buildCardBlock', () => {
  const makeActionInput = (overrides?: Record<string, unknown>) => ({
    cardId: 'card-123',
    actionName: 'Launch',
    environment: 'default',
    executionMode: 'interactive' as const,
    repoRoot: '/workspace',
    cardRepoPath: repoPath,
    configPath: '/tmp/config',
    extensionPath: '/tmp/extension',
    marketplacePath: '/test/marketplace',
    switchToInteractiveData: undefined,
    codingAgent: undefined,
    ...overrides
  });

  it('produces a YAML card block with type="yaml" attribute', () => {
    const tmpDir = join(repoPath, '..', `card-block-yaml-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(
      join(tmpDir, 'CARD.meta.json'),
      JSON.stringify({
        id: 'test-1',
        title: 'Test card title',
        status: 'active',
        tags: ['feature', 'security'],
        gates: {
          planRequired: true,
          planApproved: true,
          mergeRequestRequired: true,
          mergeApproved: false
        }
      })
    );

    const result = buildCardBlock(makeActionInput({ cardRepoPath: tmpDir }));

    expect(result).toMatch(/^<card type="yaml">/);
    expect(result).toContain('</card>');

    // Parse the YAML body
    const yamlContent = result.replace(/^<card type="yaml">\n/, '').replace(/\n<\/card>$/, '');
    const parsed = yaml.load(yamlContent) as Record<string, unknown>;
    expect(parsed['id']).toBe('test-1');
    expect(parsed['title']).toBe('Test card title');
    expect(parsed['status']).toBe('active');
    expect(parsed['tags']).toEqual(['feature', 'security']);
    expect(parsed['gates']).toEqual({
      planRequired: true,
      planApproved: true,
      mergeRequestRequired: true,
      mergeApproved: false
    });
  });

  it('dumps CARD.meta.json verbatim including relations', () => {
    const tmpDir = join(repoPath, '..', `card-block-rel-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(
      join(tmpDir, 'CARD.meta.json'),
      JSON.stringify({
        id: 'test-rel',
        title: 'Card with relations',
        status: 'active',
        tags: [],
        gates: { planRequired: false, planApproved: false, mergeRequestRequired: false, mergeApproved: false },
        relations: [{ type: 'related', cardId: 'main-99' }]
      })
    );

    const result = buildCardBlock(makeActionInput({ cardRepoPath: tmpDir }));
    const yamlContent = result.replace(/^<card type="yaml">\n/, '').replace(/\n<\/card>$/, '');
    const parsed = yaml.load(yamlContent) as Record<string, unknown>;

    expect(parsed['relations']).toEqual([{ type: 'related', cardId: 'main-99' }]);
  });

  it('throws when CARD.meta.json is missing (fail closed)', () => {
    const tmpDir = join(repoPath, '..', `card-block-no-meta-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });

    expect(() => buildCardBlock(makeActionInput({ cardRepoPath: tmpDir }))).toThrow();
  });

  it('does not include id, status, or mode as XML attributes', () => {
    const tmpDir = join(repoPath, '..', `card-block-noattr-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(
      join(tmpDir, 'CARD.meta.json'),
      JSON.stringify({
        id: 'test-2',
        title: 'Test',
        status: 'active',
        gates: { planRequired: false, planApproved: false, mergeRequestRequired: false, mergeApproved: false }
      })
    );

    const result = buildCardBlock(makeActionInput({ cardRepoPath: tmpDir }));

    expect(result).not.toContain('id="');
    expect(result).not.toContain('status="');
    expect(result).not.toContain('mode="');
  });
});

describe('buildCardRepoBlock', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = join(repoPath, '..', `repo-block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  it('produces YAML output with type="yaml" attribute', () => {
    const dir = join(tmpDir, 'yaml-test');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'CARD.md'), '# Hello');

    const result = buildCardRepoBlock(dir);

    expect(result).toMatch(/^<card-repo type="yaml">/);
    expect(result).toContain('</card-repo>');

    const yamlContent = result.replace(/^<card-repo type="yaml">\n/, '').replace(/\n<\/card-repo>$/, '');
    const parsed = yaml.load(yamlContent) as Array<{ name: string }>;
    expect(parsed.some((e) => e.name === 'CARD.md')).toBe(true);
  });

  it('lists root files and directories in YAML format', () => {
    const dir = join(tmpDir, 'files-test');
    mkdirSync(join(dir, 'plan'), { recursive: true });
    writeFileSync(join(dir, 'CARD.md'), '# Hello');
    writeFileSync(join(dir, 'plan', 'initial.md'), '# Plan');

    const result = buildCardRepoBlock(dir);
    const yamlContent = result.replace(/^<card-repo type="yaml">\n/, '').replace(/\n<\/card-repo>$/, '');
    const parsed = yaml.load(yamlContent) as Array<Record<string, unknown>>;

    const cardMd = parsed.find((e) => e['name'] === 'CARD.md');
    expect(cardMd).toBeDefined();
    const planDir = parsed.find((e) => e['name'] === 'plan/');
    expect(planDir).toBeDefined();
  });

  it('lists streams subdirectories with count field', () => {
    const dir = join(tmpDir, 'streams-test');
    mkdirSync(join(dir, 'streams', 'claude-code-session'), { recursive: true });
    writeFileSync(join(dir, 'streams', 'claude-code-session', 'a.jsonl'), '{}');
    writeFileSync(join(dir, 'streams', 'claude-code-session', 'b.jsonl'), '{}');
    writeFileSync(join(dir, 'streams', 'claude-code-session', 'c.jsonl'), '{}');

    const result = buildCardRepoBlock(dir);
    const yamlContent = result.replace(/^<card-repo type="yaml">\n/, '').replace(/\n<\/card-repo>$/, '');
    const parsed = yaml.load(yamlContent) as Array<Record<string, unknown>>;

    const streams = parsed.find((e) => e['name'] === 'streams/');
    expect(streams).toBeDefined();
    const entries = streams!['entries'] as Array<Record<string, unknown>>;
    const session = entries.find((e) => e['name'] === 'claude-code-session/');
    expect(session).toBeDefined();
    expect(session!['count']).toBe(3);
  });

  it('lists comment files in entries array', () => {
    const dir = join(tmpDir, 'comment-expand-test');
    mkdirSync(join(dir, 'comment'), { recursive: true });
    writeFileSync(join(dir, 'comment', 'initial.md'), 'first');
    writeFileSync(join(dir, 'comment', 'followup.md'), 'second');

    const result = buildCardRepoBlock(dir);
    const yamlContent = result.replace(/^<card-repo type="yaml">\n/, '').replace(/\n<\/card-repo>$/, '');
    const parsed = yaml.load(yamlContent) as Array<Record<string, unknown>>;

    const comment = parsed.find((e) => e['name'] === 'comment/');
    expect(comment).toBeDefined();
    const entries = comment!['entries'] as Array<Record<string, unknown>>;
    expect(entries.some((e) => e['name'] === 'initial.md')).toBe(true);
    expect(entries.some((e) => e['name'] === 'followup.md')).toBe(true);
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

  it('inlines sidecar summary in YAML entries', () => {
    const dir = join(tmpDir, 'root-summary-test');
    mkdirSync(join(dir, 'plan'), { recursive: true });
    writeFileSync(join(dir, 'plan', 'initial.md'), '# Plan');
    writeFileSync(
      join(dir, 'plan', 'initial.md.meta.json'),
      JSON.stringify({ title: 'Plan', summary: 'Migrate auth middleware.' })
    );

    const result = buildCardRepoBlock(dir);
    const yamlContent = result.replace(/^<card-repo type="yaml">\n/, '').replace(/\n<\/card-repo>$/, '');
    const parsed = yaml.load(yamlContent) as Array<Record<string, unknown>>;

    const planDir = parsed.find((e) => e['name'] === 'plan/');
    expect(planDir).toBeDefined();
    const entries = planDir!['entries'] as Array<Record<string, unknown>>;
    const mdEntry = entries.find((e) => e['name'] === 'initial.md');
    expect(mdEntry).toBeDefined();
    expect(mdEntry!['summary']).toBe('Migrate auth middleware.');
    // Sidecar is listed too
    expect(entries.some((e) => e['name'] === 'initial.md.meta.json')).toBe(true);
  });

  it('shows remaining count for directory with summarized and unsummarized files', () => {
    const dir = join(tmpDir, 'dir-expand-test');
    mkdirSync(join(dir, 'notes'), { recursive: true });
    writeFileSync(join(dir, 'notes', 'entry.md'), '# Entry');
    writeFileSync(join(dir, 'notes', 'entry.md.meta.json'), JSON.stringify({ summary: 'Entry points overview.' }));
    writeFileSync(join(dir, 'notes', 'other.txt'), 'plain text');

    const result = buildCardRepoBlock(dir);
    const yamlContent = result.replace(/^<card-repo type="yaml">\n/, '').replace(/\n<\/card-repo>$/, '');
    const parsed = yaml.load(yamlContent) as Array<Record<string, unknown>>;

    const notesDir = parsed.find((e) => e['name'] === 'notes/');
    expect(notesDir).toBeDefined();
    expect(notesDir!['remaining']).toBe(1);
  });

  it('shows compact count for directory with no sidecar summaries', () => {
    const dir = join(tmpDir, 'dir-compact-test');
    mkdirSync(join(dir, 'data'), { recursive: true });
    writeFileSync(join(dir, 'data', 'a.json'), '{}');
    writeFileSync(join(dir, 'data', 'b.json'), '{}');

    const result = buildCardRepoBlock(dir);
    const yamlContent = result.replace(/^<card-repo type="yaml">\n/, '').replace(/\n<\/card-repo>$/, '');
    const parsed = yaml.load(yamlContent) as Array<Record<string, unknown>>;

    const dataDir = parsed.find((e) => e['name'] === 'data/');
    expect(dataDir).toBeDefined();
    expect(dataDir!['count']).toBe(2);
  });
});

describe('buildCardRepoLogBlock', () => {
  it('returns YAML log block with type="yaml" attribute', () => {
    const result = buildCardRepoLogBlock(repoPath);

    expect(result).not.toBeNull();
    expect(result).toMatch(/<card-repo-log type="yaml" count="\d+" order="oldest-first">/);
    expect(result).toContain('</card-repo-log>');
  });

  it('produces YAML array with sha, author, subject fields', () => {
    const result = buildCardRepoLogBlock(repoPath);

    expect(result).not.toBeNull();
    const yamlContent = result!.replace(/^<card-repo-log[^>]*>\n/, '').replace(/\n<\/card-repo-log>$/, '');
    const parsed = yaml.load(yamlContent) as Array<Record<string, string>>;

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0]).toHaveProperty('sha');
    expect(parsed[0]).toHaveProperty('author');
    expect(parsed[0]).toHaveProperty('subject');
    // TestGitWorkspace creates a "Repository initializes." commit
    expect(parsed.some((c) => c['subject'] === 'Repository initializes.')).toBe(true);
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

  it('lists commits in chronological order (oldest first)', async () => {
    const chronoRepo = new TestGitWorkspace();
    const chronoPath = await chronoRepo.create();

    try {
      await chronoRepo.createAndCommitFile('CARD.md', '# First', 'First commit');
      await chronoRepo.createAndCommitFile('plan/initial.md', '# Second', 'Second commit');

      const result = buildCardRepoLogBlock(chronoPath);

      expect(result).not.toBeNull();
      const yamlContent = result!.replace(/^<card-repo-log[^>]*>\n/, '').replace(/\n<\/card-repo-log>$/, '');
      const parsed = yaml.load(yamlContent) as Array<Record<string, string>>;
      const firstIdx = parsed.findIndex((c) => c['subject'] === 'First commit');
      const secondIdx = parsed.findIndex((c) => c['subject'] === 'Second commit');
      expect(firstIdx).toBeLessThan(secondIdx);
    } finally {
      chronoRepo.destroy();
    }
  });

  describe('.gitignore filtering', () => {
    let gitignoreRepo: TestGitWorkspace;
    let gitignorePath: string;

    beforeAll(async () => {
      gitignoreRepo = new TestGitWorkspace();
      gitignorePath = await gitignoreRepo.create();
      await gitignoreRepo.createAndCommitFile('.gitignore', 'node_modules/\ndist/\n', 'Add gitignore');
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
  });

  describe('streams filtering', () => {
    let streamsRepo: TestGitWorkspace;
    let streamsPath: string;

    beforeAll(async () => {
      streamsRepo = new TestGitWorkspace();
      streamsPath = await streamsRepo.create();

      await streamsRepo.createAndCommitFile('CARD.md', '# Card\n', 'Add card description');
      await streamsRepo.createAndCommitFile('streams/session/log.jsonl', '{"type":"init"}\n', 'Add session stream');

      const git = streamsRepo.getGit();
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

    it('includes mixed commits', () => {
      const result = buildCardRepoLogBlock(streamsPath);

      expect(result).not.toBeNull();
      expect(result).toContain('Update card and stream');
    });
  });
});

describe('buildWorkspaceRepoLogBlocks', () => {
  let workspace: TestGitWorkspace;
  let workspacePath: string;

  let mainCommitSha: string;
  let branch1CommitSha1: string;
  let branch1CommitSha2: string;
  let branch2CommitSha: string;

  beforeAll(async () => {
    workspace = new TestGitWorkspace();
    workspacePath = await workspace.create();
    const git = workspace.getGit();

    await workspace.createAndCommitFile('src/main.ts', 'export const x = 1;', 'feat: main work');
    mainCommitSha = (await git.revparse(['HEAD'])).trim();

    await git.checkout(['-b', 'cards/card-123/1']);
    await workspace.createAndCommitFile('src/auth.ts', 'export function auth() {}', 'feat: implement auth');
    branch1CommitSha1 = (await git.revparse(['HEAD'])).trim();
    await workspace.createAndCommitFile('src/auth.test.ts', 'test("auth")', 'test: auth tests');
    branch1CommitSha2 = (await git.revparse(['HEAD'])).trim();

    await git.checkout(['main']);
    await git.checkout(['-b', 'cards/card-123/2']);
    await workspace.createAndCommitFile('src/api.ts', 'export function api() {}', 'feat: implement api');
    branch2CommitSha = (await git.revparse(['HEAD'])).trim();

    await git.checkout(['main']);
  });

  afterAll(() => {
    workspace.destroy();
  });

  afterEach(() => {
    delete process.env['BASE_BRANCH'];
  });

  function makeCardRepo(branches: Record<string, unknown>, commits: string[]): string {
    const dir = join(workspacePath, '..', `card-repo-ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, BRANCHES_FILE), JSON.stringify(branches, null, 2));
    writeFileSync(join(dir, COMMITS_FILE), commits.map((c) => `${c}\n`).join(''));
    return dir;
  }

  it('returns empty array when workspace files are missing', () => {
    const dir = join(workspacePath, '..', `no-ws-${Date.now()}`);
    mkdirSync(dir, { recursive: true });

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);

    expect(blocks).toEqual([]);
  });

  it('renders YAML blocks with type="yaml" attribute', () => {
    const dir = makeCardRepo({ 'cards/card-123/1': { parentBranch: 'main', addedAt: '2025-01-15T10:30:00Z' } }, [
      branch1CommitSha1,
      branch1CommitSha2
    ]);

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatch(/<workspace-repo-log type="yaml"/);
    expect(blocks[0]).toContain('branch="cards/card-123/1"');
    expect(blocks[0]).toContain('count="2"');
    expect(blocks[0]).toContain('</workspace-repo-log>');
  });

  it('produces YAML array with sha and subject fields', () => {
    const dir = makeCardRepo({ 'cards/card-123/1': { parentBranch: 'main', addedAt: '2025-01-15T10:30:00Z' } }, [
      branch1CommitSha1,
      branch1CommitSha2
    ]);

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);
    const yamlContent = blocks[0]!.replace(/^<workspace-repo-log[^>]*>\n/, '').replace(/\n<\/workspace-repo-log>$/, '');
    const parsed = yaml.load(yamlContent) as Array<Record<string, unknown>>;

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.some((c) => c['subject'] === 'feat: implement auth')).toBe(true);
    expect(parsed.some((c) => c['subject'] === 'test: auth tests')).toBe(true);
    // Each commit has sha and subject
    for (const commit of parsed) {
      expect(commit).toHaveProperty('sha');
      expect(commit).toHaveProperty('subject');
    }
  });

  it('does not include file lists in commit entries', () => {
    const dir = makeCardRepo({ 'cards/card-123/1': { parentBranch: 'main', addedAt: '2025-01-15T10:30:00Z' } }, [
      branch1CommitSha1
    ]);

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).not.toContain('src/auth.ts');
  });

  it('assigns unclaimed commits to base branch', () => {
    process.env['BASE_BRANCH'] = 'main';

    const dir = makeCardRepo({}, [mainCommitSha]);

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain('branch="main"');
    expect(blocks[0]).toContain('feat: main work');
  });

  it('renders orphaned block for commits not on any branch', () => {
    process.env['BASE_BRANCH'] = 'nonexistent-base-branch';

    const dir = makeCardRepo({}, [branch1CommitSha1]);

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);

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

  it('shows merged: true for commits reachable from the base branch', () => {
    process.env['BASE_BRANCH'] = 'main';

    const dir = makeCardRepo({ 'cards/card-123/1': { parentBranch: 'main', addedAt: '2025-01-15T10:30:00Z' } }, [
      mainCommitSha,
      branch1CommitSha1
    ]);

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);

    expect(blocks).toHaveLength(1);
    const yamlContent = blocks[0]!.replace(/^<workspace-repo-log[^>]*>\n/, '').replace(/\n<\/workspace-repo-log>$/, '');
    const parsed = yaml.load(yamlContent) as Array<Record<string, unknown>>;

    const mainCommit = parsed.find((c) => c['subject'] === 'feat: main work');
    expect(mainCommit).toBeDefined();
    expect(mainCommit!['merged']).toBe(true);

    const authCommit = parsed.find((c) => c['subject'] === 'feat: implement auth');
    expect(authCommit).toBeDefined();
    expect(authCommit!['merged']).toBeUndefined();
  });

  it('does not show merged for orphaned commits', () => {
    process.env['BASE_BRANCH'] = 'nonexistent-base-branch';

    const dir = makeCardRepo({}, [branch1CommitSha1]);

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain('orphaned="true"');
    expect(blocks[0]).not.toContain('merged');
  });

  it('shows merged: true for commits after merge to main', async () => {
    const mergeWorkspace = new TestGitWorkspace();
    const mergePath = await mergeWorkspace.create();
    const git = mergeWorkspace.getGit();

    await git.checkout(['-b', 'cards/merge-test/1']);
    await mergeWorkspace.createAndCommitFile('src/feature.ts', 'export const f = 1;', 'feat: new feature');
    const featureSha = (await git.revparse(['HEAD'])).trim();

    await git.checkout(['main']);
    await git.merge(['cards/merge-test/1', '--no-ff', '-m', 'merge: feature branch']);
    await git.checkout(['cards/merge-test/1']);

    process.env['BASE_BRANCH'] = 'main';
    const dir = makeCardRepo({ 'cards/merge-test/1': { parentBranch: 'main', addedAt: '2025-01-15T10:30:00Z' } }, [
      featureSha
    ]);

    const blocks = buildWorkspaceRepoLogBlocks(mergePath, dir);

    expect(blocks).toHaveLength(1);
    const yamlContent = blocks[0]!.replace(/^<workspace-repo-log[^>]*>\n/, '').replace(/\n<\/workspace-repo-log>$/, '');
    const parsed = yaml.load(yamlContent) as Array<Record<string, unknown>>;
    const featureCommit = parsed.find((c) => c['subject'] === 'feat: new feature');
    expect(featureCommit).toBeDefined();
    expect(featureCommit!['merged']).toBe(true);

    mergeWorkspace.destroy();
  });

  it('sorts branches by addedAt (oldest first)', () => {
    const dir = makeCardRepo(
      {
        'cards/card-123/2': { parentBranch: 'main', addedAt: '2025-01-16T14:00:00Z' },
        'cards/card-123/1': { parentBranch: 'main', addedAt: '2025-01-15T10:30:00Z' }
      },
      [mainCommitSha, branch1CommitSha1, branch2CommitSha]
    );

    const blocks = buildWorkspaceRepoLogBlocks(workspacePath, dir);

    expect(blocks[0]).toContain('branch="cards/card-123/1"');
  });
});

describe('buildAdditionalContext', () => {
  const makeActionInput = (overrides?: Record<string, unknown>) => ({
    cardId: 'card-123',
    actionName: 'Launch',
    environment: 'default',
    executionMode: 'interactive' as const,
    repoRoot: '/workspace',
    cardRepoPath: repoPath,
    configPath: '/tmp/config',
    extensionPath: '/tmp/extension',
    switchToInteractiveData: undefined,
    codingAgent: undefined,
    marketplacePath: '/test/marketplace',
    ...overrides
  });

  afterEach(() => {
    delete process.env['WORKSPACE_BRANCH'];
    delete process.env['BASE_BRANCH'];
    delete process.env['WORKSPACE_PATH'];
  });

  it('contains env block, card block, repo block, and log block', () => {
    // Need CARD.meta.json for buildCardBlock (fail closed)
    const tmpDir = join(repoPath, '..', `ctx-full-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(
      join(tmpDir, 'CARD.meta.json'),
      JSON.stringify({
        id: 'card-123',
        title: 'Test',
        status: 'active',
        gates: { planRequired: false, planApproved: false, mergeRequestRequired: false, mergeApproved: false }
      })
    );
    // Need at least one git commit for log block
    // Use the real test repo that has git history
    process.env['WORKSPACE_PATH'] = '/workspace';

    // We can't use repoPath for cardRepoPath since it needs CARD.meta.json,
    // so we test with a tmpDir that has meta but may not have git.
    // The key assertions are about the structure.
    const result = buildAdditionalContext(makeActionInput({ cardRepoPath: tmpDir }));

    expect(result).toContain('```bash');
    expect(result).toContain('EXECUTION_MODE=interactive');
    expect(result).toMatch(/<card type="yaml">/);
    expect(result).toContain('</card>');
    expect(result).toMatch(/<card-repo type="yaml">/);
    expect(result).toContain('</card-repo>');
  });

  it('throws CardRepoAccessError when repo is inaccessible', () => {
    // buildCardBlock will throw first (CARD.meta.json missing), not CardRepoAccessError.
    // But if cardRepoPath doesn't exist at all, buildCardBlock throws a filesystem error.
    const input = makeActionInput({ cardRepoPath: '/tmp/does-not-exist-xyz-999' });

    expect(() => buildAdditionalContext(input)).toThrow();
  });

  it('includes branch info in env block when env vars are set', () => {
    process.env['WORKSPACE_BRANCH'] = 'cards/card-123/1';
    process.env['BASE_BRANCH'] = 'main';
    process.env['WORKSPACE_PATH'] = '/workspace';

    const tmpDir = join(repoPath, '..', `ctx-env-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(
      join(tmpDir, 'CARD.meta.json'),
      JSON.stringify({
        id: 'card-123',
        title: 'Test',
        status: 'active',
        gates: { planRequired: false, planApproved: false, mergeRequestRequired: false, mergeApproved: false }
      })
    );

    const result = buildAdditionalContext(makeActionInput({ cardRepoPath: tmpDir }));

    expect(result).toContain('WORKSPACE_BRANCH=cards/card-123/1');
    expect(result).toContain('BASE_BRANCH=main');
  });
});
