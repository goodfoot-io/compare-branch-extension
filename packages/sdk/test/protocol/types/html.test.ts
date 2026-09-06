/**
 * Unit tests for the shared HTML validation primitives — the single source of
 * truth that both the `card html check` CLI and the pre-commit hook delegate to.
 *
 * @summary Tests for HTML metadata, resource locality, and intrinsic-layout rules
 * @module test/protocol/types/html
 */

import { describe, expect, it } from 'vitest';
import type { HtmlDocumentFacts, ScriptSpan } from '../../../src/protocol/index.js';
import {
  checkHtmlContent,
  checkIntrinsicHtmlLayout,
  collectResourceReferences,
  filterStructuralParseErrors,
  htmlCardDocPathForSidecar,
  htmlCardDocSidecarPath,
  isHtmlCardDocPath,
  isHtmlCardDocSidecarPath,
  validateHtmlInfo
} from '../../../src/protocol/index.js';

/**
 * Rejected resource references for an HTML fixture, matching the retired
 * `findExternalResources` convenience wrapper's filter+map contract.
 */
function findExternalResources(htmlSource: string, scriptSpans: readonly ScriptSpan[] = []): string[] {
  return collectResourceReferences(htmlSource, '', scriptSpans)
    .filter((entry) => entry.classification.kind === 'rejected')
    .map((entry) => entry.reference);
}

describe('validateHtmlInfo — closed scripts policy', () => {
  it.each([
    ['missing scripts', { title: 'T', summary: 'S' }],
    ['non-boolean scripts', { title: 'T', summary: 'S', scripts: 'yes' }],
    ['removed aspect key', { title: 'T', summary: 'S', scripts: false, aspect: '16:9' }]
  ])('rejects %s', (_label, value) => {
    expect(validateHtmlInfo(value).valid).toBe(false);
  });

  it.each([true, false])('accepts explicit scripts: %s', (scripts) => {
    expect(validateHtmlInfo({ title: 'T', summary: 'S', scripts }).valid).toBe(true);
  });
});

