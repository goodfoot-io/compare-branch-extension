/**
 * Tests for the SessionStart hook that persists CLI env vars.
 *
 * Verifies that the hook resolves all CLI wrapper paths and persists
 * them via persistEnvVar, and warns when any wrapper is missing.
 *
 * @summary Tests for CLI env var SessionStart hook
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

const WRAPPER_FILES = ['cards-dev-cli'] as const;
const ENV_VARS = ['CARDS_DEV_CLI'] as const;

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
  let hookBinDir: string;
  let binDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `session-start-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    hookBinDir = join(testDir, 'hooks', 'bin');
    binDir = join(testDir, 'bin');
    mkdirSync(hookBinDir, { recursive: true });
    mockPersistEnvVar.mockReset();
    mockPersistEnvVars.mockReset();
    vi.mocked(mockLogger.info).mockReset();
    vi.mocked(mockLogger.warn).mockReset();
  });

  afterEach(() => {
    mockFileURLToPath.mockRestore();
    rmSync(testDir, { recursive: true, force: true });
  });

  /**
   * Creates wrapper files in the test bin directory.
   *
   * @param filenames - Wrapper filenames to create.
   */
  function createWrappers(filenames: readonly string[]): void {
    mkdirSync(binDir, { recursive: true });
    for (const name of filenames) {
      writeFileSync(join(binDir, name), '#!/bin/sh\necho test');
    }
  }

  function runHook() {
    mockFileURLToPath.mockReturnValue(join(hookBinDir, 'hook.mjs'));
    return import('../src/session-start.js').then((m) =>
      m.default(baseInput, {
        logger: mockLogger,
        persistEnvVar: mockPersistEnvVar,
        persistEnvVars: mockPersistEnvVars
      })
    );
  }

  it('has correct hookEventName', async () => {
    const hookFn = (await import('../src/session-start.js')).default;
    expect(hookFn.hookEventName).toBe('SessionStart');
  });

  it('persists all CLI env vars when all wrappers exist', async () => {
    createWrappers(WRAPPER_FILES);
    const result = await runHook();

    for (let i = 0; i < WRAPPER_FILES.length; i++) {
      expect(mockPersistEnvVar).toHaveBeenCalledWith(ENV_VARS[i]!, join(binDir, WRAPPER_FILES[i]!));
    }
    expect(mockPersistEnvVar).toHaveBeenCalledTimes(1);
    expect(result.stdout).not.toHaveProperty('systemMessage');
  });

  it('warns and returns systemMessage when all wrappers are missing', async () => {
    const result = await runHook();

    expect(mockPersistEnvVar).not.toHaveBeenCalled();
    expect(vi.mocked(mockLogger.warn)).toHaveBeenCalledTimes(1);
    expect(result.stdout.systemMessage).toContain('cards-dev-cli');
  });
});
