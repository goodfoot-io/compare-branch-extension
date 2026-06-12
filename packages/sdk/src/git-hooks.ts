/**
 * Shared git-hook primitives consumed by workspace dispatcher generation,
 * card-repo hook installers, and the HybridStore.
 *
 * Centralises the node-resolution bash block, the compiled-hook-script path
 * map, and the atomic temp-file-to-rename write pattern so every site that
 * provisions or runs hooks composes the same building blocks.
 *
 * @summary Single source of truth for git-hook bash primitives
 * @module git-hooks
 */

import { randomUUID } from 'node:crypto';
import * as path from 'node:path';

/**
 * Git hook names that have compiled Cards `.mjs` artifacts.
 *
 * `card-post-commit.mjs` is intentionally excluded — it has no consumer.
 */
export type HookName = 'pre-commit' | 'post-commit' | 'post-rewrite';

/**
 * Node-resolution bash block that resolves a Node.js interpreter into `$NODE_BIN`.
 *
 * Prefers the extension's bundled interpreter (`~/.cards/VSCODE_NODE`),
 * falls back to `node` on `PATH`. Exports `ELECTRON_RUN_AS_NODE=1` so a
 * desktop VS Code's Electron binary runs headless — git does not inherit
 * the var from the extension host and without it every commit pops a
 * focus-stealing Electron window.
 *
 * Consumers that need `$NODE_RUN` instead (workspace dispatchers) alias it
 * in their template: `NODE_RUN="$NODE_BIN"`.
 */
export const RESOLVE_NODE_BASH = `export ELECTRON_RUN_AS_NODE=1
NODE_BIN=$(cat "$HOME/.cards/VSCODE_NODE" 2>/dev/null)
if [ -n "$NODE_BIN" ] && [ -x "$NODE_BIN" ]; then
  NODE_BIN="$NODE_BIN"
elif command -v node >/dev/null 2>&1; then
  NODE_BIN="node"
else
  NODE_BIN=""
fi
`;

/**
 * Returns a map of hook name to compiled `.mjs` artifact path under the
 * extension installation directory.
 *
 * Points each Cards-active hook type at `<extensionPath>/dist/git-hooks/<name>.mjs`.
 *
 * @param extensionPath - Absolute path to the extension installation directory.
 * @returns Map of hook name to absolute compiled `.mjs` path.
 */
export function compiledHookScriptPaths(extensionPath: string): Record<HookName, string> {
  const gitHooksDir = path.join(extensionPath, 'dist', 'git-hooks');
  return {
    'pre-commit': path.join(gitHooksDir, 'pre-commit.mjs'),
    'post-commit': path.join(gitHooksDir, 'post-commit.mjs'),
    'post-rewrite': path.join(gitHooksDir, 'post-rewrite.mjs')
  };
}

/**
 * Minimal filesystem interface required by {@link atomicWriteHookFile}.
 *
 * Matches the subset of `node:fs/promises` and `fs-extra` used during
 * atomic hook provisioning.
 */
export interface HookFileFs {
  writeFile(path: string, content: string, options?: { mode?: number }): Promise<void>;
  chmod(path: string, mode: number): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  rm(path: string, options?: { force?: boolean }): Promise<void>;
}

/**
 * Atomically writes a hook file into `hooksDir` using a temp-file + rename pattern.
 *
 * Writes to a uniquely-named temp file in the same directory, enforces the
 * requested mode, then `rename(2)`s into place. `rename(2)` within a directory
 * is atomic, so a concurrent writer producing byte-identical content can never
 * expose a half-written script to a hook invocation. On error the temp file is
 * cleaned up before re-throwing.
 *
 * @param fs - Filesystem object (e.g. `node:fs/promises` or `fs-extra`).
 * @param hooksDir - Absolute path to the hooks directory.
 * @param name - Destination filename within `hooksDir`.
 * @param content - File content to write.
 * @param mode - Posix file mode (e.g. `0o755` for scripts, `0o644` for data).
 */
export async function atomicWriteHookFile(
  fs: HookFileFs,
  hooksDir: string,
  name: string,
  content: string,
  mode: number
): Promise<void> {
  const destPath = path.join(hooksDir, name);
  const tmpPath = path.join(hooksDir, `.${name}.${process.pid}.${randomUUID()}.tmp`);
  try {
    await fs.writeFile(tmpPath, content, { mode });
    // `writeFile` honors `mode` only when it creates the file; enforce it
    // explicitly so a pre-existing umask cannot leave the script non-exec.
    await fs.chmod(tmpPath, mode);
    await fs.rename(tmpPath, destPath);
  } catch (error: unknown) {
    await fs.rm(tmpPath, { force: true });
    throw error;
  }
}
