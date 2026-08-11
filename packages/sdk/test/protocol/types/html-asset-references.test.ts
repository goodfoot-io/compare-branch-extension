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
import { checkHtmlContent, classifyResourceReference, isHtmlCardDocPath } from '../../../src/protocol/index.js';

const ROOT_PAGE = 'walkthrough.html';
const NESTED_PAGE = 'docs/overview.html';

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
