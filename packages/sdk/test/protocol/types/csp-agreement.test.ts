/**
 * Gate ↔ CSP agreement: for every fetch directive, the set of reference forms
 * the gate accepts that land under that directive must be a subset of the
 * grants the served policy gives the directive.
 *
 * The gate's classifier is reference-level — it accepts `data:` URIs,
 * `#fragment`s, `https:` URLs, and relative references resolving under the
 * repository-root `assets/` — without knowing which directive the reference's
 * element position will consume. The served policy is directive-level. The
 * agreement they must hold is: no reference the gate accepts can be refused by
 * the directive its position resolves to. `'self'` on every fetch directive is
 * the linchpin — relative references resolve to the server's own origin, so
 * the gate's `asset` classification needs a `'self'` grant in every directive
 * that can consume it.
 *
 * The policy is built by [buildHtmlFileCspPolicy()](./src/protocol/types/csp.ts)
 * — the same function the server serves the header from — so this test holds
 * the gate's accept-set against the literal the gate's sibling code depends on.
 * The webview's CSP (nonce-stamped srcdoc iframes) is a separate surface and
 * deliberately out of scope.
 *
 * @summary Gate accept-set vs served CSP grants, per fetch directive
 * @module test/protocol/types/csp-agreement
 */

import { describe, expect, it } from 'vitest';
import { buildHtmlFileCspPolicy } from '../../../src/protocol/index.js';

/**
 * Parses the built policy into per-directive grant sets.
 *
 * @param authorNonce - Author nonce to grant, or null for script-disabled mode.
 * @returns Map of directive name to the set of grant tokens it carries.
 */
function grants(authorNonce: string | null = '<author-nonce>'): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const clause of buildHtmlFileCspPolicy({
    platformNonce: '<platform-nonce>',
    ...(authorNonce === null ? {} : { authorNonce })
  }).split(';')) {
    const tokens = clause.trim().split(/\s+/);
    if (tokens.length > 0 && tokens[0] !== '') {
      map.set(tokens[0]!, new Set(tokens.slice(1)));
    }
  }
  return map;
}

const grant = (directive: string): Set<string> => grants().get(directive) ?? new Set<string>();

describe('gate ↔ CSP agreement', () => {
  it('grants only the platform nonce when author scripts are disabled', () => {
    expect(grants(null).get('script-src')).toEqual(new Set(["'nonce-<platform-nonce>'"]));
  });

  it('uses split nonces and author sources when author scripts are enabled', () => {
    expect(grant('script-src')).toEqual(
      new Set(["'nonce-<platform-nonce>'", "'nonce-<author-nonce>'", "'self'", 'https:'])
    );
  });

  it.each([
    [
      'script-src',
      ['https:', "'self'"],
      'external scripts load on https:; relative asset scripts resolve to the server origin'
    ],
    ['style-src', ['data:', 'https:', "'self'"], 'data:/https: stylesheets and relative css assets'],
    ['img-src', ['data:', 'https:', "'self'"], 'data:/https: images and relative img assets'],
    ['font-src', ['data:', 'https:', "'self'"], 'data:/https: fonts and relative font assets'],
    ['media-src', ['data:', 'https:', "'self'"], 'data:/https: media and relative video/audio assets'],
    ['connect-src', ['https:', "'self'"], 'page script fetches the server API (self) and https: endpoints']
  ] as const)('%s grants the reference forms the gate accepts for it', (directive, forms, _why) => {
    const served = grant(directive);
    for (const form of forms) {
      expect(served.has(form), `${directive} must grant ${form}`).toBe(true);
    }
  });

  it("names every fetch directive — with default-src 'none', an unnamed directive blocks everything", () => {
    // A directive that is not explicitly named falls back to `default-src 'none'`,
    // silently killing the references the gate accepts for it. Every directive a
    // reference form can land under must be present in the served policy.
    for (const directive of ['script-src', 'style-src', 'img-src', 'font-src', 'media-src', 'connect-src']) {
      expect(grants().has(directive), `${directive} must be named, not left to the default-src fallback`).toBe(true);
    }
  });

  it('deliberately withholds data: from script-src — a data: script is an execution primitive, not a subresource', () => {
    // A data: script would execute with full page trust, so it is refused at
    // two independent layers: the gate's position rule turns down a `data:`
    // reference in a `<script>` start tag at commit time, and this policy
    // carries no `data:` grant as the runtime boundary behind it. Either
    // layer alone would be enough — both are pinned so neither can be
    // "fixed" by accident.
    expect(grant('script-src').has('data:')).toBe(false);
  });

  it('keeps base-uri, form-action, frame-src, and object-src closed', () => {
    expect(grant('base-uri')).toEqual(new Set(["'none'"]));
    expect(grant('form-action')).toEqual(new Set(["'none'"]));
    // frame-src/object-src are absent, so they fall back to `default-src 'none'` —
    // no embedded frames, matching the srcdoc pipeline they replace.
    expect(grants().has('frame-src')).toBe(false);
    expect(grants().has('object-src')).toBe(false);
  });
});
