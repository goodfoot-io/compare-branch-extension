/**
 * Tests for `classifyResourceReference` — the rule deciding whether a resource
 * reference in an HTML card document is passed through untouched, rewritten at
 * render time to a served `assets/` file, or rejected at commit time.
 *
 * The classifier is pure: it never consults the filesystem, because "exists"
 * means the working tree to the `cards html check` CLI and the git index to the
 * pre-commit hook. Existence is `checkHtmlContent`'s `assetExists` callback,
 * covered separately. What is covered here is resolution — which is where the
 * subtle failures live, since a reference is resolved against the *directory of
 * the HTML file it appears in* while `assets/` is reserved only at the
 * repository root.
 *
 * @summary Tests for assets/ resolution and rejection rules
 * @module test/protocol/types/html-asset-references
 */

import { describe, expect, it } from 'vitest';
import type { ElementSpan } from '../../../src/protocol/index.js';
import { checkHtmlContent, classifyResourceReference, isHtmlCardDocPath } from '../../../src/protocol/index.js';

const ROOT_PAGE = 'walkthrough.html';
const NESTED_PAGE = 'docs/overview.html';

/**
 * Locates whole-element spans for the given tag in an HTML fixture, matching
 * what the real producers emit — parse5's `startOffset`/`endOffset` for the
 * element node (see `collectScriptSpans`/`collectElementSpans` in
 * `@cards.management/html-spans`). The SDK deliberately carries no parse5
 * dependency, so the tests hand-roll the same shape for controlled fixtures;
 * an element without a close tag ends at its start tag's `>`, as parse5
 * reports for void elements.
 *
 * @param html - HTML fixture to locate spans in.
 * @param tagName - Lowercase tag name to find.
 * @returns Whole-element spans for every matching element, in source order.
 */
function elementSpans(html: string, tagName: 'script' | 'iframe' | 'frame' | 'embed'): ElementSpan[] {
  const spans: ElementSpan[] = [];
  const OPEN = `<${tagName}`;
  const CLOSE = `</${tagName}>`;
  let cursor = 0;
  while (cursor < html.length) {
    const start = html.indexOf(OPEN, cursor);
    if (start === -1) break;
    // The start tag ends at its first *unquoted* `>` — a `>` inside a quoted
    // attribute value (a data: URI can contain `<svg/>`) is not the tag's end,
    // mirroring the SDK's own quote-tracking scan.
    let openEnd = -1;
    let quote: string | null = null;
    for (let i = start; i < html.length; i++) {
      const ch = html[i]!;
      if (quote !== null) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === '>') {
        openEnd = i;
        break;
      }
    }
    if (openEnd === -1) break;
    const closeAt = html.indexOf(CLOSE, openEnd);
    if (closeAt === -1) {
      spans.push({ start, end: openEnd + 1 });
      cursor = openEnd + 1;
      continue;
    }
    const end = closeAt + CLOSE.length;
    spans.push({ start, end });
    cursor = end;
  }
  return spans;
}

describe('classifyResourceReference — references that stay allowed', () => {
  it.each([
    ['data: URI', 'data:image/png;base64,AAAA'],
    ['same-document fragment', '#section-two'],
    ['https: URL', 'https://cdn.example.com/a.png']
  ])('classifies a %s as allowed', (_label, reference) => {
    expect(classifyResourceReference(reference, ROOT_PAGE)).toEqual({ kind: 'allowed' });
  });

  it('tolerates surrounding whitespace, which the attribute value carries verbatim', () => {
    expect(classifyResourceReference('  #section-two  ', ROOT_PAGE)).toEqual({ kind: 'allowed' });
  });
});

