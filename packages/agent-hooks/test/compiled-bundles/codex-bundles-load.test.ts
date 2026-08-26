/**
 * Integration coverage for the compiled Codex hook bundles.
 *
 * The vitest suites elsewhere in this package exercise hook handler functions
 * directly, which can never catch a whole class of failures: defects that live
 * in the compiled `.mjs` artifacts produced by `scripts/build.mjs`. This suite
 * runs the real build end-to-end and executes every emitted Codex bundle as a
 * subprocess, asserting each one loads and runs cleanly under Node.
 *
 * Motivating bug (card main-613): `@goodfoot/codex-hooks` compiles ESM bundles
 * without a `require` bridge, so any bundled CommonJS dependency that
 * `require()`s a Node builtin (e.g. `mime-types` requiring `path`) crashed the
 * hook at module load — before reading stdin or initializing logging — with
 * `Error: Dynamic require of "path" is not supported`.
 *
 * @summary Compiled Codex hook bundles must load and run cleanly
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const packageRoot = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const buildScript = join(packageRoot, 'scripts', 'build.mjs');

/** Every directory the build emits compiled Codex hook bundles into. */
const CODEX_HOOK_OUTPUT_DIRS = [
  '../../codex/cards/hooks',
  '../../codex/cards-assistant/hooks',
  '../../codex/runtime/hooks'
].map((rel) => resolve(packageRoot, rel));

const tempHomes: string[] = [];

/**
 * Isolated environment for spawned bundles: no Cards action variables (the
 * handlers take their no-action early paths) and a disposable HOME, so a hook
 * can never touch real card state. Hook logging goes to the null device.
 *
 * @returns A minimal environment safe for spawning any compiled hook bundle.
 */
function isolatedHookEnvironment(): Record<string, string> {
  const home = mkdtempSync(join(tmpdir(), 'cards-hook-bundle-'));
  tempHomes.push(home);
  return { HOME: home, CODEX_HOOKS_LOG_FILE: '/dev/null' };
}

describe('compiled Codex hook bundles', () => {
  beforeAll(() => {
    const result = spawnSync(process.execPath, [buildScript], {
      cwd: packageRoot,
      encoding: 'utf8',
      timeout: 120_000
    });
    if (result.status !== 0) {
      throw new Error(`build failed with exit code ${result.status}:\n${result.stderr}`);
    }
  }, 150_000);

  afterAll(() => {
    for (const home of tempHomes) {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('every emitted bundle loads without a dynamic require failure', () => {
    const bundles = CODEX_HOOK_OUTPUT_DIRS.flatMap((dir) =>
      readdirSync(dir)
        .filter((name) => name.endsWith('.mjs'))
        .map((name) => join(dir, name))
    );
    expect(bundles.length).toBeGreaterThan(0);

    const failures: string[] = [];
    for (const bundle of bundles) {
      const result = spawnSync(process.execPath, [bundle], {
        input: '{}\n',
        encoding: 'utf8',
        env: isolatedHookEnvironment(),
        timeout: 15_000
      });
      if (/Dynamic require of/.test(result.stderr ?? '')) {
        failures.push(`${bundle}: ${result.stderr?.split('\n').slice(0, 4).join('\n')}`);
      }
    }

    expect(failures, `${failures.length} bundle(s) crashed at load:\n${failures.join('\n\n')}`).toEqual([]);
  });

  it('runs the codex runtime SessionStart hook successfully', () => {
    const sessionStart = resolve(packageRoot, '../../codex/runtime/hooks/session-start.mjs');
    const result = spawnSync(process.execPath, [sessionStart], {
      input: '{}\n',
      encoding: 'utf8',
      env: isolatedHookEnvironment(),
      timeout: 15_000
    });

    expect(result.stderr ?? '').not.toMatch(/Dynamic require of/);
    expect(result.status).toBe(0);

    // Handler-level suites assert the payload shape; here parseable JSON on
    // stdout with a clean exit IS the contract — the artifact ran to
    // completion instead of dying during module load.
    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });
});
