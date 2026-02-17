import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir as realTmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Exercises post tool use card association behavior in the test area through focused scenarios.
 * The cases lock in edge handling and regression coverage so refactors preserve expected state
 * transitions and output.
 *
 * @summary Tests post tool use card association behavior in test
 */

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return {
    ...actual,
    homedir: vi.fn(() => process.env.MOCK_HOMEDIR || '/tmp')
  };
});

vi.mock('@cards/claude-code-sessions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cards/claude-code-sessions')>();
  return {
    ...actual,
    findClaudePid: vi.fn()
  };
});

vi.mock('../src/lib/api-discovery.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/api-discovery.js')>();
  return {
    ...actual,
    createCardsClient: vi.fn()
  };
});

import { findClaudePid } from '@cards/claude-code-sessions';
import { TestGitWorkspace } from '@cards/test-utils';
import type { Logger } from '@goodfoot/claude-code-hooks';
import { createCardsClient } from '../src/lib/api-discovery.js';
import hookFn from '../src/post-tool-use-card-association.js';

describe('post-tool-use-card-association hook', () => {
  const mockCreateCardsClient = vi.mocked(createCardsClient);
  const mockFindClaudePid = vi.mocked(findClaudePid);
  const mockLogger = {
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    logError: vi.fn()
  } as unknown as Logger;

  const mockAddCommit = vi.fn();
  const mockClient = { addCommit: mockAddCommit } as never;

  // Use the current process PID so claude-sessions doesn't prune entries as dead
  const testPid = process.pid;

  let testDir: string;
  let testRepo: TestGitWorkspace;

  beforeAll(async () => {
    testRepo = new TestGitWorkspace();
    await testRepo.create();
  });

  afterAll(() => {
    testRepo.destroy();
  });

  beforeEach(() => {
    testDir = join(realTmpdir(), `hook-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    process.env.MOCK_HOMEDIR = testDir;

    mockFindClaudePid.mockReset();
    mockCreateCardsClient.mockReset();
    mockAddCommit.mockReset();
    vi.clearAllMocks();
    delete process.env.CARD_ID;
  });

  afterEach(() => {
    delete process.env.CARD_ID;
    delete process.env.MOCK_HOMEDIR;
    rmSync(testDir, { recursive: true, force: true });
  });

  /** Write the Cards API discovery file so discoverApiInfo succeeds. */
  function writeDiscoveryFile(): void {
    const config = {
      host: 'localhost',
      port: 3000,
      accessToken: 'test-token',
      pid: 99999,
      startedAt: '2024-01-01T00:00:00Z'
    };
    mkdirSync(join(testDir, '.cards'), { recursive: true });
    writeFileSync(join(testDir, '.cards', 'cards-api.json'), JSON.stringify(config));
  }

  describe('gating conditions', () => {
    it('should skip entirely when CARD_ID env var is set', async () => {
      process.env.CARD_ID = 'test-card-123';
      const result = await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl -X POST http://localhost:3000/cards/card-456/comments -d "test"' }
        } as never,
        { logger: mockLogger }
      );
      expect(result.stdout).toEqual({});
      expect(mockFindClaudePid).not.toHaveBeenCalled();
    });

    it('should return empty output for non-curl Bash commands', async () => {
      const result = await hookFn({ tool_name: 'Bash', tool_input: { command: 'ls -la' } } as never, {
        logger: mockLogger
      });
      expect(result.stdout).toEqual({});
    });

    it('should return empty output for GET requests to Cards API', async () => {
      const result = await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl -X GET http://localhost:3000/cards/card-123' }
        } as never,
        { logger: mockLogger }
      );
      expect(result.stdout).toEqual({});
    });

    it('should skip when PID already has cardId in registry (first-write-wins)', async () => {
      mockFindClaudePid.mockReturnValue(testPid);
      writeDiscoveryFile();

      // Pre-populate the registry with a card association for our PID
      const { associatePidWithCard } = await import('@cards/claude-code-sessions');
      await associatePidWithCard(testPid, 'existing-card-id');

      const result = await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl -X POST http://localhost:3000/cards/card-123/comments -d "test"' }
        } as never,
        { logger: mockLogger }
      );

      expect(result.stdout).toEqual({});
    });

    it('should return empty output when no Claude PID found', async () => {
      mockFindClaudePid.mockReturnValue(null);

      const result = await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl -X POST http://localhost:3000/cards/card-123/comments -d "test"' }
        } as never,
        { logger: mockLogger }
      );

      expect(result.stdout).toEqual({});
      expect(mockFindClaudePid).toHaveBeenCalled();
    });

    it('should return empty output when card ID not found in URL', async () => {
      const result = await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl -X POST http://localhost:3000/api/comments -d "test"' }
        } as never,
        { logger: mockLogger }
      );

      expect(result.stdout).toEqual({});
    });

    it('should ignore card IDs that do not end with a digit', async () => {
      const result = await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl -X POST http://localhost:3000/cards/some-name/comments -d "test"' }
        } as never,
        { logger: mockLogger }
      );

      expect(result.stdout).toEqual({});
    });
  });

  describe('write detection', () => {
    function setupForWriteDetection(): void {
      mockFindClaudePid.mockReturnValue(testPid);
      writeDiscoveryFile();
    }

    it('should detect POST to card endpoints', async () => {
      setupForWriteDetection();

      const _result = await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl -X POST http://localhost:3000/cards/card-123/comments -d "test"' }
        } as never,
        { logger: mockLogger }
      );

      // Association happened (not empty output); the hook attempted to flush commits
      const { getPidCardId } = await import('@cards/claude-code-sessions');
      const cardId = await getPidCardId(testPid);
      expect(cardId).toBe('card-123');
    });

    it('should detect PUT to card endpoints', async () => {
      setupForWriteDetection();

      const _result = await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl -X PUT http://localhost:3000/cards/card-123 -d "{\\"status\\": \\"done\\"}"' }
        } as never,
        { logger: mockLogger }
      );

      const { getPidCardId } = await import('@cards/claude-code-sessions');
      const cardId = await getPidCardId(testPid);
      expect(cardId).toBe('card-123');
    });

    it('should detect PATCH to card endpoints', async () => {
      setupForWriteDetection();

      const _result = await hookFn(
        {
          tool_name: 'Bash',
          tool_input: {
            command: 'curl -X PATCH http://localhost:3000/cards/card-123 -d "{\\"title\\": \\"Updated\\"}"'
          }
        } as never,
        { logger: mockLogger }
      );

      const { getPidCardId } = await import('@cards/claude-code-sessions');
      const cardId = await getPidCardId(testPid);
      expect(cardId).toBe('card-123');
    });

    it('should detect DELETE to card endpoints', async () => {
      setupForWriteDetection();

      const _result = await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl -X DELETE http://localhost:3000/cards/card-123/attachments/att-1' }
        } as never,
        { logger: mockLogger }
      );

      const { getPidCardId } = await import('@cards/claude-code-sessions');
      const cardId = await getPidCardId(testPid);
      expect(cardId).toBe('card-123');
    });

    it('should detect implicit POST when -d flag is used without -X', async () => {
      setupForWriteDetection();

      const _result = await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl http://localhost:3000/cards/card-123/comments -d "test comment"' }
        } as never,
        { logger: mockLogger }
      );

      const { getPidCardId } = await import('@cards/claude-code-sessions');
      const cardId = await getPidCardId(testPid);
      expect(cardId).toBe('card-123');
    });

    it('should detect implicit POST when --data flag is used', async () => {
      setupForWriteDetection();

      const _result = await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl http://localhost:3000/cards/card-123/notes --data "note content"' }
        } as never,
        { logger: mockLogger }
      );

      const { getPidCardId } = await import('@cards/claude-code-sessions');
      const cardId = await getPidCardId(testPid);
      expect(cardId).toBe('card-123');
    });

    it('should detect --request POST (long form of -X)', async () => {
      setupForWriteDetection();

      const _result = await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl --request POST http://localhost:3000/cards/card-123/comments -d "test"' }
        } as never,
        { logger: mockLogger }
      );

      const { getPidCardId } = await import('@cards/claude-code-sessions');
      const cardId = await getPidCardId(testPid);
      expect(cardId).toBe('card-123');
    });
  });

  describe('card ID extraction', () => {
    function setupForExtraction(): void {
      mockFindClaudePid.mockReturnValue(testPid);
      writeDiscoveryFile();
    }

    it('should extract card ID from /cards/{cardId} pattern', async () => {
      setupForExtraction();

      await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl -X POST http://localhost:3000/cards/my-card-456/comments -d "test"' }
        } as never,
        { logger: mockLogger }
      );

      const { getPidCardId } = await import('@cards/claude-code-sessions');
      const cardId = await getPidCardId(testPid);
      expect(cardId).toBe('my-card-456');
    });

    it('should extract card ID when URL uses a shell variable for base', async () => {
      setupForExtraction();

      await hookFn(
        {
          tool_name: 'Bash',
          tool_input: {
            command:
              'eval "$(discover-api.sh)" && curl -s -X POST -H "Authorization: Bearer $ACCESS_TOKEN" "$API_BASE/cards/jsonl-strea-1/activate"'
          }
        } as never,
        { logger: mockLogger }
      );

      const { getPidCardId } = await import('@cards/claude-code-sessions');
      const cardId = await getPidCardId(testPid);
      expect(cardId).toBe('jsonl-strea-1');
    });

    it('should extract card ID when URL uses a braced shell variable', async () => {
      setupForExtraction();

      await hookFn(
        {
          tool_name: 'Bash',
          tool_input: {
            command: `curl -X POST \${API_BASE}/cards/card-456/comments -d "test"`
          }
        } as never,
        { logger: mockLogger }
      );

      const { getPidCardId } = await import('@cards/claude-code-sessions');
      const cardId = await getPidCardId(testPid);
      expect(cardId).toBe('card-456');
    });

    it('should not match file paths containing /cards/', async () => {
      const result = await hookFn(
        {
          tool_name: 'Bash',
          tool_input: {
            command: 'curl -X POST http://localhost:3000/upload -d @packages/cards/claude-code-hooks/test.json'
          }
        } as never,
        { logger: mockLogger }
      );

      expect(result.stdout).toEqual({});
    });

    it('should extract card ID from 127.0.0.1 URLs', async () => {
      setupForExtraction();

      await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl -X POST http://127.0.0.1:3000/cards/card-789 -d "test"' }
        } as never,
        { logger: mockLogger }
      );

      const { getPidCardId } = await import('@cards/claude-code-sessions');
      const cardId = await getPidCardId(testPid);
      expect(cardId).toBe('card-789');
    });
  });

  describe('PID association and commit flushing', () => {
    it('should return empty output when already associated (first-write-wins)', async () => {
      mockFindClaudePid.mockReturnValue(testPid);
      writeDiscoveryFile();

      // No pending commits → returns empty
      const result = await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl -X POST http://localhost:3000/cards/card-123/comments -d "test"' }
        } as never,
        { logger: mockLogger }
      );

      expect(result.stdout).toEqual({});
      expect(mockCreateCardsClient).not.toHaveBeenCalled();
    });

    it('should verify SHA reachability before adding commits via CardsClient', async () => {
      mockFindClaudePid.mockReturnValue(testPid);
      writeDiscoveryFile();

      // Create real commits in test repo for reachability checks
      await testRepo.createAndCommitFile('file1.txt', 'content1', 'commit 1');
      const reachableSha1 = (await testRepo.getGit().revparse(['HEAD'])).trim();

      await testRepo.createAndCommitFile('file2.txt', 'content2', 'commit 2');
      const reachableSha2 = (await testRepo.getGit().revparse(['HEAD'])).trim();

      const unreachableSha = 'a'.repeat(40); // A SHA that doesn't exist in the repo

      // Pre-populate pending commits for this PID
      const { recordPendingCommit } = await import('@cards/claude-code-sessions');
      await recordPendingCommit(testPid, reachableSha1);
      await recordPendingCommit(testPid, reachableSha2);
      await recordPendingCommit(testPid, unreachableSha);

      mockCreateCardsClient.mockResolvedValue(mockClient);
      mockAddCommit.mockResolvedValue({ sha: '', createdAt: '' });

      // The hook's execSync runs git merge-base from cwd; set cwd to test repo
      const originalCwd = process.cwd();
      process.chdir(testRepo.getPath());

      try {
        const result = await hookFn(
          {
            tool_name: 'Bash',
            tool_input: { command: 'curl -X POST http://localhost:3000/cards/card-123/comments -d "test"' }
          } as never,
          { logger: mockLogger }
        );

        // Only the 2 reachable commits should be flushed
        expect(mockAddCommit).toHaveBeenCalledTimes(2);
        expect(mockAddCommit).toHaveBeenCalledWith('card-123', reachableSha1);
        expect(mockAddCommit).toHaveBeenCalledWith('card-123', reachableSha2);
        expect(result.stdout.systemMessage).toContain('2 pending commit(s) attributed');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should add each reachable commit via CardsClient', async () => {
      mockFindClaudePid.mockReturnValue(testPid);
      writeDiscoveryFile();

      // Create real commits
      await testRepo.createAndCommitFile('file3.txt', 'content3', 'commit 3');
      const sha1 = (await testRepo.getGit().revparse(['HEAD'])).trim();

      await testRepo.createAndCommitFile('file4.txt', 'content4', 'commit 4');
      const sha2 = (await testRepo.getGit().revparse(['HEAD'])).trim();

      // Pre-populate pending commits
      const { recordPendingCommit } = await import('@cards/claude-code-sessions');
      await recordPendingCommit(testPid, sha1);
      await recordPendingCommit(testPid, sha2);

      mockCreateCardsClient.mockResolvedValue(mockClient);
      mockAddCommit.mockResolvedValue({ sha: '', createdAt: '' });

      const originalCwd = process.cwd();
      process.chdir(testRepo.getPath());

      try {
        const result = await hookFn(
          {
            tool_name: 'Bash',
            tool_input: { command: 'curl -X POST http://localhost:3000/cards/card-123/comments -d "test"' }
          } as never,
          { logger: mockLogger }
        );

        expect(mockAddCommit).toHaveBeenCalledWith('card-123', sha1);
        expect(mockAddCommit).toHaveBeenCalledWith('card-123', sha2);
        expect(result.stdout.systemMessage).toContain('2 pending commit(s) attributed');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should return no-API-connection message when client creation fails', async () => {
      mockFindClaudePid.mockReturnValue(testPid);
      // Don't write discovery file → discoverApiInfo returns null

      // Pre-populate pending commits
      const { recordPendingCommit } = await import('@cards/claude-code-sessions');
      await recordPendingCommit(testPid, `abc123def456${'0'.repeat(28)}`);

      mockCreateCardsClient.mockResolvedValue(null);

      const result = await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl -X POST http://localhost:3000/cards/card-123/comments -d "test"' }
        } as never,
        { logger: mockLogger }
      );

      expect(result.stdout.systemMessage).toContain('no API connection');
    });

    it('should return success message after flushing commits', async () => {
      mockFindClaudePid.mockReturnValue(testPid);
      writeDiscoveryFile();

      // Create real commits
      await testRepo.createAndCommitFile('file5.txt', 'content5', 'commit 5');
      const sha1 = (await testRepo.getGit().revparse(['HEAD'])).trim();

      await testRepo.createAndCommitFile('file6.txt', 'content6', 'commit 6');
      const sha2 = (await testRepo.getGit().revparse(['HEAD'])).trim();

      // Pre-populate pending commits
      const { recordPendingCommit } = await import('@cards/claude-code-sessions');
      await recordPendingCommit(testPid, sha1);
      await recordPendingCommit(testPid, sha2);

      mockCreateCardsClient.mockResolvedValue(mockClient);
      mockAddCommit.mockResolvedValue({ sha: '', createdAt: '' });

      const originalCwd = process.cwd();
      process.chdir(testRepo.getPath());

      try {
        const result = await hookFn(
          {
            tool_name: 'Bash',
            tool_input: { command: 'curl -X POST http://localhost:3000/cards/card-123/comments -d "test"' }
          } as never,
          { logger: mockLogger }
        );

        expect(result.stdout).toEqual({
          systemMessage: `PID ${testPid} associated with card card-123. 2 pending commit(s) attributed.`
        });
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('fail-open behavior', () => {
    it('should return empty output when discoverApiInfo and createCardsClient both fail', async () => {
      mockFindClaudePid.mockReturnValue(testPid);
      // Don't write discovery file → discoverApiInfo returns null
      mockCreateCardsClient.mockResolvedValue(null);

      // Pre-populate pending commits
      const { recordPendingCommit } = await import('@cards/claude-code-sessions');
      await recordPendingCommit(testPid, `abc123def456${'0'.repeat(28)}`);

      const result = await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl -X POST http://localhost:3000/cards/card-123/comments -d "test"' }
        } as never,
        { logger: mockLogger }
      );

      // Returns a message instead of empty (graceful degradation)
      expect(result.stdout.systemMessage).toContain('no API connection');
    });

    it('should return success message even when addCommit errors occur', async () => {
      mockFindClaudePid.mockReturnValue(testPid);
      writeDiscoveryFile();

      // Create a real commit
      await testRepo.createAndCommitFile('file7.txt', 'content7', 'commit 7');
      const sha = (await testRepo.getGit().revparse(['HEAD'])).trim();

      // Pre-populate pending commits
      const { recordPendingCommit } = await import('@cards/claude-code-sessions');
      await recordPendingCommit(testPid, sha);

      mockCreateCardsClient.mockResolvedValue(mockClient);
      mockAddCommit.mockRejectedValue(new Error('Network error'));

      const originalCwd = process.cwd();
      process.chdir(testRepo.getPath());

      try {
        const result = await hookFn(
          {
            tool_name: 'Bash',
            tool_input: { command: 'curl -X POST http://localhost:3000/cards/card-123/comments -d "test"' }
          } as never,
          { logger: mockLogger }
        );

        expect(result.stdout).toEqual({
          systemMessage: `PID ${testPid} associated with card card-123. 0 pending commit(s) attributed.`
        });
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should return empty output on any unexpected error', async () => {
      mockFindClaudePid.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl -X POST http://localhost:3000/cards/card-123/comments -d "test"' }
        } as never,
        { logger: mockLogger }
      );

      expect(result.stdout).toEqual({});
    });
  });
});
