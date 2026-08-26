/**
 * Unit tests for the ESM require bridge applied to CLI-compiled hook bundles
 * (scripts/esm-require-bridge.mjs).
 *
 * The compiled-artifact integration suite (`codex-bundles-load.test.ts`)
 * proves bridged bundles load; these tests pin the text-level contract the
 * integration suite cannot see: shebang preservation, inline source-map
 * remapping, idempotency, and leaving vendor-bannered bundles untouched.
 *
 * @summary Unit tests for scripts/esm-require-bridge.mjs
 */

import { describe, expect, it } from 'vitest';
import { injectEsmRequireBridge } from '../../scripts/esm-require-bridge.mjs';

/**
 * A minimal esbuild-style ESM body with an embedded inline source map.
 *
 * @param mappings - Raw source map mappings string to embed.
 * @param withShebang - When true, prefixes the body with the CLI's shebang line.
 * @returns The synthetic bundle text.
 */
function bundleWithSourceMap(mappings: string, withShebang = false): string {
  const map = Buffer.from(JSON.stringify({ version: 3, sources: ['hook.ts'], names: [], mappings }), 'utf8').toString(
    'base64'
  );
  const body = `var __defProp = Object.defineProperty;\nconsole.log(1);\n//# sourceMappingURL=data:application/json;base64,${map}\n`;
  return withShebang ? `#!/usr/bin/env -S node --enable-source-maps\n${body}` : body;
}

function decodeSourceMap(content: string): { sources: string[]; mappings: string } {
  const marker = '//# sourceMappingURL=data:application/json;base64,';
  const start = content.indexOf(marker) + marker.length;
  const end = content.indexOf('\n', start);
  return JSON.parse(Buffer.from(content.slice(start, end), 'base64').toString('utf8'));
}

describe('injectEsmRequireBridge', () => {
  it('prepends a createRequire binding to a plain bundle', () => {
    const { content, changed } = injectEsmRequireBridge('console.log(1);\n');

    expect(changed).toBe(true);
    expect(content.startsWith("import { createRequire as cardsEsmBridgeCreateRequire } from 'node:module';\n")).toBe(
      true
    );
    expect(content.endsWith('console.log(1);\n')).toBe(true);
  });

  it('keeps the shebang as the first line', () => {
    const { content, changed } = injectEsmRequireBridge(bundleWithSourceMap('AAAA', true));

    expect(changed).toBe(true);
    expect(content.startsWith('#!/usr/bin/env -S node --enable-source-maps\nimport { createRequire')).toBe(true);
  });

  it('is idempotent', () => {
    const first = injectEsmRequireBridge('console.log(1);\n');
    const second = injectEsmRequireBridge(first.content);

    expect(second.changed).toBe(false);
    expect(second.content).toBe(first.content);
  });

  it('leaves bundles that already declare a require binding untouched', () => {
    const claudeStyle = [
      '#!/usr/bin/env -S node --enable-source-maps',
      'import { createRequire as __createRequire } from "node:module";',
      'const require = __createRequire(import.meta.url);',
      'console.log(1);'
    ].join('\n');
    const { content, changed } = injectEsmRequireBridge(claudeStyle);

    expect(changed).toBe(false);
    expect(content).toBe(claudeStyle);
  });

  it('shifts inline source map mappings by the number of inserted lines', () => {
    const original = bundleWithSourceMap('AAAA,CAAC;;EAAA');
    const { content, changed } = injectEsmRequireBridge(original);

    expect(changed).toBe(true);
    const map = decodeSourceMap(content);
    expect(map.sources).toEqual(['hook.ts']);
    // Two preamble lines → two empty mapping groups ahead of the originals.
    expect(map.mappings).toBe(';;AAAA,CAAC;;EAAA');
  });

  it('leaves bundles without an inline source map unchanged in their body', () => {
    const { content, changed } = injectEsmRequireBridge('console.log(1);\n// no sourcemap here\n');

    expect(changed).toBe(true);
    expect(content).toContain('// no sourcemap here');
    expect(content.includes('sourceMappingURL=data:')).toBe(false);
  });
});
