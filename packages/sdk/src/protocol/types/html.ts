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
 * - `aspect`: required string or number.
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

  // aspect: required string or number
  if (!('aspect' in record)) {
    errors.push('Missing required field "aspect"');
  } else if (typeof record['aspect'] !== 'string' && typeof record['aspect'] !== 'number') {
    errors.push('"aspect" must be a string or number');
  }

  // scripts: optional boolean
  if ('scripts' in record && typeof record['scripts'] !== 'boolean') {
    errors.push('"scripts" must be a boolean');
  }

  return { valid: errors.length === 0, errors };
}
