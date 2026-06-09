import type { ChildProcess } from 'node:child_process';
import type { CardsAssistantContext, CardsAssistantInput } from '@cards/sdk/config';
import { Logger } from '@cards/sdk/config';
import { flushMicrotasks } from '@cards/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Exercises the default cards-assistant handler through focused scenarios.
 *
 * The cases lock in the cross-platform `claude` launch: the Windows shell shim
 * (so the `claude.cmd`/`claude.ps1` PATH shim resolves), the POSIX exec-direct
 * behavior, the cmd-quotable single-line system prompt, the inline marketplace
 * settings, the fail-closed spawn-error path, and the registration-before-spawn
 * ordering. They guard against regressions that would silently break the
 * feature on Windows.
 *
 * @summary Tests default cards-assistant handler behavior
 */

vi.mock('cross-spawn', async () => {
  // spawnAgentCli routes the agent launch through cross-spawn; forward it to the
  // mocked node:child_process.spawn so existing spawn('claude'/'codex', ...)
  // assertions hold on every platform (cross-spawn would otherwise rewrite the
  // call into a cmd.exe invocation on win32 and bypass the node:child_process mock).
  const cp = await import('node:child_process');
  return { default: cp.spawn };
});
vi.mock('node:child_process', () => ({
  spawn: vi.fn()
}));

vi.mock('../src/lib/claude-session.js', () => ({
  updateMarketplaceRegistration: vi.fn().mockResolvedValue(undefined)
}));

const ORIGINAL_PLATFORM = process.platform;

/**
 * Forces `process.platform` for the duration of a test so the win32 / POSIX
 * branch of the handler's spawn is exercised. Restored in `afterEach`.
 *
 * @param platform - Platform value to install on process.platform.
 */
function forcePlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { value: platform, configurable: true });
}

/**
 * Builds a fake ChildProcess that records `on(...)` handlers and lets a test
 * drive the `close` / `error` events deterministically.
 *
 * @param overrides - Partial overrides merged onto the fake child.
 * @returns A ChildProcess-shaped mock.
 */
function createMockChild(overrides?: Partial<ChildProcess>): ChildProcess {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  return {
    pid: 12345,
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      handlers.set(event, cb);
    }),
    kill: vi.fn(),
    stdout: null,
    stderr: null,
    /**
     * Emits a registered child-process event for test control flow.
     *
     * @param event Event name to emit.
     * @param args Event payload arguments.
     * @returns True to match EventEmitter-style emit behavior.
     */
    emit(event: string, ...args: unknown[]) {
      handlers.get(event)?.(...args);
      return true;
    },
    ...overrides
  } as unknown as ChildProcess;
}

function createMockContext(): CardsAssistantContext {
  return {
    logger: new Logger(),
    cwd: '/test/workspace'
  };
}

function baseInput(overrides?: Partial<CardsAssistantInput>): CardsAssistantInput {
  return {
    marketplacePath: '/test/extension/dist/marketplace',
    extensionPath: '/test/extension',
    repoRoot: '/test/workspace',
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  Object.defineProperty(process, 'platform', { value: ORIGINAL_PLATFORM, configurable: true });
});

