import { TestHttpClient } from '@cards/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CardsClient } from '../../src/client/cardsClient.js';
import { ApiError, NetworkError } from '../../src/client/types/errors.js';
import type { StreamMeta } from '../../src/protocol/index.js';

/**
 * Exercises cards client behavior in the client area through focused scenarios.
 * The cases lock in edge handling and regression coverage so refactors preserve expected state
 * transitions and output.
 *
 * @summary Tests cards client behavior in client
 */

describe('CardsClient', () => {
  const options = {
    baseUrl: 'http://localhost:3000',
    accessToken: 'test-token'
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor and configuration', () => {
    it('should create client without DI (backward compatible)', () => {
      const client = new CardsClient(options);
      expect(client).toBeInstanceOf(CardsClient);
    });

    it('should create client with HttpClient injection', () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      expect(client).toBeInstanceOf(CardsClient);
    });

    it('should return false from hasHttpClient when no client injected', () => {
      const client = new CardsClient(options);
      expect(client.hasHttpClient()).toBe(false);
    });

    it('should return true from hasHttpClient when client injected', () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      expect(client.hasHttpClient()).toBe(true);
    });

    it('should return configured base URL', () => {
      const client = new CardsClient(options);
      expect(client.getBaseUrl()).toBe('http://localhost:3000');
    });
  });

  describe('Card Operations', () => {
    it('should GET /cards when listing cards', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.listCards();
      expect(httpClient.requests[0]).toMatchObject({
        method: 'GET',
        url: expect.stringContaining('/cards')
      });
    });

    it('should GET /cards with status filter', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.listCards({ status: 'active' });
      expect(httpClient.requests).toHaveLength(1);
      expect(httpClient.requests[0]?.url).toContain('status=active');
    });

    it('should GET /cards/:id when fetching single card', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.getCard('card-123');
      expect(httpClient.requests[0]).toMatchObject({
        method: 'GET',
        url: expect.stringContaining('/cards/card-123')
      });
    });

    it('should POST /cards when creating card', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      const data = { title: 'Test Card' };
      await client.createCard(data);
      expect(httpClient.requests[0]).toMatchObject({
        method: 'POST',
        url: expect.stringContaining('/cards'),
        body: data
      });
    });

    it('should PATCH /cards/:id when updating card', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      const data = { title: 'Updated Title' };
      await client.updateCard('card-123', data);
      expect(httpClient.requests[0]).toMatchObject({
        method: 'PATCH',
        url: expect.stringContaining('/cards/card-123'),
        body: data
      });
    });

    it('should DELETE /cards/:id when deleting card', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.deleteCard('card-123');
      expect(httpClient.requests[0]).toMatchObject({
        method: 'DELETE',
        url: expect.stringContaining('/cards/card-123')
      });
    });
  });

  describe('Attachment Operations', () => {
    it('should PUT /cards/:id/attachments/:filename when uploading', async () => {
      const client = new CardsClient(options);
      const base64Data = 'dGVzdCBjb250ZW50'; // "test content" in base64

      // Mock fetch for binary PUT
      const mockResponse = { id: 'att-123', name: 'test.txt', size: 12 };
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.uploadAttachment('card-123', 'test.txt', base64Data);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/cards/card-123/attachments/test.txt'),
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/octet-stream'
          })
        })
      );
      expect(result).toEqual(mockResponse);
      vi.restoreAllMocks();
    });

    it('should GET /cards/:id/attachments/:attachmentId when downloading attachment', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      const mockBlob = new Blob(['attachment content'], { type: 'application/octet-stream' });
      // Mock fetch to return blob
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        blob: async () => mockBlob
      } as Response);
      const result = await client.getAttachment('card-123', 'attachment-456');
      expect(result).toEqual(mockBlob);
      vi.restoreAllMocks();
    });

    it('should throw ApiError on 404 when downloading attachment', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      // Mock fetch to return 404
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Attachment not found' })
      } as Response);
      await expect(client.getAttachment('card-123', 'attachment-456')).rejects.toThrow();
      vi.restoreAllMocks();
    });

    it('should GET /cards/:id/attachments when listing attachments', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.listAttachments('card-123');
      expect(httpClient.requests[0]).toMatchObject({
        method: 'GET',
        url: expect.stringContaining('/cards/card-123/attachments')
      });
    });

    it('should return array of AttachmentResponse when listing attachments', async () => {
      const httpClient = new TestHttpClient();
      const expectedAttachments = [
        {
          id: 'att-1',
          originalName: 'file.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          createdAt: '2024-01-01T00:00:00Z'
        },
        { id: 'att-2', originalName: 'image.png', mimeType: 'image/png', size: 2048, createdAt: '2024-01-02T00:00:00Z' }
      ];
      httpClient.responses.set('http://localhost:3000/cards/card-123/attachments', expectedAttachments);
      const client = new CardsClient(options, httpClient);
      const result = await client.listAttachments('card-123');
      expect(result).toEqual(expectedAttachments);
    });
  });

  describe('Timeline Operations', () => {
    it('should GET /cards/:id/timeline when fetching timeline', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.getTimeline('card-123');
      expect(httpClient.requests[0]).toMatchObject({
        method: 'GET',
        url: expect.stringContaining('/cards/card-123/timeline')
      });
    });

    it('should GET /cards/:id/timeline with pagination', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.getTimeline('card-123', { before: '2024-01-01T00:00:00Z', limit: 10 });
      expect(httpClient.requests).toHaveLength(1);
      const requestUrl = httpClient.requests[0]?.url;
      expect(requestUrl).toContain('/cards/card-123/timeline');
      expect(requestUrl).toContain('before=');
      expect(requestUrl).toContain('limit=10');
    });
  });

  describe('File Operations', () => {
    it('should PUT /cards/:id/fs/:path when putting file', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.putFile('card-1', 'plan/initial.md', '# My Plan');
      expect(httpClient.requests[0]).toMatchObject({
        method: 'PUT',
        url: 'http://localhost:3000/cards/card-1/fs/plan/initial.md',
        body: '# My Plan'
      });
    });
  });

  describe('Comment Operations', () => {
    it('should GET /cards/:id/comments when fetching comments', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.getComments('card-123');
      expect(httpClient.requests[0]).toMatchObject({
        method: 'GET',
        url: expect.stringContaining('/cards/card-123/comments')
      });
    });

    it('should GET /cards/:id/comments/:commentId when fetching single comment', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.getComment('card-123', 'comment-456');
      expect(httpClient.requests[0]).toMatchObject({
        method: 'GET',
        url: expect.stringContaining('/cards/card-123/comments/comment-456')
      });
    });

    it('should POST /cards/:id/comments when creating comment', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      const data = { content: 'Test comment' };
      await client.createComment('card-123', data);
      expect(httpClient.requests[0]).toMatchObject({
        method: 'POST',
        url: expect.stringContaining('/cards/card-123/comments'),
        body: data
      });
    });

    it('should PATCH /cards/:id/comments/:commentId when updating comment', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      const data = { content: 'Updated comment' };
      await client.updateComment('card-123', 'comment-456', data);
      expect(httpClient.requests[0]).toMatchObject({
        method: 'PATCH',
        url: expect.stringContaining('/cards/card-123/comments/comment-456'),
        body: data
      });
    });

    it('should DELETE /cards/:id/comments/:commentId when deleting comment', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.deleteComment('card-123', 'comment-456');
      expect(httpClient.requests[0]).toMatchObject({
        method: 'DELETE',
        url: expect.stringContaining('/cards/card-123/comments/comment-456')
      });
    });
  });

  describe('Gate Operations', () => {
    it('should POST /cards/:id/gates/:gateName/approve when approving gate', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.approveGate('card-123', 'mergeRequest');
      expect(httpClient.requests[0]).toMatchObject({
        method: 'POST',
        url: expect.stringContaining('/cards/card-123/gates/mergeRequest/approve')
      });
    });
  });

  describe('Commit Operations', () => {
    it('should GET /cards/:id/commits when fetching commits', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.getCommits('card-123');
      expect(httpClient.requests[0]).toMatchObject({
        method: 'GET',
        url: expect.stringContaining('/cards/card-123/commits')
      });
    });

    it('should POST /cards/:id/commits when adding commit', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.addCommit('card-123', 'abc123def456');
      expect(httpClient.requests[0]).toMatchObject({
        method: 'POST',
        url: expect.stringContaining('/cards/card-123/commits')
      });
    });

    it('should DELETE /cards/:id/commits/:sha when removing commit', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.removeCommit('card-123', 'abc123def456');
      expect(httpClient.requests[0]).toMatchObject({
        method: 'DELETE',
        url: expect.stringContaining('/cards/card-123/commits/abc123def456')
      });
    });
  });

  describe('Branch Operations', () => {
    it('should GET /cards/:id/branches when getting branches', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.getBranches('card-123');
      expect(httpClient.requests[0]).toMatchObject({
        method: 'GET',
        url: expect.stringContaining('/cards/card-123/branches')
      });
    });

    it('should GET /cards/:id/branches with workspacePath query param', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.getBranches('card-123', { workspacePath: '/workspace' });
      expect(httpClient.requests).toHaveLength(1);
      expect(httpClient.requests[0]?.url).toContain('workspacePath=%2Fworkspace');
    });

    it('should POST /cards/:id/branches with name and worktree when adding branch', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.addBranch('card-123', { name: 'feature/test', parentBranch: 'main', worktree: '/path/to/worktree' });
      expect(httpClient.requests[0]).toMatchObject({
        method: 'POST',
        url: expect.stringContaining('/cards/card-123/branches'),
        body: { name: 'feature/test', parentBranch: 'main', worktree: '/path/to/worktree' }
      });
    });

    it('should DELETE /cards/:id/branches/:name when removing branch', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.removeBranch('card-123', 'feature/test');
      expect(httpClient.requests[0]).toMatchObject({
        method: 'DELETE',
        url: expect.stringContaining('/cards/card-123/branches/feature%2Ftest')
      });
    });

    it('should URL-encode branch name with slashes when removing', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.removeBranch('card-123', 'feature/sub/branch');
      expect(httpClient.requests[0]).toMatchObject({
        method: 'DELETE',
        url: expect.stringContaining('feature%2Fsub%2Fbranch')
      });
    });

    it('should throw ApiError on server error response', async () => {
      const client = new CardsClient(options);

      // Mock fetch to return 404 — fresh Response per call since body is single-use
      vi.spyOn(global, 'fetch').mockImplementation(async () => {
        return new Response(JSON.stringify({ error: 'Card not found', code: 'NOT_FOUND' }), {
          status: 404,
          statusText: 'Not Found'
        });
      });

      const err = await client.getBranches('card-123').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).message).toBe('Card not found');
      expect((err as ApiError).code).toBe('NOT_FOUND');
      vi.restoreAllMocks();
    });
  });

  describe('Tag Operations', () => {
    it('should GET /tags when fetching tags', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.getTags();
      expect(httpClient.requests[0]).toMatchObject({
        method: 'GET',
        url: expect.stringContaining('/tags')
      });
    });
  });

  describe('Environment Operations', () => {
    it('should GET /environments when fetching environments', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.getEnvironments();
      expect(httpClient.requests[0]).toMatchObject({
        method: 'GET',
        url: expect.stringContaining('/environments')
      });
    });

    it('should return array of environments with name and optional description', async () => {
      const httpClient = new TestHttpClient();
      const expectedEnvironments = [{ name: 'production' }, { name: 'staging' }, { name: 'development' }];
      httpClient.responses.set('http://localhost:3000/environments', expectedEnvironments);
      const client = new CardsClient(options, httpClient);
      const result = await client.getEnvironments();
      expect(result).toEqual(expectedEnvironments);
    });
  });

  describe('Stream Operations', () => {
    it('listStreams calls GET /cards/:cardId/streams', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      const mockStreams: StreamMeta[] = [
        {
          filename: 'session.log',
          streamType: 'claude-session',
          status: 'completed',
          createdAt: '2024-01-01T00:00:00Z',
          closedAt: '2024-01-01T01:00:00Z',
          lineCount: 100
        }
      ];

      httpClient.responses.set('http://localhost:3000/cards/card-1/streams', mockStreams);

      const result = await client.listStreams('card-1');

      expect(httpClient.requests[0]).toMatchObject({
        method: 'GET',
        url: expect.stringContaining('/cards/card-1/streams')
      });
      expect(result).toEqual(mockStreams);
    });

    it('listStreams returns empty array when no streams', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      httpClient.responses.set('http://localhost:3000/cards/card-1/streams', []);

      const result = await client.listStreams('card-1');

      expect(result).toEqual([]);
    });

    it('getStream calls GET /cards/:cardId/streams/:streamType/:filename', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      const mockStream = {
        meta: {
          filename: 'session.log',
          streamType: 'claude-session',
          status: 'completed',
          createdAt: '2024-01-01T00:00:00Z',
          lineCount: 2
        },
        lines: ['line 1', 'line 2']
      };

      httpClient.responses.set('http://localhost:3000/cards/card-1/streams/claude-session/session.log', mockStream);

      const result = await client.getStream('card-1', 'claude-session', 'session.log');

      expect(httpClient.requests[0]).toMatchObject({
        method: 'GET',
        url: expect.stringContaining('/cards/card-1/streams/claude-session/session.log')
      });
      expect(result).toEqual(mockStream);
    });

    it('getStream encodes filename in URL', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      httpClient.responses.set('http://localhost:3000/cards/card-1/streams/claude-session/file%20with%20spaces.log', {
        meta: {},
        lines: []
      });

      await client.getStream('card-1', 'claude-session', 'file with spaces.log');

      expect(httpClient.requests[0]).toMatchObject({
        method: 'GET',
        url: expect.stringContaining('/cards/card-1/streams/claude-session/file%20with%20spaces.log')
      });
    });

    it('getStream encodes streamType in URL', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      httpClient.responses.set('http://localhost:3000/cards/card-1/streams/type%2Fwith%2Fslashes/session.log', {
        meta: {},
        lines: []
      });

      await client.getStream('card-1', 'type/with/slashes', 'session.log');

      expect(httpClient.requests[0]).toMatchObject({
        method: 'GET',
        url: expect.stringContaining('/cards/card-1/streams/type%2Fwith%2Fslashes/session.log')
      });
    });

    it('getStream throws ApiError on 404', async () => {
      const client = new CardsClient(options);
      const errorResponse = new Response(JSON.stringify({ error: 'Stream not found' }), {
        status: 404,
        statusText: 'Not Found'
      });

      // Mock fetch to return 404
      vi.spyOn(global, 'fetch').mockResolvedValue(errorResponse);

      await expect(client.getStream('card-1', 'claude-session', 'nonexistent.log')).rejects.toThrow(ApiError);

      vi.restoreAllMocks();
    });
  });

  describe('Action Operations', () => {
    it('executeAction sends POST to /cards/:id/actions/:name and returns ActionResult', async () => {
      const httpClient = new TestHttpClient();
      const expectedResult = { success: true, exitCode: 0 };
      httpClient.responses.set('http://localhost:3000/cards/card-123/actions/launch', expectedResult);
      const client = new CardsClient(options, httpClient);

      const result = await client.executeAction('card-123', 'launch');

      expect(httpClient.requests[0]).toMatchObject({
        method: 'POST',
        url: expect.stringContaining('/cards/card-123/actions/launch')
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('Compare Operations', () => {
    it('should POST /compare with branch-range request body', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      const request = { baseRef: 'main', compareRef: 'feature/my-card' };
      await client.setCompare(request);
      expect(httpClient.requests[0]).toMatchObject({
        method: 'POST',
        url: expect.stringContaining('/compare'),
        body: request
      });
    });

    it('should POST /compare with dynamic request body', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      const request = { baseRef: 'main', repositoryPath: '/workspace/repo' };
      await client.setCompare(request);
      expect(httpClient.requests[0]).toMatchObject({
        method: 'POST',
        url: expect.stringContaining('/compare'),
        body: request
      });
    });

    it('should POST /compare with fixed-attribution request body', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      const request = { compareRef: 'feature/my-card', attributionShas: ['abc123', 'def456'] };
      await client.setCompare(request);
      expect(httpClient.requests[0]).toMatchObject({
        method: 'POST',
        url: expect.stringContaining('/compare'),
        body: request
      });
    });

    it('should return null when GET /compare returns 204', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 204 }));
      const result = await client.getCompare();
      expect(result).toBeNull();
    });

    it('should return state when GET /compare returns 200', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      const state = { mode: 'branch-range' as const, baseRef: 'main', compareRef: 'feature/my-card' };
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(state), { status: 200, headers: { 'Content-Type': 'application/json' } })
      );
      const result = await client.getCompare();
      expect(result).toEqual(state);
    });

    it('should DELETE /compare when clearing compare', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.clearCompare();
      expect(httpClient.requests[0]).toMatchObject({
        method: 'DELETE',
        url: expect.stringContaining('/compare')
      });
    });
  });

  describe('Type Schema Operations', () => {
    it('should GET /cards/:id/schema when fetching type schemas', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.getTypeSchemas('card-123');
      expect(httpClient.requests[0]).toMatchObject({
        method: 'GET',
        url: expect.stringContaining('/cards/card-123/schema')
      });
    });

    it('should return typed response from getTypeSchemas', async () => {
      const httpClient = new TestHttpClient();
      const mockResponse = {
        types: {
          note: { version: '1.0.0', schema: 'YAML + markdown' },
          contract: { version: '2.0.0', schema: null, description: null }
        }
      };
      httpClient.responses.set('http://localhost:3000/cards/card-123/schema', mockResponse);
      const client = new CardsClient(options, httpClient);
      const result = await client.getTypeSchemas('card-123');
      expect(result.types).toBeDefined();
      expect(result.types['note']?.version).toBe('1.0.0');
      expect(result.types['note']?.schema).toBe('YAML + markdown');
      expect(result.types['contract']?.schema).toBeNull();
    });
  });

  describe('timeout and backoff behavior', () => {
    it('should pass AbortSignal to fetch when using default HTTP client', async () => {
      const client = new CardsClient(options);
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => []
      } as Response);

      await client.listCards();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );
    });

    it('should not apply timeout when HttpClient is injected', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);

      await client.listCards();

      // TestHttpClient handles the request directly, no fetch() call
      expect(httpClient.requests).toHaveLength(1);
    });

    it('should throw NetworkError with timeout message after exhausting retries', async () => {
      const client = new CardsClient(options);
      const timeoutError = new DOMException('signal timed out', 'TimeoutError');
      // All 3 attempts (1 initial + 2 retries) fail with timeout
      vi.spyOn(global, 'fetch').mockRejectedValue(timeoutError);

      await expect(client.listCards()).rejects.toThrow(NetworkError);
      await expect(client.listCards()).rejects.toThrow('Request timed out');
    });

    it('should retry on timeout and succeed on later attempt', async () => {
      const client = new CardsClient(options);
      const fetchSpy = vi.spyOn(global, 'fetch');

      // First attempt times out, second succeeds
      fetchSpy
        .mockRejectedValueOnce(new DOMException('signal timed out', 'TimeoutError'))
        .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'card-1' }] } as Response);

      const result = await client.listCards();
      expect(result).toEqual([{ id: 'card-1' }]);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('should retry up to MAX_TIMEOUT_RETRIES times then throw', async () => {
      const client = new CardsClient(options);
      const fetchSpy = vi.spyOn(global, 'fetch');
      fetchSpy.mockRejectedValue(new DOMException('signal timed out', 'TimeoutError'));

      await expect(client.listCards()).rejects.toThrow(NetworkError);
      // 1 initial + 2 retries = 3 total attempts
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-timeout NetworkError', async () => {
      const client = new CardsClient(options);
      const fetchSpy = vi.spyOn(global, 'fetch');
      fetchSpy.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(client.listCards()).rejects.toThrow(NetworkError);
      await expect(client.listCards()).rejects.toThrow('Request failed');
      // Each listCards() call should produce exactly 1 fetch (no retry)
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('should not retry ApiError (server responded)', async () => {
      const client = new CardsClient(options);
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async () => {
        return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400, statusText: 'Bad Request' });
      });

      await expect(client.listCards()).rejects.toThrow(ApiError);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should increase timeout on consecutive failures (exponential backoff)', async () => {
      const client = new CardsClient(options);
      const fetchSpy = vi.spyOn(global, 'fetch');

      // All attempts for this call time out (triggers backoff increase per retry)
      fetchSpy.mockRejectedValue(new DOMException('signal timed out', 'TimeoutError'));
      await expect(client.listCards()).rejects.toThrow(NetworkError);

      // Next call: should start with an even higher timeout from cumulative backoff
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      } as Response);
      await client.listCards();

      // Extract signals - retries within the first call plus the successful call
      const signals = fetchSpy.mock.calls.map((call) => call[1]?.signal as AbortSignal);
      for (const signal of signals) {
        expect(signal).toBeInstanceOf(AbortSignal);
      }
      // Each retry creates a new signal instance
      expect(signals[0]).not.toBe(signals[1]);
    });

    it('should reset timeout after successful request', async () => {
      const client = new CardsClient(options);
      const fetchSpy = vi.spyOn(global, 'fetch');

      // All retries fail with timeout
      fetchSpy.mockRejectedValue(new DOMException('signal timed out', 'TimeoutError'));
      await expect(client.listCards()).rejects.toThrow();

      // Clear and succeed
      fetchSpy.mockReset();
      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
      await client.listCards();

      // Next call after success should use initial timeout (fresh signal)
      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
      await client.listCards();

      // Both successful calls should have had AbortSignal
      for (const call of fetchSpy.mock.calls) {
        expect(call[1]?.signal).toBeInstanceOf(AbortSignal);
      }
    });

    it('should reset timeout on server error responses (connection is alive)', async () => {
      const client = new CardsClient(options);
      const fetchSpy = vi.spyOn(global, 'fetch');

      // All retries fail with timeout (3 fetch calls)
      fetchSpy.mockRejectedValue(new DOMException('signal timed out', 'TimeoutError'));
      await expect(client.listCards()).rejects.toThrow();

      // Server responds with 500 - connection is alive, should reset backoff
      fetchSpy.mockReset();
      fetchSpy.mockImplementation(async () => {
        return new Response(JSON.stringify({ error: 'Server error' }), {
          status: 500,
          statusText: 'Internal Server Error'
        });
      });
      await expect(client.listCards()).rejects.toThrow(ApiError);

      // Next call should use initial timeout (backoff was reset by the 500 response)
      fetchSpy.mockReset();
      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
      await client.listCards();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should apply timeout to uploadAttachment direct fetch call', async () => {
      const client = new CardsClient(options);
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'att-1', name: 'test.txt', size: 4 })
      } as Response);

      await client.uploadAttachment('card-1', 'test.txt', new Blob(['test']));

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );
    });

    it('should apply timeout to getAttachment direct fetch call', async () => {
      // getAttachment uses direct fetch (not httpClient), so DI client is ignored
      const client = new CardsClient(options);
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['data'])
      } as Response);

      await client.getAttachment('card-1', 'att-1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );
    });
  });
});
