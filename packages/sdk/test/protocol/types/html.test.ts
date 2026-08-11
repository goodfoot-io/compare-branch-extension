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
  htmlCardDocPathForSidecar,
  htmlCardDocSidecarPath,
  isHtmlCardDocPath,
  isHtmlCardDocSidecarPath,
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
    ['quoted src', '<img src="http://cdn.example.com/a.png">'],
    ['unquoted src', '<img src=http://cdn.example.com/a.png>'],
    ['srcset', '<img srcset="http://cdn.example.com/a.png 1x">'],
    ['CSS url()', '<div style="background:url(http://cdn.example.com/bg.png)"></div>'],
    ['CSS @import', '<style>@import "http://cdn.example.com/x.css";</style>'],
    ['protocol-relative', '<script src="//cdn.example.com/lib.js"></script>']
  ])('flags external resource in %s', (_label, html) => {
    const urls = findExternalResources(html);
    expect(urls.some((u) => u.includes('cdn.example.com'))).toBe(true);
  });

  it.each([
    ['quoted src', '<img src="https://cdn.example.com/a.png">'],
    ['unquoted src', '<img src=https://cdn.example.com/a.png>'],
    ['srcset', '<img srcset="https://cdn.example.com/a.png 1x">'],
    ['CSS url()', '<div style="background:url(https://cdn.example.com/bg.png)"></div>'],
    ['CSS @import', '<style>@import "https://cdn.example.com/x.css";</style>']
  ])('does not flag an https: resource in %s', (_label, html) => {
    expect(findExternalResources(html)).toEqual([]);
  });

  it('does not flag a data: URI or a same-document fragment', () => {
    expect(findExternalResources('<img src="data:image/png;base64,AAAA"><a href="#section">x</a>')).toEqual([]);
  });

  it.each([
    ['relative path', '<img src="./page.html">'],
    ['parent-relative path', '<img src="../images/a.png">']
  ])('flags a %s — it resolves outside the repository-root assets/ URL space', (_label, html) => {
    expect(findExternalResources(html)).not.toEqual([]);
  });

  it('does not flag a relative reference resolving under assets/ — the served-document model serves it', () => {
    expect(findExternalResources('<a href="assets/logo.png">x</a>')).toEqual([]);
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

  /**
   * Locates the `<script>…</script>` span in a single-script test fixture, the
   * same shape a real caller derives from a parse5 parse with
   * `sourceCodeLocationInfo: true` (see `collectScriptSpans` in
   * `@cards.management/html-spans`, which has the parse5 dependency the SDK does not).
   *
   * @param html - Single-script HTML fixture to locate the `<script>` span in.
   * @returns The `<script>…</script>` span, as `{ start, end }` character offsets.
   */
  function scriptSpanOf(html: string): { start: number; end: number } {
    const start = html.indexOf('<script');
    const end = html.indexOf('</script>') + '</script>'.length;
    return { start, end };
  }

  it.each([
    ['<script>const u = new URL(base);</script>', 'new URL(base)'],
    ['<script>const u = buildUrl(path);</script>', 'buildUrl(path)'],
    ['<script>const b = createObjectUrl(blob);</script>', 'createObjectUrl(blob)'],
    ['<script>fetchUrl("/api/x");</script>', 'fetchUrl("/api/x")'],
    ['<script>const s = "please @import this config";</script>', 'string literal containing @import']
  ])('does not flag %s (%s is inline JS, not CSS) given its script span', (html) => {
    expect(findExternalResources(html, [scriptSpanOf(html)])).toEqual([]);
  });

  it('still flags an external CSS url() inside a <style> block', () => {
    const html = '<style>body { background: url(http://evil.example/x.png); }</style>';
    expect(findExternalResources(html)).toEqual(['http://evil.example/x.png']);
  });

  it('still flags an external CSS @import inside a <style> block', () => {
    const html = '<style>@import "http://evil.example/x.css";</style>';
    expect(findExternalResources(html)).toEqual(['http://evil.example/x.css']);
  });

  it('still flags an external url() sitting between an inert "<script" text token and a later real <script> element, when given only the real span', () => {
    const html =
      '<div title="<script>"></div><style>a{background:url(http://evil.example/y)}</style><script>init()</script>';
    // The real span, as a real parse5 parse would report it — deliberately NOT
    // `scriptSpanOf(html)`, whose naive first-`<script`-occurrence search would
    // find the inert token inside the `title` attribute instead.
    const realScriptSpan = { start: html.indexOf('<script>init()'), end: html.length };
    expect(findExternalResources(html, [realScriptSpan])).toEqual(['http://evil.example/y']);
  });

  it('dedupes a url() that is also captured by the @import pattern (e.g. @import url(X))', () => {
    expect(findExternalResources('<style>@import url(http://evil.example/z.css);</style>')).toEqual([
      'http://evil.example/z.css'
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
      parseErrorCodes: [],
      assetExists: () => true
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
      parseErrorCodes: ['eof-in-tag'],
      assetExists: () => true
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('well-formedness');
  });

  it('fails on an external resource (check 4)', () => {
    const result = checkHtmlContent({
      htmlPath: 'html/p.html',
      metaPath: 'html/p.meta.json',
      htmlSource: '<img srcset="http://cdn.example.com/a.png 1x">',
      parsedMeta: { title: 'T', summary: 'S', aspect: '16:9' },
      parseErrorCodes: [],
      assetExists: () => true
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('cdn.example.com');
  });

  it('passes an https: resource (check 4)', () => {
    const result = checkHtmlContent({
      htmlPath: 'html/p.html',
      metaPath: 'html/p.meta.json',
      htmlSource: '<img srcset="https://cdn.example.com/a.png 1x">',
      parsedMeta: { title: 'T', summary: 'S', aspect: '16:9' },
      parseErrorCodes: [],
      assetExists: () => true
    });
    expect(result.valid).toBe(true);
  });

  it('passes a clean fragment', () => {
    const result = checkHtmlContent({
      htmlPath: 'html/p.html',
      metaPath: 'html/p.meta.json',
      htmlSource: '<p class="text-base">ok</p>',
      parsedMeta: { title: 'T', summary: 'S', aspect: '16:9' },
      parseErrorCodes: ['missing-doctype'],
      assetExists: () => true
    });
    expect(result.valid).toBe(true);
  });
});

describe('isHtmlCardDocPath', () => {
  it.each([
    ['repo-root .html', 'walkthrough.html'],
    ['nested .html', 'docs/architecture-overview.html'],
    ['deeply nested .html', 'docs/sub/dir/thing.html'],
    ['legacy html/ location is still eligible, not special', 'html/walkthrough.html'],
    ['a filename that merely starts with "attachments"', 'attachments-report.html'],
    ['a filename that is exactly "attachments.html"', 'attachments.html'],
    ['a nested filename that merely starts with "attachments"', 'docs/attachments.html']
  ])('accepts %s', (_label, path) => {
    expect(isHtmlCardDocPath(path)).toBe(true);
  });

  it.each([
    ['a top-level attachments/ file', 'attachments/foo.html'],
    ['a nested attachments/ file', 'docs/attachments/bar.html'],
    ['a deeply nested attachments/ file', 'a/b/attachments/c/d.html'],
    ['a non-.html file', 'docs/notes.md'],
    ['the sidecar itself', 'docs/walkthrough.meta.json'],
    ['a path merely containing "html"', 'html/notes.md']
  ])('rejects %s', (_label, path) => {
    expect(isHtmlCardDocPath(path)).toBe(false);
  });

  it('classifies Windows-separator paths identically', () => {
    expect(isHtmlCardDocPath('docs\\sub\\thing.html')).toBe(true);
    expect(isHtmlCardDocPath('docs\\attachments\\thing.html')).toBe(false);
  });
});

describe('isHtmlCardDocSidecarPath', () => {
  it.each([
    ['a repo-root sidecar', 'walkthrough.meta.json'],
    ['a nested sidecar', 'docs/architecture-overview.meta.json']
  ])('accepts %s', (_label, path) => {
    expect(isHtmlCardDocSidecarPath(path)).toBe(true);
  });

  it.each([
    ['a markdown document sidecar (extension-carrying stem)', 'CARD.md.meta.json'],
    ['a nested markdown document sidecar', 'plans/plan.md.meta.json'],
    ['an attachment sidecar', 'attachments/att-1.png.meta.json'],
    ['a sidecar under attachments/', 'attachments/foo.meta.json'],
    ['a nested sidecar under attachments/', 'docs/attachments/foo.meta.json'],
    ['the .html file itself', 'docs/walkthrough.html']
  ])('rejects %s', (_label, path) => {
    expect(isHtmlCardDocSidecarPath(path)).toBe(false);
  });
});

describe('sidecar path derivation', () => {
  it('derives the sidecar from an html path', () => {
    expect(htmlCardDocSidecarPath('docs/sub/thing.html')).toBe('docs/sub/thing.meta.json');
  });

  it('derives the html path from a sidecar', () => {
    expect(htmlCardDocPathForSidecar('docs/sub/thing.meta.json')).toBe('docs/sub/thing.html');
  });
});
