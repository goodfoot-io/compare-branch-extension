/**
 * Type surface for `generate-antigravity-entry.mjs`, so the bun-run TypeScript
 * consumer (`src/streams/antigravity-session/www/build.ts`) imports it
 * type-safely.
 *
 * @summary Types for the antigravity-session entrypoint generator
 * @module
 */

/**
 * Writes the generated antigravity-session `index.html` entrypoint into
 * `<pkgRoot>/dist/www-entry/antigravity-session/`, skipping the write when the
 * on-disk content already matches.
 *
 * @param pkgRoot - Absolute path to the default-configuration package root.
 * @returns Absolute path to the generated `index.html`.
 */
export function generateAntigravityEntry(pkgRoot: string): string;