describe('classifyResourceReference — references resolving into assets/', () => {
  it('resolves a root-page reference directly', () => {
    expect(classifyResourceReference('assets/diagram.png', ROOT_PAGE)).toEqual({
      kind: 'asset',
      assetPath: 'assets/diagram.png'
    });
  });

  it('resolves a nested page reaching the root with ../', () => {
    expect(classifyResourceReference('../assets/diagram.png', NESTED_PAGE)).toEqual({
      kind: 'asset',
      assetPath: 'assets/diagram.png'
    });
  });

  it('resolves a nested subdirectory of assets/', () => {
    expect(classifyResourceReference('assets/fonts/inter.woff2', ROOT_PAGE)).toEqual({
      kind: 'asset',
      assetPath: 'assets/fonts/inter.woff2'
    });
  });

  it('normalizes a redundant ./ segment', () => {
    expect(classifyResourceReference('./assets/diagram.png', ROOT_PAGE)).toEqual({
      kind: 'asset',
      assetPath: 'assets/diagram.png'
    });
  });

  it('normalizes a round-trip through a sibling directory', () => {
    expect(classifyResourceReference('assets/fonts/../diagram.png', ROOT_PAGE)).toEqual({
      kind: 'asset',
      assetPath: 'assets/diagram.png'
    });
  });

  it('strips a cache-busting query string, which is ordinary font syntax', () => {
    expect(classifyResourceReference('assets/inter.woff2?v=2', ROOT_PAGE)).toEqual({
      kind: 'asset',
      assetPath: 'assets/inter.woff2'
    });
  });

  it('strips a fragment, which is ordinary font syntax (the IE `#iefix` idiom)', () => {
    expect(classifyResourceReference('assets/inter.eot#iefix', ROOT_PAGE)).toEqual({
      kind: 'asset',
      assetPath: 'assets/inter.eot'
    });
  });

  it('strips a query string and a fragment together', () => {
    expect(classifyResourceReference('assets/inter.eot?v=2#iefix', ROOT_PAGE)).toEqual({
      kind: 'asset',
      assetPath: 'assets/inter.eot'
    });
  });

  it('percent-decodes a space in a filename', () => {
    expect(classifyResourceReference('assets/my%20logo.png', ROOT_PAGE)).toEqual({
      kind: 'asset',
      assetPath: 'assets/my logo.png'
    });
  });
});

describe('classifyResourceReference — decoding happens before segmenting', () => {
  it('rejects an encoded ../ that would escape assets/ only after decoding', () => {
    // `assets/a%2e%2e%2fb.png` decodes to `assets/a../b.png`; a segment check
    // performed on the raw string sees only the literal segment `a%2e%2e%2fb.png`
    // and lets it through. The mirror image holds on the serving side, where
    // Express percent-decodes `req.params` before the route ever sees the path.
    const result = classifyResourceReference('assets/%2e%2e%2fsecrets.png', ROOT_PAGE);
    expect(result.kind).toBe('rejected');
  });

  it('does not throw on a literal % in a filename', () => {
    // `decodeURIComponent('assets/100%.png')` throws URIError, and neither the
    // CLI nor the hook wraps the call — so an unguarded decode surfaces as
    // "Unexpected error" at commit time and blanks the page at render time.
    expect(() => classifyResourceReference('assets/100%.png', ROOT_PAGE)).not.toThrow();
  });
});

describe('classifyResourceReference — references that stay rejected', () => {
  it('rejects a relative path resolving outside assets/ from a root page', () => {
    const result = classifyResourceReference('./local.css', ROOT_PAGE);
    expect(result.kind).toBe('rejected');
  });

  it('rejects a nested page reference that resolves to docs/assets/, not assets/', () => {
    // The single most likely first-attempt mistake, and the direct cost of
    // reserving `assets/` at the repository root only.
    const result = classifyResourceReference('assets/logo.png', NESTED_PAGE);
    expect(result.kind).toBe('rejected');
  });

  it('rejects a reference escaping the repository root', () => {
    const result = classifyResourceReference('../../assets/logo.png', ROOT_PAGE);
    expect(result.kind).toBe('rejected');
  });

  it.each([
    ['root-absolute', '/assets/logo.png'],
    ['protocol-relative', '//cdn.example.com/logo.png'],
    ['backslash-separated', 'assets\\logo.png'],
    ['http: scheme', 'http://cdn.example.com/logo.png'],
    ['file: scheme', 'file:///etc/passwd']
  ])('rejects a %s reference', (_label, reference) => {
    expect(classifyResourceReference(reference, ROOT_PAGE).kind).toBe('rejected');
  });
});

