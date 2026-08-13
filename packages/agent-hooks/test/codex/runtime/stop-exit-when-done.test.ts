/** Tests for the Codex Stop exit-when-done hook. */

import path from 'node:path';
import { extractActionInput } from '@cards.management/sdk/config';
import {
  hasSessionExitWhenDoneNudgeFired,
  markSessionExitWhenDoneNudgeFired
} from '@cards.management/sessions/card-repo';
import { Logger } from '@goodfoot/codex-hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import hook from '../../../src/codex/runtime/stop-exit-when-done.js';
import { isSessionIdle } from '../../../src/shared/session-idle.js';

vi.mock('@cards.management/sdk/config', () => ({ extractActionInput: vi.fn() }));
vi.mock('@cards.management/sessions/card-repo', () => ({
  hasSessionExitWhenDoneNudgeFired: vi.fn(),
  markSessionExitWhenDoneNudgeFired: vi.fn()
}));
vi.mock('../../../src/shared/session-idle.js', () => ({ isSessionIdle: vi.fn() }));

const mockExtractActionInput = vi.mocked(extractActionInput);
const mockHasNudged = vi.mocked(hasSessionExitWhenDoneNudgeFired);
const mockMarkNudged = vi.mocked(markSessionExitWhenDoneNudgeFired);
const mockIsSessionIdle = vi.mocked(isSessionIdle);
const logger = new Logger();
const actionInput = {
  cardId: 'main-453',
  actionName: 'Launch',
  environment: 'default',
  executionMode: 'interactive' as const,
  exitWhenDone: true,
  repoRoot: '/workspace',
  cardRepoPath: '/cards/main-453',
  configPath: '/config',
  extensionPath: '/extension',
  switchToInteractiveData: undefined,
  codingAgent: 'codex' as const,
  marketplacePath: '/marketplace'
};
const input = { session_id: 'session-453' } as Parameters<typeof hook>[0];

describe('Codex Stop exit-when-done hook', () => {
  beforeEach(() => {
    mockExtractActionInput.mockReturnValue(actionInput);
    mockHasNudged.mockReturnValue(false);
    mockMarkNudged.mockReturnValue(undefined);
    mockIsSessionIdle.mockReturnValue(true);
  });

  afterEach(() => vi.clearAllMocks());

  it('is a matcher-less Stop hook that blocks with an installed absolute runbook path', async () => {
    expect(hook.hookEventName).toBe('Stop');

    const result = await hook(input, { logger });
    const stdout = result!.stdout as { decision?: string; reason?: string };
    const runbook = stdout.reason?.match(/`([^`]*shutdown\.md)`/)?.[1];

    expect(stdout.decision).toBe('block');
    expect(runbook).toBeDefined();
    expect(path.isAbsolute(runbook!)).toBe(true);
    expect(runbook).toContain('/skills/card/references/shutdown.md');
    expect(mockMarkNudged).toHaveBeenCalledWith(input.session_id);
  });

  it('consumes only its own first-event marker and suppresses repeated Stop events', async () => {
    expect(await hook(input, { logger })).toBeDefined();
    mockHasNudged.mockReturnValue(true);
    expect(await hook(input, { logger })).toBeUndefined();
    expect(mockMarkNudged).toHaveBeenCalledTimes(1);
  });

  it('does not inspect or write a marker when exit-when-done is disabled', async () => {
    mockExtractActionInput.mockReturnValue({ ...actionInput, exitWhenDone: false });
    expect(await hook(input, { logger })).toBeUndefined();
    expect(mockHasNudged).not.toHaveBeenCalled();
    expect(mockMarkNudged).not.toHaveBeenCalled();
  });

  it('does not consume the marker while the session has active work', async () => {
    mockIsSessionIdle.mockReturnValue(false);
    expect(await hook(input, { logger })).toBeUndefined();
    expect(mockHasNudged).not.toHaveBeenCalled();
  });

  it('fails open and logs when action context is missing', async () => {
    mockExtractActionInput.mockImplementation(() => {
      throw new Error('missing action context');
    });
    expect(await hook(input, { logger })).toBeUndefined();
  });

  it('fails open when the marker cannot be read', async () => {
    mockHasNudged.mockImplementation(() => {
      throw new Error('permission denied');
    });
    expect(await hook(input, { logger })).toBeUndefined();
    expect(mockMarkNudged).not.toHaveBeenCalled();
  });

  it('fails open when the marker cannot be written', async () => {
    mockMarkNudged.mockImplementation(() => {
      throw new Error('disk full');
    });
    expect(await hook(input, { logger })).toBeUndefined();
  });
});
