/**
 * Protocol types for HTML file entries in card repositories.
 *
 * An HTML file entry consists of an `.html` source file and a same-basename
 * `.meta.json` sidecar sitting next to it. The pair may live anywhere in the
 * card repository except under an `attachments/` directory (see
 * {@link isHtmlCardDocPath}). The sidecar's schema is closed — only the keys
 * enumerated here are permitted.
 *
 * @summary Protocol types for HTML card file entries
 * @module types/html
 */

import mime from 'mime-types';
import { ASSETS_DIR, ASSETS_PREFIX, ATTACHMENTS_DIR } from '../../cardRepoLayout.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum character length for an HTML file title. */
const MAX_HTML_TITLE_LENGTH = 120;

/** Maximum character length for an HTML file summary. */
const MAX_HTML_SUMMARY_LENGTH = 280;

/** Exact set of keys allowed in an HtmlInfoFile. Any other key is rejected. */
const ALLOWED_HTML_INFO_KEYS = new Set<string>(['title', 'summary', 'aspect', 'scripts']);

/**
 * Detects any non-local resource reference in `src`/`href`/`srcset` attributes
 * and CSS `url()` / `@import` references — anything that isn't a `data:` URI,
 * a same-document fragment (`#id`), or an `https:` URL.
 *
 * This is a defense-in-depth, commit-time author convenience that catches the
 * common ways a resource reference silently fails to render. It is NOT the
 * security boundary: the real runtime enforcement is the served-document CSP —
 * the response header [buildHtmlFileCspPolicy()](./csp.ts) produces — which
 * grants `'self'` (relative references resolve to the server's own origin),
 * `data:`, and `https:` on the fetch directives this check governs, plus a
 * per-build nonce on `script-src`. Because that CSP has no token for `http:`
 * or protocol-relative URLs, and the asset route refuses everything outside
 * the repository-root `assets/` URL space, the references rejected here are
 * exactly the ones that would fail to render — with the author-facing reason
 * from {@link classifyResourceReference} at commit time instead of a silent
 * broken page.
 *
 * Matched vectors (any scheme/path, not just `https:`/`http:`/`//`):
 * - quoted/unquoted `src=`/`href=` attributes (with a left-boundary guard so
 *   `data-src="…"` and JS property assignments like `o.href = "…"` are not
 *   mistaken for the HTML attribute)
 * - `srcset=` candidate lists
 * - CSS `url(...)` (quoted or unquoted) in inline styles or `<style>` blocks
 * - CSS `@import` rules
 *
 * Every pattern above is scanned outside `<script>` element *bodies* (see
 * {@link blankScriptBodies}): inline JavaScript is not markup and not CSS, so
 * neither the left-boundary guard nor the CSS syntax can tell a bare
 * `var href = …` assignment or a `new URL(base)` call from the real thing.
 * Only the body is redacted, never the start tag — a `<script src="…">`
 * attribute is a genuine resource reference and must stay visible.
 */
// Left-boundary guard: `src`/`href` must not be immediately preceded by a word
// character, `.`, or `-` — excludes `data-src="…"` (preceded by `-`) and JS
// property access like `o.href = …` or `a.src = …` (preceded by `.`), which
// would otherwise be mistaken for the HTML attribute.
const ATTR_BOUNDARY = String.raw`(?<![\w.-])`;

// srcset candidate URLs (quoted attribute value, one or more comma-separated candidates).
// Named separately so `findExternalResources` can special-case its comma-splitting —
// a data: URI's own comma (the base64 separator) must not be split like a srcset list.
const SRCSET_RE = new RegExp(`${ATTR_BOUNDARY}srcset\\s*=\\s*["']([^"']+)["']`, 'gi');

// `data=` is a reference vector only on `<object>` — the one element whose
// load the served CSP's `object-src` (falling back to `default-src 'none'`)
// blocks — so the collection loop scans it only inside an object start tag
// (see {@link collectResourceReferences}); on any other element `data=` is
// author data (state, selectors), never a load, and must not be scanned.
// Named separately so the loop can scope them by regex identity, like
// {@link SRCSET_RE}.
const DATA_QUOTED_RE = new RegExp(`${ATTR_BOUNDARY}data\\s*=\\s*["']\\s*([^"']+)["']`, 'gi');
const DATA_UNQUOTED_RE = new RegExp(`${ATTR_BOUNDARY}data\\s*=\\s*([^\\s"'>]+)`, 'gi');

