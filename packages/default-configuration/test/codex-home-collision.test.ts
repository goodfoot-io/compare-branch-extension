/**
 * Concurrency and atomicity coverage for `populateCodexPluginCache`.
 *
 * The cache-install path replaces the staged-home copy: each bundled plugin is
 * written into a temp dir under `plugins/cache/local/` and moved into place at
 * `plugins/cache/local/<plugin>/local` with an atomic rename (mirroring codex's
 * own `replace_plugin_root_atomically`). These tests run against a real
 * filesystem sandbox: `node:fs/promises` is wrapped so `fs.cp` and `fs.rename`
 * delegate to the real implementations while recording their arguments, so the
 * assertions exercise the production move sequence rather than a stub.
 *
 * @summary Tests concurrent populateCodexPluginCache cache installs
 */

import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Wrap `node:fs/promises` so every call delegates to the real implementation
 * while recording its arguments. ESM forbids `vi.spyOn` on module exports, so
 * the module is mocked with real-backed spies — no behavior is stubbed.
 */
vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  const wrapped = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(actual)) {
    wrapped[key] = typeof value === 'function' ? vi.fn(value as (...args: unknown[]) => unknown) : value;
  }
  return wrapped;
});

/**
 * Production code builds paths with node:path, so on Windows the values passed
 * to fs spies use backslash separators. Normalize to forward slashes so the
 * POSIX suffix checks below match regardless of platform.
 *
 * @param p - Path-like value (string, Buffer, or URL) to normalize.
 * @returns The value stringified with backslashes converted to forward slashes.
 */
function toPosix(p: unknown): string {
  return String(p).replace(/\\/g, '/');
}

let fs: typeof import('node:fs/promises');
let sandbox: string;
let codexHome: string;
let marketplacePath: string;
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

beforeEach(async () => {
  fs = await import('node:fs/promises');
  vi.clearAllMocks();

  for (const key of ['CODEX_HOME', 'CARDS_HOME', 'XDG_DATA_HOME', 'XDG_CONFIG_HOME']) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }

  sandbox = await fs.mkdtemp(path.join(tmpdir(), 'codex-collision-'));

  // A real marketplace bundle that satisfies ensureCodexBundleAvailable().
  // bundlePath = dirname(marketplacePath)/codex
  marketplacePath = path.join(sandbox, 'marketplace');
  const bundlePath = path.join(sandbox, 'codex');
  await writeJson(path.join(bundlePath, '.agents', 'plugins', 'marketplace.json'), { name: 'local' });
  await writeJson(path.join(bundlePath, 'cards', '.codex-plugin', 'plugin.json'), { name: 'cards' });
  await writeJson(path.join(bundlePath, 'runtime', '.codex-plugin', 'plugin.json'), { name: 'runtime' });

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

/**
 * Asserts the cache holds a valid manifest for `pluginName` at the exact load
 * path `<codexHome>/plugins/cache/local/<plugin>/local/.codex-plugin/plugin.json`.
 *
 * @param pluginName - Bundled plugin name to verify.
 */
async function expectCachedManifest(pluginName: 'cards' | 'runtime'): Promise<void> {
  const manifestPath = path.join(
    codexHome,
    'plugins',
    'cache',
    'local',
    pluginName,
    'local',
    '.codex-plugin',
    'plugin.json'
  );
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8')) as { name: string };
  expect(manifest).toEqual({ name: pluginName });
}

describe('populateCodexPluginCache concurrency and atomicity', () => {
  it('concurrent populateCodexPluginCache calls both succeed and produce the same cache', async () => {
    const { populateCodexPluginCache } = await import('../src/lib/codex-session.js');

    const [result1, result2] = await Promise.all([
      populateCodexPluginCache(codexHome, marketplacePath),
      populateCodexPluginCache(codexHome, marketplacePath)
    ]);

    // Both calls resolve and resolve the same load paths.
    for (const result of [result1, result2]) {
      expect(result.pluginCachePaths.cards).toBe(path.join(codexHome, 'plugins', 'cache', 'local', 'cards', 'local'));
      expect(result.pluginCachePaths.runtime).toBe(
        path.join(codexHome, 'plugins', 'cache', 'local', 'runtime', 'local')
      );
    }

    // fs.cp is called with a destination under the marketplace dir for each plugin.
    const cpDestinations = vi.mocked(fs.cp).mock.calls.map((call) => toPosix(call[1]));
    expect(cpDestinations.some((dest) => /\/plugins\/cache\/local\/\.incoming-.*-cards$/.test(dest))).toBe(true);
    expect(cpDestinations.some((dest) => /\/plugins\/cache\/local\/\.incoming-.*-runtime$/.test(dest))).toBe(true);

    // The shared cache ends with valid manifests at the load paths.
    await expectCachedManifest('cards');
    await expectCachedManifest('runtime');
  });

  it('populateCodexPluginCache moves each incoming dir into place with an atomic rename', async () => {
    const { populateCodexPluginCache } = await import('../src/lib/codex-session.js');

    await populateCodexPluginCache(codexHome, marketplacePath);

    // The final move lands each plugin at plugins/cache/local/<plugin>/local.
    const renameDestinations = vi.mocked(fs.rename).mock.calls.map((call) => toPosix(call[1]));
    expect(renameDestinations).toContain(toPosix(path.join(codexHome, 'plugins', 'cache', 'local', 'cards', 'local')));
    expect(renameDestinations).toContain(
      toPosix(path.join(codexHome, 'plugins', 'cache', 'local', 'runtime', 'local'))
    );

    // The resulting cache dirs contain valid manifests at the load path.
    await expectCachedManifest('cards');
    await expectCachedManifest('runtime');
  });
});
