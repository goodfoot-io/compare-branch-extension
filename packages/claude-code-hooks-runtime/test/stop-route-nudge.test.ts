/**
 * Tests for the Stop Route Nudge hook.
 *
 * @summary Tests for stop-route-nudge hook
 */

import { execFileSync } from 'node:child_process';
import { getBaseBranch, getCardRepoPath, getWorkspaceBranch, getWorkspacePath } from '@cards/sdk/config';
import { hasSessionRouteNudgeFired, markSessionRouteNudgeFired } from '@cards/sessions/card-repo';
import { Logger } from '@goodfoot/claude-code-hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import hook from '../src/stop-route-nudge.js';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn()
}));

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn()
}));

vi.mock('node:path', async (importOriginal) => {
  return await importOriginal<typeof import('node:path')>();
});

vi.mock('@cards/sdk/config', () => ({
  getCardRepoPath: vi.fn(),
  getWorkspacePath: vi.fn(),
  getBaseBranch: vi.fn(),
  getWorkspaceBranch: vi.fn()
}));

vi.mock('@cards/sessions/card-repo', () => ({
  hasSessionRouteNudgeFired: vi.fn(),
  markSessionRouteNudgeFired: vi.fn()
}));

const mockExecFileSync = vi.mocked(execFileSync);
const mockGetCardRepoPath = vi.mocked(getCardRepoPath);
const mockGetWorkspacePath = vi.mocked(getWorkspacePath);
const mockGetBaseBranch = vi.mocked(getBaseBranch);
const mockGetWorkspaceBranch = vi.mocked(getWorkspaceBranch);
const mockHasSessionRouteNudgeFired = vi.mocked(hasSessionRouteNudgeFired);
const mockMarkSessionRouteNudgeFired = vi.mocked(markSessionRouteNudgeFired);

// Import readFileSync after mocking so we get the mock instance
import { readFileSync } from 'node:fs';

const mockReadFileSync = vi.mocked(readFileSync);

const logger = new Logger();

const baseCardMeta = {
  id: 'card-123',
  title: 'Test Card',
  status: 'active',
  tags: [] as string[],
  gates: {
    planRequired: false,
    planApproved: false,
    mergeRequestRequired: false,
    mergeApproved: false
  }
};

const mockInput = { session_id: 'sess-abc' } as Parameters<typeof hook>[0];