const RESOURCE_REFERENCE_RES: readonly RegExp[] = [
  // Quoted src/href: src="…" / href='…'
  new RegExp(`${ATTR_BOUNDARY}(?:src|href)\\s*=\\s*["']\\s*([^"']+)["']`, 'gi'),
  // Unquoted src/href: src=… (terminated by whitespace or '>')
  new RegExp(`${ATTR_BOUNDARY}(?:src|href)\\s*=\\s*([^\\s"'>]+)`, 'gi'),
  SRCSET_RE,
  // Quoted/unquoted object data: data="…" / data='…' / data=…
  DATA_QUOTED_RE,
  DATA_UNQUOTED_RE,
  // CSS url(...) — quoted or unquoted
  /url\(\s*["']?\s*([^)"']+)["']?\s*\)/gi,
  // CSS @import "url" or @import url(...)
  /@import\s+(?:url\(\s*)?["']?\s*([^)"';\s]+)/gi
];

/**
 * A `<script>` element's whole-element byte-offset span within the HTML
 * source, as derived from a parse5 parse with `sourceCodeLocationInfo: true`:
 * `startOffset`/`endOffset` of the element node, covering the start tag, the
 * body, and the end tag.
 *
 * parse5 is not an SDK dependency (see {@link checkHtmlContent}), so callers
 * that already parse the document for the well-formedness gate (check 3) walk
 * the resulting tree for `script` elements and pass their spans in here — a
 * real parse is correct by construction against comments, attribute values,
 * and RCDATA text (`<title>`, `<textarea>`), where a raw-text regex for
 * `<script>` tokens is not.
 *
 * The span is deliberately the whole element rather than just the body: the
 * start tag's own `src` attribute is a real resource reference the locality
 * check must still see. {@link scriptBodyRange} narrows each span to its body
 * before redaction.
 */
export interface ScriptSpan {
  /** Offset (inclusive) of the `<script` element's opening `<` in `htmlSource`. */
  start: number;
  /** Offset (exclusive) just past the element's closing `</script>`. */
  end: number;
}

/**
 * A whole-element byte-offset span in HTML source, as derived from a parse5
 * parse with `sourceCodeLocationInfo: true` — the generic shape behind
 * {@link ScriptSpan}, reused for the frame-like elements whose `src` loads are
 * refused by the served-document CSP.
 */
export interface ElementSpan {
  /** Offset (inclusive) of the element's opening `<` in the source. */
  start: number;
  /** Offset (exclusive) just past the element's closing tag. */
  end: number;
}

/**
 * Tag names whose start tag carries a frame or embedded-object load — `src` on
 * `<iframe>`/`<frame>`/`<embed>`, `data` on `<object>`. The served-document CSP
 * carries `frame-src 'none'` and `object-src 'none'`, so whatever a page points
 * such an element at can never render — {@link collectResourceReferences}
 * refuses references found in these elements' start tags, and the span
 * producers in `@cards.management/html-spans` walk for the same names, so the
 * gate and its span source cannot drift.
 */
export const FRAME_ELEMENT_TAG_NAMES = ['iframe', 'frame', 'embed', 'object'] as const;

/**
 * Tag names for the author-`<base>` refusal.
 *
 * The served document resolves relative references against its own URL and the
 * serve-time builder injects a target-only `<base>`, so an author `<base>` is
 * inert in the href direction (the CSP's `base-uri 'none'` blocks it) while
 * its `target` still beats the builder's — {@link checkHtmlContent}'s check 4b
 * refuses the element itself, and the span producers in
 * `@cards.management/html-spans` walk for the same names, so the gate and its
 * span source cannot drift.
 */
export const BASE_ELEMENT_TAG_NAMES = ['base'] as const;

/**
 * Offset of the first unquoted `>` in `htmlSource` at or after `from`, scanning
 * to at most `to` — the terminator of a start tag, whose attribute values may
 * legally contain `>` inside quotes.
 *
 * @param htmlSource - HTML source to scan.
 * @param from - Offset to start scanning at (inclusive).
 * @param to - Exclusive scan bound.
 * @returns The offset of the terminating `>`, or `-1` when none exists.
 */
function findUnquotedTagEnd(htmlSource: string, from: number, to: number): number {
  let quote: string | null = null;
  for (let i = from; i < to; i++) {
    const ch = htmlSource[i]!;
    if (quote !== null) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '>') {
      return i;
    }
  }
  return -1;
}

/**
 * Narrows a whole-element {@link ScriptSpan} to the offsets of its body — the
 * inline JavaScript between the start tag's `>` and the end tag's `<`.
 *
 * The start tag is located by scanning for its unquoted terminating `>` (an
 * attribute value may legally contain `>`), and the end tag by the last
 * `</script` within the span. A `<script>` with no body, or one whose start
 * tag never terminates inside the span, yields `null`.
 *
 * @param htmlSource - HTML source the span refers to.
 * @param span - Whole-element `<script>` span.
 * @returns The body's `[start, end)` offsets, or `null` when there is no body.
 */
function scriptBodyRange(htmlSource: string, span: ScriptSpan): { start: number; end: number } | null {
  const spanEnd = Math.min(span.end, htmlSource.length);
  const tagEnd = findUnquotedTagEnd(htmlSource, span.start, spanEnd);
  if (tagEnd === -1) return null;
  const bodyStart = tagEnd + 1;
  // An unclosed `<script>` has no end tag; parse5 then runs the element span to
  // EOF, and everything past the start tag is body. Matched case-insensitively
  // by regex rather than `toLowerCase().lastIndexOf(…)`, whose case mapping can
  // change string length (`İ` lowercases to two code units) and so would return
  // an index that no longer refers to the same offset in `htmlSource`.
  let closeAt = -1;
  for (const match of htmlSource.slice(bodyStart, spanEnd).matchAll(/<\/script/gi)) closeAt = match.index;
  const bodyEnd = closeAt === -1 ? spanEnd : bodyStart + closeAt;
  return bodyEnd > bodyStart ? { start: bodyStart, end: bodyEnd } : null;
}

/**
 * Blanks out the *bodies* of the `<script>` elements at the given whole-element
 * spans (preserving length/offsets and newlines, so unrelated regex behavior is
 * unaffected) so the resource-reference patterns never scan inline JavaScript.
 *
 * Start tags are left intact, so a `<script src="http://…">` reference is still
 * matched by the attribute patterns; neither `url()` nor `@import` can legally
 * appear in a start tag, so body-only redaction is equally correct for the
 * CSS-syntax patterns.
 *
 * @param htmlSource - HTML source to redact.
 * @param scriptSpans - Whole-element `<script>` spans, as parsed by the caller.
 * @returns `htmlSource` with script element bodies replaced with spaces.
 */
function blankScriptBodies(htmlSource: string, scriptSpans: readonly ScriptSpan[]): string {
  if (scriptSpans.length === 0) return htmlSource;
  // Index by UTF-16 code unit (not code point) to match parse5's byte offsets.
  const chars = Array.from({ length: htmlSource.length }, (_, i) => htmlSource[i]!);
  for (const span of scriptSpans) {
    const body = scriptBodyRange(htmlSource, span);
    if (!body) continue;
    for (let i = body.start; i < body.end; i++) {
      if (chars[i] !== '\n') chars[i] = ' ';
    }
  }
  return chars.join('');
}

/**
 * Splits a `srcset` attribute value into its candidate URL strings, respecting
 * the single comma that separates a `data:` URI's metadata from its payload —
 * a naive `raw.split(',')` breaks that comma apart, turning
 * `data:image/png;base64,AAA` into the two bogus candidates `data:image/png;base64`
 * and `AAA`.
 *
 * Each returned string is a full "url descriptor" candidate (e.g. `data:...,AAA 1x`);
 * callers extract just the URL with `candidate.split(/\s+/)[0]`.
 *
 * @param raw - The raw `srcset` attribute value (comma-separated candidate list).
 * @returns The candidate segments, comma-split but data-URI-aware.
 */
function splitSrcsetCandidates(raw: string): string[] {
  const candidates: string[] = [];
  let i = 0;
  const n = raw.length;

  while (i < n) {
    while (i < n && /[\s,]/.test(raw[i]!)) i++;
    if (i >= n) break;
    const start = i;

    if (raw.startsWith('data:', i)) {
      // The first comma after `data:` separates metadata from payload and is
      // part of the URI, not a candidate separator — skip past it before
      // looking for the real candidate-terminating comma.
      const metaComma = raw.indexOf(',', i);
      const payloadComma = metaComma === -1 ? -1 : raw.indexOf(',', metaComma + 1);
      i = payloadComma === -1 ? n : payloadComma;
    } else {
      const comma = raw.indexOf(',', i);
      i = comma === -1 ? n : comma;
    }

    const segment = raw.slice(start, i).trim();
    if (segment) candidates.push(segment);
    if (i < n && raw[i] === ',') i++;
  }

  return candidates;
}

/**
 * Whether a single resource reference value is permitted: a `data:` URI, a
 * same-document fragment (`#id`), or an `https:` URL. Anything else —
 * `http:` URLs, protocol-relative URLs, and relative paths alike — is
 * rejected (see {@link RESOURCE_REFERENCE_RES}).
 *
 * @param value - A single captured `src`/`href`/`url()` reference value.
 * @returns `true` when the value is a `data:` URI, a `#fragment`, or an `https:` URL.
 */
function isAllowedResourceReference(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith('data:') || trimmed.startsWith('#') || trimmed.startsWith('https:');
}

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * File-persisted metadata for an HTML card file.
 *
 * Stored in `<dir>/<name>.meta.json` alongside `<dir>/<name>.html`.
 * The schema is closed: only the keys `title`, `summary`, `aspect`, and
 * `scripts` are permitted — any unknown key causes validation to fail.
 *
 * @summary Sidecar metadata for an HTML file in a card repository
 *
 * @example
 * ```json
 * {
 *   "title": "Architecture Overview",
 *   "summary": "Interactive diagram of the system architecture.",
 *   "aspect": "16:9",
 *   "scripts": true
 * }
 * ```
 */
export interface HtmlInfoFile {
  /**
   * Human-readable title for the HTML file, shown in the timeline row.
   * Maximum 120 characters.
   */
  title: string;

  /**
   * Short description of the HTML file's content, shown collapsed beneath the title.
   * Maximum 280 characters.
   */
  summary: string;

  /**
   * Aspect ratio for the rendered iframe.
   *
   * Accepts a `"<width>:<height>"` string (e.g. `"16:9"`) or a positive
   * finite number representing the ratio directly (e.g. `1.7778`).
   */
  aspect: string | number;

  /**
   * Whether the iframe sandbox permits scripts.
   *
   * When `true` (default), the panel's sandbox is `allow-scripts
   * allow-same-origin`; when `false`, it is `allow-same-origin` alone, so a
   * scriptless page still loads its same-origin subresources and fonts.
   * `allow-same-origin` is always present because the frame loads a real
   * document from the cards server — the grant is the page's own server
   * origin, never the parent webview's (`vscode-webview://`, unreachable from
   * a page on the server's origin).
   */
  scripts?: boolean;
}

// ─── Path eligibility ─────────────────────────────────────────────────────────

const HTML_EXTENSION = '.html';
const HTML_SIDECAR_EXTENSION = '.meta.json';

/**
 * Splits a repo-relative path into its segments, tolerating Windows separators
 * so `path.relative()` output classifies the same as git's POSIX paths.
 *
 * @param repoRelativePath - Path to split.
 * @returns The path's non-empty segments.
 */
function pathSegments(repoRelativePath: string): string[] {
  return repoRelativePath.split(/[/\\]/).filter((segment) => segment.length > 0);
}

/**
 * Whether a repo-relative path is an eligible HTML card document.
 *
 * Single source of truth for the discovery rule shared by the panel builder,
 * the `cards html check` CLI, the pre-commit hook, the search indexer, and the
 * timeline: any `*.html` file anywhere in a card repository qualifies, with two
 * exclusions. One living under an `attachments/` directory at any depth belongs
 * to the attachment feature; one under the repository-root `assets/` directory
 * is a fragment or template served to other pages, so it produces no timeline
 * row and is exempt from the sidecar-pairing rule. A file merely *named* like
 * either directory — `attachments.html`, `assets-report.html` — is eligible;
 * only a real path segment excludes.
 *
 * The two exclusions differ in depth on purpose: `attachments` excludes at any
 * depth, `assets` only at the root. That mirrors where each name is reserved —
 * a nested `docs/assets/` is an ordinary directory, and treating it as reserved
 * would hide its pages from the timeline while leaving them unservable.
 *
 * @param repoRelativePath - Repo-relative path (POSIX or Windows separators).
 * @returns `true` when the path is a renderable HTML card document.
 */
export function isHtmlCardDocPath(repoRelativePath: string): boolean {
  if (!repoRelativePath.endsWith(HTML_EXTENSION)) return false;
  const segments = pathSegments(repoRelativePath);
  const directorySegments = segments.slice(0, -1);
  if (directorySegments.includes(ATTACHMENTS_DIR)) return false;
  return directorySegments[0] !== ASSETS_DIR;
}

/**
 * Whether a repo-relative path is the `.meta.json` sidecar of an eligible HTML
 * card document — i.e. the companion the pairing rule expects next to an
 * `.html` file of the same basename.
 *
 * Sidecar naming disambiguates this from every other `.meta.json` in a card
 * repo: an HTML sidecar *replaces* the `.html` extension (`report.html` →
 * `report.meta.json`), whereas document and attachment sidecars *append* to a
 * full filename (`CARD.md` → `CARD.md.meta.json`). So a stem that still carries
 * an extension is never an HTML sidecar.
 *
 * Existence of the `.html` file is deliberately not consulted: an orphaned
 * sidecar must still be recognized as HTML-feature-relevant so the pairing gate
 * can reject it.
 *
 * @param repoRelativePath - Repo-relative path (POSIX or Windows separators).
 * @returns `true` when the path is an eligible HTML card document's sidecar.
 */
export function isHtmlCardDocSidecarPath(repoRelativePath: string): boolean {
  if (!repoRelativePath.endsWith(HTML_SIDECAR_EXTENSION)) return false;
  const stem = repoRelativePath.slice(0, -HTML_SIDECAR_EXTENSION.length);
  const basename = pathSegments(stem).at(-1);
  if (basename === undefined || basename.includes('.')) return false;
  return isHtmlCardDocPath(`${stem}${HTML_EXTENSION}`);
}

/**
 * Derives the `.meta.json` sidecar path for an HTML card document path.
 *
 * @param htmlPath - Path ending in `.html`.
 * @returns The sibling sidecar path with the same basename.
 */
export function htmlCardDocSidecarPath(htmlPath: string): string {
  return `${htmlPath.slice(0, -HTML_EXTENSION.length)}${HTML_SIDECAR_EXTENSION}`;
}

/**
 * Derives the `.html` document path for an HTML card document sidecar path.
 *
 * @param sidecarPath - Path ending in `.meta.json`.
 * @returns The sibling `.html` path with the same basename.
 */
export function htmlCardDocPathForSidecar(sidecarPath: string): string {
  return `${sidecarPath.slice(0, -HTML_SIDECAR_EXTENSION.length)}${HTML_EXTENSION}`;
}

// ─── Aspect ratio parsing ──────────────────────────────────────────────────────

/**
 * Parses an aspect ratio value into its numeric ratio (width / height).
 *
 * This is the single source of truth for the aspect-parse rule. Both the
 * commit gate (`validateHtmlInfo`, called by the pre-commit hook and the
 * `card html check` CLI) and the extension's `parseAspect()` delegate here.
 *
 * Accepted inputs:
 * - `"<w>:<h>"` — both positive integers, exactly two colon-delimited parts
 *   (e.g. `"16:9"` → `16/9 ≈ 1.7778`).
 * - Positive finite number — returned as-is (e.g. `1.7778`).
 *
 * Rejected (returns `null`): `"0:0"`, three-part strings like `"16:9:9"`,
 * negatives, zero, non-numeric strings, and quoted decimals like `"1.6"`
 * (a colon-less string is only accepted in numeric `number` form, not as a
 * decimal string).
 *
 * @param value - Aspect ratio as a `"<width>:<height>"` string or numeric ratio.
 * @returns The ratio as a number, or `null` if `value` is invalid.
 */
export function parseAspectRatio(value: string | number): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  // String form: exactly "<w>:<h>" with both positive integers.
  const parts = value.split(':');
  if (parts.length !== 2) {
    return null;
  }

  const w = Number(parts[0]);
  const h = Number(parts[1]);
  if (!Number.isInteger(w) || !Number.isInteger(h) || w <= 0 || h <= 0) {
    return null;
  }

  return w / h;
}

