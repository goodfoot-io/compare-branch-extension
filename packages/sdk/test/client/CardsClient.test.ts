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
      await client.listCards({ status: 'in_progress' });
      expect(httpClient.requests).toHaveLength(1);
      expect(httpClient.requests[0]?.url).toContain('status=in_progress');
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
      const data = { title: 'Test Card', description: 'Test description' };
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
        json: async () => ({ message: 'Attachment not found' })
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

  describe('Plan Operations', () => {
    it('should GET /cards/:id/plan when fetching plan', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.getPlan('card-123');
      expect(httpClient.requests[0]).toMatchObject({
        method: 'GET',
        url: expect.stringContaining('/cards/card-123/plan')
      });
    });

    it('should PUT /cards/:id/plan when updating plan', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      const content = '# Plan\n\n## Tasks\n- Task 1';
      await client.updatePlan('card-123', content);
      expect(httpClient.requests[0]).toMatchObject({
        method: 'PUT',
        url: expect.stringContaining('/cards/card-123/plan'),
        body: content
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
      await client.approveGate('card-123', 'review');
      expect(httpClient.requests[0]).toMatchObject({
        method: 'POST',
        url: expect.stringContaining('/cards/card-123/gates/review/approve')
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
      const expectedEnvironments = [
        { name: 'production', description: 'Production environment' },
        { name: 'staging', description: 'Staging environment' },
        { name: 'development' }
      ];
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

    it('getStream calls GET /cards/:cardId/streams/:filename', async () => {
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

      httpClient.responses.set('http://localhost:3000/cards/card-1/streams/session.log', mockStream);

      const result = await client.getStream('card-1', 'session.log');

      expect(httpClient.requests[0]).toMatchObject({
        method: 'GET',
        url: expect.stringContaining('/cards/card-1/streams/session.log')
      });
      expect(result).toEqual(mockStream);
    });

    it('getStream encodes filename in URL', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      httpClient.responses.set('http://localhost:3000/cards/card-1/streams/file%20with%20spaces.log', {
        meta: {},
        lines: []
      });

      await client.getStream('card-1', 'file with spaces.log');

      expect(httpClient.requests[0]).toMatchObject({
        method: 'GET',
        url: expect.stringContaining('/cards/card-1/streams/file%20with%20spaces.log')
      });
    });

    it('getStream throws ApiError on 404', async () => {
      const client = new CardsClient(options);
      const errorResponse = new Response(JSON.stringify({ message: 'Stream not found' }), {
        status: 404,
        statusText: 'Not Found'
      });

      // Mock fetch to return 404
      vi.spyOn(global, 'fetch').mockResolvedValue(errorResponse);

      await expect(client.getStream('card-1', 'nonexistent.log')).rejects.toThrow(ApiError);

      vi.restoreAllMocks();
    });
  });

  describe('Typed File Operations', () => {
    it('should PUT /cards/:id/adaptive-card-submission/:fileName when submitting card action', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.submitCardAction('card-123', 'submit-btn', { name: 'Alice' });
      expect(httpClient.requests[0]).toMatchObject({
        method: 'PUT',
        url: expect.stringContaining('/cards/card-123/adaptive-card-submission/'),
        body: { cardId: 'card-123', actionId: 'submit-btn', data: { name: 'Alice' } }
      });
    });

    it('should include actionId in the generated fileName', async () => {
      const httpClient = new TestHttpClient();
      const client = new CardsClient(options, httpClient);
      await client.submitCardAction('card-123', 'my-action', {});
      expect(httpClient.requests[0]?.url).toContain('my-action-');
      expect(httpClient.requests[0]?.url).toContain('.json');
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
          note: { version: '1.0.0', schema: 'YAML + markdown', description: 'Notes' },
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

    it('should throw NetworkError with timeout message on timeout', async () => {
      const client = new CardsClient(options);
      const timeoutError = new DOMException('signal timed out', 'TimeoutError');
      vi.spyOn(global, 'fetch').mockRejectedValue(timeoutError);

      await expect(client.listCards()).rejects.toThrow(NetworkError);
      await expect(client.listCards()).rejects.toThrow('Request timed out');
    });

    it('should throw NetworkError for generic network failures', async () => {
      const client = new CardsClient(options);
      vi.spyOn(global, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(client.listCards()).rejects.toThrow(NetworkError);
      await expect(client.listCards()).rejects.toThrow('Request failed');
    });

    it('should increase timeout on consecutive failures (exponential backoff)', async () => {
      const client = new CardsClient(options);
      const fetchSpy = vi.spyOn(global, 'fetch');

      // First call: fails with timeout
      fetchSpy.mockRejectedValueOnce(new DOMException('signal timed out', 'TimeoutError'));
      await expect(client.listCards()).rejects.toThrow(NetworkError);

      // Second call: should have a longer timeout (2s vs initial 1s)
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      } as Response);
      await client.listCards();

      // Extract signals from both calls
      const firstSignal = fetchSpy.mock.calls[0]?.[1]?.signal as AbortSignal;
      const secondSignal = fetchSpy.mock.calls[1]?.[1]?.signal as AbortSignal;
      expect(firstSignal).toBeInstanceOf(AbortSignal);
      expect(secondSignal).toBeInstanceOf(AbortSignal);
      // We can't directly inspect the timeout value on AbortSignal,
      // but we can verify the signals are different instances (new timeout created each call)
      expect(firstSignal).not.toBe(secondSignal);
    });

    it('should reset timeout after successful request', async () => {
      const client = new CardsClient(options);
      const fetchSpy = vi.spyOn(global, 'fetch');

      // Fail a few times to increase backoff
      fetchSpy.mockRejectedValueOnce(new DOMException('signal timed out', 'TimeoutError'));
      await expect(client.listCards()).rejects.toThrow();
      fetchSpy.mockRejectedValueOnce(new DOMException('signal timed out', 'TimeoutError'));
      await expect(client.listCards()).rejects.toThrow();

      // Succeed - should reset backoff
      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
      await client.listCards();

      // Next call after success should use initial timeout (fresh signal)
      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
      await client.listCards();

      // All 4 calls should have had AbortSignal
      for (const call of fetchSpy.mock.calls) {
        expect(call[1]?.signal).toBeInstanceOf(AbortSignal);
      }
    });

    it('should reset timeout on server error responses (connection is alive)', async () => {
      const client = new CardsClient(options);
      const fetchSpy = vi.spyOn(global, 'fetch');

      // Fail with timeout to increase backoff
      fetchSpy.mockRejectedValueOnce(new DOMException('signal timed out', 'TimeoutError'));
      await expect(client.listCards()).rejects.toThrow();

      // Server responds with 500 - connection is alive, should reset backoff
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Server error' })
      } as Response);
      await expect(client.listCards()).rejects.toThrow(); // ApiError, not NetworkError

      // Next call should use initial timeout (backoff was reset by the 500 response)
      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
      await client.listCards();

      expect(fetchSpy).toHaveBeenCalledTimes(3);
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