describe('checkIntrinsicHtmlLayout', () => {
  it.each([
    ['root viewport sizing', 'html { min-height: 100vh }', 'root/body'],
    ['root scrolling', 'body { overflow-y: auto }', 'root/body'],
    ['fixed extents', '.banner { position: fixed }', 'fixed/absolute'],
    ['absolute pseudo-element extents', '.card::after { position: absolute }', 'pseudo-element'],
    ['transforms', '.card { transform: scale(1.1) }', 'transformed'],
    ['horizontal overflow', '.wide { min-width: 120vw }', 'horizontal overflow']
  ])('rejects %s', (_label, css, expected) => {
    const result = checkIntrinsicHtmlLayout({ cssSources: [{ css, source: '<style> block' }] });
    expect(result.errors.join('\n')).toContain(expected);
  });

  it('accepts normal-flow equivalents', () => {
    const result = checkIntrinsicHtmlLayout({
      cssSources: [{ css: '.page { display: grid; width: 100%; min-height: 12rem }', source: '<style> block' }]
    });
    expect(result.errors).toEqual([]);
  });

  it('applies root ownership only when the selector directly targets the root', () => {
    expect(
      checkIntrinsicHtmlLayout({
        cssSources: [{ css: 'body .panel { min-height: 12rem } :root .card { height: 20px }', source: '<style>' }]
      }).errors
    ).toEqual([]);
    expect(
      checkIntrinsicHtmlLayout({ cssSources: [{ css: 'body { display: flex }', source: '<style>' }] }).errors.join('\n')
    ).toContain('root/body');
  });

  it('rejects inline event handlers and decodes data:text/css stylesheets', () => {
    const result = checkIntrinsicHtmlLayout({
      inlineEventHandlers: [{ tagName: 'button', attributeName: 'onclick' }],
      stylesheetReferences: [{ reference: 'data:text/css,body%20%7B%20height%3A%20100vh%20%7D', source: '<link>' }]
    });
    expect(result.errors.join('\n')).toContain('onclick');
    expect(result.errors.join('\n')).toContain('root/body');
  });

  it('classifies unavailable HTTPS stylesheet bytes as runtime-audited', () => {
    const result = checkIntrinsicHtmlLayout({
      stylesheetReferences: [{ reference: 'https://example.com/page.css', source: '<link>' }]
    });
    expect(result.errors).toEqual([]);
    expect(result.runtimeAuditedStylesheets).toEqual(['https://example.com/page.css']);
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
  // The SDK has no parse5 dependency, so the boundary facts are the caller's
  // authority; the orchestration tests hand a complete set and the boundary
  // matrix below varies it.
  const COMPLETE_FACTS: HtmlDocumentFacts = {
    hasAuthoredDoctype: true,
    hasSourceLocatedRootStartTags: { html: true, head: true, body: true }
  };

  it('fails when scripts policy is missing (check 2)', () => {
    const result = checkHtmlContent({
      htmlPath: 'html/p.html',
      metaPath: 'html/p.meta.json',
      htmlSource: '<p>ok</p>',
      parsedMeta: { title: 'T', summary: 'S' },
      parseErrorCodes: [],
      documentFacts: COMPLETE_FACTS,
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
      parsedMeta: { title: 'T', summary: 'S', scripts: false },
      parseErrorCodes: ['eof-in-tag'],
      documentFacts: COMPLETE_FACTS,
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
      parsedMeta: { title: 'T', summary: 'S', scripts: false },
      parseErrorCodes: [],
      documentFacts: COMPLETE_FACTS,
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
      parsedMeta: { title: 'T', summary: 'S', scripts: false },
      parseErrorCodes: [],
      documentFacts: COMPLETE_FACTS,
      assetExists: () => true
    });
    expect(result.valid).toBe(true);
  });
});

describe('checkHtmlContent — complete-document boundary (check 3b)', () => {
  // A fragment once passed both authoring gates and rendered in a card-detail
  // webview as a navigation storm, so the shared policy now requires an
  // authored doctype plus source-located `html`, `head`, and `body` start
  // tags. The SDK has no parse5 dependency, so the facts are constructed
  // literally here — the parse-backed producer lives in
  // `@cards.management/html-spans` (`collectDocumentFacts`).
  const BOUNDARIES = ['doctype', 'html', 'head', 'body'] as const;

  /**
   * Builds facts whose every boundary is present except the ones named.
   *
   * @param missing - Boundaries to omit.
   * @returns Facts with exactly the named boundaries missing.
   */
  function factsMissing(...missing: Array<(typeof BOUNDARIES)[number]>): HtmlDocumentFacts {
    return {
      hasAuthoredDoctype: !missing.includes('doctype'),
      hasSourceLocatedRootStartTags: {
        html: !missing.includes('html'),
        head: !missing.includes('head'),
        body: !missing.includes('body')
      }
    };
  }

  const SINGLE_BOUNDARY_CASES: Array<[(typeof BOUNDARIES)[number], string]> = [
    ['doctype', '<!DOCTYPE'],
    ['html', '<html>'],
    ['head', '<head>'],
    ['body', '<body>']
  ];

  it('passes complete facts', () => {
    const result = checkHtmlContent({
      htmlPath: 'html/p.html',
      metaPath: 'html/p.meta.json',
      htmlSource: '<!DOCTYPE html><html><head><title>T</title></head><body><p>hi</p></body></html>',
      parsedMeta: { title: 'T', summary: 'S', scripts: false },
      parseErrorCodes: [],
      documentFacts: factsMissing(),
      assetExists: () => true
    });
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it.each(
    SINGLE_BOUNDARY_CASES
  )('fails when only the %s is missing, naming it with the path prefix', (boundary, marker) => {
    const result = checkHtmlContent({
      htmlPath: 'html/p.html',
      metaPath: 'html/p.meta.json',
      htmlSource: '<!DOCTYPE html><html><head></head><body></body></html>',
      parsedMeta: { title: 'T', summary: 'S', scripts: false },
      parseErrorCodes: [],
      documentFacts: factsMissing(boundary),
      assetExists: () => true
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/^html\/p\.html: /);
    expect(result.errors[0]).toContain(marker);
  });

  it('produces a single error naming every boundary when all are missing at once', () => {
    const result = checkHtmlContent({
      htmlPath: 'html/p.html',
      metaPath: 'html/p.meta.json',
      htmlSource: '<p class="text-base">ok</p>',
      parsedMeta: { title: 'T', summary: 'S', scripts: false },
      parseErrorCodes: ['missing-doctype'],
      documentFacts: factsMissing(...BOUNDARIES),
      assetExists: () => true
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/^html\/p\.html: /);
    expect(result.errors[0]).toContain('<!DOCTYPE');
    expect(result.errors[0]).toContain('<html>');
    expect(result.errors[0]).toContain('<head>');
    expect(result.errors[0]).toContain('<body>');
  });

  it('gives the specific complete-document error, not a duplicate generic parse error, for missing-doctype', () => {
    // `missing-doctype` stays informational so the fragment case reports the
    // actionable boundary error exactly once.
    const result = checkHtmlContent({
      htmlPath: 'html/p.html',
      metaPath: 'html/p.meta.json',
      htmlSource: '<html><head></head><body></body></html>',
      parsedMeta: { title: 'T', summary: 'S', scripts: false },
      parseErrorCodes: ['missing-doctype'],
      documentFacts: factsMissing('doctype'),
      assetExists: () => true
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('html/p.html');
    expect(result.errors[0]).toContain('<!DOCTYPE');
    expect(result.errors[0]).not.toContain('well-formedness');
  });

  it('runs before the resource-locality check — an incomplete document reports the boundary, not its references', () => {
    const result = checkHtmlContent({
      htmlPath: 'html/p.html',
      metaPath: 'html/p.meta.json',
      htmlSource: '<p><img src="http://cdn.example.com/a.png"></p>',
      parsedMeta: { title: 'T', summary: 'S', scripts: false },
      parseErrorCodes: [],
      documentFacts: factsMissing('doctype', 'html', 'head', 'body'),
      assetExists: () => true
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('html/p.html');
    expect(result.errors[0]).not.toContain('cdn.example.com');
  });

  it('rejects a foreign-namespace <html> lookalike — the SVG-namespace element <svg><html> produces is not an authored root', () => {
    // `<!DOCTYPE html><svg><html></html></svg>` parses to an SVG-namespace
    // element named `html` carrying a start-tag location, while the real
    // root structure is parse5-synthesized. The facts below are exactly what
    // `collectDocumentFacts` reports for that tree — its HTML-namespace
    // filter is pinned in `@cards.management/html-spans` — and the boundary
    // check must reject the document.
    const result = checkHtmlContent({
      htmlPath: 'html/p.html',
      metaPath: 'html/p.meta.json',
      htmlSource: '<!DOCTYPE html><svg><html></html></svg>',
      parsedMeta: { title: 'T', summary: 'S', scripts: false },
      parseErrorCodes: [],
      documentFacts: {
        hasAuthoredDoctype: true,
        hasSourceLocatedRootStartTags: { html: false, head: false, body: false }
      },
      assetExists: () => true
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/^html\/p\.html: /);
    expect(result.errors[0]).toContain('<html>');
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
