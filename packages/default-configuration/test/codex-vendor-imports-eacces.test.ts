/**
 * Regression guard for the Launch failure where staging the Codex home
 * recursively copied the source `~/.codex` directory — including the
 * codex-managed `vendor_imports/skills/.git` partial-clone repository — and
 * aborted with EACCES when an unreadable git packfile was encountered.
 *
 * Observed in the wild as:
 *   Handler error: EACCES: permission denied, copyfile
 *     '.../.codex/vendor_imports/skills/.git/objects/pack/pack-<hash>.idx' -> '...'
 *
 * The cache-install path replaces the recursive home copy: `populateCodexPluginCache`
 * only copies the bundled plugins into `<codexHome>/plugins/cache/local/…` and never
 * traverses `vendor_imports`. This test proves it: a real marketplace bundle, a real
 * CODEX_HOME containing an unreadable packfile, and a real cache write — no fs mocking
 * — must start cleanly, leave no staging dir, and produce valid cached manifests.
 *
 * @summary Regression guard: cache-install never traverses vendor_imports/.git
 */

import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let sandbox: string;
let codexHome: string;
let packfile: string;
let marketplacePath: string;
const savedEnv: Record<string, string | undefined> = {};
const PLUGIN_VERSIONS = {
  cards: 'cards-test-version',
  runtime: 'runtime-test-version'
} as const;

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
  for (const key of ['CODEX_HOME', 'CARDS_HOME', 'XDG_DATA_HOME', 'XDG_CONFIG_HOME']) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }

  sandbox = await fs.mkdtemp(path.join(tmpdir(), 'codex-eacces-'));

  // A real marketplace bundle that satisfies ensureCodexBundleAvailable().
  // bundlePath = dirname(marketplacePath)/codex
  marketplacePath = path.join(sandbox, 'marketplace');
  const bundlePath = path.join(sandbox, 'codex');
  await writeJson(path.join(bundlePath, '.agents', 'plugins', 'marketplace.json'), { name: 'local' });
  await writeJson(path.join(bundlePath, 'cards', '.codex-plugin', 'plugin.json'), {
    name: 'cards',
    version: PLUGIN_VERSIONS.cards
  });
  await writeJson(path.join(bundlePath, 'runtime', '.codex-plugin', 'plugin.json'), {
    name: 'runtime',
    version: PLUGIN_VERSIONS.runtime
  });

  // A real source CODEX_HOME holding a codex-managed partial-clone repo whose
  // packfile cannot be read — exactly the state git leaves objects in.
  codexHome = path.join(sandbox, 'codexhome');
  const packDir = path.join(codexHome, 'vendor_imports', 'skills', '.git', 'objects', 'pack');
  await fs.mkdir(packDir, { recursive: true });
  packfile = path.join(packDir, 'pack-029d08823bd8a8eab510ad6ac75c823cfd3ed31e.idx');
  await fs.writeFile(packfile, 'packdata');
  await fs.chmod(packfile, 0o000);

  process.env['CODEX_HOME'] = codexHome;
  process.env['CARDS_HOME'] = path.join(sandbox, 'cardshome');
});

afterEach(async () => {
  // Restore read permission so the recursive cleanup can traverse the tree.
  await fs.chmod(packfile, 0o644).catch(() => undefined);
  await fs.rm(sandbox, { recursive: true, force: true }).catch(() => undefined);
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe('populateCodexPluginCache with an unreadable vendor_imports packfile', () => {
  it('starts cleanly with unreadable vendor_imports packfile — no staging dir created', async () => {
    const { populateCodexPluginCache } = await import('../src/lib/codex-session.js');

    // 1. The cache write resolves — the packfile at mode 0000 is never traversed.
    await expect(populateCodexPluginCache(codexHome, marketplacePath)).resolves.toBeDefined();

    // 2. No `codex.tmp-*` staging directory appears under CARDS_HOME.
    const cardsHome = process.env['CARDS_HOME']!;
    const cardsHomeEntries = await fs.readdir(cardsHome).catch(() => [] as string[]);
    expect(cardsHomeEntries.filter((entry) => entry.startsWith('codex.tmp-'))).toEqual([]);

    // 3 & 4. Cached manifests exist at the exact version-segmented load paths
    // and parse correctly.
    for (const pluginName of ['cards', 'runtime'] as const) {
      const manifestPath = path.join(
        codexHome,
        'plugins',
        'cache',
        'local',
        pluginName,
        PLUGIN_VERSIONS[pluginName],
        '.codex-plugin',
        'plugin.json'
      );
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8')) as { name: string; version: string };
      expect(manifest).toEqual({ name: pluginName, version: PLUGIN_VERSIONS[pluginName] });
    }
  });
});
