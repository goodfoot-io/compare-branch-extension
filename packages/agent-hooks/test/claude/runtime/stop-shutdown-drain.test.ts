/**
 * Tests for the Claude Stop shutdown-drain readiness hook.
 *
 * @summary Tests for the Claude Stop shutdown-drain readiness hook
 */

import {
  clearPendingShutdownRequest,
  readPendingShutdownRequest,
  sendShutdownReady
} from '@cards.management/sdk/config';
import { Logger } from '@goodfoot/agent-hooks/claude-code';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import hook from '../../../src/claude/runtime/stop-shutdown-drain.js';
import { isSessionIdle } from '../../../src/shared/session-idle.js';

vi.mock('@cards.management/sdk/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cards.management/sdk/config')>();
  return {
    ...actual,
    clearPendingShutdownRequest: vi.fn(),
    readPendingShutdownRequest: vi.fn(),
    sendShutdownReady: vi.fn()
  };
});
vi.mock('../../../src/shared/session-idle.js', () => ({ isSessionIdle: vi.fn() }));

const mockClearPendingShutdownRequest = vi.mocked(clearPendingShutdownRequest);
const mockReadPendingShutdownRequest = vi.mocked(readPendingShutdownRequest);
const mockSendShutdownReady = vi.mocked(sendShutdownReady);
const mockIsSessionIdle = vi.mocked(isSessionIdle);
const logger = new Logger();

/** Minimal set of env vars required by extractActionInput. */
const ACTION_ENV = {
  CARD_ID: 'card-456',
  ACTION_NAME: 'Launch Claude',
  ENVIRONMENT: 'staging',
  EXECUTION_MODE: 'interactive',
  EXIT_WHEN_DONE: 'true',
  REPO_ROOT: '/workspace',
  CARD_REPO_PATH: '/workspace/.cards/repo',
  CONFIG_PATH: '/tmp/config',
  EXTENSION_PATH: '/tmp/extension',
  MARKETPLACE_PATH: '/tmp/extension/dist/marketplace',
  WORKSPACE_PATH: '/workspace',
  BASE_BRANCH: 'main',
  WORKSPACE_BRANCH: 'cards/main-1/1'
} as const;

const input = { session_id: 'session-456' } as Parameters<typeof hook>[0];

const pendingRequest = {
  version: 1 as const,
  requestId: 'shutdown-request-opaque-456',
  socketPath: '/tmp/cards-action-456.sock'
};

describe('Claude Stop shutdown-drain hook', () => {
  it('has correct hookEventName metadata', () => {
    expect(hook.eventName).toBe('Stop');
  });

  it('fails open when not inside an action subprocess', async () => {
    const preserved: Record<string, string | undefined> = {};
    for (const key of Object.keys(ACTION_ENV)) {
      preserved[key] = process.env[key];
      delete process.env[key];
    }
    try {
      expect(await hook(input, { logger })).toBeNull();
      expect(mockReadPendingShutdownRequest).not.toHaveBeenCalled();
    } finally {
      for (const [key, value] of Object.entries(preserved)) {
        if (value !== undefined) process.env[key] = value;
      }
    }
  });

  describe('inside an action subprocess', () => {
    beforeEach(() => {
      for (const [key, value] of Object.entries(ACTION_ENV)) {
        process.env[key] = value;
      }
      mockReadPendingShutdownRequest.mockReturnValue(undefined);
      mockSendShutdownReady.mockResolvedValue(undefined);
      mockIsSessionIdle.mockResolvedValue(true);
    });

    afterEach(() => {
      for (const key of Object.keys(ACTION_ENV)) {
        delete process.env[key];
      }
      vi.clearAllMocks();
    });

    it('is a no-op when no shutdown request is pending', async () => {
      expect(await hook(input, { logger })).toBeNull();
      expect(mockReadPendingShutdownRequest).toHaveBeenCalledWith(input.session_id);
      expect(mockIsSessionIdle).not.toHaveBeenCalled();
    });

    it('fails open when the pending-request marker cannot be read', async () => {
      mockReadPendingShutdownRequest.mockImplementation(() => {
        throw new Error('permission denied');
      });
      expect(await hook(input, { logger })).toBeNull();
      expect(mockIsSessionIdle).not.toHaveBeenCalled();
    });

    describe('with a pending shutdown request', () => {
      beforeEach(() => {
        mockReadPendingShutdownRequest.mockReturnValue(pendingRequest);
      });

      it('acknowledges readiness and clears the request once the strict idle authority reports drained', async () => {
        mockIsSessionIdle.mockResolvedValue(true);

        expect(await hook(input, { logger })).toBeNull();

        expect(mockIsSessionIdle).toHaveBeenCalledWith(input.session_id, { strict: true });
        expect(mockSendShutdownReady).toHaveBeenCalledWith(pendingRequest.socketPath, {
          type: 'shutdownReady',
          requestId: pendingRequest.requestId
        });
        expect(mockClearPendingShutdownRequest).toHaveBeenCalledWith(input.session_id, pendingRequest.requestId);
      });

      it('does not acknowledge while the strict idle authority reports background work', async () => {
        mockIsSessionIdle.mockResolvedValue(false);

        expect(await hook(input, { logger })).toBeNull();

        expect(mockSendShutdownReady).not.toHaveBeenCalled();
        expect(mockClearPendingShutdownRequest).not.toHaveBeenCalled();
      });

      it('fails closed when the strict idle authority throws', async () => {
        mockIsSessionIdle.mockRejectedValue(new Error('process-tree query failed'));

        expect(await hook(input, { logger })).toBeNull();
        expect(mockSendShutdownReady).not.toHaveBeenCalled();
      });

      it('leaves the request pending when the readiness socket write fails', async () => {
        mockIsSessionIdle.mockResolvedValue(true);
        mockSendShutdownReady.mockRejectedValue(new Error('ECONNREFUSED'));

        expect(await hook(input, { logger })).toBeNull();
        expect(mockClearPendingShutdownRequest).not.toHaveBeenCalled();
      });
    });
  });
});
