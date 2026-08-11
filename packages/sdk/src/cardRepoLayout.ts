/**
 * Single source of truth for card-repository document directory names.
 *
 * This module defines the canonical names of the card-repository document
 * directories. Every other occurrence in the codebase derives from these
 * constants — no caller should hardcode `'plans'`, `'comments'`, `'attachments'`,
 * or `'assets'` (or their trailing-slash prefix forms) as a literal.
 *
 * Two constant shapes are exported for each directory:
 *
 * - `*_DIR` — bare name (no slash), for use in `path.join` segments and
 *   template literals that build paths: `path.join(cardPath, COMMENTS_DIR)`.
 *
 * - `*_PREFIX` — name with a trailing slash, for `.startsWith(...)` checks and
 *   exclude-lists: `repoRelativePath.startsWith(COMMENTS_PREFIX)`.
 *
 * There is exactly one set of names. No singular/plural compatibility layer
 * exists — callers use these constants and nothing else.
 *
 * This module has zero imports and is safe for browser contexts. Import via
 * the `@cards.management/sdk/card-repo-layout` subpath export.
 *
 * @summary Single source of truth for card-repo document directory names
 * @module
 */

export const PLANS_DIR = 'plans';
export const COMMENTS_DIR = 'comments';
export const ATTACHMENTS_DIR = 'attachments';

/**
 * Reserved directory holding files served to HTML card documents.
 *
 * Unlike {@link ATTACHMENTS_DIR}, which is recognized as a directory segment at
 * any depth, this name is meaningful **only at the repository root**. The
 * asymmetry is deliberate: the set of files hidden from the timeline and the set
 * of files served to pages must be identical, or a nested `docs/assets/` would be
 * invisible *and* unservable — a trap with nothing in the path to explain it.
 */
export const ASSETS_DIR = 'assets';

export const PLANS_PREFIX = `${PLANS_DIR}/`;
export const COMMENTS_PREFIX = `${COMMENTS_DIR}/`;
export const ATTACHMENTS_PREFIX = `${ATTACHMENTS_DIR}/`;
export const ASSETS_PREFIX = `${ASSETS_DIR}/`;
