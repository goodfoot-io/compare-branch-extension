/**
 * Pure formatting helpers for the compact session card's timing and metrics
 * rows. Each returns a short display string lifted from the redesign mockup
 * (`7h 33m`, `11m 53s`, `536K`, `Jun 1`).
 *
 * @summary Duration / count / date formatters for the compact metrics row
 * @module components/compact/format
 */

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