// ─── Resource locality ──────────────────────────────────────────────────────────

/**
 * What a single resource reference in an HTML card document resolves to.
 *
 * The three cases are exhaustive and mutually exclusive, and each one has a
 * distinct downstream consequence: `allowed` references are passed through
 * untouched, `asset` references are served as written — the browser resolves
 * them natively against the served document's real URL, landing on the asset
 * route's URL space — and `rejected` references fail the commit-time gate.
 *
 * @summary Classification of one resource reference
 */
export type ResourceReferenceClass =
  /** A `data:` URI, a same-document `#fragment`, or an `https:` URL. */
  | { kind: 'allowed' }
  /**
   * A relative reference resolving to a file under the repository-root
   * `assets/` directory. `assetPath` is the normalized repo-relative path
   * (always beginning `assets/`), with any query string and fragment stripped
   * and percent-escapes decoded.
   */
  | { kind: 'asset'; assetPath: string }
  /** Anything else. `reason` is author-facing and names the specific failure. */
  | { kind: 'rejected'; reason: string };

/**
 * Classifies one resource reference taken from an HTML card document.
 *
 * Pure: existence of the referenced file is deliberately not consulted, because
 * "exists" means different things to the CLI (working tree) and the pre-commit
 * hook (git index). Callers combine this classification with their own
 * existence predicate — see {@link checkHtmlContent}'s `assetExists`.
 *
 * Resolution is performed relative to the **directory containing the HTML
 * file**, so `docs/overview.html` reaches a root-level asset as
 * `../assets/logo.png`. `assets/` is recognized only at the repository root.
 *
 * @param reference - The raw attribute or CSS value, exactly as it appears in
 *   the source (leading and trailing whitespace tolerated).
 * @param htmlRepoRelativePath - Repo-relative path of the HTML file the
 *   reference was found in.
 * @returns The reference's classification.
 */