describe('classifyResourceReference — directory-style trailing slashes', () => {
  // `assets/logo.png/` normalizes to `assets/logo.png` — the empty trailing
  // segment is skipped — so the raw segment rules let it through, but the asset
  // route serves files only: a request to `<asset>/` is answered with 404, and
  // the page would silently fail to load. The refusal happens before
  // segmentation, so no normalization can un-skip it.
  it.each([
    ['a literal trailing slash', 'assets/logo.png/', ROOT_PAGE],
    ['an encoded trailing slash', 'assets/logo.png%2F', ROOT_PAGE],
    ['from a nested page', '../assets/logo.png/', NESTED_PAGE]
  ])('rejects %s', (_label, reference, page) => {
    const result = classifyResourceReference(reference, page);
    expect(result.kind).toBe('rejected');
    if (result.kind !== 'rejected') return;
    expect(result.reason).toMatch(/ends with a '\/'/);
  });

  it('keeps a trailing query string accepted, which is ordinary font syntax', () => {
    expect(classifyResourceReference('assets/logo.png?v=2', ROOT_PAGE).kind).toBe('asset');
  });
});

describe('classifyResourceReference — the rejection suggestion cannot dead-end', () => {
  // The suggestion is a path the author can write next that actually resolves
  // into root `assets/`. The replay form prefixes the page's `../` depth onto a
  // clean root-relative `assets/` reference; every other shape re-anchors at
  // the resolved asset path. A formula that replayed the raw reference with the
  // depth prefix would send a `../`-carrying (or plain-name) author straight
  // back out of `assets/` — the same rejection, looped.
  it.each([
    ['a plain name from a nested page', 'logo.png', NESTED_PAGE, '../assets/logo.png'],
    ['a dot-relative reference from a nested page', '../logo.png', NESTED_PAGE, '../assets/logo.png'],
    ['a plain name from a root page', 'logo.png', ROOT_PAGE, 'assets/logo.png'],
    ['a dot-relative reference from a root page', './logo.png', ROOT_PAGE, 'assets/logo.png']
  ])('suggests the assets/ path for %s', (_label, reference, page, suggested) => {
    const result = classifyResourceReference(reference, page);
    expect(result.kind).toBe('rejected');
    if (result.kind !== 'rejected') return;
    expect(result.reason).toContain(suggested);
  });

  it('replays a clean root-relative assets/ reference with the page depth prefix', () => {
    const result = classifyResourceReference('assets/logo.png', NESTED_PAGE);
    expect(result.kind).toBe('rejected');
    if (result.kind !== 'rejected') return;
    expect(result.reason).toContain('../assets/logo.png');
  });
});

describe('classifyResourceReference — rejection reasons are author-facing', () => {
  it('names the resolved path and the corrected reference for a nested page', () => {
    const result = classifyResourceReference('assets/logo.png', NESTED_PAGE);
    expect(result.kind).toBe('rejected');
    if (result.kind !== 'rejected') return;
    // The author wrote a path that looks right; the message has to explain both
    // where it actually landed and what to write instead, or the root-only rule
    // is indistinguishable from a bug.
    expect(result.reason).toContain('docs/assets/logo.png');
    expect(result.reason).toContain('../assets/logo.png');
  });

  it('says the reference escapes the repository root', () => {
    const result = classifyResourceReference('../../assets/logo.png', ROOT_PAGE);
    expect(result.kind).toBe('rejected');
    if (result.kind !== 'rejected') return;
    expect(result.reason).toMatch(/repository root/i);
  });
});

