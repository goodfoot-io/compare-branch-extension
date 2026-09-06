/**
 * Input validation boundaries for Cards V2 user-facing fields.
 *
 * These constants keep UI validation and server validation aligned. They are
 * deliberately centralized so limits can be changed in one place without
 * drifting between clients.
 *
 *
 * @summary Input validation boundaries for Cards V2 user-facing fields
 * @module types/constraints
 */

// --- Length Constraints ---

/**
 * Upper bound for human-facing titles shown in lists and headers.
 */
export const MAX_TITLE_LENGTH = 200;

/**
 * Upper bound for short summary fields (for example, adaptive card summaries).
 */
export const MAX_SUMMARY_LENGTH = 200;

/**
 * Upper bound for a single tag token after normalization.
 */
export const MAX_TAG_LENGTH = 50;

/**
 * Upper bound for UUID-style identifiers stored as strings.
 */
export const MAX_ID_LENGTH = 36;

// --- Pattern Constraints ---

/**
 * Regex pattern for normalized tag slugs.
 *
 * Tag tokens are restricted to lowercase letters, numbers, and hyphens so they
 * remain URL- and filesystem-friendly.
 */
export const TAG_PATTERN = /^[a-z0-9-]+$/;
