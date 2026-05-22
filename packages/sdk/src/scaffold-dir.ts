/**
 * Resolvers for the card-repository scaffold fixture directory.
 *
 * Two resolvers are provided:
 * - {@link resolveScaffoldDir} — for built/packaged environments, resolves the
 *   scaffold directory from a marketplace path. Use this in production code.
 * - {@link resolveScaffoldDirFromSource} — for test environments where the SDK
 *   is consumed as TypeScript source (e.g. under vitest), resolves relative to
 *   `import.meta.url`. Use this in test helpers and TestCardRepository.
 *
 * @summary Scaffold fixture directory resolvers
 * @module scaffold-dir
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Returns the scaffold fixture directory within a packaged marketplace.
 *
 * Follows the marketplace-path convention used across `@cards/default-configuration`
 * (e.g. `buildPluginSettings()`). Use this resolver in all production sites
 * where a `marketplacePath` is available (e.g. `cardsApiLifecycle.ts`).
 *
 * @param marketplacePath - Absolute path to the bundled marketplace directory.
 * @returns Absolute path to `<marketplacePath>/claude/cards/scaffold`.
 */
export function resolveScaffoldDir(marketplacePath: string): string {
  return path.join(marketplacePath, 'claude', 'cards', 'scaffold');
}

/**
 * Returns the scaffold fixture directory resolved relative to this source file.
 *
 * This resolver is intended **only** for environments where the SDK is consumed
 * as TypeScript source — primarily vitest test suites and `TestCardRepository`.
 * It resolves `./scaffold` relative to the compiled location of this module
 * using `fileURLToPath` (not `.pathname`) so that paths with spaces and Windows
 * file URLs are handled correctly.
 *
 * @throws {Error} If the expected fixture files (`.gitignore`, `AGENTS.md`) are
 *   absent at the resolved path. This means the module is being consumed as a
 *   built artifact rather than TS source. Use {@link resolveScaffoldDir} with a
 *   `marketplacePath` instead.
 * @returns Absolute path to the `src/scaffold` directory within the SDK source.
 */
export function resolveScaffoldDirFromSource(): string {
  const dir = fileURLToPath(new URL('./scaffold', import.meta.url));
  // Guard: if fixtures are missing, import.meta.url is not pointing at the TS source
  // (e.g. this module was consumed as a built artifact). Fail loudly with a clear message.
  if (!existsSync(path.join(dir, '.gitignore')) || !existsSync(path.join(dir, 'AGENTS.md'))) {
    throw new Error(
      `resolveScaffoldDirFromSource: fixtures not found at ${dir}. ` +
        `This resolver requires sdk to be consumed as TS source (e.g. under vitest). ` +
        `Use resolveScaffoldDir(marketplacePath) for built environments.`
    );
  }
  return dir;
}
