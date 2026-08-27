// ESM require bridge for CLI-compiled hook bundles.
//
// `@goodfoot/agent-hooks`'s Codex CLI compiles hook sources to strict-ESM bundles with Node
// builtins externalized and no `require` binding. Bundled CommonJS
// dependencies compile to esbuild's `__require` shim, whose fallback throws
// `Dynamic require of "<id>" is not supported` under ESM whenever the bundled
// code requires something outside the bundle. Any CJS dependency that
// `require()`s a builtin therefore crashed its hook at module load (card
// main-613: `mime-types` requiring `path`).
//
// The fix mirrors what the two other emitters already do: the
// same CLI's Claude Code build bakes a `createRequire` banner into every
// bundle, and this package's OpenCode builder passes the same banner to
// esbuild directly (see {@link ../build.mjs} `buildOpencodeTarget`). This
// module applies the equivalent preamble to the Codex CLI's written artifacts
// after compilation, where we cannot pass esbuild options ourselves.
//
// Declaring a top-level `require` makes the shim's `typeof require !==
// "undefined"` probe succeed, so externalized CJS requires resolve through
// real CommonJS semantics instead of throwing. Two preamble lines means two
// generated lines added before the original first line — inline source maps
// embedded by the CLI are shifted accordingly (see {@link
// shiftInlineSourceMapMappings}), keeping stack-trace attribution intact.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The injected preamble. One import plus one declaration: any top-level
 * `require` binding satisfies esbuild's `__require` shim, which probes
 * `typeof require` before falling back to throwing.
 */
const BRIDGE_LINES = [
  "import { createRequire as cardsEsmBridgeCreateRequire } from 'node:module';",
  'const require = cardsEsmBridgeCreateRequire(import.meta.url);'
];

/**
 * Number of generated lines the preamble adds ahead of the original bundle
 * body — the amount every inline source map must be shifted by.
 */
const BRIDGE_LINE_COUNT = BRIDGE_LINES.length;

/**
 * Detects an existing `createRequire`-style bridge in the head of a compiled
 * bundle. Vendor-emitted banners (Claude CLI) and previously bridged files
 * both declare their binding within the first few lines, so scanning a small
 * window keeps the injection idempotent and never double-banners.
 *
 * @param content - Full text of a compiled `.mjs` artifact.
 * @returns True when a require binding is already declared near the top.
 */
function hasRequireBridge(content) {
  // Strip a leading shebang so the scan sees executable lines only.
  const body = content.startsWith('#!') ? content.slice(content.indexOf('\n') + 1) : content;
  const head = body.split('\n', 16).join('\n');
  return /\bcreateRequire\b/.test(head);
}

/**
 * Prepends one empty mapping group per inserted line to an inline base64
 * source map. Source map `mappings` fields are semicolon-separated groups,
 * one per generated line, so shifting the file down by N lines is exactly an
 * N-semicolon prefix. Everything else about the map is untouched.
 *
 * @param body - Bundle body possibly ending in a `sourceMappingURL=data:` comment.
 * @param lines - Number of generated lines prepended ahead of the body.
 * @returns The body with its inline source map shifted, or unchanged when none is present.
 */
function shiftInlineSourceMapMappings(body, lines) {
  const marker = '//# sourceMappingURL=data:application/json;base64,';
  const markerIndex = body.indexOf(marker);
  if (markerIndex === -1) {
    return body;
  }
  const encodedStart = markerIndex + marker.length;
  let encodedEnd = body.indexOf('\n', encodedStart);
  if (encodedEnd === -1) {
    encodedEnd = body.length;
  }
  const decoded = JSON.parse(Buffer.from(body.slice(encodedStart, encodedEnd).trim(), 'base64').toString('utf8'));
  if (typeof decoded.mappings === 'string') {
    decoded.mappings = `${';'.repeat(lines)}${decoded.mappings}`;
  }
  const reEncoded = Buffer.from(JSON.stringify(decoded), 'utf8').toString('base64');
  return `${body.slice(0, encodedStart)}${reEncoded}${body.slice(encodedEnd)}`;
}

/**
 * Injects the require bridge into one compiled bundle's text.
 *
 * @param content - Full text of a compiled `.mjs` artifact (may start with a shebang).
 * @returns The bridged text and whether anything was changed.
 */
export function injectEsmRequireBridge(content) {
  if (hasRequireBridge(content)) {
    return { content, changed: false };
  }
  let shebang = '';
  let body = content;
  if (body.startsWith('#!')) {
    const newlineIndex = body.indexOf('\n');
    shebang = body.slice(0, newlineIndex + 1);
    body = body.slice(newlineIndex + 1);
  }
  body = shiftInlineSourceMapMappings(body, BRIDGE_LINE_COUNT);
  const bridged = `${shebang}${BRIDGE_LINES.join('\n')}\n${body}`;
  return { content: bridged, changed: true };
}

/**
 * Bridges every `.mjs` artifact directly inside a compiled hooks directory.
 * Files that already carry a bridge (Claude CLI banners, prior runs) are left
 * byte-for-byte alone.
 *
 * @param directory - Directory containing compiled `<name>.mjs` hook bundles.
 * @returns How many artifacts were scanned and how many were rewritten.
 */
export function applyEsmRequireBridgeToDirectory(directory) {
  const artifacts = readdirSync(directory).filter((name) => name.endsWith('.mjs'));
  let bridged = 0;
  for (const name of artifacts) {
    const filePath = join(directory, name);
    const { content, changed } = injectEsmRequireBridge(readFileSync(filePath, 'utf8'));
    if (changed) {
      writeFileSync(filePath, content, 'utf8');
      bridged += 1;
    }
  }
  return { scanned: artifacts.length, bridged };
}
