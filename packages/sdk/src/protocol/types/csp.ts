/**
 * The Content-Security-Policy served with an HTML card document.
 *
 * The served document is a real, same-origin resource: the CSP rides as an
 * HTTP response header rather than a `<meta>` tag, so the author's markup is
 * policy-free. `'self'` on every fetch directive is what makes the
 * relative-reference model literal — `assets/x` and `../assets/x` resolve to
 * the server's own origin and load under it — and `media-src` is named for the
 * first time because falling back to `default-src 'none'` would silently block
 * relative `<video>`/`<audio>` assets. `frame-src`/`object-src` stay at
 * `'none'` (no embedded frames, matching today's pipeline).
 *
 * The policy is built here, in the SDK, so the server (which serves the
 * header) and the gate-agreement tests (which hold the gate's accept-set
 * against the served grants) share one literal — the same reason the gate and
 * the server share the asset classifier.
 *
 * @summary Served-document CSP builder, shared by server and gate agreement
 * @module types/csp
 */

/**
 * Builds the Content-Security-Policy served with an HTML card document.
 *
 * The `script-src` nonce is minted per build and stamped onto every `<script>`
 * in the same build (see `htmlDocumentBuild`); it never crosses the
 * extension/webview boundary — it exists only inside the served bytes and this
 * header.
 *
 * `'self'` appears on every fetch directive because relative references resolve
 * to the server's own origin; `media-src` is named because falling back to
 * `default-src 'none'` would silently block relative `<video>`/`<audio>`
 * assets. `base-uri` and `form-action` are closed; `frame-src` and
 * `object-src` are absent, so they fall back to `default-src 'none'` — no
 * embedded frames, matching the srcdoc pipeline this model replaces.
 *
 * `data:` is deliberately absent from `script-src`: the classifier accepts
 * `data:` references in any attribute position, but a `data:` script is an
 * execution primitive with full page trust, not a subresource.
 *
 * @param nonce - The per-build CSP nonce stamped onto the document's scripts.
 * @returns The policy string for the `Content-Security-Policy` response header.
 */
export function buildHtmlFileCspPolicy(nonce: string): string {
  return [
    "default-src 'none'",
    `script-src 'nonce-${nonce}' 'self' https:`,
    "style-src 'unsafe-inline' 'self' data: https:",
    "img-src 'self' data: https:",
    "font-src 'self' data: https:",
    "media-src 'self' data: https:",
    "connect-src 'self' https:",
    "base-uri 'none'",
    "form-action 'none'"
  ].join('; ');
}
