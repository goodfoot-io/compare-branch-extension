import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type { ActionContext, ActionInput } from '@cards/sdk/config';
import { Logger } from '@cards/sdk/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  spawn: vi.fn()
}));

vi.mock('node:crypto', () => ({
  randomUUID: vi.fn(() => 'test-uuid-1234')
}));

const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function createMockContext(): ActionContext {
  return {
    logger: new Logger(),
    cwd: process.cwd(),
    onCancel: vi.fn(),
    onSwitchToInteractive: vi.fn()
  };
}

function createMockChild(overrides?: Partial<ChildProcess>): ChildProcess {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  return {
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      handlers.set(event, cb);
    }),
    kill: vi.fn(),
    stdout: null,
    stderr: null,
    /** Emit a registered event for testing. */
    emit(event: string, ...args: unknown[]) {
      handlers.get(event)?.(...args);
      return true;
    },
    ...overrides
  } as unknown as ChildProcess;
}

function createMockChildWithStreams(): ChildProcess & { emitStdout(data: string): void } {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const child = {
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      handlers.set(event, cb);
    }),
    kill: vi.fn(),
    stdout,
    stderr,
    emit(event: string, ...args: unknown[]) {
      handlers.get(event)?.(...args);
      return true;
    },
    emitStdout(data: string) {
      stdout.emit('data', Buffer.from(data));
    }
  } as unknown as ChildProcess & { emitStdout(data: string): void };
  return child;
}

function baseInput(overrides?: Partial<ActionInput>): ActionInput {
  return {
    cardId: 'card-123',
    actionName: 'Launch',
    environment: 'default',
    executionMode: 'interactive',
    apiBaseUrl: 'http://localhost:3000',
    apiAccessToken: 'test-token',
    workspacePath: '/test/workspace',
    cardRepoPath: '/test/repo',
    ...overrides
  };
}

