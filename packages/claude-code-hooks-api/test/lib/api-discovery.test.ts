import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn()
}));

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/mock-home')
}));

import { readFile } from 'node:fs/promises';
import type { Logger } from '@goodfoot/claude-code-hooks';
import { createCardsClient, discoverApiInfo } from '../../src/lib/api-discovery.js';

const mockReadFile = vi.mocked(readFile);

const mockLogger = {
  debug: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  error: vi.fn()
} as unknown as Logger;

describe('api-discovery', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('discoverApiInfo', () => {
    it('should return mock info in API_TEST_MODE', async () => {
      process.env.API_TEST_MODE = '1';

      const info = await discoverApiInfo(mockLogger);
      expect(info).toEqual({
        host: 'localhost',
        port: 9999,
        pid: 99999,
        accessToken: 'test-token',
        startedAt: '2024-01-01T00:00:00Z'
      });
    });

    it('should read and parse valid config', async () => {
      const config = {
        host: 'localhost',
        port: 3000,
        accessToken: 'token-abc',
        pid: 12345,
        startedAt: '2024-06-01T12:00:00Z'
      };
      mockReadFile.mockResolvedValue(JSON.stringify(config));

      const info = await discoverApiInfo(mockLogger);
      expect(info).toEqual(config);
    });

    it('should include sessionBaseline when present', async () => {
      const config = {
        host: 'localhost',
        port: 3000,
        accessToken: 'token-abc',
        pid: 12345,
        startedAt: '2024-06-01T12:00:00Z',
        sessionBaseline: { cardId: 'card-1', updatedAt: '2024-06-01T12:00:00Z' }
      };
      mockReadFile.mockResolvedValue(JSON.stringify(config));

      const info = await discoverApiInfo(mockLogger);
      expect(info?.sessionBaseline).toEqual({ cardId: 'card-1', updatedAt: '2024-06-01T12:00:00Z' });
    });

    it('should return null when config is missing required fields', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({ host: 'localhost' }));

      const info = await discoverApiInfo(mockLogger);
      expect(info).toBeNull();
    });

    it('should return null when config file is missing', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'));

      const info = await discoverApiInfo(mockLogger);
      expect(info).toBeNull();
    });

    it('should return null when config file contains invalid JSON', async () => {
      mockReadFile.mockResolvedValue('not valid json');

      const info = await discoverApiInfo(mockLogger);
      expect(info).toBeNull();
    });

    it('should return null when host is not a string', async () => {
      mockReadFile.mockResolvedValue(
        JSON.stringify({ host: 123, port: 3000, accessToken: 'tok', pid: 1, startedAt: '2024-01-01T00:00:00Z' })
      );

      const info = await discoverApiInfo(mockLogger);
      expect(info).toBeNull();
    });

    it('should return null when port is not a number', async () => {
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          host: 'localhost',
          port: '3000',
          accessToken: 'tok',
          pid: 1,
          startedAt: '2024-01-01T00:00:00Z'
        })
      );

      const info = await discoverApiInfo(mockLogger);
      expect(info).toBeNull();
    });
  });

  describe('createCardsClient', () => {
    it('should return null when discovery fails', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'));

      const client = await createCardsClient(mockLogger);
      expect(client).toBeNull();
    });

    it('should return a CardsClient configured from discovery info', async () => {
      const config = {
        host: '127.0.0.1',
        port: 4000,
        accessToken: 'my-token',
        pid: 99,
        startedAt: '2024-01-01T00:00:00Z'
      };
      mockReadFile.mockResolvedValue(JSON.stringify(config));

      const client = await createCardsClient(mockLogger);
      expect(client).not.toBeNull();
      expect(client?.getBaseUrl()).toBe('http://127.0.0.1:4000');
    });

    it('should return a CardsClient in API_TEST_MODE', async () => {
      process.env.API_TEST_MODE = '1';

      const client = await createCardsClient(mockLogger);
      expect(client).not.toBeNull();
      expect(client?.getBaseUrl()).toBe('http://localhost:9999');
    });
  });
});