export function classifyResourceReference(reference: string, htmlRepoRelativePath: string): ResourceReferenceClass {
  const trimmed = reference.trim();
  if (isAllowedResourceReference(trimmed)) return { kind: 'allowed' };

  // Anything carrying a scheme or an authority is a network reference, and the
  // only network scheme this feature permits was already accepted above.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return {
      kind: 'rejected',
      reason: `only https: URLs and data: URIs may be referenced by scheme: ${trimmed}`
    };
  }
  if (trimmed.startsWith('//')) {
    return { kind: 'rejected', reason: `protocol-relative references are not permitted: ${trimmed}` };
  }
  if (trimmed.startsWith('/')) {
    return {
      kind: 'rejected',
      reason: `root-absolute references are not permitted — write a path relative to the page instead: ${trimmed}`
    };
  }
  if (trimmed.includes('\\')) {
    return { kind: 'rejected', reason: `use '/' as the path separator, not '\\': ${trimmed}` };
  }

  // A query string and a fragment are ordinary font and cache-busting syntax
  // (`?v=2`, the `#iefix` idiom) rather than part of the path — strip both
  // before anything else looks at segments.
  const pathPart = trimmed.split('#')[0]!.split('?')[0]!;
  if (pathPart.length === 0) {
    return { kind: 'rejected', reason: `resource reference has no path: ${trimmed}` };
  }

  // Decode BEFORE segmenting: `assets/%2e%2e%2fx.png` decodes to `assets/../x.png`,
  // so a segment check run on the raw string sees one opaque segment and lets the
  // escape through. `decodeURIComponent` throws URIError on a lone `%` — which a
  // filename like `100%.png` legitimately contains — so a failed decode falls back
  // to the raw text rather than propagating out of a commit-time check.
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathPart);
  } catch {
    decoded = pathPart;
  }

  // A trailing `/` (literal or `%2F`) is a directory-style path, and the asset
  // route serves files only — a request to `<asset>/` is answered with 404,
  // so a reference like `assets/logo.png/` would pass the gate and then fail
  // to load. The segment loop below would skip the trailing empty segment and
  // approve it; the refusal has to happen before segmentation.
  if (decoded.endsWith('/')) {
    return {
      kind: 'rejected',
      reason: `'${trimmed}' ends with a '/' — a directory-style path, and the asset server serves files, not directory paths; name the file itself`
    };
  }

  const htmlDirSegments = pathSegments(htmlRepoRelativePath).slice(0, -1);
  const resolved: string[] = [...htmlDirSegments];
  for (const segment of decoded.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      if (resolved.length === 0) {
        return {
          kind: 'rejected',
          reason: `'${trimmed}' resolves outside the repository root — '..' may not leave the repository`
        };
      }
      resolved.pop();
      continue;
    }
    resolved.push(segment);
  }

  const assetPath = resolved.join('/');
  if (resolved[0] !== ASSETS_DIR || resolved.length < 2) {
    // Overwhelmingly the first-attempt mistake for a page in a subdirectory, and
    // the direct cost of reserving `assets/` at the repository root only. The
    // message has to name where the reference actually landed and what to write
    // instead, or the rule is indistinguishable from a bug.
    //
    // The suggested path can never dead-end. A resolution that already lands
    // under root `assets/` is replayed with the page's `../` depth prefix — the
    // clean `assets/logo.png` form (from a root page) and the dot-forms that
    // resolve to the same place (`./assets/logo.png` from a root page,
    // `../assets/logo.png` from `docs/`, `assets/../assets/logo.png` from
    // `docs/`) all resolve to `['assets', 'logo.png']`, so the suggestion is
    // the depth-prefixed resolution, never the raw reference. Anything else is
    // re-anchored under `assets/` at the page's own level:
    // `beyondPageDir` is what the author actually wrote — the parts of the
    // resolution past the page's own directory (`logo.png` from `docs/`
    // resolves to `docs/logo.png`, so the suggestion is `../assets/logo.png`)
    // — and the re-anchor varies by its shape: an author who wrote `assets/…`
    // without the depth prefix (`./assets/logo.png` from `docs/` resolves to
    // `docs/assets/logo.png`) has already supplied the `assets/` segment the
    // re-anchor would add, so it is dropped — otherwise the suggestion would
    // be `../assets/assets/logo.png`, a second `assets/` the classifier would
    // refuse again; a leading `../` that popped the page's own directory
    // (`../logo.png` from `docs/` resolves to `logo.png`) leaves an empty
    // `beyondPageDir`, so the whole resolution is re-anchored. The earlier
    // re-anchor form used the entire resolved path, which for a page-local
    // reference produced `../assets/docs/logo.png` — a path resolving right
    // back out of `assets/`, looping the author through the same rejection.
    const beyondPageDir = resolved.slice(htmlDirSegments.length);
    const reAnchor =
      beyondPageDir[0] === ASSETS_DIR ? beyondPageDir.slice(1) : beyondPageDir.length > 0 ? beyondPageDir : resolved;
    if (assetPath.split('?')[0]!.toLowerCase().endsWith(HTML_EXTENSION)) {
      // An `.html` resolution is a page-link attempt, not an asset move — no
      // re-anchor exists for it, because `../assets/other.html` would be
      // re-rejected by the HTML-file rule below. Saying so beats suggesting
      // a path the next rule turns down again.
      return {
        kind: 'rejected',
        reason: `'${trimmed}' resolves to '${assetPath}', which is not under the repository-root ${ASSETS_PREFIX} directory and is an HTML page — pages link over https:, with a data: URI, or to a #fragment, never with a relative path to a committed page`
      };
    }
    if (resolved[0] === ASSETS_DIR) {
      // resolved === ['assets']: the reference names the root assets/ directory
      // itself, and the asset server serves files, not directory paths. It is
      // the one shape whose re-anchor would be the reference itself
      // (`assets` re-anchored from a root page is `assets`), so it gets a
      // direct refusal naming the directory shape instead of a path that
      // loops back through this same rule.
      return {
        kind: 'rejected',
        reason: `'${trimmed}' resolves to '${assetPath}' — the ${ASSETS_PREFIX} directory itself, and the asset server serves files, not directory paths; name the file itself, e.g. ${'../'.repeat(htmlDirSegments.length)}${ASSETS_DIR}/logo.png`
      };
    }
    const suggestion = `${'../'.repeat(htmlDirSegments.length)}${ASSETS_DIR}/${reAnchor.join('/')}`;
    // The suggestion is itself a relative reference from the same page, so it
    // is probe-classified before it is offered: a re-anchor that a rule below
    // refuses anyway — a page-local dotfile, an unmappable extension, a
    // directory-style trailing slash — would loop the author straight back
    // into another rejection. When the probe refuses, the message carries the
    // probe's refusal (the thing to fix) instead of the looping path. The
    // probe terminates: its suggestion always starts with the page depth
    // prefix followed by `assets/`, so its own resolution lands under root
    // `assets/` and never re-enters this branch.
    if (suggestion !== trimmed) {
      const probe = classifyResourceReference(suggestion, htmlRepoRelativePath);
      if (probe.kind === 'rejected') {
        return {
          kind: 'rejected',
          reason: `'${trimmed}' resolves to '${assetPath}', which is not under the repository-root ${ASSETS_PREFIX} directory, and the natural fix is refused again: ${probe.reason}. Fix the named problem first, then reference the corrected path under ${ASSETS_PREFIX}`
        };
      }
    }
    return {
      kind: 'rejected',
      reason: `'${trimmed}' resolves to '${assetPath}', which is not under the repository-root ${ASSETS_PREFIX} directory — from ${htmlRepoRelativePath}, write ${suggestion}`
    };
  }

  // The route and the gate must read the same path out of the same URL. The
  // asset route matches its literal `assets` segment against the raw request
  // path — Express patterns match before any percent-decoding — and the
  // browser keeps a percent-encoded '/' or '.' inside its one segment while
  // resolving relative references. So an encoded separator in the first raw
  // segment of the resolved reference (`assets%2Fdiagram.png`,
  // `%61ssets/logo.png`, `%2e%2e/assets/logo.png`) never matches the route;
  // the document route then 404s the decoded assets/-space path. The
  // resolution above decoded before segmenting, which is exactly what makes
  // those shapes land under `assets/` here — this raw resolution exists to
  // catch that gate-accepts/route-404s inversion. Dot segments collapse over
  // the raw text exactly as URL resolution collapses them (literal `.` and
  // `..` only; the encoded forms stay opaque here, as in the browser), so the
  // raw and decoded resolutions can differ only through characters the request
  // never decodes on this side of the route. `assets/100%2Fcomplete.png`
  // passes: its encoded slash sits inside the wildcard segment past the
  // literal `assets`, where the route decodes it into the file the
  // classification above already approved.
  const rawResolved: string[] = [...htmlDirSegments];
  for (const segment of pathPart.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') rawResolved.pop();
    else rawResolved.push(segment);
  }
  if (rawResolved[0] !== ASSETS_DIR) {
    // The offending segment to name is the one that still carries a
    // percent-escape: for a nested-page `%2e%2e/assets/…` the raw slot at the
    // route's literal `assets` position is the page's own directory (not the
    // author's mistake), so quoting the slot would blame `docs/` for a
    // reference whose fix is `../assets/…`. A percent-escape in the reference
    // is always present here — a literal-only reference whose raw resolution
    // lands outside `assets/` never passed the decoded checks above.
    const encodedSegment = pathPart.split('/').find((segment) => segment.includes('%')) ?? rawResolved[0] ?? '';
    return {
      kind: 'rejected',
      reason: `'${trimmed}' resolves to the asset '${assetPath}' in the commit check, but the browser's request never reaches the asset route — its literal 'assets' segment must match the raw URL before any percent-decoding, and the percent-encoded segment '${encodedSegment}' is never decoded into a separator or a match on this side of the route; write the path literally, without percent-encoding`
    };
  }

  // The serving route runs `send` with `dotfiles: 'deny'`, so a dot-leading
  // segment is answered with 403 at render time. Without this rule the reference
  // passes the gate (the file genuinely exists under `assets/`) and then fails to
  // load — a gate/render inversion of the same shape as the `media-src` and
  // `octet-stream` cases, and the invariant this design is built on. Rejecting
  // here rather than loosening the route keeps `dotfiles: 'deny'` doing its real
  // work: it is also what stops `assets/.git/config` being served should a card
  // repository ever grow a nested git directory beneath `assets/`.
  const dotSegment = resolved.find((segment) => segment.startsWith('.'));
  if (dotSegment !== undefined) {
    return {
      kind: 'rejected',
      reason: `'${trimmed}' contains the dot-leading path segment '${dotSegment}', which the asset server refuses — rename it without the leading dot`
    };
  }

  // An `.html` file under root `assets/` is not a card document — the timeline
  // exclusion, the document route's refusal, and this rule are one decision:
  // "a page stored under it is not a card document", so the asset route serves
  // none of the document contract (base target, theme bake, nonce stamp) that
  // committed pages render under. Approving the reference here would break the
  // gate/render agreement the other way from the rules above — the gate would
  // bless a render that runs without the machinery it promises. Inline it as a
  // `data:` URI or load it over `https://` instead, like any page-like
  // reference.
  if (assetPath.split('?')[0]!.toLowerCase().endsWith(HTML_EXTENSION)) {
    return {
      kind: 'rejected',
      reason: `'${trimmed}' resolves to '${assetPath}', which is an HTML file — assets/ is a fragment and template space, not a card-document directory, so the served-document contract (base target, theme, nonce) would not apply to it; inline it as a data: URI, load it over https:, or use a non-HTML asset`
    };
  }

  // The serving route answers through `send`, whose Content-Type comes from a
  // mime map; a reference whose extension `mime-types` cannot map is served as
  // `application/octet-stream`, and render is sniff-dependent from there — the
  // same gate/render-agreement argument as the dot-segment rule above.
  // `mime-types` is the mapping authority so the gate and the route cannot
  // drift, and the rule lives here in the classifier so the CLI, the
  // pre-commit hook, and the deletion sweep share one map.
  //
  // The extension name in the message is derived from the filename, not the
  // whole path: a dotless path like `assets/code` would report a bogus
  // extension (`.assets/code` — `lastIndexOf('.')` is -1 and the `+ 1` makes
  // `slice` yield the entire path), so the basename is carved out first and
  // the no-dot case falls through to the `extension === ''` branch below.
  const fileName = assetPath.slice(assetPath.lastIndexOf('/') + 1);
  const dotIndex = fileName.lastIndexOf('.');
  const extension = dotIndex === -1 ? '' : fileName.slice(dotIndex + 1).toLowerCase();
  if (mime.lookup(assetPath) === false) {
    const what = extension === '' ? 'no file extension' : `the extension '.${extension}'`;
    return {
      kind: 'rejected',
      reason: `'${trimmed}' resolves to '${assetPath}', which has ${what} the asset server cannot map to a content type — it would be served as application/octet-stream and rendering would be sniff-dependent; rename it to a mappable file type (e.g. a .png, .css, or .js extension)`
    };
  }

  return { kind: 'asset', assetPath };
}

