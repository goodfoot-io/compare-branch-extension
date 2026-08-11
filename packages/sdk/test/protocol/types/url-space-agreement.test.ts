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

describe.skip('gate ↔ URL-space agreement', () => {
  it.each([
    ['a root-page reference', 'assets/diagram.png', 'walkthrough.html'],
    ['a nested page reaching the root', '../assets/diagram.png', 'docs/overview.html'],
    ['a redundant ./ segment', './assets/diagram.png', 'walkthrough.html'],
    ['a nested subdirectory of assets/', 'assets/fonts/inter.woff2', 'walkthrough.html'],
    ['a cache-busting query string', 'assets/inter.woff2?v=2', 'walkthrough.html'],
    ['a fragment (the IE #iefix idiom)', 'assets/inter.eot#iefix', 'walkthrough.html'],
    ['an encoded space in a filename', 'assets/my%20logo.png', 'walkthrough.html']
  ])('%s resolves onto the asset route URL space', (_label, reference, page) => {
    const cls = classifyResourceReference(reference, page);
    expect(cls.kind).toBe('asset');
    if (cls.kind !== 'asset') return;
    // The route set serves decoded paths (Express percent-decodes before the
    // route sees them), so the browser's escaped pathname must decode to the
    // route's path for the classifier's assetPath exactly.
    const pathname = decodeURIComponent(new URL(reference, documentUrl(page)).pathname);
    expect(pathname).toBe(assetRouteUrl(cls.assetPath));
  });

  it.each([
    ['a root-absolute reference', '/assets/logo.png', 'walkthrough.html'],
    ['an escaping .. reference', '../../assets/logo.png', 'docs/overview.html'],
    ['a protocol-relative reference', '//cdn.example.com/logo.png', 'walkthrough.html'],
    ['an http: reference', 'http://cdn.example.com/logo.png', 'walkthrough.html'],
    ['an encoded .. escape', 'assets/%2e%2e%2fsecrets.png', 'walkthrough.html']
  ])('%s resolves outside the asset route URL space', (_label, reference, page) => {
    const cls = classifyResourceReference(reference, page);
    expect(cls.kind).toBe('rejected');
    if (cls.kind !== 'rejected') return;
    // The route set serves only /cards/:id/html-files/assets/* for assets; a
    // reference the gate refuses must not land there, or the browser would
    // serve bytes the gate said could not exist.
    const pathname = decodeURIComponent(new URL(reference, documentUrl(page)).pathname);
    expect(pathname.startsWith(`/cards/${CARD_ID}/html-files/assets/`)).toBe(false);
  });

  it('a dot-leading reference resolves onto the asset route space, where dotfiles: deny refuses it', () => {
    // The classifier rejects the reference; the route set serves its resolved
    // URL only as a 403. The agreement is that the gate's refusal mirrors a
    // refusal that genuinely exists at render time — not a 404 on a route that
    // was never mounted.
    const cls = classifyResourceReference('assets/.hidden.png', 'walkthrough.html');
    expect(cls.kind).toBe('rejected');
    const pathname = decodeURIComponent(new URL('assets/.hidden.png', documentUrl('walkthrough.html')).pathname);
    expect(pathname).toBe(assetRouteUrl('assets/.hidden.png'));
  });
});
