import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir as realTmpdir } from 'node:os';
import { join } from 'node:path';
import type { Logger } from '@goodfoot/claude-code-hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Exercises stop behavior in the test area through focused scenarios.
 * The cases lock in edge handling and regression coverage so refactors preserve expected state
 * transitions and output.
 *
 * @summary Tests stop behavior in test
 */

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return {
    ...actual,
    homedir: vi.fn(() => process.env['MOCK_HOMEDIR'] || '/tmp')
  };
});

vi.mock('@cards/sessions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cards/sessions')>();
  return {
    ...actual,
    findAgentPid: vi.fn()
  };
});

import { findAgentPid } from '@cards/sessions';
import hookFn from '../src/stop.js';

describe('cards stop hook', () => {
  const originalEnv = process.env;
  const mockFindAgentPid = vi.mocked(findAgentPid);
  const mockLogger = {
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  };

  // Use the current process PID so claude-sessions doesn't prune entries as dead
  const testPid = process.pid;

  let testDir: string;

  const baseInput = {
    transcript_path: '/tmp/transcript.jsonl',
    cwd: '/test/workspace',
    hook_event_name: 'Stop' as const,
    stop_hook_active: true
  };

  beforeEach(() => {
    process.env = { ...originalEnv };
    testDir = join(realTmpdir(), `stop-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    process.env['MOCK_HOMEDIR'] = testDir;
    mockFindAgentPid.mockReset();
    mockLogger.debug.mockReset();
    mockLogger.warn.mockReset();
    mockLogger.info.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(testDir, { recursive: true, force: true });
  });

  /**
   * Write a session registry file with the given PID entry.
   *
   * @param pid - Process ID used as the session key.
   * @param entry - Session entry payload stored for the PID.
   * @param entry.cardId - Optional associated card identifier.
   * @param entry.pendingCommits - Pending commit SHAs tied to the session.
   * @param entry.updatedAt - ISO timestamp for the last session update.
   * @returns Nothing.
   */
  function writeRegistry(pid: number, entry: { cardId?: string; pendingCommits: string[]; updatedAt: string }): void {
    const cardsDir = join(testDir, '.cards');
    mkdirSync(cardsDir, { recursive: true });
    const registry = { sessions: { [String(pid)]: entry } };
    writeFileSync(join(cardsDir, 'sessions.json'), JSON.stringify(registry, null, 2));
  }

  /**
   * Read the registry file and return parsed content.
   *
   * @returns Parsed registry data, or an empty sessions map when unreadable.
   */
  function readRegistry(): { sessions: Record<string, unknown> } {
    try {
      return JSON.parse(readFileSync(join(testDir, '.cards', 'sessions.json'), 'utf-8'));
    } catch {
      return { sessions: {} };
    }
  }

  it('has correct hookEventName', () => {
    expect(hookFn.hookEventName).toBe('Stop');
  });

  it('approves when CARD_ID is set', async () => {
    process.env['CARD_ID'] = 'card-123';
    const result = await hookFn(
      { ...baseInput, session_id: 'test-session' },
      { logger: mockLogger as unknown as Logger }
    );
    expect(result.stdout.decision).toBe('approve');
    expect(mockFindAgentPid).not.toHaveBeenCalled();
  });

  it('calls findAgentPid and removes registry entry when CARD_ID not set', async () => {
    process.env['CARD_ID'] = undefined;
    mockFindAgentPid.mockReturnValue(testPid);

    // Pre-populate registry with an entry for our PID
    writeRegistry(testPid, { cardId: 'card-456', pendingCommits: [], updatedAt: new Date().toISOString() });

    const result = await hookFn(
      { ...baseInput, session_id: 'test-session' },
      { logger: mockLogger as unknown as Logger }
    );
    expect(result.stdout.decision).toBe('approve');
    expect(mockFindAgentPid).toHaveBeenCalled();

    // Verify the entry was actually removed from the real registry
    const registry = readRegistry();
    expect(registry.sessions[String(testPid)]).toBeUndefined();
  });

  it('approves when findAgentPid returns null', async () => {
    process.env['CARD_ID'] = undefined;
    mockFindAgentPid.mockReturnValue(null);

    const result = await hookFn(
      { ...baseInput, session_id: 'test-session' },
      { logger: mockLogger as unknown as Logger }
    );
    expect(result.stdout.decision).toBe('approve');
  });

  it('approves even when removePidEntry encounters corrupt registry', async () => {
    process.env['CARD_ID'] = undefined;
    mockFindAgentPid.mockReturnValue(testPid);

    // Write corrupt registry file
    const cardsDir = join(testDir, '.cards');
    mkdirSync(cardsDir, { recursive: true });
    writeFileSync(join(cardsDir, 'sessions.json'), 'not valid json');

    const result = await hookFn(
      { ...baseInput, session_id: 'test-session' },
      { logger: mockLogger as unknown as Logger }
    );
    expect(result.stdout.decision).toBe('approve');
  });

  it('always returns decision approve', async () => {
    process.env['CARD_ID'] = undefined;
    mockFindAgentPid.mockImplementation(() => {
      throw new Error('Process error');
    });

    const result = await hookFn(
      { ...baseInput, session_id: 'test-session' },
      { logger: mockLogger as unknown as Logger }
    );
    expect(result.stdout.decision).toBe('approve');
  });
});
