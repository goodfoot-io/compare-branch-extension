/**
 * Tests for the post-compaction SessionStart hook.
 *
 * @summary Tests for session-start-after-compaction hook
 */

import { Logger } from '@goodfoot/claude-code-hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import hook from '../src/session-start-after-compaction.js';

// --- Module mocks ---

vi.mock('@cards/sessions', () => ({
  findAgentPid: vi.fn(),
  getPidCardAssociation: vi.fn(),
  registerSession: vi.fn()
}));

vi.mock('@cards/sdk/client/discovery', () => ({
  discoverApiInfo: vi.fn(),
  createCardsClient: vi.fn()
}));

vi.mock('@cards/sdk/bin/spawn-transcript-watcher', () => ({
  spawnTranscriptWatcher: vi.fn()
}));

import { spawnTranscriptWatcher } from '@cards/sdk/bin/spawn-transcript-watcher';
import { createCardsClient, discoverApiInfo } from '@cards/sdk/client/discovery';
import { findAgentPid, getPidCardAssociation, registerSession } from '@cards/sessions';

const mockFindAgentPid = vi.mocked(findAgentPid);
const mockGetPidCardAssociation = vi.mocked(getPidCardAssociation);
const mockRegisterSession = vi.mocked(registerSession);
const mockDiscoverApiInfo = vi.mocked(discoverApiInfo);
const mockCreateCardsClient = vi.mocked(createCardsClient);
const mockSpawnTranscriptWatcher = vi.mocked(spawnTranscriptWatcher);

const logger = new Logger();

const BASE_INPUT = {
  session_id: 'new-session-id',
  transcript_path: '/tmp/new-session.jsonl'
} as Parameters<typeof hook>[0];

const MOCK_API_INFO = {
  host: 'localhost',
  port: 3000,
  pid: 1,
  accessToken: 'test-token',
  startedAt: '2026-01-01T00:00:00.000Z'
};

const MOCK_CARD = {
  repositoryPath: '/home/node/.cards/cards-repos/card-abc'
};

/**
 * Minimal persistEnvVar / persistEnvVars context.
 *
 * @returns Context object with logger and stub env-var setters.
 */
function makeContext() {
  return {
    logger,
    persistEnvVar: vi.fn(),
    persistEnvVars: vi.fn()
  };
}

/**
 * Minimal fetch response helper.
 *
 * @param ok - Whether the response should be successful.
 * @param body - Response body to serialize.
 * @returns A `Response`-shaped stub.
 */
