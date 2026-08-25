/**
 * Type surface for `generate-opencode-entry.mjs`, so the bun-run TypeScript
 * consumer (`src/streams/opencode-session/www/build.ts`) imports it type-safely.
 *
 * @summary Types for the opencode-session entrypoint generator
 * @module
 */

/**
 * Writes the generated opencode-session `index.html` entrypoint into
 * `<pkgRoot>/dist/www-entry/opencode-session/`, skipping the write when the
 * on-disk content already matches.
 *
 * @param pkgRoot - Absolute path to the default-configuration package root.
 * @returns Absolute path to the generated `index.html`.
 */
export function generateOpencodeEntry(pkgRoot: string): string;
