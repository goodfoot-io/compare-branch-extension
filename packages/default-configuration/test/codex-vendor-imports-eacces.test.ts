/**
 * Reproduces the Launch failure where staging the Codex home recursively copies
 * the source `~/.codex` directory — including the codex-managed
 * `vendor_imports/skills/.git` partial-clone repository — and aborts with EACCES
 * when an unreadable git packfile is encountered.
 *
 * Observed in the wild as:
 *   Handler error: EACCES: permission denied, copyfile
 *     '.../.codex/vendor_imports/skills/.git/objects/pack/pack-<hash>.idx' -> '...'
 *
 * This exercises the real `prepareStagedCodexHome` over a real filesystem: a real
 * marketplace bundle, a real CODEX_HOME containing a packfile with no read
 * permission, and a real staging parent (CARDS_HOME). No fs mocking — the failure
 * comes from the production `fs.cp(sourceCodexHome, stagedCodexHome, {recursive:true})`.
 *
 * @summary Reproduces vendor_imports/.git EACCES during Codex home staging
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
  await writeJson(path.join(bundlePath, 'cards', '.codex-plugin', 'plugin.json'), { name: 'cards' });
  await writeJson(path.join(bundlePath, 'runtime', '.codex-plugin', 'plugin.json'), { name: 'runtime' });

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

describe('prepareStagedCodexHome with an unreadable vendor_imports packfile', () => {
  it('aborts staging with EACCES on the git packfile (reproduces the Launch handler error)', async () => {
    const { prepareStagedCodexHome } = await import('../src/lib/codex-session.js');

    await expect(prepareStagedCodexHome(marketplacePath)).rejects.toMatchObject({
      code: 'EACCES',
      syscall: 'copyfile'
    });

    // And the offending path is the codex-managed git internals it should never copy.
    await expect(prepareStagedCodexHome(marketplacePath)).rejects.toThrow(
      /vendor_imports[/\\]skills[/\\]\.git[/\\]objects[/\\]pack/
    );
  });
});
