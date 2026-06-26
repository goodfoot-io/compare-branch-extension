import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The CLI wrapper shims resolve their Node.js interpreter from
 * `~/.cards/VSCODE_NODE`, which the extension populates with
 * `process.execPath`. In a packaged install that path is the VS Code
 * Electron binary (e.g. `Code.exe`), not a standalone Node.js binary —
 * VS Code does not ship a separate `node` executable.
 *
 * Invoking an Electron binary with a script path but without
 * `ELECTRON_RUN_AS_NODE=1` makes Electron treat the argument as a file to
 * open in the editor instead of a script to execute. The shims must
 * therefore set `ELECTRON_RUN_AS_NODE=1` before invoking the resolved
 * interpreter. Standalone Node.js ignores the variable, so the fix is
 * safe across every resolution path.
 *
 * @summary Guards that every bin shim runs the VS Code Electron binary as Node.
 */
const BIN_DIR = path.resolve(__dirname, '../../src/bin');

const CMD_SHIMS = [
  'cards.cmd',
  'cards-dev.cmd',
  'cards-extension-cli.cmd',
  'create-worktree.cmd',
  'remove-worktree.cmd',
  'transcript-watcher.cmd'
];

const SH_SHIMS = [
  'cards.sh',
  'cards-dev.sh',
  'cards-extension-cli.sh',
  'create-worktree.sh',
  'remove-worktree.sh',
  'transcript-watcher.sh'
];

describe('bin shims: ELECTRON_RUN_AS_NODE', () => {
  it.each(CMD_SHIMS)('%s sets ELECTRON_RUN_AS_NODE before invoking node', (shim) => {
    const content = fs.readFileSync(path.join(BIN_DIR, shim), 'utf-8');
    const setIndex = content.indexOf('set "ELECTRON_RUN_AS_NODE=1"');
    const invokeIndex = content.indexOf('"%NODE%"');
    expect(setIndex).toBeGreaterThanOrEqual(0);
    expect(invokeIndex).toBeGreaterThan(setIndex);
  });

  it.each(SH_SHIMS)('%s exports ELECTRON_RUN_AS_NODE before invoking node', (shim) => {
    const content = fs.readFileSync(path.join(BIN_DIR, shim), 'utf-8');
    const exportIndex = content.indexOf('export ELECTRON_RUN_AS_NODE=1');
    const invokeIndex = content.indexOf('exec "$NODE"');
    expect(exportIndex).toBeGreaterThanOrEqual(0);
    expect(invokeIndex).toBeGreaterThan(exportIndex);
  });
});