/**
 * One resource reference found in an HTML card document, paired with its
 * classification.
 *
 * @summary A scanned reference and what the gate makes of it
 */
export interface CollectedResourceReference {
  /** The raw reference exactly as it appears in the source (whitespace-trimmed). */
  reference: string;
  /** The reference's classification. */
  classification: ResourceReferenceClass;
}

/**
 * Collects every resource reference in an HTML card document and classifies
 * each one against the gate's rules.
 *
 * The classification-based engine behind {@link checkHtmlContent}'s resource
 * check and the deletion sweep: `allowed` references are passed through
 * untouched, `asset` references are subject to the caller's `assetExists`
 * predicate, and `rejected` references fail the gate with their author-facing
 * reason. Resolution is relative to the directory containing the HTML file,
 * hence the required `htmlRepoRelativePath` — the same resolution
 * {@link classifyResourceReference} performs.
 *
 * The list is deduplicated by classification identity (the resolved asset path
 * for `asset` references, the rejection reason for `rejected` ones), so the
 * same file referenced two ways — `assets/x.png` and `./assets/x.png` — is
 * checked once, and an offending reference named in both an attribute and a
 * CSS `url()` is reported once.
 *
 * Two element-position rules are applied on top of the plain classification,
 * each closing a gate-accepts-but-render-breaks class against the served
 * document's CSP:
 *
 * - Any reference in the start tag of a frame-like element — `<iframe>`,
 *   `<frame>`, `<embed>`, and `<object>` — is refused: the CSP carries no
 *   `frame-src`/`object-src` token, so they fall back to `default-src 'none'`
 *   and block every frame and object load whatever the reference is, `https:`
 *   and `data:` included. The classifier would bless a `https:` iframe src as
 *   a normal network reference; this rule is what stops that class.
 *   `frameElementSpans` are the whole-element spans of those elements from
 *   the caller's parse5 parse (see {@link FRAME_ELEMENT_TAG_NAMES}).
 *   `<object>`'s reference is its `data` attribute, which is scanned only
 *   inside an object start tag — elsewhere `data=` is author data, never a
 *   load, so it is not a reference at all.
 * - A `data:` reference in a `<script>` start tag is refused — `script-src`
 *   deliberately carries no `data:` token, so the URI would be blocked before
 *   it ever loaded. `https:` and `#fragment` script references are unchanged.
 *
 * @param htmlSource - HTML source to scan.
 * @param htmlRepoRelativePath - Repo-relative path of the HTML file the
 *   references were found in (for `../` resolution).
 * @param scriptSpans - Whole-element `<script>` spans (see {@link ScriptSpan}),
 *   whose bodies are redacted so inline JavaScript is excluded from every
 *   pattern; `<script>` start tags stay visible so their `src` attributes are
 *   still checked. Defaults to none — omitting spans skips the position rules
 *   and widens the gate toward the very gate-accepts/CSP-blocks class they
 *   close, so every caller that runs the gate parses the document and passes
 *   them.
 * @param frameElementSpans - Whole-element spans of the frame-like elements
 *   (`<iframe>`/`<frame>`/`<embed>`/`<object>`, see
 *   {@link FRAME_ELEMENT_TAG_NAMES}) whose start-tag references the served CSP
 *   refuses. Defaults to none — omitting them skips the frame refusal (and the
 *   `data=` scan it gates, since object spans are its only authority) and
 *   widens the gate; same caveat as `scriptSpans`.
 * @returns Every reference with its classification, in source order, deduplicated.
 */
