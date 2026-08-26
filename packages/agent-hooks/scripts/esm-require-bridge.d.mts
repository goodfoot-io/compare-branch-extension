/**
 * Type declarations for the ESM require bridge applied to CLI-compiled hook
 * bundles after compilation (see {@link ./esm-require-bridge.mjs}).
 *
 * @summary Type declarations for scripts/esm-require-bridge.mjs
 */

/**
 * Injects the require bridge into one compiled bundle's text. Idempotent:
 * bundles that already declare a `createRequire`-style binding near the top
 * come back unchanged with `changed: false`.
 *
 * @param content - Full text of a compiled `.mjs` artifact (may start with a shebang).
 * @returns The bridged text and whether anything was changed.
 */
export declare function injectEsmRequireBridge(content: string): { content: string; changed: boolean };

/**
 * Bridges every `.mjs` artifact directly inside a compiled hooks directory.
 *
 * @param directory - Directory containing compiled `<name>.mjs` hook bundles.
 * @returns How many artifacts were scanned and how many were rewritten.
 */
export declare function applyEsmRequireBridgeToDirectory(directory: string): { scanned: number; bridged: number };