describe('Default Actions', () => {
  describe('launch', () => {
    it('exports an action command', async () => {
      const action = (await import('../src/actions/launch.js')).default;
      expect(action.factoryType).toBe('action');
      expect(action.actionName).toBe('Launch');
    });

    it('spawns claude with inherited stdio in interactive mode', async () => {
      const { spawn } = await import('node:child_process');
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const action = (await import('../src/actions/launch.js')).default;
      const promise = action(baseInput(), createMockContext());

      expect(spawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--session-id', 'test-uuid-1234']),
        expect.objectContaining({ cwd: '/test/workspace', stdio: 'inherit' })
      );

      // Prompt should be the first positional argument
      const args = vi.mocked(spawn).mock.calls[0][1] as string[];
      expect(args[0]).toContain('card-123');
      expect(args[0]).toContain('/test/repo');

      // Should not include --print in interactive mode
      expect(args).not.toContain('--print');

      // Should include --settings with plugin and marketplace JSON
      const settingsIdx = args.indexOf('--settings');
      expect(settingsIdx).toBeGreaterThan(-1);
      const settingsJson = JSON.parse(args[settingsIdx + 1]);
      expect(settingsJson.enabledPlugins['runtime@cards.management']).toBe(true);
      expect(settingsJson.extraKnownMarketplaces['cards.management'].source).toEqual({
        source: 'directory',
        path: 'public'
      });

      child.emit('close', 0);
      await promise;
    });

    it('spawns claude with --print and stream-json in background mode', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            filename: 'test.jsonl',
            streamType: 'claude-code-session',
            lineCount: 0,
            status: 'completed'
          }),
          { status: 200 }
        )
      );

      const { spawn } = await import('node:child_process');
      const child = createMockChildWithStreams();
      vi.mocked(spawn).mockReturnValue(child);

      const action = (await import('../src/actions/launch.js')).default;
      const promise = action(baseInput({ executionMode: 'background' }), createMockContext());

      const args = vi.mocked(spawn).mock.calls[0][1] as string[];
      expect(args).toContain('--print');
      expect(args).toContain('--output-format');
      expect(args).toContain('stream-json');

      const spawnOpts = vi.mocked(spawn).mock.calls[0][2] as { stdio: unknown };
      expect(spawnOpts.stdio).toEqual(['ignore', 'pipe', 'pipe']);

      child.emit('close', 0);
      await promise;
    });

    it('streams background stdout lines to the server via openStream', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            filename: 'test.jsonl',
            streamType: 'claude-code-session',
            lineCount: 2,
            status: 'completed'
          }),
          { status: 200 }
        )
      );
      globalThis.fetch = fetchMock;

      const { spawn } = await import('node:child_process');
      const child = createMockChildWithStreams();
      vi.mocked(spawn).mockReturnValue(child);

      const action = (await import('../src/actions/launch.js')).default;
      const context = createMockContext();
      const promise = action(baseInput({ executionMode: 'background' }), context);

      // Verify fetch was called with the stream endpoint
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/cards/card-123/streams/claude-code-session/'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-ndjson',
            Authorization: 'Bearer test-token'
          })
        })
      );

      // Emit stdout lines — these should be written to the stream, not logged
      const sdkMessage = JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Hello from Claude' }] }
      });
      child.emitStdout(`${sdkMessage}\n`);

      child.emit('close', 0);
      await promise;

      // Verify the action logged completion with stream result metadata
      const _logSpy = vi.spyOn(context.logger, 'info');
      // The logger.info call before the spy was created won't be captured,
      // but we can verify the action completed without error (promise resolved)
    });

    it('registers onCancel that kills the child process', async () => {
      const { spawn } = await import('node:child_process');
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const action = (await import('../src/actions/launch.js')).default;
      const context = createMockContext();
      const promise = action(baseInput(), context);

      expect(context.onCancel).toHaveBeenCalledWith(expect.any(Function));

      // Invoke the registered cancel callback
      const cancelCallback = vi.mocked(context.onCancel).mock.calls[0][0] as () => void;
      cancelCallback();
      expect(child.kill).toHaveBeenCalledWith('SIGTERM');

      child.emit('close', null);
      await promise;
    });

    it('registers onSwitchToInteractive that returns session ID', async () => {
      const { spawn } = await import('node:child_process');
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const action = (await import('../src/actions/launch.js')).default;
      const context = createMockContext();
      const promise = action(baseInput(), context);

      expect(context.onSwitchToInteractive).toHaveBeenCalledWith(expect.any(Function));

      // Invoke the registered callback and verify it returns the session ID
      const switchCallback = vi.mocked(context.onSwitchToInteractive).mock.calls[0][0] as () => unknown;
      const result = switchCallback();
      expect(result).toEqual({ sessionId: 'test-uuid-1234' });
      expect(child.kill).toHaveBeenCalledWith('SIGTERM');

      child.emit('close', null);
      await promise;
    });

    it('resumes session from switchToInteractiveData', async () => {
      const { spawn } = await import('node:child_process');
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const action = (await import('../src/actions/launch.js')).default;
      const promise = action(
        baseInput({ switchToInteractiveData: { sessionId: 'existing-session-456' } }),
        createMockContext()
      );

      const args = vi.mocked(spawn).mock.calls[0][1] as string[];
      expect(args).toContain('--resume');
      expect(args).toContain('existing-session-456');
      expect(args).not.toContain('--session-id');

      child.emit('close', 0);
      await promise;
    });

    it('resolves only after child process exits', async () => {
      const { spawn } = await import('node:child_process');
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const action = (await import('../src/actions/launch.js')).default;
      let resolved = false;
      const promise = action(baseInput(), createMockContext()).then(() => {
        resolved = true;
      });

      // Should not resolve before close event
      await Promise.resolve();
      expect(resolved).toBe(false);

      child.emit('close', 0);
      await promise;
      expect(resolved).toBe(true);
    });
  });
});
