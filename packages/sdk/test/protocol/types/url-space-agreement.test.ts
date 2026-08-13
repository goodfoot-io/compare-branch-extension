/**
 * Gate ↔ URL-space agreement: the URL the browser resolves for every reference
 * the gate accepts must be a path the route set actually serves.
 *
 * The served document lives at `/cards/:cardId/html-files/{repoPath}` and the
 * asset route mounts at `/cards/:cardId/html-files/assets/*` — the URL space
 * the browser's relative resolution lands in against the document's address.
 * The gate classifies a reference by resolving it against the page's
 * *repo-relative* directory ([classifyResourceReference](./src/protocol/types/html.ts));
 * the browser resolves the same reference against the document's *URL*
 * directory. Because the URL mirrors the repo path (`html-files/{repoPath}`),
 * the two resolutions must agree — this test pins that mirror, and with it the
 * invariant the [url-space-route-agreement span](./.span/html-assets/url-space-route-agreement)
 * guards: a change to the classifier's root-only `assets/` reservation or to
 * the route's mount independently leaves the other side's tests green while
 * accepted references 404 in the browser.
 *
 * The route side of the agreement (real `CardsServer` mounts, `dotfiles:
 * 'deny'` refusal, containment) is enforced by Phase C's integration tests;
 * this file pins the pure URL arithmetic the route set is mounted against.
 *
 * @summary Browser-resolved reference URLs vs the served route set
 * @module test/protocol/types/url-space-agreement
 */

import { describe, expect, it } from 'vitest';
import { classifyResourceReference } from '../../../src/protocol/index.js';

const CARD_ID = 'card-448';

function documentUrl(repoPath: string): string {
  return `https://cards.test/cards/${CARD_ID}/html-files/${repoPath}`;
}

function assetRouteUrl(assetPath: string): string {
  return `/cards/${CARD_ID}/html-files/${assetPath}`;
}

/**
 * Resolves a URL pathname the way the route set actually serves it.
 *
 * Express matches route patterns against the *raw* path before any decoding,
 * so the asset route's literal `assets` segment only matches when the raw
 * fourth segment is exactly `assets` — an encoded `%2F` (or any other escape)
 * inside that segment keeps it from ever matching, which is what makes
 * `assets%2Fdiagram.png` a 404. Only the wildcard that follows the literal
 * prefix is percent-decoded (Express hands the route an array of decoded
 * segments), and its dot segments are collapsed the way `path.join` and
 * realpath containment resolve them. A pathname that does not match the
 * literal prefix is returned raw: it is answered by other routes (the
 * document route refuses decoded assets/-space paths; other mounts 404), none
 * of which serve asset bytes.
 *
 * @param pathname - A URL pathname as the browser resolved it.
 * @returns The path the route set resolves — the asset route's served path
 *   when the literal prefix matched, otherwise the untouched pathname.
 */
function resolvedPath(pathname: string): string {
  const raw = pathname.split('/').filter((segment) => segment.length > 0);
  // `/cards/:cardId/html-files/assets` — the literal prefix the asset route
  // matches against raw segments, before any percent-decoding.
  if (raw.length >= 4 && raw[0] === 'cards' && raw[2] === 'html-files' && raw[3] === 'assets') {
    const segments = ['cards', raw[1], 'html-files', 'assets'];
    for (const decoded of raw.slice(4).map(decodeURIComponent)) {
      for (const inner of decoded.split('/')) {
        if (inner === '' || inner === '.') continue;
        if (inner === '..') segments.pop();
        else segments.push(inner);
      }
    }
    return `/${segments.join('/')}`;
  }
  return pathname;
}

describe('gate ↔ URL-space agreement', () => {
  it.each([
    ['a root-page reference', 'assets/diagram.png', 'walkthrough.html'],
    ['a nested page reaching the root', '../assets/diagram.png', 'docs/overview.html'],
    ['a redundant ./ segment', './assets/diagram.png', 'walkthrough.html'],
    ['a nested subdirectory of assets/', 'assets/fonts/inter.woff2', 'walkthrough.html'],
    ['a cache-busting query string', 'assets/inter.woff2?v=2', 'walkthrough.html'],
    ['a fragment (the IE #iefix idiom)', 'assets/inter.eot#iefix', 'walkthrough.html'],
    ['an encoded space in a filename', 'assets/my%20logo.png', 'walkthrough.html'],
    [
      'an encoded slash inside the wildcard, past the literal assets segment',
      'assets/100%2Fcomplete.png',
      'walkthrough.html'
    ]
  ])('%s resolves onto the asset route URL space', (_label, reference, page) => {
    const cls = classifyResourceReference(reference, page);
    expect(cls.kind).toBe('asset');
    if (cls.kind !== 'asset') return;
    // The route set serves resolved paths (percent-decoded, dot segments
    // collapsed), so the browser's pathname must resolve to the route's path
    // for the classifier's assetPath exactly.
    const pathname = resolvedPath(new URL(reference, documentUrl(page)).pathname);
    expect(pathname).toBe(assetRouteUrl(cls.assetPath));
  });

  it.each([
    ['a root-absolute reference', '/assets/logo.png', 'walkthrough.html'],
    ['an escaping .. reference', '../../assets/logo.png', 'docs/overview.html'],
    ['a protocol-relative reference', '//cdn.example.com/logo.png', 'walkthrough.html'],
    ['an http: reference', 'http://cdn.example.com/logo.png', 'walkthrough.html'],
    ['an encoded .. escape', 'assets/%2e%2e%2fsecrets.png', 'walkthrough.html'],
    ['an encoded slash spanning the literal assets segment', 'assets%2Fdiagram.png', 'walkthrough.html']
  ])('%s resolves outside the asset route URL space', (_label, reference, page) => {
    const cls = classifyResourceReference(reference, page);
    expect(cls.kind).toBe('rejected');
    if (cls.kind !== 'rejected') return;
    // The route set serves only /cards/:id/html-files/assets/* for assets; a
    // reference the gate refuses must not land there, or the browser would
    // serve bytes the gate said could not exist. (The encoded-escape row is
    // the point of resolvedPath: `%2e%2e%2f` survives URL parsing as an opaque
    // segment, but the serve side decodes it into a `..` that containment
    // refuses.)
    const pathname = resolvedPath(new URL(reference, documentUrl(page)).pathname);
    expect(pathname.startsWith(`/cards/${CARD_ID}/html-files/assets/`)).toBe(false);
  });

  it('a dot-leading reference resolves onto the asset route space, where dotfiles: deny refuses it', () => {
    // The classifier rejects the reference; the route set serves its resolved
    // URL only as a 403. The agreement is that the gate's refusal mirrors a
    // refusal that genuinely exists at render time — not a 404 on a route that
    // was never mounted.
    const cls = classifyResourceReference('assets/.hidden.png', 'walkthrough.html');
    expect(cls.kind).toBe('rejected');
    const pathname = resolvedPath(new URL('assets/.hidden.png', documentUrl('walkthrough.html')).pathname);
    expect(pathname).toBe(assetRouteUrl('assets/.hidden.png'));
  });
});
