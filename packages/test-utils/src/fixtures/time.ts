/**
 * Time utilities for test fixtures.
 *
 * Why: standardize timestamp creation so fixture factories and tests can share
 * consistent temporal semantics without duplicating date math.
 *
 * Behavior: returns ISO 8601 strings derived from the local clock at call time.
 *
 * Constraint: `pastDate` and `futureDate` use calendar-day arithmetic in the
 * local timezone, so DST boundaries can shift the underlying hour.
 *
 *
 * @summary Time utilities for test fixtures
 * @module test-utils/fixtures/time
 */

/**
 * Returns the current timestamp in ISO 8601 format.
 *
 * Behavior: uses `new Date().toISOString()` at the moment of invocation.
 *
 * @returns Current ISO timestamp string
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Returns a timestamp for a date in the past.
 *
 * Behavior: subtracts `days` from the local calendar date, then serializes to
 * an ISO string (UTC).
 *
 * @param days Number of days in the past
 * @returns ISO timestamp string for the past date
 */
export function pastDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

/**
 * Returns a timestamp for a date in the future.
 *
 * Behavior: adds `days` to the local calendar date, then serializes to
 * an ISO string (UTC).
 *
 * @param days Number of days in the future
 * @returns ISO timestamp string for the future date
 */
export function futureDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}
