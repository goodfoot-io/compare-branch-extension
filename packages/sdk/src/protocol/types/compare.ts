/**
 * Compare API request and response types for controlling the attribution tree.
 *
 * @summary Compare API types for controlling the attribution tree view
 * @module types/compare
 */

// --- Request Types (Discriminated Union) ---

/**
 * Request to compare two branches by ref names.
 */
export interface CompareBranchRangeRequest {
  /** The base branch ref (e.g., "main"). */
  baseRef: string;
  /** The compare branch ref (e.g., "feature/my-card"). */
  compareRef: string;
  /** Optional display title for the comparison (e.g., "CARD 45 CHANGES"). */
  title?: string;
}

/**
 * Request to compare dynamically against a worktree's working state.
 */
export interface CompareDynamicRequest {
  /** The base branch ref to compare against. */
  baseRef: string;
  /** Absolute path to the repository worktree. */
  repositoryPath: string;
  /** Optional display title for the comparison (e.g., "CARD 45 CHANGES"). */
  title?: string;
}

/**
 * Request to compare against a fixed set of pre-computed attribution SHAs.
 */
export interface CompareFixedAttributionRequest {
  /** The branch ref whose commits are attributed. */
  compareRef: string;
  /** Pre-computed commit SHAs for attribution. */
  attributionShas: string[];
  /** Optional display title for the comparison (e.g., "CARD 45 CHANGES"). */
  title?: string;
}

/**
 * Discriminated union of all supported compare request shapes.
 *
 * Discriminated by which fields are present:
 * - `baseRef` + `compareRef` → branch range
 * - `baseRef` + `repositoryPath` → dynamic
 * - `compareRef` + `attributionShas` → fixed attribution
 */
export type CompareRequest = CompareBranchRangeRequest | CompareDynamicRequest | CompareFixedAttributionRequest;

// --- Response / State Type ---

/**
 * The active compare mode.
 */
export type CompareMode = 'branch-range' | 'dynamic' | 'fixed-attribution';

/**
 * Current compare state stored on the server.
 *
 * Returned by POST /compare and GET /compare.
 */
export interface CompareState {
  /** Discriminant indicating which compare mode is active. */
  mode: CompareMode;
  /** Base branch ref. Present for branch-range and dynamic modes. */
  baseRef?: string;
  /** Compare branch ref. Present for branch-range and fixed-attribution modes. */
  compareRef?: string;
  /** Absolute path to the repository worktree. Present for dynamic mode. */
  repositoryPath?: string;
  /** Pre-computed commit SHAs for attribution. Present for fixed-attribution mode. */
  attributionShas?: string[];
  /** Optional display title for the comparison. When present, overrides the derived ref-based title. */
  title?: string;
}
