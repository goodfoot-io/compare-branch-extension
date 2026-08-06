/**
 * Protocol types for HTML file entries in card repositories.
 *
 * An HTML file entry consists of an `.html` source file and a `.meta.json`
 * sidecar under `html/` in a card repository. The sidecar's schema is closed —
 * only the keys enumerated here are permitted.
 *
 * @summary Protocol types for HTML card file entries
 * @module types/html
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum character length for an HTML file title. */
const MAX_HTML_TITLE_LENGTH = 120;

/** Maximum character length for an HTML file summary. */
const MAX_HTML_SUMMARY_LENGTH = 280;

/** Exact set of keys allowed in an HtmlInfoFile. Any other key is rejected. */
const ALLOWED_HTML_INFO_KEYS = new Set<string>(['title', 'summary', 'aspect', 'scripts']);

/**
 * Detects any non-local resource reference in `src`/`href`/`srcset` attributes
 * and CSS `url()` / `@import` references — anything that isn't a `data:` URI
 * or a same-document fragment (`#id`).
 *
 * This is a defense-in-depth, commit-time author convenience that catches the
 * common ways a resource reference silently fails to render. It is NOT the
 * security boundary: the real runtime enforcement is the per-panel CSP
 * (`default-src 'none'; connect-src 'none'; img-src data:`) injected at render
 * time. Because that CSP only allows `img-src data:`, a relative path (e.g.
 * `./logo.png`) passes commit-time syntax but silently fails to load in the
 * sandboxed iframe with no surfaced error — so relative paths are rejected
 * here too, not just absolute/protocol-relative URLs.
 *
 * Matched vectors (any scheme/path, not just `https:`/`http:`/`//`):
 * - quoted/unquoted `src=`/`href=` attributes (with a left-boundary guard so
 *   `data-src="…"` and JS property assignments like `o.href = "…"` are not
 *   mistaken for the HTML attribute)
 * - `srcset=` candidate lists
 * - CSS `url(...)` (quoted or unquoted) in inline styles or `<style>` blocks
 * - CSS `@import` rules
 *
 * The two CSS-syntax patterns above are scanned only outside `<script>`
 * element bodies (see {@link blankScriptElements}): they have no attribute
 * name to left-boundary-guard against, so unlike `src=`/`href=`, a bare
 * inline-JS call such as `new URL(base)` or `buildUrl(path)` is
 * indistinguishable from real CSS by regex alone.
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

const RESOURCE_REFERENCE_RES: readonly RegExp[] = [
  // Quoted src/href: src="…" / href='…'
  new RegExp(`${ATTR_BOUNDARY}(?:src|href)\\s*=\\s*["']\\s*([^"']+)["']`, 'gi'),
  // Unquoted src/href: src=… (terminated by whitespace or '>')
  new RegExp(`${ATTR_BOUNDARY}(?:src|href)\\s*=\\s*([^\\s"'>]+)`, 'gi'),
  SRCSET_RE,
  // CSS url(...) — quoted or unquoted
  /url\(\s*["']?\s*([^)"']+)["']?\s*\)/gi,
  // CSS @import "url" or @import url(...)
  /@import\s+(?:url\(\s*)?["']?\s*([^)"';\s]+)/gi
];

// CSS-syntax patterns (url()/@import) have no attribute-name left-context to
// boundary-guard against — a bare inline-JS call like `URL(base)` or a string
// literal containing the text "@import" is indistinguishable from real CSS by
// regex alone. Rather than chase unboundable false positives, these two
// regexes are scoped to run only outside `<script>` element bodies.
const CSS_SYNTAX_RES: ReadonlySet<RegExp> = new Set([RESOURCE_REFERENCE_RES[3]!, RESOURCE_REFERENCE_RES[4]!]);

/**
 * A `<script>` element's byte-offset span within the HTML source, as derived
 * from a parse5 parse with `sourceCodeLocationInfo: true`.
 *
 * parse5 is not an SDK dependency (see {@link checkHtmlContent}), so callers
 * that already parse the document for the well-formedness gate (check 3) walk
 * the resulting tree for `script` elements and pass their spans in here — a
 * real parse is correct by construction against comments, attribute values,
 * and RCDATA text (`<title>`, `<textarea>`), where a raw-text regex for
 * `<script>` tokens is not.
 */
export interface ScriptSpan {
  /** Offset (inclusive) of the `<script` element's opening `<` in `htmlSource`. */
  start: number;
  /** Offset (exclusive) just past the element's closing `</script>`. */
  end: number;
}

/**
 * Blanks out `<script>…</script>` element bodies at the given spans
 * (preserving length/offsets and newlines, so unrelated regex behavior is
 * unaffected) so CSS-syntax patterns don't scan inline JavaScript.
 *
 * @param htmlSource - HTML source to redact.
 * @param scriptSpans - `<script>` element spans, as parsed by the caller.
 * @returns `htmlSource` with script element contents replaced with spaces.
 */
