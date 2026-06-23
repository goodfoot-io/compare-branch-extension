/**
 * Regression guard for the non-atomic `.cards/` publish step in
 * [build.mjs](../scripts/build.mjs). The old publish `rmSync`'d the live
 * `bin/`, `settings.json`, and `www/` and then `cpSync`'d `dist/` over the top,
 * tearing the directory for the whole duration of the copy: a concurrent reader
 * (the extension's settings watcher, an action handler spawning from
 * `.cards/bin/`) saw `settings.json` absent or `bin/` half-populated and failed
 * with ENOENT. Worse, a copy that threw partway left the live bundle destroyed
 * with no replacement — violating the package's own "refuse to ship a partial
 * artifact" doctrine.
 *
 * [publishBundle](../scripts/publishBundle.mjs) stages every entry beside its
 * live counterpart first and only swaps once staging fully succeeds, so a
 * failed publish leaves the previous bundle intact and a successful one never
 * exposes a torn intermediate.
 *
 * @summary Regression guard: `.cards/` publish is fail-closed and atomic
 */

import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { publishBundle } from '../scripts/publishBundle.mjs';

let sandbox: string;
let dist: string;
let cardsDir: string;

/**
 * Lay down a complete bundle (bin/, settings.json, www/) under `root`.
 *
 * @param root - Directory to populate with a bundle.
 * @param marker - Tag embedded in each file so old and new bundles are distinguishable.
 */
function writeBundle(root: string, marker: string): void {
  mkdirSync(join(root, 'bin'), { recursive: true });
  writeFileSync(join(root, 'bin', 'handler.js'), `// ${marker} handler\n`);
  writeFileSync(join(root, 'settings.json'), JSON.stringify({ marker }));
  mkdirSync(join(root, 'www', 'claude-code-session'), { recursive: true });
  writeFileSync(join(root, 'www', 'claude-code-session', 'index.html'), `<!-- ${marker} -->`);
}

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'publish-atomic-'));
  dist = join(sandbox, 'dist');
  cardsDir = join(sandbox, '.cards');
});

afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

describe('publishBundle', () => {
  it('leaves the live bundle completely intact when staging fails (fail-closed)', () => {
    // A complete previous bundle is live, alongside a sibling the build never
    // manages (logs/) that must also survive.
    writeBundle(cardsDir, 'old');
    mkdirSync(join(cardsDir, 'logs'), { recursive: true });
    writeFileSync(join(cardsDir, 'logs', 'run.log'), 'keep me');

    // The new dist is incomplete — `www/` is missing — so publishing must fail.
    mkdirSync(join(dist, 'bin'), { recursive: true });
    writeFileSync(join(dist, 'bin', 'handler.js'), '// new handler\n');
    writeFileSync(join(dist, 'settings.json'), JSON.stringify({ marker: 'new' }));

    expect(() => publishBundle(dist, cardsDir)).toThrow();

    // Every live entry is still the complete previous bundle, never torn.
    expect(JSON.parse(readFileSync(join(cardsDir, 'settings.json'), 'utf8'))).toEqual({ marker: 'old' });
    expect(readFileSync(join(cardsDir, 'bin', 'handler.js'), 'utf8')).toBe('// old handler\n');
    expect(readFileSync(join(cardsDir, 'www', 'claude-code-session', 'index.html'), 'utf8')).toBe('<!-- old -->');
    expect(readFileSync(join(cardsDir, 'logs', 'run.log'), 'utf8')).toBe('keep me');

    // No staging debris is left behind.
    expect(readdirSync(cardsDir).filter((e) => e.includes('tmp-publish') || e.includes('old-publish'))).toEqual([]);
  });

  it('replaces every managed entry and leaves no staging debris on success', () => {
    writeBundle(cardsDir, 'old');
    writeBundle(dist, 'new');

    publishBundle(dist, cardsDir);

    expect(JSON.parse(readFileSync(join(cardsDir, 'settings.json'), 'utf8'))).toEqual({ marker: 'new' });
    expect(readFileSync(join(cardsDir, 'bin', 'handler.js'), 'utf8')).toBe('// new handler\n');
    expect(readFileSync(join(cardsDir, 'www', 'claude-code-session', 'index.html'), 'utf8')).toBe('<!-- new -->');
    expect(readdirSync(cardsDir).filter((e) => e.includes('tmp-publish') || e.includes('old-publish'))).toEqual([]);
  });

  it('publishes into a fresh .cards/ that does not yet exist', () => {
    writeBundle(dist, 'new');

    publishBundle(dist, cardsDir);

    expect(JSON.parse(readFileSync(join(cardsDir, 'settings.json'), 'utf8'))).toEqual({ marker: 'new' });
    expect(readFileSync(join(cardsDir, 'bin', 'handler.js'), 'utf8')).toBe('// new handler\n');
  });
});