function makeDeleteResponse(ok: boolean, body: object = { stopped: ['s1'], timedOut: [] }) {
  return {
    ok,
    status: ok ? 200 : 503,
    json: async () => body
  } as Response;
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('session-start-after-compaction hook metadata', () => {
  it('has SessionStart hookEventName', () => {
    expect(hook.hookEventName).toBe('SessionStart');
  });
});

describe('when no agent PID is found', () => {
  beforeEach(() => {
    mockFindAgentPid.mockReturnValue(null);
  });

  it('returns the routing reminder without calling DELETE or spawnTranscriptWatcher', async () => {
    const ctx = makeContext();
    const result = await hook(BASE_INPUT, ctx);

    expect(mockGetPidCardAssociation).not.toHaveBeenCalled();
    expect(mockDiscoverApiInfo).not.toHaveBeenCalled();
    expect(mockSpawnTranscriptWatcher).not.toHaveBeenCalled();
    expect(ctx.persistEnvVar).not.toHaveBeenCalled();

    const stdout = result!.stdout as { systemMessage?: string };
    expect(stdout.systemMessage).toContain('IMPORTANT');
  });
});

describe('when association is null', () => {
  beforeEach(() => {
    mockFindAgentPid.mockReturnValue(42);
    mockGetPidCardAssociation.mockResolvedValue(null);
  });

  it('returns the routing reminder without calling DELETE or spawnTranscriptWatcher', async () => {
    const ctx = makeContext();
    const result = await hook(BASE_INPUT, ctx);

    expect(mockDiscoverApiInfo).not.toHaveBeenCalled();
    expect(mockSpawnTranscriptWatcher).not.toHaveBeenCalled();
    expect(ctx.persistEnvVar).not.toHaveBeenCalled();

    const stdout = result!.stdout as { systemMessage?: string };
    expect(stdout.systemMessage).toContain('IMPORTANT');
  });
});

describe('when mode is launch (no mode field)', () => {
  beforeEach(() => {
    mockFindAgentPid.mockReturnValue(42);
    mockGetPidCardAssociation.mockResolvedValue({ cardId: 'card-abc', mode: 'launch' });
  });

  it('does not enter the attach branch — no DELETE or spawn calls', async () => {
    const ctx = makeContext();
    const result = await hook(BASE_INPUT, ctx);

    expect(mockDiscoverApiInfo).not.toHaveBeenCalled();
    expect(mockSpawnTranscriptWatcher).not.toHaveBeenCalled();
    expect(ctx.persistEnvVar).not.toHaveBeenCalled();

    const stdout = result!.stdout as { systemMessage?: string };
    expect(stdout.systemMessage).toContain('IMPORTANT');
  });
});

describe('when mode is attach', () => {
  const CARD_ID = 'card-abc';

  beforeEach(() => {
    mockFindAgentPid.mockReturnValue(42);
    mockGetPidCardAssociation.mockResolvedValue({
      cardId: CARD_ID,
      mode: 'attach',
      workspacePath: '/workspace/repo'
    });
    mockRegisterSession.mockResolvedValue(undefined);
    mockCreateCardsClient.mockResolvedValue({ getCard: async () => MOCK_CARD } as unknown as Awaited<
      ReturnType<typeof createCardsClient>
    >);
  });

  it('calls DELETE before spawnTranscriptWatcher (call order)', async () => {
    const callOrder: string[] = [];

    mockDiscoverApiInfo.mockImplementation(async () => {
      callOrder.push('discoverApiInfo');
      return MOCK_API_INFO;
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      callOrder.push('DELETE');
      return makeDeleteResponse(true);
    });

    mockSpawnTranscriptWatcher.mockImplementation(() => {
      callOrder.push('spawnTranscriptWatcher');
    });

    const ctx = makeContext();
    await hook(BASE_INPUT, ctx);

    const deleteIndex = callOrder.indexOf('DELETE');
    const spawnIndex = callOrder.indexOf('spawnTranscriptWatcher');
    expect(deleteIndex).toBeGreaterThanOrEqual(0);
    expect(spawnIndex).toBeGreaterThanOrEqual(0);
    expect(deleteIndex).toBeLessThan(spawnIndex);

    fetchSpy.mockRestore();
  });

  it('persists CARDS_SESSION_ID and CARDS_TRANSCRIPT_PATH', async () => {
    mockDiscoverApiInfo.mockResolvedValue(MOCK_API_INFO);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeDeleteResponse(true));

    const ctx = makeContext();
    await hook(BASE_INPUT, ctx);

    expect(ctx.persistEnvVar).toHaveBeenCalledWith('CARDS_SESSION_ID', BASE_INPUT.session_id);
    expect(ctx.persistEnvVar).toHaveBeenCalledWith('CARDS_TRANSCRIPT_PATH', BASE_INPUT.transcript_path);

    vi.restoreAllMocks();
  });

  it('always returns the routing reminder', async () => {
    mockDiscoverApiInfo.mockResolvedValue(MOCK_API_INFO);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeDeleteResponse(true));

    const ctx = makeContext();
    const result = await hook(BASE_INPUT, ctx);

    const stdout = result!.stdout as { systemMessage?: string };
    expect(stdout.systemMessage).toContain('IMPORTANT');

    vi.restoreAllMocks();
  });

  it('DELETE failure does not block: still spawns watcher and returns routing reminder', async () => {
    mockDiscoverApiInfo.mockResolvedValue(MOCK_API_INFO);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('connection refused'));

    const ctx = makeContext();
    const result = await hook(BASE_INPUT, ctx);

    expect(mockSpawnTranscriptWatcher).toHaveBeenCalled();
    expect(ctx.persistEnvVar).toHaveBeenCalledWith('CARDS_SESSION_ID', BASE_INPUT.session_id);

    const stdout = result!.stdout as { systemMessage?: string };
    expect(stdout.systemMessage).toContain('IMPORTANT');

    vi.restoreAllMocks();
  });

  // F5: persistEnvVar must be called BEFORE spawnTranscriptWatcher
  it('persistEnvVar is invoked before spawnTranscriptWatcher in the attach-mode branch', async () => {
    const callOrder: string[] = [];

    mockDiscoverApiInfo.mockResolvedValue(MOCK_API_INFO);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeDeleteResponse(true));

    mockSpawnTranscriptWatcher.mockImplementation(() => {
      callOrder.push('spawnTranscriptWatcher');
    });

    const ctx = makeContext();
    ctx.persistEnvVar.mockImplementation((_key: string, _val: string) => {
      callOrder.push('persistEnvVar');
    });

    await hook(BASE_INPUT, ctx);

    const firstPersist = callOrder.indexOf('persistEnvVar');
    const spawnIndex = callOrder.indexOf('spawnTranscriptWatcher');

    expect(firstPersist).toBeGreaterThanOrEqual(0);
    expect(spawnIndex).toBeGreaterThanOrEqual(0);
    expect(firstPersist).toBeLessThan(spawnIndex);

    vi.restoreAllMocks();
  });

  it('DELETE is issued to the correct URL with bearer auth', async () => {
    mockDiscoverApiInfo.mockResolvedValue(MOCK_API_INFO);

    let capturedRequest: { url: string; options: RequestInit } | null = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
      capturedRequest = { url: url as string, options: options ?? {} };
      return makeDeleteResponse(true);
    });

    const ctx = makeContext();
    await hook(BASE_INPUT, ctx);

    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest!.url).toBe(
      `http://${MOCK_API_INFO.host}:${MOCK_API_INFO.port}/internal/cards/${CARD_ID}/watchers`
    );
    expect(capturedRequest!.options.method).toBe('DELETE');
    expect((capturedRequest!.options.headers as Record<string, string>)['Authorization']).toBe(
      `Bearer ${MOCK_API_INFO.accessToken}`
    );

    vi.restoreAllMocks();
  });
});