function blankScriptElements(htmlSource: string, scriptSpans: readonly ScriptSpan[]): string {
  if (scriptSpans.length === 0) return htmlSource;
  // Index by UTF-16 code unit (not code point) to match parse5's byte offsets.
  const chars = Array.from({ length: htmlSource.length }, (_, i) => htmlSource[i]!);
  for (const { start, end } of scriptSpans) {
    for (let i = start; i < end && i < chars.length; i++) {
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
 * Whether a single resource reference value is permitted: a `data:` URI or a
 * same-document fragment (`#id`). Anything else — absolute URLs, protocol-relative
 * URLs, and relative paths alike — is rejected (see {@link RESOURCE_REFERENCE_RES}).
 *
 * @param value - A single captured `src`/`href`/`url()` reference value.
 * @returns `true` when the value is a `data:` URI or a `#fragment`.
 */
function isAllowedResourceReference(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith('data:') || trimmed.startsWith('#');
}

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * File-persisted metadata for an HTML card file.
 *
 * Stored in `html/<name>.meta.json` alongside `html/<name>.html`.
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
   * When `true` (default), the iframe is sandboxed with `allow-scripts allow-same-origin`.
   * When `false`, scripts are fully disabled: `allow-same-origin` only.
   */
  scripts?: boolean;
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
 * Scans HTML source for external (non-local) resource references.
 *
 * Defense-in-depth only — see {@link EXTERNAL_RESOURCE_RES}. The CSP injected at
 * render time is the enforcement layer; this exists so an author gets an early,
 * clear commit-time error naming the offending URL.
 *
 * @param htmlSource - HTML source to scan.
 * @param scriptSpans - `<script>` element spans (see {@link ScriptSpan}), used to
 *   exclude inline JavaScript from the CSS-syntax (`url()`/`@import`) patterns.
 *   Defaults to none, which is safe (just less precise) when the caller hasn't
 *   already parsed the document.
 * @returns Array of offending resource references (empty when none are found).
 */
export function findExternalResources(htmlSource: string, scriptSpans: readonly ScriptSpan[] = []): string[] {
  const urls: string[] = [];
  const scriptRedactedSource = blankScriptElements(htmlSource, scriptSpans);
  for (const re of RESOURCE_REFERENCE_RES) {
    // Each regex is global; reset lastIndex defensively before iterating.
    re.lastIndex = 0;
    const isSrcset = re === SRCSET_RE;
    // CSS-syntax patterns (url()/@import) scan the script-redacted source so
    // inline JS like `new URL(base)` or `buildUrl(path)` isn't mistaken for CSS.
    const source = CSS_SYNTAX_RES.has(re) ? scriptRedactedSource : htmlSource;
    for (const match of source.matchAll(re)) {
      const raw = match[1];
      if (!raw) continue;
      // srcset is a comma-separated "url descriptor" candidate list; extract
      // just the URL from each data-URI-aware candidate segment.
      const candidates = isSrcset ? splitSrcsetCandidates(raw).map((c) => c.split(/\s+/)[0]) : [raw];
      for (const candidate of candidates) {
        if (candidate && !isAllowedResourceReference(candidate)) urls.push(candidate);
      }
    }
  }
  // `@import url(X)` matches both the url() and @import patterns above;
  // dedupe so the offending reference is only reported once.
  return [...new Set(urls)];
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
 * 4. Resource locality — via {@link findExternalResources}.
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
 * @param params.scriptSpans - `<script>` element spans from the same parse5 parse
 *   (with `sourceCodeLocationInfo: true`), used by check 4 to exclude inline
 *   JavaScript from the CSS-syntax (`url()`/`@import`) locality patterns.
 * @returns Aggregated result; `valid` is false on the first failing check.
 */
export function checkHtmlContent(params: {
  htmlPath: string;
  metaPath: string;
  htmlSource: string;
  parsedMeta: unknown;
  parseErrorCodes: readonly string[];
  scriptSpans?: readonly ScriptSpan[];
}): HtmlContentCheckResult {
  const { htmlPath, metaPath, htmlSource, parsedMeta, parseErrorCodes, scriptSpans = [] } = params;

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

  // ── Check 4: Resource locality ──
  const externalUrls = findExternalResources(htmlSource, scriptSpans);
  if (externalUrls.length > 0) {
    return {
      valid: false,
      errors: [
        `${htmlPath}: non-local resource reference(s) are not permitted (src/href/srcset/CSS url() must be a data: URI or a #fragment): ${externalUrls.join(', ')}`
      ]
    };
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