export function collectResourceReferences(
  htmlSource: string,
  htmlRepoRelativePath: string,
  scriptSpans: readonly ScriptSpan[] = [],
  frameElementSpans: readonly ElementSpan[] = []
): CollectedResourceReference[] {
  // Every pattern scans the body-redacted source: inline JS is neither markup
  // nor CSS, so `var href = …` and `new URL(base)` alike must not be matched.
  const source = blankScriptBodies(htmlSource, scriptSpans);
  const collected: CollectedResourceReference[] = [];
  const seen = new Set<string>();
  for (const re of RESOURCE_REFERENCE_RES) {
    // Each regex is global; reset lastIndex defensively before iterating.
    re.lastIndex = 0;
    const isSrcset = re === SRCSET_RE;
    const isDataAttr = re === DATA_QUOTED_RE || re === DATA_UNQUOTED_RE;
    for (const match of source.matchAll(re)) {
      const raw = match[1];
      if (!raw) continue;
      // `data=` is a resource reference only on `<object>` — anywhere else it
      // is author data (state, selectors), never a load, and scanning it would
      // invent references the author never wrote. The frame-element spans are
      // the only authority for where an object's start tag is, so a `data=`
      // match outside one is skipped; with no spans at all nothing is scanned
      // (the documented widened-gate consequence of omitting them).
      if (isDataAttr && !isInsideStartTag(match.index, htmlSource, frameElementSpans)) continue;
      // srcset is a comma-separated "url descriptor" candidate list; extract
      // just the URL from each data-URI-aware candidate segment.
      const candidates = isSrcset ? splitSrcsetCandidates(raw).map((c) => c.split(/\s+/)[0]) : [raw];
      for (const candidate of candidates) {
        if (!candidate) continue;
        const reference = candidate.trim();
        let classification = classifyResourceReference(reference, htmlRepoRelativePath);
        if (isInsideStartTag(match.index, htmlSource, frameElementSpans)) {
          // A frame or object element can never render anything under the
          // served CSP: frame-src and object-src carry no token, so they fall
          // back to `default-src 'none'` and block every frame and object load
          // whatever the reference is — https:, data:, and assets/ alike
          // (`<object>`'s reference rides its `data` attribute, `src`-less).
          // Accepting any of them would break the accepts-exactly-what-renders
          // agreement, so the whole class is refused here at commit time.
          classification = {
            kind: 'rejected',
            reason: `'${reference}' is the load target of an embedded frame or object element (iframe/frame/embed/object), which the served-document CSP refuses — frame-src and object-src fall back to default-src 'none', so nothing such an element points at can ever render; put the content in the page instead`
          };
        } else if (
          classification.kind === 'allowed' &&
          reference.startsWith('data:') &&
          isInsideStartTag(match.index, htmlSource, scriptSpans)
        ) {
          classification = {
            kind: 'rejected',
            reason: `'${reference}' is a data: URI in a <script> src, which the served-document CSP refuses — script-src carries no data: token; put the code in a <script> body instead`
          };
        }
        // Dedupe by classification identity: the same file referenced two ways
        // (`assets/x.png` and `./assets/x.png`) is one `asset` entry, and the
        // same offending reference in an attribute and a CSS `url()` is one
        // `rejected` entry.
        const identity = classificationIdentity(classification);
        if (seen.has(identity)) continue;
        seen.add(identity);
        collected.push({ reference, classification });
      }
    }
  }
  return collected;
}

/**
 * Whether a pattern-match offset falls inside the *start tag* of one of the
 * given whole-element spans.
 *
 * Position rules like the frame and script-start-tag refusals are scoped to
 * the start tag because that is where the element's resource-loading
 * attributes live; a reference inside the element's body is scanned by the
 * generic patterns like any other content. The start tag is narrowed from the
 * whole-element span by its first unquoted `>` — a `>` inside a quoted
 * attribute value is not the tag's end.
 *
 * @param offset - Offset of a pattern match in the source.
 * @param htmlSource - HTML source the spans refer to (same offsets).
 * @param spans - Whole-element spans to test against.
 * @returns `true` when the offset falls within some span's start tag.
 */