describe('cards-assistant handler', () => {
  it('spawns claude with shell:true on win32 so the .cmd/.ps1 PATH shim resolves', async () => {
    forcePlatform('win32');
    const { spawn } = await import('node:child_process');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const handler = (await import('../src/cards-assistant.js')).default;
    const promise = handler(baseInput(), createMockContext());
    await flushMicrotasks();

    expect(vi.mocked(spawn).mock.calls[0][0]).toBe('claude');
    const opts = vi.mocked(spawn).mock.calls[0][2] as { shell?: boolean };
    expect(opts.shell).toBe(true);

    child.emit('close', 0);
    await promise;
  });

  it.each<NodeJS.Platform>([
    'linux',
    'darwin'
  ])('spawns claude without a shell on %s so POSIX exec-direct is unchanged', async (platform) => {
    forcePlatform(platform);
    const { spawn } = await import('node:child_process');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const handler = (await import('../src/cards-assistant.js')).default;
    const promise = handler(baseInput(), createMockContext());
    await flushMicrotasks();

    const opts = vi.mocked(spawn).mock.calls[0][2] as { shell?: boolean };
    expect(opts.shell).toBe(false);

    child.emit('close', 0);
    await promise;
  });

  it.each<NodeJS.Platform>(['win32', 'linux'])('preserves cwd and inherited stdio on %s', async (platform) => {
    forcePlatform(platform);
    const { spawn } = await import('node:child_process');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const handler = (await import('../src/cards-assistant.js')).default;
    const promise = handler(baseInput({ repoRoot: '/custom/repo' }), createMockContext());
    await flushMicrotasks();

    const opts = vi.mocked(spawn).mock.calls[0][2] as { cwd?: string; stdio?: unknown };
    expect(opts.cwd).toBe('/custom/repo');
    expect(opts.stdio).toBe('inherit');

    child.emit('close', 0);
    await promise;
  });

  it('passes a single-line, cmd-quotable system prompt (no embedded newlines)', async () => {
    forcePlatform('win32');
    const { spawn } = await import('node:child_process');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const handler = (await import('../src/cards-assistant.js')).default;
    const promise = handler(baseInput(), createMockContext());
    await flushMicrotasks();

    const args = vi.mocked(spawn).mock.calls[0][1] as string[];
    const promptIdx = args.indexOf('--append-system-prompt');
    expect(promptIdx).toBeGreaterThan(-1);

    const prompt = args[promptIdx + 1];
    expect(prompt).toContain('Load the `cards:management` skill');
    // Regression guard: cmd.exe (shell:true) cannot safely carry a single
    // argument with embedded newlines, so the prompt must stay on one line.
    expect(prompt).not.toContain('\n');

    child.emit('close', 0);
    await promise;
  });

  it('passes inline marketplace plugin settings for the extension bundle', async () => {
    const { spawn } = await import('node:child_process');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const input = baseInput({ marketplacePath: '/global/storage/marketplace' });
    const handler = (await import('../src/cards-assistant.js')).default;
    const promise = handler(input, createMockContext());
    await flushMicrotasks();

    const args = vi.mocked(spawn).mock.calls[0][1] as string[];
    const settingsIdx = args.indexOf('--settings');
    expect(settingsIdx).toBeGreaterThan(-1);

    const settings = JSON.parse(args[settingsIdx + 1]) as {
      enabledPlugins: Record<string, boolean>;
      extraKnownMarketplaces: Record<string, { source: { source: string; path: string } }>;
    };
    expect(settings.enabledPlugins['cards@cards.management']).toBe(true);
    expect(settings.extraKnownMarketplaces['cards.management'].source.path).toBe('/global/storage/marketplace');

    child.emit('close', 0);
    await promise;
  });

  it('fails closed when spawn errors: logs and settles without hanging', async () => {
    forcePlatform('win32');
    const { spawn } = await import('node:child_process');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const context = createMockContext();
    const errorSpy = vi.spyOn(context.logger, 'error');

    const handler = (await import('../src/cards-assistant.js')).default;
    let resolved = false;
    const promise = handler(baseInput(), context).then(() => {
      resolved = true;
    });
    await flushMicrotasks();

    expect(resolved).toBe(false);

    const enoent = Object.assign(new Error('spawn claude ENOENT'), { code: 'ENOENT' });
    child.emit('error', enoent);

    await promise;
    expect(resolved).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith('Failed to spawn claude', { error: 'spawn claude ENOENT' });
  });

  it('updates marketplace registration before spawning claude', async () => {
    const { spawn } = await import('node:child_process');
    const { updateMarketplaceRegistration } = await import('../src/lib/claude-session.js');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const input = baseInput();
    const context = createMockContext();
    const handler = (await import('../src/cards-assistant.js')).default;
    const promise = handler(input, context);
    await flushMicrotasks();

    expect(updateMarketplaceRegistration).toHaveBeenCalledWith(input.marketplacePath, context.logger);

    const registrationOrder = vi.mocked(updateMarketplaceRegistration).mock.invocationCallOrder[0];
    const spawnOrder = vi.mocked(spawn).mock.invocationCallOrder[0];
    expect(registrationOrder).toBeLessThan(spawnOrder);

    child.emit('close', 0);
    await promise;
  });
});
