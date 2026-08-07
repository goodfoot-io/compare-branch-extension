/**
 * Regression tests for `findExternalResources` scanning inline JavaScript with
 * the HTML *attribute* patterns (`src=`/`href=`/`srcset=`).
 *
 * The CSS-syntax patterns (`url()`/`@import`) already scan a script-redacted
 * copy of the source; the attribute patterns still scan the raw source, so a
 * bare `var href = …` assignment inside a `<script>` body is reported as a
 * non-local resource reference. The `(?<![\w.-])` left-boundary guard masks
 * this for property access (`o.href = …`) and prefixed identifiers
 * (`sheetHref`), but a bare `href`/`src` identifier has no such left context.
 *
 * @summary Tests that inline-JS bare src/href assignments are not resource references
 * @module test/protocol/types/html-script-attrs
 */

import { describe, expect, it } from 'vitest';
import type { ScriptSpan } from '../../../src/protocol/index.js';
import { findExternalResources } from '../../../src/protocol/index.js';

/**
 * Locates every `<script>` element's whole-element span in an HTML fixture,
 * matching what the real producers emit — parse5's `startOffset`/`endOffset`
 * for the element node, which covers the start tag, the body, and the end tag
 * (see `collectScriptSpans` in the extension and git-hooks packages, which
 * have the parse5 dependency the SDK does not).
 *
 * @param html - HTML fixture to locate `<script>` element spans in.
 * @returns Whole-element spans for every `<script>` element, in source order.
 */
function scriptElementSpans(html: string): ScriptSpan[] {
  const spans: ScriptSpan[] = [];
  const CLOSE = '</script>';
  let cursor = 0;
  while (cursor < html.length) {
    const start = html.indexOf('<script', cursor);
    if (start === -1) break;
    const closeAt = html.indexOf(CLOSE, start);
    if (closeAt === -1) break;
    const end = closeAt + CLOSE.length;
    spans.push({ start, end });
    cursor = end;
  }
  return spans;
}

describe('findExternalResources — inline JS bare src/href identifiers', () => {
  it('does not flag a bare `var href = …` assignment reading a stylesheet href', () => {
    const html = '<script>var href = document.styleSheets[0].href;</script>';
    expect(findExternalResources(html, scriptElementSpans(html))).toEqual([]);
  });

  it('does not flag a bare `var src = …` conditional assignment', () => {
    const html = '<script>var src = ok ? a : b;</script>';
    expect(findExternalResources(html, scriptElementSpans(html))).toEqual([]);
  });

  it('does not flag a bare `var href = "./styles.css"` string assignment', () => {
    const html = '<script>var href = "./styles.css";</script>';
    expect(findExternalResources(html, scriptElementSpans(html))).toEqual([]);
  });

  it('does not flag a script body combining all three bare-identifier assignments', () => {
    const html = [
      '<!DOCTYPE html><html><head><title>t</title></head><body>',
      '<script>',
      '  var href = document.styleSheets[0].href;',
      '  var src = ok ? a : b;',
      '  var href2 = "./styles.css";',
      '</script>',
      '</body></html>'
    ].join('\n');
    expect(findExternalResources(html, scriptElementSpans(html))).toEqual([]);
  });
});

describe('findExternalResources — real script/link attributes still flagged', () => {
  it('still flags an external src on the <script> element itself, whose span covers its start tag', () => {
    const html = '<script src="http://evil.example/x.js"></script>';
    expect(findExternalResources(html, scriptElementSpans(html))).toEqual(['http://evil.example/x.js']);
  });

  it('still flags a relative <link href> alongside a script whose body assigns a bare href', () => {
    const html = '<link href="./local.css"><script>var href = document.styleSheets[0].href;</script>';
    expect(findExternalResources(html, scriptElementSpans(html))).toEqual(['./local.css']);
  });

  it('accepts an https: script src', () => {
    const html = '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>';
    expect(findExternalResources(html, scriptElementSpans(html))).toEqual([]);
  });
});