function isInsideStartTag(offset: number, htmlSource: string, spans: readonly ElementSpan[]): boolean {
  for (const span of spans) {
    if (offset < span.start) continue;
    // An unterminated frame element — no close tag, which is legal HTML — is
    // reported by parse5 as a zero-width span (the element never closes, so
    // its location collapses onto its start). Its start tag did terminate, so
    // the unquoted-`>` scan extends to the end of the source for such a span;
    // a reference inside that start tag must still be refused, or an
    // unterminated `<iframe src="assets/x.png">` would pass the gate and
    // render a CSP-blocked blank frame.
    const spanEnd = span.end > span.start ? Math.min(span.end, htmlSource.length) : htmlSource.length;
    const tagEnd = findUnquotedTagEnd(htmlSource, span.start, spanEnd);
    if (tagEnd !== -1 && offset < tagEnd) return true;
  }
  return false;
}

/**
 * Stable deduplication identity for a classification: the resolved asset path
 * for `asset` references, the full reason for `rejected` ones (which already
 * names the reference), and the kind alone for `allowed`.
 *
 * @param classification - The classification to derive an identity for.
 * @returns A string that is equal exactly when two classifications should be
 *   reported once.
 */
function classificationIdentity(classification: ResourceReferenceClass): string {
  switch (classification.kind) {
    case 'allowed':
      return 'allowed';
    case 'asset':
      return `asset:${classification.assetPath}`;
    case 'rejected':
      return `rejected:${classification.reason}`;
  }
}

/**
 * Scans HTML source for resource references the gate rejects.
 *
 * Defense-in-depth only — the served-document CSP header is the enforcement
 * layer; this exists so an author gets an early, clear commit-time error
 * naming the offending reference. Under the served-document model the
 * "external" references are exactly the rejected classifications: relative
 * references resolving under the repository-root `assets/` are served, not
 * external, so this reworks onto {@link collectResourceReferences}.
 *
 * The reference list carries no page path, so classification is judged as it
 * would be from the repository root — fine for the scheme/host refs this
 * function's contract is about, and the reason callers that already know the
 * page path use {@link checkHtmlContent} instead.
 *
 * @param htmlSource - HTML source to scan.
 * @param scriptSpans - Whole-element `<script>` spans (see {@link ScriptSpan}),
 *   whose bodies are redacted so inline JavaScript is excluded from every
 *   pattern; `<script>` start tags stay visible so their `src` attributes are
 *   still checked. Defaults to none, which is safe (just less precise) when the
 *   caller hasn't already parsed the document.
 * @param frameElementSpans - Whole-element spans of the frame-like elements
 *   whose start-tag references are refused (see
 *   {@link collectResourceReferences}).
 * @returns Array of rejected resource references, deduplicated (empty when none).
 */
export function findExternalResources(
  htmlSource: string,
  scriptSpans: readonly ScriptSpan[] = [],
  frameElementSpans: readonly ElementSpan[] = []
): string[] {
  return collectResourceReferences(htmlSource, '', scriptSpans, frameElementSpans)
    .filter((entry) => entry.classification.kind === 'rejected')
    .map((entry) => entry.reference);
}

// ─── Well-formedness ────────────────────────────────────────────────────────────

/**
 * parse5 error codes that are informational, not structural failures.
 *
 * `missing-doctype` is excluded from the gate: agent-authored HTML fragments are
 * not expected to include a DOCTYPE declaration. All other parse5 errors (e.g.
 * `eof-in-tag`, `eof-in-comment`, `eof-in-element-that-can-contain-only-text`)
 * indicate truncated / broken-EOF markup and are fatal.
 *
 * Shared so the CLI (`card html check`) and the pre-commit hook apply the
 * identical filtering rule — see {@link filterStructuralParseErrors}.
 */
export const INFORMATIONAL_PARSE5_CODES: ReadonlySet<string> = new Set<string>(['missing-doctype']);

/**
 * Filters a list of parse5 error codes down to the structurally fatal ones.
 *
 * @param codes - Raw parse5 error codes collected via `onParseError`.
 * @returns The subset that represents genuine structural failures.
 */
export function filterStructuralParseErrors(codes: readonly string[]): string[] {
  return codes.filter((code) => !INFORMATIONAL_PARSE5_CODES.has(code));
}

// ─── Shared content checks ──────────────────────────────────────────────────────

/**
 * Result of {@link checkHtmlContent}.
 *
 * @summary Outcome of the shared HTML content checks (schema + well-formedness + locality)
 */
export interface HtmlContentCheckResult {
  /** Whether all shared content checks passed. */
  valid: boolean;
  /** Error messages (already prefixed with the relevant repo-relative path). */
  errors: string[];
}

/**
 * Runs the shared, pure content checks (2–4) that both the `card html check`
 * CLI and the pre-commit hook must apply identically:
 *
 * 2. Closed-schema sidecar — via {@link validateHtmlInfo} (includes aspect parse).
 * 3. HTML well-formedness — the caller's parse5 error codes, filtered through
 *    {@link filterStructuralParseErrors}.
 * 4. Resource locality — every reference classified via
 *    {@link collectResourceReferences}: `rejected` references fail with their
 *    author-facing reason, and `asset` references must pass the caller's
 *    `assetExists` predicate.
 *
 * parse5 is not an SDK dependency, so the raw parse happens in each caller; the
 * informational-code filtering rule lives here so the two gates cannot drift.
 * Pairing (check 1) is filesystem-specific and stays at each caller.
 *
 * @param params - Inputs for the shared content checks.
 * @param params.htmlPath - Repo-relative path of the `.html` file (for messages).
 * @param params.metaPath - Repo-relative path of the `.meta.json` sidecar (for messages).
 * @param params.htmlSource - HTML source text.
 * @param params.parsedMeta - Already-JSON-parsed sidecar value (unknown shape).
 * @param params.parseErrorCodes - parse5 error codes collected from `htmlSource`.
 * @param params.scriptSpans - Whole-element `<script>` spans from the same parse5
 *   parse (with `sourceCodeLocationInfo: true`), used by check 4 to exclude
 *   inline JavaScript bodies from every locality pattern while still checking
 *   the `src` attribute on each `<script>` start tag.
 * @param params.frameElementSpans - Whole-element spans of the frame-like
 *   elements (`<iframe>`/`<frame>`/`<embed>`) from the same parse, used by
 *   check 4 to refuse relative references the served CSP would block (see
 *   {@link collectResourceReferences}).
 * @param params.baseElementSpans - Whole-element spans of `<base>` elements
 *   (see {@link BASE_ELEMENT_TAG_NAMES}) from the same parse. The served
 *   document refuses an author `<base>` as a class — see check 4b — and the
 *   spans are its authority; a `<base` token inside a comment or script body
 *   produces no span and stays inert text. Defaults to none.
 * @param params.assetExists - Whether a repo-relative path under `assets/`
 *   exists. Required rather than optional: it is the one check standing between
 *   an author and a page that renders as an error, so no caller may fail open by
 *   omitting it. The CLI supplies a working-tree `existsSync`; the pre-commit
 *   hook supplies an index-based predicate, so an asset added but not staged
 *   fails the commit that references it.
 * @returns Aggregated result; `valid` is false on the first failing check.
 */