describe('classifyResourceReference — segments the asset server will refuse', () => {
  // The serving route runs `send` with `dotfiles: 'deny'`. A reference the gate
  // accepts and the route then 403s is a gate/render inversion: the author
  // commits successfully and the page silently fails to load. These reject at
  // the gate so the failure is a commit-time message instead.
  it.each([
    ['assets/.hidden.png', '.hidden.png'],
    ['assets/.well-known/probe.json', '.well-known'],
    ['assets/sub/.dot.css', '.dot.css']
  ])('rejects %s, naming the offending segment', (reference, segment) => {
    const result = classifyResourceReference(reference, ROOT_PAGE);
    expect(result.kind).toBe('rejected');
    if (result.kind !== 'rejected') return;
    expect(result.reason).toContain(segment);
  });

  it('does not reject a dot that is not leading a segment', () => {
    // The rule is about `send`'s dotfile filter, which keys on the segment's
    // first character — an ordinary versioned or multi-extension filename is
    // unaffected and must stay servable.
    expect(classifyResourceReference('assets/logo.v2.min.css', ROOT_PAGE)).toEqual({
      kind: 'asset',
      assetPath: 'assets/logo.v2.min.css'
    });
  });

  it('still resolves a relative reference that traverses through a dot-free path', () => {
    // `.` and `..` are consumed during resolution, so they must never be
    // mistaken for dot-leading segments by the check that follows.
    expect(classifyResourceReference('./assets/../assets/logo.png', ROOT_PAGE)).toEqual({
      kind: 'asset',
      assetPath: 'assets/logo.png'
    });
  });
});

describe('classifyResourceReference — mappable-extension rule', () => {
  // An asset whose extension `mime-types` cannot map is refused: the asset
  // route would serve it as `application/octet-stream`, and render is
  // sniff-dependent from there — the same gate/render-agreement argument as
  // the dot-segment rule above. `mime-types` is the mapping authority, so the
  // acceptance/rejection split below is whatever it says it is.
  it.each([
    ['a PNG', 'assets/diagram.png'],
    ['a stylesheet', 'assets/theme.css'],
    ['a script', 'assets/app.js'],
    ['a WOFF2 font', 'assets/inter.woff2'],
    ['an EOT font', 'assets/inter.eot'],
    ['a video', 'assets/demo.mp4'],
    ['an audio file', 'assets/loop.mp3'],
    ['a WebM video', 'assets/demo.webm'],
    ['an SVG', 'assets/logo.svg'],
    ['a WebP image', 'assets/pic.webp'],
    ['an AVIF image', 'assets/pic.avif'],
    ['an ICO favicon', 'assets/favicon.ico'],
    ['a JSON data file', 'assets/data.json'],
    ['a gzip archive', 'assets/archive.tar.gz']
  ])('accepts %s', (_label, reference) => {
    expect(classifyResourceReference(reference, ROOT_PAGE).kind).toBe('asset');
  });

  it.each([
    ['an unmapped extension', 'assets/blob.dat'],
    ['an extensionless file', 'assets/blob'],
    ['a made-up extension', 'assets/thing.unknown']
  ])('rejects a reference with %s', (_label, reference) => {
    const result = classifyResourceReference(reference, ROOT_PAGE);
    expect(result.kind).toBe('rejected');
    if (result.kind !== 'rejected') return;
    expect(result.reason).toMatch(/extension/i);
  });

  it('strips a query string before deciding the extension', () => {
    expect(classifyResourceReference('assets/blob.dat?v=2', ROOT_PAGE).kind).toBe('rejected');
  });

  it('names the failing extension in the rejection reason', () => {
    const result = classifyResourceReference('assets/blob.dat', ROOT_PAGE);
    expect(result.kind).toBe('rejected');
    if (result.kind !== 'rejected') return;
    expect(result.reason).toContain('.dat');
  });
});

