/**
 * Headline sanitization for the compact claude-code-session view.
 *
 * Reduces a candidate headline string to genuine human/assistant prose, or `''`.
 * Lives in `lib/` as a leaf module (it depends only on {@link stripMarkup}) so
 * that both the parse layer and the compact state machine import it from here,
 * breaking the `parse-session → compact-state → lib → parse-session` cycle.
 *
 * @summary Pure headline sanitizer: rejects markup and runtime control traffic
 * @module lib/sanitize
 */

import { stripMarkup } from './markdown';

/** Prefixes that mark runtime control traffic rather than genuine prose. */
const CONTROL_PREFIXES = ['Load the', 'Base directory', 'Stop hook feedback:'];

/**
 * Raw wrapper-markup markers whose mere presence means the line is a
 * slash-command expansion or routing message, not genuine prose. These are
 * matched against the *raw* text — {@link stripMarkup} would otherwise drop the
 * tags and leave their machine-generated inner text looking like real prose (the
 * markup-leak the redesign exists to fix).
 */
const CONTROL_MARKERS = /<command-(?:message|name)|<skill-format|<teammate-message/i;

/**
 * Reports whether `text` parses as a complete JSON value.
 * @param text - Candidate string.
 * @returns True when `JSON.parse` accepts the input.
 * @throws Re-throws any non-`SyntaxError` raised by `JSON.parse`.
 */
function isJsonValue(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch (error) {
    if (error instanceof SyntaxError) return false;
    throw error;
  }
}

/**
 * Reduces a candidate headline string to genuine human/assistant prose, or `''`.
 *
 * Rejects (returns `''`) any line carrying `<command-*>` / `<skill-format>` /
 * `<teammate-message` wrapper markup wholesale — these are slash-command
 * expansions or routing messages whose stripped inner text is the markup leak
 * the redesign exists to fix. Otherwise it strips benign inline tags and
 * markdown (via {@link stripMarkup}) and then rejects anything that is empty,
 * JSON-ish (`^\s*[{[<]`), or runtime control traffic: lines that start with
 * `Load the`, `Base directory`, or `Stop hook feedback:`, or that parse as JSON.
 *
 * This is the single source of truth for "is this genuine prose"; the
 * parse-session user-text guard and the compact-state headline selector both
 * import it rather than re-deriving the rules.
 *
 * @param text - Raw candidate text (may contain wrapper markup).
 * @returns Sanitized prose, or `''` when nothing genuine remains.
 */
export function sanitizeHeadline(text: string): string {
  const raw = String(text ?? '');
  // Reject slash-command / skill / routing wrapper markup on the raw text:
  // stripMarkup would drop the tags and leave the machine inner text behind,
  // which is exactly the leak we must prevent.
  if (CONTROL_MARKERS.test(raw)) return '';
  const cleaned = stripMarkup(raw);
  if (!cleaned) return '';
  if (/^\s*[{[<]/.test(cleaned)) return '';
  for (const prefix of CONTROL_PREFIXES) {
    if (cleaned.startsWith(prefix)) return '';
  }
  if (isJsonValue(raw.trim())) return '';
  return cleaned;
}