describe('Stop Route Nudge Hook', () => {
  beforeEach(() => {
    mockGetCardRepoPath.mockReturnValue('/tmp/card-repos/card-123');
    mockGetWorkspacePath.mockReturnValue('/workspace');
    mockGetBaseBranch.mockReturnValue('main');
    mockGetWorkspaceBranch.mockReturnValue('cards/main-1/1');
    mockHasSessionRouteNudgeFired.mockReturnValue(false);
    mockMarkSessionRouteNudgeFired.mockReturnValue(undefined);
    mockReadFileSync.mockReturnValue(JSON.stringify(baseCardMeta) as ReturnType<typeof readFileSync>);
    mockExecFileSync.mockReturnValue('3\n' as ReturnType<typeof execFileSync>);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has correct hookEventName metadata', () => {
    expect(hook.hookEventName).toBe('Stop');
  });

  describe('trigger fires', () => {
    it('fires with decision:"block" and reason containing branch names and routing instructions when all conditions hold', async () => {
      const result = await hook(mockInput, { logger });

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('_type', 'Stop');
      const stdout = result!.stdout as { decision?: string; reason?: string };
      expect(stdout.decision).toBe('block');
      expect(stdout.reason).toContain('cards/main-1/1');
      expect(stdout.reason).toContain('main');
      expect(stdout.reason).toContain('SKILL.md');
      expect(mockMarkSessionRouteNudgeFired).toHaveBeenCalledWith(mockInput.session_id);
    });

    it('includes unmerged commit count in the reason', async () => {
      mockExecFileSync.mockReturnValue('5\n' as ReturnType<typeof execFileSync>);

      const result = await hook(mockInput, { logger });

      const stdout = result!.stdout as { reason?: string };
      expect(stdout.reason).toContain('5 commit(s)');
    });

    it('writes marker on first fire; subsequent invocation in same session returns null even if conditions still hold', async () => {
      // First invocation: should fire and write the marker
      const firstResult = await hook(mockInput, { logger });
      expect(firstResult).not.toBeNull();
      expect(mockMarkSessionRouteNudgeFired).toHaveBeenCalledWith(mockInput.session_id);

      // Simulate a subsequent invocation: the marker is now present
      mockHasSessionRouteNudgeFired.mockReturnValue(true);

      const secondResult = await hook(mockInput, { logger });
      expect(secondResult).toBeNull();
    });
  });

  describe('null when blocked tag is present', () => {
    it('returns null when tags includes "blocked"', async () => {
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ ...baseCardMeta, tags: ['blocked'] }) as ReturnType<typeof readFileSync>
      );

      const result = await hook(mockInput, { logger });

      expect(result).toBeNull();
    });
  });

  describe('null when merge gate not satisfied', () => {
    it('returns null when mergeRequestRequired is true and mergeApproved is false', async () => {
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          ...baseCardMeta,
          gates: { ...baseCardMeta.gates, mergeRequestRequired: true, mergeApproved: false }
        }) as ReturnType<typeof readFileSync>
      );

      const result = await hook(mockInput, { logger });

      expect(result).toBeNull();
    });

    it('fires when mergeRequestRequired is true and mergeApproved is true', async () => {
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          ...baseCardMeta,
          gates: { ...baseCardMeta.gates, mergeRequestRequired: true, mergeApproved: true }
        }) as ReturnType<typeof readFileSync>
      );

      const result = await hook(mockInput, { logger });

      expect(result).not.toBeNull();
    });

    it('fires when mergeRequestRequired is false and mergeApproved is false', async () => {
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          ...baseCardMeta,
          gates: { ...baseCardMeta.gates, mergeRequestRequired: false, mergeApproved: false }
        }) as ReturnType<typeof readFileSync>
      );

      const result = await hook(mockInput, { logger });

      expect(result).not.toBeNull();
    });
  });

  describe('null when git rev-list returns 0', () => {
    it('returns null when there are no unmerged commits', async () => {
      mockExecFileSync.mockReturnValue('0\n' as ReturnType<typeof execFileSync>);

      const result = await hook(mockInput, { logger });

      expect(result).toBeNull();
    });
  });

  describe('once-per-session suppression', () => {
    it('returns null when hasSessionRouteNudgeFired is true', async () => {
      mockHasSessionRouteNudgeFired.mockReturnValue(true);

      const result = await hook(mockInput, { logger });

      expect(result).toBeNull();
      expect(mockMarkSessionRouteNudgeFired).not.toHaveBeenCalled();
    });
  });

  describe('fail-open error paths', () => {
    it('returns null (no throw) when an env getter throws', async () => {
      mockGetWorkspacePath.mockImplementation(() => {
        throw new Error('missing env var');
      });

      const result = await hook(mockInput, { logger });

      expect(result).toBeNull();
    });

    it('returns null (no throw) when git rev-list throws', async () => {
      mockExecFileSync.mockImplementation(() => {
        throw new Error('git not found');
      });

      const result = await hook(mockInput, { logger });

      expect(result).toBeNull();
    });

    it('returns null (no throw) when CARD.meta.json is missing', async () => {
      const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      mockReadFileSync.mockImplementation(() => {
        throw enoent;
      });

      const result = await hook(mockInput, { logger });

      expect(result).toBeNull();
    });

    it('returns null (no throw) when CARD.meta.json is invalid JSON', async () => {
      mockReadFileSync.mockReturnValue('not json' as ReturnType<typeof readFileSync>);

      const result = await hook(mockInput, { logger });

      expect(result).toBeNull();
    });

    it('returns null (no throw) when markSessionRouteNudgeFired throws', async () => {
      mockMarkSessionRouteNudgeFired.mockImplementation(() => {
        throw new Error('disk full');
      });

      const result = await hook(mockInput, { logger });

      expect(result).toBeNull();
    });

    it('returns null (no throw) when hasSessionRouteNudgeFired throws', async () => {
      mockHasSessionRouteNudgeFired.mockImplementation(() => {
        throw new Error('permission denied');
      });

      const result = await hook(mockInput, { logger });

      expect(result).toBeNull();
    });
  });
});