describe('classifyResourceReference — extension naming comes from the basename', () => {
  // The extension is taken from the *filename*, never from a directory segment
  // — `assets/blob` must be reported as extensionless, not as "the extension
  // `.assets/blob`" (the segment before the final dot). The old form cut at the
  // last dot of the whole path, which misnamed the failure and sent the author
  // hunting for a dot in the wrong place.
  it.each([
    ['assets/blob', /no file extension/],
    ['assets/dir.dotted/blob', /no file extension/]
  ])('reports %s as extensionless', (reference, pattern) => {
    const result = classifyResourceReference(reference, ROOT_PAGE);
    expect(result.kind).toBe('rejected');
    if (result.kind !== 'rejected') return;
    expect(result.reason).toMatch(pattern);
    expect(result.reason).not.toContain(`.${reference.replace(/.*\//, '')}`);
  });

  it('still names the extension of a dotted basename', () => {
    const result = classifyResourceReference('assets/dir.dotted/blob.dat', ROOT_PAGE);
    expect(result.kind).toBe('rejected');
    if (result.kind !== 'rejected') return;
    expect(result.reason).toContain('.dat');
  });
});

describe('classifyResourceReference — html files are not assets', () => {
  // `isHtmlCardDocPath` keeps `.html` files under root `assets/` out of the
  // timeline — "a page stored under it is not a card document" — and the gate's
  // accepts-exactly-what-renders promise demands the same refusal here: the
  // asset route serves none of the document contract (base target, theme bake,
  // nonce stamp) that committed pages render under.
  it.each([
    ['a root page', 'assets/fragment.html'],
    ['a nested page', 'assets/templates/row.html'],
    ['from a nested page', '../assets/fragment.html'],
    ['with a query string', 'assets/fragment.html?v=2'],
    ['a case-variant extension', 'assets/PAGE.HTML']
  ])('rejects an html reference — %s', (_label, reference) => {
    const page = reference.startsWith('..') ? NESTED_PAGE : ROOT_PAGE;
    const result = classifyResourceReference(reference, page);
    expect(result.kind).toBe('rejected');
    if (result.kind !== 'rejected') return;
    expect(result.reason).toMatch(/HTML file|card document/);
  });

  it('still accepts a non-html file in the same directory', () => {
    expect(classifyResourceReference('assets/fragment.css', ROOT_PAGE).kind).toBe('asset');
  });
});

