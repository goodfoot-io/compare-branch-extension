import type { ChildProcess } from 'node:child_process';
import type { CardsAssistantContext, CardsAssistantInput } from '@cards.management/sdk/config';
import { Logger } from '@cards.management/sdk/config';
import { flushMicrotasks } from '@cards.management/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Exercises the default cards-assistant handler through focused scenarios.
 *
 * The cases lock in the cross-platform `claude` launch: routing through
 * cross-spawn (no `shell` option) so the win32 `claude.cmd` PATHEXT shim resolves
 * and its arguments are escaped for cmd.exe, the multi-line `--append-system-prompt`
 * surviving intact (cross-spawn escapes embedded newlines — no collapsing needed),
 * the inline marketplace settings, inherited stdio, the fail-closed spawn-error
 * path, and the registration-before-spawn ordering. They guard against the win32
 * regression where a `shell: true` spawn concatenated argv unquoted and cmd.exe
 * mangled the `--settings '{…JSON…}'` argument. The codex branch is covered for
 * the same cross-spawn routing and fail-closed spawn-`error` guard as claude.
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
  spawn: vi.fn(),
  // @cards.management/sdk's index runs `promisify(execFile)` at module load, and execFileSync
  // is used by the worktree primitives, so both must exist on the mock for the
  // module graph to import even though these tests only assert on spawn.
  execFile: vi.fn(),
  execFileSync: vi.fn()
}));

vi.mock('../src/lib/claude-session.js', () => ({
  updateMarketplaceRegistration: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../src/lib/codex-session.js', () => ({
  CODEX_ASSISTANT_PLUGIN_NAMES: ['cards', 'cards-assistant'],
  formatDeveloperInstructionsOverride: vi.fn((value: string) => `developer_instructions=${value}`),
  populateCodexPluginCache: vi.fn().mockResolvedValue({ pluginCachePaths: [] }),
  resolveDefaultCodexHome: vi.fn(() => '/test/codex-home'),
  writeCodexProfileConfig: vi.fn().mockResolvedValue('/test/codex-home/config.toml')
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
  it.each<NodeJS.Platform>([
    'win32',
    'linux',
    'darwin'
  ])('spawns claude through cross-spawn with no shell option on %s', async (platform) => {
    forcePlatform(platform);
    const { spawn } = await import('node:child_process');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const handler = (await import('../src/cards-assistant.js')).default;
    const promise = handler(baseInput(), createMockContext());
    await flushMicrotasks();

    expect(vi.mocked(spawn).mock.calls[0][0]).toBe('claude');
    // cross-spawn owns win32 shim resolution + argv escaping; the caller must NOT
    // set `shell` (a `shell: true` spawn is what mangled the JSON --settings arg).
    const opts = vi.mocked(spawn).mock.calls[0][2] as { shell?: boolean };
    expect(opts.shell).toBeUndefined();

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

  it('passes the multi-line interview system prompt intact (cross-spawn escapes it)', async () => {
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
    expect(prompt).toContain('Load the `cards:cards` skill');
    // cross-spawn escapes embedded newlines for cmd.exe, so the prompt is passed
    // verbatim — the previous single-line collapse (a shell:true workaround) is
    // gone. The multi-line structure must survive to reach the agent unchanged.
    expect(prompt).toContain('\n');
    expect(prompt.trimStart().startsWith('<instructions>')).toBe(true);

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

  it('pushes initialPrompt as the leading CLI arg ahead of --append-system-prompt', async () => {
    const { spawn } = await import('node:child_process');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const input = baseInput({ initialPrompt: 'explain this error' });
    const handler = (await import('../src/cards-assistant.js')).default;
    const promise = handler(input, createMockContext());
    await flushMicrotasks();

    const args = vi.mocked(spawn).mock.calls[0][1] as string[];
    expect(args[0]).toBe('explain this error');
    expect(args.indexOf('--append-system-prompt')).toBe(1);

    child.emit('close', 0);
    await promise;
  });

  it('omits the leading positional arg when initialPrompt is absent', async () => {
    const { spawn } = await import('node:child_process');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const handler = (await import('../src/cards-assistant.js')).default;
    const promise = handler(baseInput(), createMockContext());
    await flushMicrotasks();

    const args = vi.mocked(spawn).mock.calls[0][1] as string[];
    expect(args[0]).toBe('--append-system-prompt');

    child.emit('close', 0);
    await promise;
  });

  it('omits the leading positional arg when initialPrompt is an empty string', async () => {
    const { spawn } = await import('node:child_process');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const handler = (await import('../src/cards-assistant.js')).default;
    const promise = handler(baseInput({ initialPrompt: '' }), createMockContext());
    await flushMicrotasks();

    const args = vi.mocked(spawn).mock.calls[0][1] as string[];
    expect(args[0]).toBe('--append-system-prompt');

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

  it('routes the codex branch through cross-spawn and fails closed on a spawn error', async () => {
    forcePlatform('win32');
    const { spawn } = await import('node:child_process');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const context = createMockContext();
    const errorSpy = vi.spyOn(context.logger, 'error');

    const handler = (await import('../src/cards-assistant.js')).default;
    let resolved = false;
    const promise = handler(baseInput({ codingAgent: 'codex-cli' }), context).then(() => {
      resolved = true;
    });
    await flushMicrotasks();

    // The codex branch was taken (not claude) and routed through cross-spawn with
    // no `shell` option, mirroring the claude launch.
    expect(vi.mocked(spawn).mock.calls[0][0]).toBe('codex');
    const opts = vi.mocked(spawn).mock.calls[0][2] as { shell?: boolean };
    expect(opts.shell).toBeUndefined();
    expect(resolved).toBe(false);

    // A `codex`/`codex.cmd` shim that cannot spawn emits `error`, never `close`.
    // Without the codex-branch guard this promise would hang forever.
    const enoent = Object.assign(new Error('spawn codex ENOENT'), { code: 'ENOENT' });
    child.emit('error', enoent);

    await promise;
    expect(resolved).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith('Failed to spawn codex', { error: 'spawn codex ENOENT' });
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
