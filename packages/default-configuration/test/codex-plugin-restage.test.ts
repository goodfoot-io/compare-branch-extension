/**
 * Reproduction coverage for the content-addressed restage invariant.
 *
 * `populateCodexPluginCache` stages each bundled plugin into a version-segmented
 * cache slot `plugins/cache/local/<plugin>/<version>`. When the extension ships a
 * rebuilt hook bundle whose `plugin.json` `version` is unchanged (the manual
 * bump was skipped), the staged slot already exists — and the install path must
 * still deliver the new bytes. The invariant: the hook code Codex executes for a
 * local-marketplace plugin is byte-identical to the current bundle, regardless of
 * whether the declared version moved.
 *
 * These tests run against a real filesystem sandbox — `node:fs/promises` is not
 * mocked in this file — so the assertions observe the actual published bytes, not
 * a stubbed rename.
 *
 * @summary Tests same-version rebuilds restage into the Codex plugin cache
 */

import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const PLUGIN_VERSION = '1.0.0';

let sandbox: string;
let codexHome: string;
let marketplacePath: string;
let bundlePath: string;
const savedEnv: Record<string, string | undefined> = {};

/**
 * Writes a JSON file, creating parent directories as needed.
 *
 * @param filePath - Absolute path to write.
 * @param value - Value serialized as JSON.
 */
async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value));
}

/**
 * (Re)writes the bundled `cards` plugin with a hook file carrying `hookBody`,
 * leaving the declared manifest version fixed at {@link PLUGIN_VERSION}. This is
 * the exact shape of the defect: a rebuilt hook bundle whose version string never
 * moved.
 *
 * @param hookBody - Contents to write into the plugin's `hooks/session-start.mjs`.
 */
async function writeBundle(hookBody: string): Promise<void> {
  await writeJson(path.join(bundlePath, '.agents', 'plugins', 'marketplace.json'), { name: 'local' });
  await writeJson(path.join(bundlePath, 'cards', '.codex-plugin', 'plugin.json'), {
    name: 'cards',
    version: PLUGIN_VERSION
  });
  await fs.mkdir(path.join(bundlePath, 'cards', 'hooks'), { recursive: true });
  await fs.writeFile(path.join(bundlePath, 'cards', 'hooks', 'session-start.mjs'), hookBody);
}

/**
 * Resolves the published cache path for the `cards` plugin hook file.
 *
 * @returns Absolute path to `<codexHome>/plugins/cache/local/cards/<version>/hooks/session-start.mjs`.
 */
function stagedHookPath(): string {
  return path.join(codexHome, 'plugins', 'cache', 'local', 'cards', PLUGIN_VERSION, 'hooks', 'session-start.mjs');
}

beforeEach(async () => {
  for (const key of ['CODEX_HOME', 'CARDS_HOME', 'XDG_DATA_HOME', 'XDG_CONFIG_HOME']) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }

  sandbox = await fs.mkdtemp(path.join(tmpdir(), 'codex-restage-'));
  marketplacePath = path.join(sandbox, 'marketplace');
  bundlePath = path.join(sandbox, 'codex');
  codexHome = path.join(sandbox, 'codexhome');
  process.env['CODEX_HOME'] = codexHome;
});

afterEach(async () => {
  await fs.rm(sandbox, { recursive: true, force: true }).catch(() => undefined);
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe('populateCodexPluginCache content-addressed restage', () => {
  it('restages a rebuilt bundle whose version string is unchanged', async () => {
    const { populateCodexPluginCache } = await import('../src/lib/codex-session.js');

    const OLD_HOOK = 'export const marker = "stale: spawns transcript-watcher";\n';
    const NEW_HOOK = 'export const marker = "rebuilt: spawns stream-sync-watcher";\n';

    // First build stages the old hook bytes under version 1.0.0.
    await writeBundle(OLD_HOOK);
    await populateCodexPluginCache(codexHome, marketplacePath, ['cards']);
    expect(await fs.readFile(stagedHookPath(), 'utf-8')).toBe(OLD_HOOK);

    // The extension rebuilds the hook bundle but the manual version bump is
    // skipped, so plugin.json still declares 1.0.0 while the bytes differ.
    await writeBundle(NEW_HOOK);
    await populateCodexPluginCache(codexHome, marketplacePath, ['cards']);

    // Codex would load this exact file. It must be the rebuilt bytes — a stale
    // slot means the launched session silently runs the pre-rework hook.
    expect(await fs.readFile(stagedHookPath(), 'utf-8')).toBe(NEW_HOOK);
  });
});
