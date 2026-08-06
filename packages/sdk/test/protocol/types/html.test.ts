/**
 * Unit tests for the shared HTML validation primitives — the single source of
 * truth that both the `card html check` CLI and the pre-commit hook delegate to.
 *
 * @summary Tests for parseAspectRatio, findExternalResources, and validateHtmlInfo aspect/locality rules
 * @module test/protocol/types/html
 */

import { describe, expect, it } from 'vitest';
import {
  checkHtmlContent,
  filterStructuralParseErrors,
  findExternalResources,
  parseAspectRatio,
  validateHtmlInfo
} from '../../../src/protocol/index.js';

describe('parseAspectRatio', () => {
  it('accepts "16:9" → 16/9', () => {
    expect(parseAspectRatio('16:9')).toBeCloseTo(16 / 9);
  });

  it('accepts a positive finite number as-is', () => {
    expect(parseAspectRatio(1.6)).toBe(1.6);
  });

  it.each([
    ['"0:0"', '0:0'],
    ['"16:9:9" (three-part)', '16:9:9'],
    ['zero denominator "4:0"', '4:0'],
    ['quoted decimal "1.6"', '1.6'],
    ['non-numeric "wide"', 'wide']
  ])('rejects %s → null', (_label, value) => {
    expect(parseAspectRatio(value as string)).toBeNull();
  });

  it.each([
    ['negative number', -3],
    ['zero', 0]
  ])('rejects %s → null', (_label, value) => {
    expect(parseAspectRatio(value as number)).toBeNull();
  });
});

describe('validateHtmlInfo — aspect rejection', () => {
  it('rejects an unparseable aspect with a path/value-naming message', () => {
    const result = validateHtmlInfo({ title: 'T', summary: 'S', aspect: '0:0' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('aspect') && e.includes('0:0'))).toBe(true);
  });

  it('accepts a valid "16:9" aspect', () => {
    expect(validateHtmlInfo({ title: 'T', summary: 'S', aspect: '16:9' }).valid).toBe(true);
  });
});

describe('findExternalResources — hardened locality', () => {
  it.each([
    ['quoted src', '<img src="https://cdn.example.com/a.png">'],
    ['unquoted src', '<img src=https://cdn.example.com/a.png>'],
    ['srcset', '<img srcset="https://cdn.example.com/a.png 1x">'],
    ['CSS url()', '<div style="background:url(https://cdn.example.com/bg.png)"></div>'],
    ['CSS @import', '<style>@import "https://cdn.example.com/x.css";</style>'],
    ['protocol-relative', '<script src="//cdn.example.com/lib.js"></script>']
  ])('flags external resource in %s', (_label, html) => {
    const urls = findExternalResources(html);
    expect(urls.some((u) => u.includes('cdn.example.com'))).toBe(true);
  });

  it('does not flag a data: URI or a same-document fragment', () => {
    expect(findExternalResources('<img src="data:image/png;base64,AAAA"><a href="#section">x</a>')).toEqual([]);
  });

  it.each([
    ['relative path', '<img src="./page.html">'],
    ['bare relative path', '<a href="assets/logo.png">x</a>'],
    ['parent-relative path', '<img src="../images/a.png">']
  ])('flags a %s — render-time CSP only allows img-src data:', (_label, html) => {
    expect(findExternalResources(html)).not.toEqual([]);
  });

  it('does not flag a data: URI srcset with multiple candidates (base64 comma must not split it)', () => {
    const html =
      '<img srcset="data:image/png;base64,AAA 1x, data:image/png;base64,BBB 2x" src="data:image/png;base64,AAA">';
    expect(findExternalResources(html)).toEqual([]);
  });

  it('does not flag a data-src attribute (not a real src attribute)', () => {
    expect(findExternalResources('<div data-src="foo"></div>')).toEqual([]);
  });

  it('does not flag inline JS assigning .src/.href as if they were HTML attributes', () => {
    expect(findExternalResources('<script>a.src = fn(); o.href="/x";</script>')).toEqual([]);
  });

  it.each([
    ['<script>const u = new URL(base);</script>', 'new URL(base)'],
    ['<script>const u = buildUrl(path);</script>', 'buildUrl(path)'],
    ['<script>const b = createObjectUrl(blob);</script>', 'createObjectUrl(blob)'],
    ['<script>fetchUrl("/api/x");</script>', 'fetchUrl("/api/x")'],
    ['<script>const s = "please @import this config";</script>', 'string literal containing @import']
  ])('does not flag %s (%s is inline JS, not CSS)', (html) => {
    expect(findExternalResources(html)).toEqual([]);
  });

  it('still flags an external CSS url() inside a <style> block', () => {
    expect(findExternalResources('<style>body { background: url(https://evil.example/x.png); }</style>')).toEqual([
      'https://evil.example/x.png'
    ]);
  });

  it('still flags an external CSS @import inside a <style> block', () => {
    expect(findExternalResources('<style>@import "https://evil.example/x.css";</style>')).toEqual([
      'https://evil.example/x.css'
    ]);
  });
});

describe('filterStructuralParseErrors', () => {
  it('drops the informational missing-doctype code but keeps structural ones', () => {
    expect(filterStructuralParseErrors(['missing-doctype', 'eof-in-tag'])).toEqual(['eof-in-tag']);
  });
});

describe('checkHtmlContent — orchestration', () => {
  it('fails on invalid aspect (check 2)', () => {
    const result = checkHtmlContent({
      htmlPath: 'html/p.html',
      metaPath: 'html/p.meta.json',
      htmlSource: '<p>ok</p>',
      parsedMeta: { title: 'T', summary: 'S', aspect: '1.6' },
      parseErrorCodes: []
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('html/p.meta.json');
  });

  it('fails on a structural parse error (check 3)', () => {
    const result = checkHtmlContent({
      htmlPath: 'html/p.html',
      metaPath: 'html/p.meta.json',
      htmlSource: '<div',
      parsedMeta: { title: 'T', summary: 'S', aspect: '16:9' },
      parseErrorCodes: ['eof-in-tag']
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('well-formedness');
  });

  it('fails on an external resource (check 4)', () => {
    const result = checkHtmlContent({
      htmlPath: 'html/p.html',
      metaPath: 'html/p.meta.json',
      htmlSource: '<img srcset="https://cdn.example.com/a.png 1x">',
      parsedMeta: { title: 'T', summary: 'S', aspect: '16:9' },
      parseErrorCodes: []
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('cdn.example.com');
  });

  it('passes a clean fragment', () => {
    const result = checkHtmlContent({
      htmlPath: 'html/p.html',
      metaPath: 'html/p.meta.json',
      htmlSource: '<p class="text-base">ok</p>',
      parsedMeta: { title: 'T', summary: 'S', aspect: '16:9' },
      parseErrorCodes: ['missing-doctype']
    });
    expect(result.valid).toBe(true);
  });
});
