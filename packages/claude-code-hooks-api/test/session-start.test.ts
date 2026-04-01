/**
 * Tests for the SessionStart hook that persists CARD_CLI.
 *
 * Verifies that the hook resolves the card-cli wrapper path and persists
 * it via persistEnvVar, and warns when the wrapper is missing.
 *
 * @summary Tests for CARD_CLI SessionStart hook
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Logger } from '@goodfoot/claude-code-hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:url', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:url')>();
  return {
    ...actual,
    fileURLToPath: vi.fn(actual.fileURLToPath)
  };
});

import { fileURLToPath } from 'node:url';

const mockFileURLToPath = vi.mocked(fileURLToPath);

describe('session-start hook', () => {
  const mockPersistEnvVar = vi.fn();
  const mockPersistEnvVars = vi.fn();
  const mockLogger: Logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  } as unknown as Logger;

  const baseInput = {
    session_id: 'test-session-123',
    transcript_path: '/tmp/transcript.jsonl',
    cwd: '/test/workspace',
    hook_event_name: 'SessionStart' as const,
    source: 'startup' as const
  };

  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `session-start-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    mockPersistEnvVar.mockReset();
    mockPersistEnvVars.mockReset();
    vi.mocked(mockLogger.info).mockReset();
    vi.mocked(mockLogger.warn).mockReset();
  });

  afterEach(() => {
    mockFileURLToPath.mockRestore();
    rmSync(testDir, { recursive: true, force: true });
  });

  it('has correct hookEventName', async () => {
    const hookFn = (await import('../src/session-start.js')).default;
    expect(hookFn.hookEventName).toBe('SessionStart');
  });

  it('persists CARD_CLI when card-cli wrapper exists', async () => {
    // Simulate compiled hook at <testDir>/hooks/bin/hook.mjs
    // card-cli should resolve to <testDir>/bin/card-cli
    const hookBinDir = join(testDir, 'hooks', 'bin');
    mkdirSync(hookBinDir, { recursive: true });
    const binDir = join(testDir, 'bin');
    mkdirSync(binDir, { recursive: true });
    writeFileSync(join(binDir, 'card-cli'), '#!/bin/sh\necho test');

    mockFileURLToPath.mockReturnValue(join(hookBinDir, 'hook.mjs'));

    const hookFn = (await import('../src/session-start.js')).default;
    const result = await hookFn(baseInput, {
      logger: mockLogger,
      persistEnvVar: mockPersistEnvVar,
      persistEnvVars: mockPersistEnvVars
    });

    expect(mockPersistEnvVar).toHaveBeenCalledWith('CARD_CLI', join(binDir, 'card-cli'));
    expect(vi.mocked(mockLogger.info)).toHaveBeenCalledWith('Persisted CARD_CLI', { path: join(binDir, 'card-cli') });
    expect(result.stdout).not.toHaveProperty('systemMessage');
  });

  it('warns and returns systemMessage when card-cli wrapper is missing', async () => {
    // Point to a directory with no card-cli file
    const hookBinDir = join(testDir, 'hooks', 'bin');
    mkdirSync(hookBinDir, { recursive: true });

    mockFileURLToPath.mockReturnValue(join(hookBinDir, 'hook.mjs'));

    const hookFn = (await import('../src/session-start.js')).default;
    const result = await hookFn(baseInput, {
      logger: mockLogger,
      persistEnvVar: mockPersistEnvVar,
      persistEnvVars: mockPersistEnvVars
    });

    expect(mockPersistEnvVar).not.toHaveBeenCalled();
    expect(vi.mocked(mockLogger.warn)).toHaveBeenCalledWith('card-cli wrapper not found', {
      path: join(testDir, 'bin', 'card-cli')
    });
    expect(result.stdout.systemMessage).toContain('card-cli wrapper not found');
  });
});