export function checkHtmlContent(params: {
  htmlPath: string;
  metaPath: string;
  htmlSource: string;
  parsedMeta: unknown;
  parseErrorCodes: readonly string[];
  scriptSpans?: readonly ScriptSpan[];
  frameElementSpans?: readonly ElementSpan[];
  baseElementSpans?: readonly ElementSpan[];
  assetExists: (repoRelativeAssetPath: string) => boolean;
}): HtmlContentCheckResult {
  const {
    htmlPath,
    metaPath,
    htmlSource,
    parsedMeta,
    parseErrorCodes,
    scriptSpans = [],
    frameElementSpans = [],
    baseElementSpans = [],
    assetExists
  } = params;

  // ── Check 2: Closed-schema sidecar (includes aspect parse) ──
  const schemaResult = validateHtmlInfo(parsedMeta);
  if (!schemaResult.valid) {
    return { valid: false, errors: schemaResult.errors.map((e) => `${metaPath}: ${e}`) };
  }

  // ── Check 3: HTML well-formedness ──
  const structuralErrors = filterStructuralParseErrors(parseErrorCodes);
  if (structuralErrors.length > 0) {
    return {
      valid: false,
      errors: [`${htmlPath}: HTML well-formedness error: ${structuralErrors.join(', ')}`]
    };
  }

  // ── Check 4: Resource locality — classify every reference ──
  const collected = collectResourceReferences(htmlSource, htmlPath, scriptSpans, frameElementSpans);
  const errors: string[] = [];
  for (const { reference, classification } of collected) {
    switch (classification.kind) {
      case 'allowed':
        break;
      case 'asset':
        if (!assetExists(classification.assetPath)) {
          errors.push(
            `${htmlPath}: references '${reference}', but the asset '${classification.assetPath}' was not found — create the file, stage it, or fix the reference`
          );
        }
        break;
      case 'rejected':
        errors.push(`${htmlPath}: ${classification.reason}`);
        break;
    }
  }

  // ── Check 4b: no author <base> element ──
  // The served document resolves relative references against its own URL and
  // the serve-time builder injects a target-only <base> for link opening. An
  // author <base> is refused as a class: the served CSP's `base-uri 'none'`
  // blocks its href, so the element is inert in the direction it is normally
  // written for, while its target still wins the first-base race over the
  // builder's — the author's markup silently diverges from the render either
  // way, with no load-time error to say so. Refusing the element itself keeps
  // the gate's promise that a page which commits clean renders clean.
  for (const span of baseElementSpans) {
    // An unclosed `<base` at EOF never yields a span — the tokenizer drops
    // the tag token when the `>` is missing at EOF, as the browser does, so
    // parse5 emits nothing for it (and the form renders nothing). The
    // zero-width guard below is defensive only: a collapsed-location span
    // from a producer extends the start-tag scan to the source end, same as
    // the frame rule.
    const spanEnd = span.end > span.start ? Math.min(span.end, htmlSource.length) : htmlSource.length;
    const tagEnd = findUnquotedTagEnd(htmlSource, span.start, spanEnd);
    const tagText = htmlSource
      .slice(span.start, tagEnd === -1 ? spanEnd : tagEnd)
      .replace(/\s+/g, ' ')
      .trim();
    errors.push(
      `${htmlPath}: the document contains a <base> element (${tagText}), which is not allowed here — the page resolves relative references against its own URL and the server injects a target-only <base> for link opening, so this element's href would be blocked by the CSP's base-uri 'none' while its target would override the server's; remove it`
    );
  }
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Result of validating an HTML sidecar file.
 *
 * @summary Validation result for {@link validateHtmlInfo}
 */
export interface HtmlInfoValidationResult {
  /** Whether the input is a valid {@link HtmlInfoFile}. */
  valid: boolean;
  /** Validation error messages. Empty when `valid` is `true`. */
  errors: string[];
}

/**
 * Validates an unknown value against the closed {@link HtmlInfoFile} schema.
 *
 * The schema is **closed**: any key other than `title`, `summary`, `aspect`,
 * and `scripts` causes validation to fail with an "unknown key" error. This
 * contrasts with the open `validateAttachmentInfo()` which permits extra keys.
 *
 * Validation rules:
 * - No unknown keys permitted (closed schema).
 * - `title`: required string, ≤ 120 characters.
 * - `summary`: required string, ≤ 280 characters.
 * - `aspect`: required string or number that parses to a valid positive ratio
 *   (see {@link parseAspectRatio}); unparseable values like `"0:0"`, `"16:9:9"`,
 *   `-3`, `0`, or the quoted decimal `"1.6"` are rejected.
 * - `scripts`: optional boolean.
 *
 * @param value - Unknown input to validate.
 * @returns Validation result with `valid` flag and any `errors`.
 */
export function validateHtmlInfo(value: unknown): HtmlInfoValidationResult {
  const errors: string[] = [];

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { valid: false, errors: ['HtmlInfoFile must be a non-null object'] };
  }

  const record = value as Record<string, unknown>;

  // Closed schema: reject any unknown key
  for (const key of Object.keys(record)) {
    if (!ALLOWED_HTML_INFO_KEYS.has(key)) {
      errors.push(`Unknown key "${key}" — HtmlInfoFile only permits: title, summary, aspect, scripts`);
    }
  }

  // title: required string ≤ 120 chars
  if (!('title' in record)) {
    errors.push('Missing required field "title"');
  } else if (typeof record['title'] !== 'string') {
    errors.push('"title" must be a string');
  } else if (record['title'].length > MAX_HTML_TITLE_LENGTH) {
    errors.push(`"title" must be ≤ ${MAX_HTML_TITLE_LENGTH} characters (got ${record['title'].length})`);
  }

  // summary: required string ≤ 280 chars
  if (!('summary' in record)) {
    errors.push('Missing required field "summary"');
  } else if (typeof record['summary'] !== 'string') {
    errors.push('"summary" must be a string');
  } else if (record['summary'].length > MAX_HTML_SUMMARY_LENGTH) {
    errors.push(`"summary" must be ≤ ${MAX_HTML_SUMMARY_LENGTH} characters (got ${record['summary'].length})`);
  }

  // aspect: required string or number, AND must parse to a valid positive ratio.
  if (!('aspect' in record)) {
    errors.push('Missing required field "aspect"');
  } else if (typeof record['aspect'] !== 'string' && typeof record['aspect'] !== 'number') {
    errors.push('"aspect" must be a string or number');
  } else if (parseAspectRatio(record['aspect']) === null) {
    errors.push(
      `"aspect" value ${JSON.stringify(record['aspect'])} is not a valid aspect ratio — ` +
        'use "<width>:<height>" with positive integers (e.g. "16:9") or a positive finite number (e.g. 1.7778)'
    );
  }

  // scripts: optional boolean
  if ('scripts' in record && typeof record['scripts'] !== 'boolean') {
    errors.push('"scripts" must be a boolean');
  }

  return { valid: errors.length === 0, errors };
}
