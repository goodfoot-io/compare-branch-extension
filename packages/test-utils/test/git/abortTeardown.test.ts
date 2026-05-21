/**
 * Regression test: teardown's guarded `abort()` must never let the abort plugin's
 * task-promise rejection escape as a process-fatal unhandled rejection.
 *
 * Why: replacing `clearQueue()` with `AbortController.abort()` introduced a path
 * where aborting a still-spawned git child rejects the in-flight task promise.
 * When that promise was abandoned (a timed-out test) or fire-and-forget, the
 * rejection has no handler and — in the default Node `unhandledRejection` mode
 * used by the extension test host — terminates the whole process. This test
 * proves the helper's teardown contains that rejection.
 *
 * Mechanism: the scenario is exercised in a child Node process (default
 * unhandled-rejections mode) because the fatal consequence is only observable as
 * a non-zero process exit; every in-process listener fires regardless of the fix.
 *
 * @summary Teardown abort must not surface a fatal unhandled rejection
 * @module test-utils/test/git/abortTeardown
 */
import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const childScript = path.join(path.dirname(fileURLToPath(import.meta.url)), 'abortUnhandledRejectionChild.ts');

/**
 * Runs the child harness and resolves with its exit code and captured stderr.
 *
 * @returns The child process exit code (null if killed by signal) and stderr.
 */
function runChild(): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolve, reject) => {
    // Run the harness in a real Node process under the default
    // unhandledRejection mode (the mode the extension test host uses), where an
    // escaped abort rejection terminates the process with a non-zero exit. tsx
    // provides TypeScript + workspace-export (`.js` -> `.ts`) resolution.
    const child = spawn(process.execPath, ['--import', 'tsx', childScript], {
      stdio: ['ignore', 'inherit', 'pipe'],
      cwd: path.dirname(childScript)
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stderr }));
  });
}

describe('TestCardRepository teardown abort', () => {
  it('does not surface an unhandled rejection when aborting an in-flight git operation', async () => {
    const { code, stderr } = await runChild();

    expect(stderr).not.toMatch(/GitPluginError/);
    expect(code).toBe(0);
  }, 20000);
});