describe('checkHtmlContent — check 4 rework: rejected references fail with their reason', () => {
  // Check 4 moves onto classifications: every rejected reference fails with
  // its own error naming the reference as written and the classifier's
  // author-facing reason, instead of one combined line listing every URL.
  const PAGE = {
    htmlPath: 'walkthrough.html',
    metaPath: 'walkthrough.meta.json',
    parsedMeta: { title: 'T', summary: 'S', aspect: '16:9' },
    parseErrorCodes: [] as string[],
    scriptSpans: []
  };

  it('reports a rejected reference naming the reference as written', () => {
    const result = checkHtmlContent({
      ...PAGE,
      htmlSource: '<img src="http://cdn.example.com/a.png">',
      assetExists: () => true
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('http://cdn.example.com/a.png');
  });

  it('reports two distinct rejected references as two errors, not one combined line', () => {
    const result = checkHtmlContent({
      ...PAGE,
      htmlSource: '<img src="http://a.example/x.png"><img src="assets/.hidden.png">',
      assetExists: () => true
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it('never asks about existence for a reference the classifier refuses', () => {
    const seen: string[] = [];
    checkHtmlContent({
      ...PAGE,
      htmlSource: '<img src="assets/.hidden.png">',
      assetExists: (assetPath) => {
        seen.push(assetPath);
        return true;
      }
    });
    expect(seen).toEqual([]);
  });
});

describe('assets/ is not part of the timeline', () => {
  it.each([
    ['a page under assets/', 'assets/fragment.html'],
    ['a page nested under assets/', 'assets/templates/row.html']
  ])('does not treat %s as a card document', (_label, path) => {
    // The set of files hidden from the timeline and the set of files served to
    // pages must be identical — an `.html` file under assets/ is a fragment or
    // a template, so it is also exempt from the sidecar-pairing rule.
    expect(isHtmlCardDocPath(path)).toBe(false);
  });

  it('still treats a file merely named like the directory as a card document', () => {
    expect(isHtmlCardDocPath('assets-report.html')).toBe(true);
  });

  it('recognizes assets/ only at the repository root', () => {
    // The deliberate asymmetry with `attachments/`, which excludes at any depth.
    expect(isHtmlCardDocPath('docs/assets/page.html')).toBe(true);
  });
});

describe('checkHtmlContent — asset existence is the caller’s answer', () => {
  const PAGE = {
    htmlPath: 'walkthrough.html',
    metaPath: 'walkthrough.meta.json',
    parsedMeta: { title: 'T', summary: 'S', aspect: '16:9' },
    parseErrorCodes: [] as string[],
    scriptSpans: []
  };

  it('passes a reference to an asset the caller reports as present', () => {
    const result = checkHtmlContent({
      ...PAGE,
      htmlSource: '<img src="assets/diagram.png">',
      assetExists: (assetPath) => assetPath === 'assets/diagram.png'
    });
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('fails a reference to an asset the caller reports as absent, naming the path', () => {
    const result = checkHtmlContent({
      ...PAGE,
      htmlSource: '<img src="assets/missing.png">',
      assetExists: () => false
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('assets/missing.png');
  });

  it('asks the caller about the normalized path, not the reference as written', () => {
    // The predicate is a filesystem lookup on the other side of the boundary;
    // handing it a query string or an undecoded escape makes it always miss.
    const seen: string[] = [];
    checkHtmlContent({
      ...PAGE,
      htmlSource: '<link rel="stylesheet" href="./assets/my%20theme.css?v=2">',
      assetExists: (assetPath) => {
        seen.push(assetPath);
        return true;
      }
    });
    expect(seen).toEqual(['assets/my theme.css']);
  });

  it('never asks about a reference that is allowed outright', () => {
    const seen: string[] = [];
    checkHtmlContent({
      ...PAGE,
      htmlSource: '<img src="data:image/png;base64,AAAA"><a href="#top">t</a>',
      assetExists: (assetPath) => {
        seen.push(assetPath);
        return true;
      }
    });
    expect(seen).toEqual([]);
  });

  it('reports each distinct failure class separately rather than as one combined line', () => {
    const result = checkHtmlContent({
      ...PAGE,
      htmlSource: '<img src="assets/missing.png"><img src="./local.png">',
      assetExists: () => false
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe('checkHtmlContent — frame-element start-tag references are refused', () => {
  // The served-document CSP carries no frame-src or object-src token, so every
  // frame and object load falls back to `default-src 'none'` — nothing an
  // `<iframe>`, `<frame>`, or `<embed>` points at can ever render, whatever the
  // reference is. Committing one would bless a page that silently renders
  // nothing, so the position rule refuses the whole class at commit time.
  const PAGE = {
    htmlPath: 'walkthrough.html',
    metaPath: 'walkthrough.meta.json',
    parsedMeta: { title: 'T', summary: 'S', aspect: '16:9' },
    parseErrorCodes: [] as string[],
    scriptSpans: []
  };

  it.each([
    ['iframe', '<iframe src="assets/frame.svg"></iframe>'],
    ['frame', '<frame src="assets/frame.svg">'],
    ['embed', '<embed src="assets/frame.svg">']
  ])('refuses an assets/ reference in a %s start tag', (tag, htmlSource) => {
    const result = checkHtmlContent({
      ...PAGE,
      htmlSource,
      frameElementSpans: elementSpans(htmlSource, tag as 'iframe' | 'frame' | 'embed'),
      assetExists: () => true
    });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors[0]).toMatch(/embedded frame/);
  });

  it('refuses an https: reference in an iframe start tag — no scheme can render under the CSP', () => {
    const htmlSource = '<iframe src="https://cdn.example.com/embed.html"></iframe>';
    const result = checkHtmlContent({
      ...PAGE,
      htmlSource,
      frameElementSpans: elementSpans(htmlSource, 'iframe'),
      assetExists: () => true
    });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors[0]).toContain('https://cdn.example.com/embed.html');
  });

  it('refuses a data: reference in an embed start tag', () => {
    const htmlSource = '<embed src="data:image/svg+xml,<svg/>">';
    const result = checkHtmlContent({
      ...PAGE,
      htmlSource,
      frameElementSpans: elementSpans(htmlSource, 'embed'),
      assetExists: () => true
    });
    expect(result.valid).toBe(false);
  });

  it('refuses an assets/ reference in an unterminated iframe start tag', () => {
    // A frame element with no close tag is legal HTML; parse5 reports it as a
    // zero-width span (start === end), which the position rules extend to the
    // source end so the start tag's own references stay refused — otherwise
    // `<div><iframe src="assets/x.png">` would pass the gate and render a
    // CSP-blocked blank frame.
    const htmlSource = '<div><iframe src="assets/frame.svg">';
    const result = checkHtmlContent({
      ...PAGE,
      htmlSource,
      frameElementSpans: [{ start: 5, end: 5 }],
      assetExists: () => true
    });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors[0]).toMatch(/embedded frame/);
  });

  it('keeps the same reference allowed on an ordinary element', () => {
    const htmlSource = '<img src="assets/frame.svg">';
    const result = checkHtmlContent({
      ...PAGE,
      htmlSource,
      frameElementSpans: elementSpans(htmlSource, 'iframe'),
      assetExists: () => true
    });
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('ignores an inert <iframe token inside a comment — spans come from a real parse', () => {
    // A parse5 span collection finds no iframe element here, so the token
    // stays inert text; the fixture hands over the same empty collection.
    const htmlSource = '<!-- <iframe src="assets/frame.svg"></iframe> -->';
    const result = checkHtmlContent({
      ...PAGE,
      htmlSource,
      frameElementSpans: [],
      assetExists: () => true
    });
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('ignores an iframe token inside a script body, which the span redaction blanks', () => {
    const htmlSource = '<script>var s = "<iframe src=\'assets/frame.svg\'>";</script>';
    const result = checkHtmlContent({
      ...PAGE,
      htmlSource,
      frameElementSpans: [],
      assetExists: () => true
    });
    expect(result).toEqual({ valid: true, errors: [] });
  });
});

describe('checkHtmlContent — data: references in a <script> src are refused', () => {
  // script-src carries only the nonce and `https:` — a `data:` script src can
  // never load under the served CSP, so the position rule refuses it at commit
  // time; the same data: reference on any other element stays allowed.
  const PAGE = {
    htmlPath: 'walkthrough.html',
    metaPath: 'walkthrough.meta.json',
    parsedMeta: { title: 'T', summary: 'S', aspect: '16:9' },
    parseErrorCodes: [] as string[],
    scriptSpans: []
  };

  it('refuses a data: URI in a script src', () => {
    const htmlSource = '<script src="data:text/javascript,alert(1)"></script>';
    const result = checkHtmlContent({
      ...PAGE,
      htmlSource,
      scriptSpans: elementSpans(htmlSource, 'script'),
      assetExists: () => true
    });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors[0]).toMatch(/script-src/);
  });

  it('keeps a data: URI on a non-script element allowed', () => {
    const htmlSource = '<img src="data:image/png;base64,AAAA">';
    const result = checkHtmlContent({
      ...PAGE,
      htmlSource,
      scriptSpans: [],
      assetExists: () => true
    });
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('keeps an https: script src allowed', () => {
    const htmlSource = '<script src="https://cdn.example.com/a.js"></script>';
    const result = checkHtmlContent({
      ...PAGE,
      htmlSource,
      scriptSpans: elementSpans(htmlSource, 'script'),
      assetExists: () => true
    });
    expect(result).toEqual({ valid: true, errors: [] });
  });
});
