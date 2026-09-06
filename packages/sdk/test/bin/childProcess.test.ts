/**
 * Tests for the window-suppressing child-process helpers.
 *
 * Per .claude/rules/tests.md these exercise real behavior — a real child runs
 * and produces output / propagates failure — rather than asserting on the
 * `windowsHide` constant.
 *
 * @summary Tests for execFileNoWindowAsync / execFileSyncNoWindow
 */

import { describe, expect, it } from 'vitest';
import { execFileNoWindowAsync, execFileSyncNoWindow } from '../../src/bin/childProcess.js';

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
