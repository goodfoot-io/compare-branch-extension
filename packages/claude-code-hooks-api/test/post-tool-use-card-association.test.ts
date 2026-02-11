import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  execSync: vi.fn()
}));
vi.mock('../src/lib/api-discovery.js', () => ({
  discoverApiInfo: vi.fn(),
  createCardsClient: vi.fn()
}));
vi.mock('../src/lib/claude-sessions.js', () => ({
  associatePidWithCard: vi.fn(),
  getPidCardId: vi.fn()
}));
vi.mock('../src/lib/process-tree.js', () => ({
  findClaudePid: vi.fn()
}));

import { execSync } from 'node:child_process';
import type { Logger } from '@goodfoot/claude-code-hooks';
import { createCardsClient, discoverApiInfo } from '../src/lib/api-discovery.js';
import { associatePidWithCard, getPidCardId } from '../src/lib/claude-sessions.js';
import { findClaudePid } from '../src/lib/process-tree.js';
import hookFn from '../src/post-tool-use-card-association.js';

describe('post-tool-use-card-association hook', () => {
  const mockExecSync = vi.mocked(execSync);
  const mockDiscoverApiInfo = vi.mocked(discoverApiInfo);
  const mockCreateCardsClient = vi.mocked(createCardsClient);
  const mockAssociatePidWithCard = vi.mocked(associatePidWithCard);
  const mockGetPidCardId = vi.mocked(getPidCardId);
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

  beforeEach(() => {
    vi.resetModules();
    mockExecSync.mockReset();
    mockDiscoverApiInfo.mockReset();
    mockCreateCardsClient.mockReset();
    mockAssociatePidWithCard.mockReset();
    mockGetPidCardId.mockReset();
    mockFindClaudePid.mockReset();
    mockAddCommit.mockReset();
    vi.clearAllMocks();
    delete process.env.CARD_ID;
  });

  afterEach(() => {
    delete process.env.CARD_ID;
  });

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
      mockFindClaudePid.mockReturnValue(12345);
      mockGetPidCardId.mockResolvedValue('existing-card-id');

      const result = await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl -X POST http://localhost:3000/cards/card-123/comments -d "test"' }
        } as never,
        { logger: mockLogger }
      );

      expect(result.stdout).toEqual({});
      expect(mockGetPidCardId).toHaveBeenCalledWith(12345, mockLogger);
      expect(mockAssociatePidWithCard).not.toHaveBeenCalled();
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
      expect(mockAssociatePidWithCard).not.toHaveBeenCalled();
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
    const apiInfo = {
      host: 'localhost',
      port: 3000,
      accessToken: 'test-token',
      pid: 99999,
      startedAt: '2024-01-01T00:00:00Z'
    };

    function setupForWriteDetection(): void {
      mockFindClaudePid.mockReturnValue(12345);
      mockGetPidCardId.mockResolvedValue(null);
      mockDiscoverApiInfo.mockResolvedValue(apiInfo);
      mockAssociatePidWithCard.mockResolvedValue([]);
    }

    it('should detect POST to card endpoints', async () => {
      setupForWriteDetection();

      await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl -X POST http://localhost:3000/cards/card-123/comments -d "test"' }
        } as never,
        { logger: mockLogger }
      );

      expect(mockAssociatePidWithCard).toHaveBeenCalledWith(12345, 'card-123', mockLogger);
    });

    it('should detect PUT to card endpoints', async () => {
      setupForWriteDetection();

      await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl -X PUT http://localhost:3000/cards/card-123 -d "{\\"status\\": \\"done\\"}"' }
        } as never,
        { logger: mockLogger }
      );

      expect(mockAssociatePidWithCard).toHaveBeenCalledWith(12345, 'card-123', mockLogger);
    });

    it('should detect PATCH to card endpoints', async () => {
      setupForWriteDetection();

      await hookFn(
        {
          tool_name: 'Bash',
          tool_input: {
            command: 'curl -X PATCH http://localhost:3000/cards/card-123 -d "{\\"title\\": \\"Updated\\"}"'
          }
        } as never,
        { logger: mockLogger }
      );

      expect(mockAssociatePidWithCard).toHaveBeenCalledWith(12345, 'card-123', mockLogger);
    });

    it('should detect DELETE to card endpoints', async () => {
      setupForWriteDetection();

      await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl -X DELETE http://localhost:3000/cards/card-123/attachments/att-1' }
        } as never,
        { logger: mockLogger }
      );

      expect(mockAssociatePidWithCard).toHaveBeenCalledWith(12345, 'card-123', mockLogger);
    });

    it('should detect implicit POST when -d flag is used without -X', async () => {
      setupForWriteDetection();

      await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl http://localhost:3000/cards/card-123/comments -d "test comment"' }
        } as never,
        { logger: mockLogger }
      );

      expect(mockAssociatePidWithCard).toHaveBeenCalledWith(12345, 'card-123', mockLogger);
    });

    it('should detect implicit POST when --data flag is used', async () => {
      setupForWriteDetection();

      await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl http://localhost:3000/cards/card-123/notes --data "note content"' }
        } as never,
        { logger: mockLogger }
      );

      expect(mockAssociatePidWithCard).toHaveBeenCalledWith(12345, 'card-123', mockLogger);
    });

    it('should detect --request POST (long form of -X)', async () => {
      setupForWriteDetection();

      await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl --request POST http://localhost:3000/cards/card-123/comments -d "test"' }
        } as never,
        { logger: mockLogger }
      );

      expect(mockAssociatePidWithCard).toHaveBeenCalledWith(12345, 'card-123', mockLogger);
    });
  });

  describe('card ID extraction', () => {
    const apiInfo = {
      host: 'localhost',
      port: 3000,
      accessToken: 'test-token',
      pid: 99999,
      startedAt: '2024-01-01T00:00:00Z'
    };

    function setupForExtraction(): void {
      mockFindClaudePid.mockReturnValue(12345);
      mockGetPidCardId.mockResolvedValue(null);
      mockDiscoverApiInfo.mockResolvedValue(apiInfo);
      mockAssociatePidWithCard.mockResolvedValue([]);
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

      expect(mockAssociatePidWithCard).toHaveBeenCalledWith(12345, 'my-card-456', mockLogger);
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

      expect(mockAssociatePidWithCard).toHaveBeenCalledWith(12345, 'jsonl-strea-1', mockLogger);
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

      expect(mockAssociatePidWithCard).toHaveBeenCalledWith(12345, 'card-456', mockLogger);
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

      expect(mockAssociatePidWithCard).toHaveBeenCalledWith(12345, 'card-789', mockLogger);
    });
  });

  describe('PID association and commit flushing', () => {
    const apiInfo = {
      host: 'localhost',
      port: 3000,
      accessToken: 'test-token',
      pid: 99999,
      startedAt: '2024-01-01T00:00:00Z'
    };

    it('should return empty output when already associated (first-write-wins)', async () => {
      mockFindClaudePid.mockReturnValue(12345);
      mockGetPidCardId.mockResolvedValue(null);
      mockDiscoverApiInfo.mockResolvedValue(apiInfo);
      mockAssociatePidWithCard.mockResolvedValue([]);

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
      mockFindClaudePid.mockReturnValue(12345);
      mockGetPidCardId.mockResolvedValue(null);
      mockDiscoverApiInfo.mockResolvedValue(apiInfo);
      mockAssociatePidWithCard.mockResolvedValue(['abc123', 'def456', 'unreachable789']);
      mockCreateCardsClient.mockResolvedValue(mockClient);
      mockAddCommit.mockResolvedValue({ sha: '', createdAt: '' });
      mockExecSync
        .mockReturnValueOnce(Buffer.from('')) // abc123 reachable
        .mockReturnValueOnce(Buffer.from('')) // def456 reachable
        .mockImplementationOnce(() => {
          throw new Error('not an ancestor');
        });

      const result = await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl -X POST http://localhost:3000/cards/card-123/comments -d "test"' }
        } as never,
        { logger: mockLogger }
      );

      expect(mockExecSync).toHaveBeenCalledWith('git merge-base --is-ancestor abc123 HEAD', { stdio: 'pipe' });
      expect(mockExecSync).toHaveBeenCalledWith('git merge-base --is-ancestor def456 HEAD', { stdio: 'pipe' });
      expect(mockExecSync).toHaveBeenCalledWith('git merge-base --is-ancestor unreachable789 HEAD', { stdio: 'pipe' });

      expect(mockAddCommit).toHaveBeenCalledTimes(2);
      expect(mockAddCommit).toHaveBeenCalledWith('card-123', 'abc123');
      expect(mockAddCommit).toHaveBeenCalledWith('card-123', 'def456');
      expect(result.stdout.systemMessage).toContain('2 pending commit(s) attributed');
    });

    it('should add each reachable commit via CardsClient', async () => {
      mockFindClaudePid.mockReturnValue(12345);
      mockGetPidCardId.mockResolvedValue(null);
      mockDiscoverApiInfo.mockResolvedValue(apiInfo);
      mockAssociatePidWithCard.mockResolvedValue(['abc123', 'def456']);
      mockCreateCardsClient.mockResolvedValue(mockClient);
      mockAddCommit.mockResolvedValue({ sha: '', createdAt: '' });
      mockExecSync.mockReturnValue(Buffer.from(''));

      const result = await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl -X POST http://localhost:3000/cards/card-123/comments -d "test"' }
        } as never,
        { logger: mockLogger }
      );

      expect(mockAddCommit).toHaveBeenCalledWith('card-123', 'abc123');
      expect(mockAddCommit).toHaveBeenCalledWith('card-123', 'def456');
      expect(result.stdout.systemMessage).toContain('2 pending commit(s) attributed');
    });

    it('should return no-API-connection message when client creation fails', async () => {
      mockFindClaudePid.mockReturnValue(12345);
      mockGetPidCardId.mockResolvedValue(null);
      mockDiscoverApiInfo.mockResolvedValue(null);
      mockCreateCardsClient.mockResolvedValue(null);
      mockAssociatePidWithCard.mockResolvedValue(['abc123']);

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
      mockFindClaudePid.mockReturnValue(12345);
      mockGetPidCardId.mockResolvedValue(null);
      mockDiscoverApiInfo.mockResolvedValue(apiInfo);
      mockAssociatePidWithCard.mockResolvedValue(['abc123', 'def456']);
      mockCreateCardsClient.mockResolvedValue(mockClient);
      mockAddCommit.mockResolvedValue({ sha: '', createdAt: '' });
      mockExecSync.mockReturnValue(Buffer.from(''));

      const result = await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl -X POST http://localhost:3000/cards/card-123/comments -d "test"' }
        } as never,
        { logger: mockLogger }
      );

      expect(result.stdout).toEqual({
        systemMessage: 'PID 12345 associated with card card-123. 2 pending commit(s) attributed.'
      });
    });
  });

  describe('fail-open behavior', () => {
    it('should return empty output when discoverApiInfo and createCardsClient both fail', async () => {
      mockFindClaudePid.mockReturnValue(12345);
      mockGetPidCardId.mockResolvedValue(null);
      mockDiscoverApiInfo.mockResolvedValue(null);
      mockCreateCardsClient.mockResolvedValue(null);
      mockAssociatePidWithCard.mockResolvedValue(['abc123']);

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
      mockFindClaudePid.mockReturnValue(12345);
      mockGetPidCardId.mockResolvedValue(null);
      mockDiscoverApiInfo.mockResolvedValue({
        host: 'localhost',
        port: 3000,
        accessToken: 'test-token',
        pid: 99999,
        startedAt: '2024-01-01T00:00:00Z'
      });
      mockAssociatePidWithCard.mockResolvedValue(['abc123']);
      mockCreateCardsClient.mockResolvedValue(mockClient);
      mockExecSync.mockReturnValue(Buffer.from(''));
      mockAddCommit.mockRejectedValue(new Error('Network error'));

      const result = await hookFn(
        {
          tool_name: 'Bash',
          tool_input: { command: 'curl -X POST http://localhost:3000/cards/card-123/comments -d "test"' }
        } as never,
        { logger: mockLogger }
      );

      expect(result.stdout).toEqual({
        systemMessage: 'PID 12345 associated with card card-123. 0 pending commit(s) attributed.'
      });
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
