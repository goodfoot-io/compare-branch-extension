/**
 * Tests for runtime execution module.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock process.exit before importing runtime
const mockExit = vi.fn();
vi.spyOn(process, 'exit').mockImplementation(mockExit as unknown as typeof process.exit);

// Mock stderr.write
const mockStderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

import { startCardHook } from '../src/hooks.js';
import { execute } from '../src/runtime.js';

describe('execute', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('executes hook with environment variables', async () => {
    // Set required environment variables
    process.env.CARD_ID = 'test-card';
    process.env.EXECUTION_WRAPPER_PID = '12345';
    process.env.HOOK_IPC_SOCKET = '/tmp/socket.sock';

    const handler = vi.fn();
    const hook = startCardHook({}, handler);

    await execute(hook);

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        cardId: 'test-card',
        executionWrapperPid: 12345,
        hookIpcSocket: '/tmp/socket.sock'
      }),
      expect.objectContaining({
        logger: expect.anything()
      })
    );
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('exits with error when required env vars are missing', async () => {
    // Don't set CARD_ID
    process.env.EXECUTION_WRAPPER_PID = '12345';
    process.env.HOOK_IPC_SOCKET = '/tmp/socket.sock';

    const hook = startCardHook({}, () => {});

    await execute(hook);

    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockStderrWrite).toHaveBeenCalled();
  });

  it('exits with error when handler throws', async () => {
    process.env.CARD_ID = 'test-card';
    process.env.EXECUTION_WRAPPER_PID = '12345';
    process.env.HOOK_IPC_SOCKET = '/tmp/socket.sock';

    const error = new Error('Handler failed');
    const hook = startCardHook({}, () => {
      throw error;
    });

    await execute(hook);

    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockStderrWrite).toHaveBeenCalledWith(expect.stringContaining('Handler failed'));
  });

  it('configures logger from CLI log file env var', async () => {
    process.env.CARD_ID = 'test-card';
    process.env.EXECUTION_WRAPPER_PID = '12345';
    process.env.HOOK_IPC_SOCKET = '/tmp/socket.sock';
    process.env.COMPARE_BRANCH_HOOKS_CLI_LOG_FILE = '/tmp/test.log';

    const hook = startCardHook({}, () => {});

    await execute(hook);

    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('exits with error when CLI and env log files conflict', async () => {
    process.env.CARD_ID = 'test-card';
    process.env.EXECUTION_WRAPPER_PID = '12345';
    process.env.HOOK_IPC_SOCKET = '/tmp/socket.sock';
    process.env.COMPARE_BRANCH_HOOKS_CLI_LOG_FILE = '/tmp/cli.log';
    process.env.COMPARE_BRANCH_HOOKS_LOG_FILE = '/tmp/env.log';

    const hook = startCardHook({}, () => {});

    await execute(hook);

    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockStderrWrite).toHaveBeenCalledWith(expect.stringContaining('conflict'));
  });

  it('allows matching CLI and env log files', async () => {
    process.env.CARD_ID = 'test-card';
    process.env.EXECUTION_WRAPPER_PID = '12345';
    process.env.HOOK_IPC_SOCKET = '/tmp/socket.sock';
    process.env.COMPARE_BRANCH_HOOKS_CLI_LOG_FILE = '/tmp/same.log';
    process.env.COMPARE_BRANCH_HOOKS_LOG_FILE = '/tmp/same.log';

    const hook = startCardHook({}, () => {});

    await execute(hook);

    expect(mockExit).toHaveBeenCalledWith(0);
  });
});
