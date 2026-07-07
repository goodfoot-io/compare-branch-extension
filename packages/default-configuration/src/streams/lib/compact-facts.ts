/**
 * Shared pure formatting and fact-building helpers for the compact card.
 *
 * Both stream renderers' adapters (`claudeToCompactCardModel`,
 * `codexToCompactCardModel`) use these to format counts/durations/dates and to
 * build the {@link FactModel} entries that make up the compact card's metrics
 * rows. Ported verbatim from the claude-code-session `format.ts` /
 * `CompactView.tsx` implementations as the single canonical source — Codex's
 * previous inline lowercase-`k` `formatCount` is intentionally replaced by
 * this M/K-tier version, an accepted convergence between the two renderers.
 *
 * @summary Compact-card format/fact helpers
 * @module streams/lib/compact-facts
 */

import type { FactModel } from './compact-card-model';

/** Month abbreviations for {@link formatDate}; index = `Date.getMonth()`. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats an elapsed/total span as a compact duration string.
 *
 * - `>= 1h` → `Hh Mm` (e.g. `7h 33m`)
 * - `>= 1m` → `Mm Ss` (e.g. `11m 53s`)
 * - otherwise → `Ss` (e.g. `42s`)
 *
 * Negative or non-finite inputs format as `0s`.
 *
 * @param ms - Span in milliseconds.
 * @returns Compact duration string.
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/**
 * Formats a token (or other large) count compactly: `>= 1000` collapses to a
 * `K`/`M` suffix with no decimals (e.g. `536000` → `536K`, `1_900_000` → `1.9M`),
 * smaller values render as-is.
 *
 * @param n - The count to format.
 * @returns Compact count string.
 */
export function formatCount(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(Math.round(n));
}

/**
 * Formats an epoch-ms timestamp as a short `Mon D` date (e.g. `Jun 1`).
 * Returns `''` for a missing/zero timestamp so the caller can omit the field.
 *
 * @param ms - Epoch milliseconds (0 → unset).
 * @returns `Mon D` date string, or `''` when unset.
 */
export function formatDate(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const date = new Date(ms);
  const month = MONTHS[date.getMonth()];
  return month ? `${month} ${date.getDate()}` : '';
}

/**
 * Builds a count fact (`<b>{count}</b> noun[s]`), or null when the count is
 * zero (or negative) so zero-valued counts drop out of the metrics row
 * entirely. The noun pluralizes for any count other than 1.
 * @param count - The tally to render (e.g. turns, tool calls, files touched).
 * @param noun - The singular noun for the tally.
 * @returns The fact, or null when `count` is zero or negative.
 */
export function countFact(count: number, noun: string): FactModel | null {
  if (count <= 0) return null;
  return { key: noun, kind: 'value', bold: String(count), label: count === 1 ? noun : `${noun}s` };
}

/**
 * Builds a token fact (`<b>{formatted}</b> label`), or null when the total is
 * zero (or negative) so an empty session shows no `0 out` / `0 in`.
 * @param total - The summed token count to format compactly.
 * @param label - The trailing label (`out` / `in`).
 * @returns The fact, or null when `total` is zero or negative.
 */
export function tokenFact(total: number, label: string): FactModel | null {
  if (total <= 0) return null;
  return { key: label, kind: 'value', bold: formatCount(total), label };
}

/**
 * Builds a bare plain-text fact (e.g. the model name), or null when `text` is
 * falsy so an absent/empty value drops out of the metrics row entirely.
 * @param key - Stable React key for the fact.
 * @param text - The plain text to render.
 * @returns The fact, or null when `text` is falsy.
 */
export function plainFact(key: string, text: string): FactModel | null {
  if (!text) return null;
  return { key, kind: 'plain', text };
}
