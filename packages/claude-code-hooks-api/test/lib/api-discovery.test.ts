import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir as realTmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Exercises api discovery behavior in the lib area through focused scenarios.
 * The cases lock in edge handling and regression coverage so refactors preserve expected state
 * transitions and output.
 *
 * @summary Tests api discovery behavior in lib
 */

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return {
    ...actual,
    homedir: vi.fn(() => process.env.MOCK_HOMEDIR || '/tmp')
  };
});

import type { Logger } from '@goodfoot/claude-code-hooks';
import { createCardsClient, discoverApiInfo } from '../../src/lib/api-discovery.js';

const mockLogger = {
  debug: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  error: vi.fn()
} as unknown as Logger;

describe('api-discovery', () => {
  const originalEnv = process.env;
  let testDir: string;

  beforeEach(() => {
    process.env = { ...originalEnv };
    testDir = join(realTmpdir(), `api-discovery-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    process.env.MOCK_HOMEDIR = testDir;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(testDir, { recursive: true, force: true });
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
      mkdirSync(join(testDir, '.cards'), { recursive: true });
      writeFileSync(join(testDir, '.cards', 'cards-api.json'), JSON.stringify(config));

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
      mkdirSync(join(testDir, '.cards'), { recursive: true });
      writeFileSync(join(testDir, '.cards', 'cards-api.json'), JSON.stringify(config));

      const info = await discoverApiInfo(mockLogger);
      expect(info?.sessionBaseline).toEqual({ cardId: 'card-1', updatedAt: '2024-06-01T12:00:00Z' });
    });

    it('should return null when config is missing required fields', async () => {
      mkdirSync(join(testDir, '.cards'), { recursive: true });
      writeFileSync(join(testDir, '.cards', 'cards-api.json'), JSON.stringify({ host: 'localhost' }));

      const info = await discoverApiInfo(mockLogger);
      expect(info).toBeNull();
    });

    it('should return null when config file is missing', async () => {
      // Don't create the file - it naturally doesn't exist
      const info = await discoverApiInfo(mockLogger);
      expect(info).toBeNull();
    });

    it('should return null when config file contains invalid JSON', async () => {
      mkdirSync(join(testDir, '.cards'), { recursive: true });
      writeFileSync(join(testDir, '.cards', 'cards-api.json'), 'not valid json');

      const info = await discoverApiInfo(mockLogger);
      expect(info).toBeNull();
    });

    it('should return null when host is not a string', async () => {
      mkdirSync(join(testDir, '.cards'), { recursive: true });
      writeFileSync(
        join(testDir, '.cards', 'cards-api.json'),
        JSON.stringify({ host: 123, port: 3000, accessToken: 'tok', pid: 1, startedAt: '2024-01-01T00:00:00Z' })
      );

      const info = await discoverApiInfo(mockLogger);
      expect(info).toBeNull();
    });

    it('should return null when port is not a number', async () => {
      mkdirSync(join(testDir, '.cards'), { recursive: true });
      writeFileSync(
        join(testDir, '.cards', 'cards-api.json'),
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
      // Don't create the config file
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
      mkdirSync(join(testDir, '.cards'), { recursive: true });
      writeFileSync(join(testDir, '.cards', 'cards-api.json'), JSON.stringify(config));

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
