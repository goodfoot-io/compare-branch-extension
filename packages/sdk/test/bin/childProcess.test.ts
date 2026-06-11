/**
 * Tests for the window-suppressing child-process helpers.
 *
 * Per .claude/rules/tests.md these exercise real behavior — a real child runs
 * and produces output / propagates failure — rather than asserting on the
 * `windowsHide` constant. The option-actually-reaches-the-call invariant is
 * proven for `spawnNoWindow` via a `spawn` spy.
 *
 * `node:child_process` is mocked with `importOriginal`: `execFile` /
 * `execFileSync` are left as the REAL implementations (so the child runs for
 * real AND `util.promisify(execFile)` inside the helper keeps its custom
 * promisified form), while only `spawn` is wrapped in a spy delegating to the
 * real impl so its forwarded options can be asserted.
 *
 * @summary Tests for execFileNoWindowAsync / execFileSyncNoWindow / spawnNoWindow
 */

import { describe, expect, it, vi } from 'vitest';

const spawnSpy = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  spawnSpy.mockImplementation(actual.spawn);
  return { ...actual, spawn: spawnSpy };
});

const { execFileNoWindowAsync, execFileSyncNoWindow, spawnNoWindow } = await import('../../src/bin/childProcess.js');

// `process.execPath` is the running Node, available on every platform.
const NODE = process.execPath;

describe('execFileNoWindowAsync', () => {
  it('runs the child and returns its stdout as a string', async () => {
    // Real behavior: the child ran and we captured a string (callers .trim() it).
    const { stdout } = await execFileNoWindowAsync(NODE, ['-e', 'process.stdout.write("hello-async")']);
    expect(stdout.trim()).toBe('hello-async');
  });

  it('preserves caller options alongside the forced windowsHide (timeout is honored)', async () => {
    // A real timeout aborts a long-sleeping child — proving the caller's options
    // are merged through, not dropped, when windowsHide is forced on.
    await expect(
      execFileNoWindowAsync(NODE, ['-e', 'setTimeout(() => {}, 60000)'], { timeout: 200 })
    ).rejects.toMatchObject({ killed: true });
  });

  it('rejects when the child exits non-zero (error path is preserved)', async () => {
    await expect(execFileNoWindowAsync(NODE, ['-e', 'process.exit(3)'])).rejects.toMatchObject({ code: 3 });
  });
});

describe('execFileSyncNoWindow', () => {
  it('runs the child synchronously and returns a string with a string encoding', () => {
    const out = execFileSyncNoWindow(NODE, ['-e', 'process.stdout.write("hello-sync")'], { encoding: 'utf-8' });
    expect(out.trim()).toBe('hello-sync');
  });

  it('throws when the child exits non-zero', () => {
    expect(() => execFileSyncNoWindow(NODE, ['-e', 'process.exit(2)'], { encoding: 'utf-8' })).toThrow();
  });
});

describe('spawnNoWindow', () => {
  it('spawns a child that actually runs to completion', async () => {
    const child = spawnNoWindow(NODE, ['-e', 'process.exit(0)'], { stdio: 'ignore' });
    const code = await new Promise<number | null>((resolve, reject) => {
      child.on('close', resolve);
      child.on('error', reject);
    });
    expect(code).toBe(0);
  });

  it('forwards windowsHide:true to child_process.spawn while preserving caller options', () => {
    spawnSpy.mockClear();
    const child = spawnNoWindow(NODE, ['-e', '0'], { stdio: 'ignore', detached: true });
    child.unref();
    const optionsArg = spawnSpy.mock.calls.at(-1)?.[2] as { windowsHide?: boolean; detached?: boolean; stdio?: string };
    expect(optionsArg.windowsHide).toBe(true);
    expect(optionsArg.detached).toBe(true);
    expect(optionsArg.stdio).toBe('ignore');
  });
});
