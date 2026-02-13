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
 * Upper bound for markdown description bodies stored in card files.
 */
export const MAX_DESCRIPTION_LENGTH = 50000;

/**
 * Upper bound for UUID-style identifiers stored as strings.
 */
export const MAX_ID_LENGTH = 36;

/**
 * Upper bound for card IDs that follow the branch-based format.
 *
 * Format: `{prefix}-{counter}` where the prefix is up to 11 characters and the
 * counter is up to 4 digits.
 */
export const MAX_CARD_ID_LENGTH = 16;

// --- Pattern Constraints ---

/**
 * Regex pattern for normalized tag slugs.
 *
 * Tag tokens are restricted to lowercase letters, numbers, and hyphens so they
 * remain URL- and filesystem-friendly.
 */
export const TAG_PATTERN = /^[a-z0-9-]+$/;

/**
 * Regex pattern for attachment identifiers embedded in text.
 *
 * Pattern: `att-{uuid}_{filename}` where uuid is a 36-character hex string
 * with hyphens and the filename is a simple slug (word characters, dots,
 * or hyphens). The pattern is intentionally unanchored so callers can scan
 * larger strings; anchor it for full-string validation.
 */
export const ATTACHMENT_ID_PATTERN = /att-[a-f0-9-]{36}_[\w.-]+/;
