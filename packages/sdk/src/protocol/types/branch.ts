/**
 * Branch and worktree tracking types for Cards V2 workspace integration.
 *
 * These types support tracking Git branches and their associated worktrees within
 * a card's workspace block. The workspace block is stored in CARD.meta.json and
 * tracks both static metadata (branch name, worktree path, addedAt timestamp) and
 * derived fields computed at read time (exists, isMerged, commits).
 *
 * The branch API (`GET /cards/:id/branches`, `POST /cards/:id/branches`) uses
 * these types to expose workspace tracking state to clients and enable branch
 * association with cards.
 *
 * @summary Branch and worktree tracking types for Cards V2 workspace integration
 * @module types/branch
 */

/**
 * A single tracked branch within a card's workspace block.
 *
 * This is the minimal metadata persisted for each branch in CARD.meta.json.
 * The worktree path is optional and machine-specific; it may become stale if
 * the worktree is moved or deleted outside of the cards system.
 */
export interface WorkspaceBranch {
  /**
   * Optional absolute path to worktree directory (machine-specific, may be stale).
   * This path is advisory only and should be validated before use.
   */
  worktree?: string;

  /**
   * ISO 8601 timestamp when branch was added to the card.
   * Used for chronological sorting and audit trails.
   */
  addedAt: string;
}

/**
 * Workspace tracking block stored in CARD.meta.json.
 *
 * This block contains all workspace-related metadata for a card, including
 * branch tracking and commit attribution. It is persisted to disk and updated
 * by git-hooks and branch API operations.
 */
export interface WorkspaceBlock {
  /**
   * Map of branch name → branch tracking data.
   * Branch names may contain slashes (e.g., "feature/auth").
   */
  branches: Record<string, WorkspaceBranch>;

  /**
   * Commit SHAs attributed to this card's workspace.
   * Used for activity tracking and timeline integration.
   */
  commits: string[];
}

/**
 * Branch info returned by GET /cards/:id/branches (includes computed fields).
 *
 * This type extends the persisted WorkspaceBranch data with runtime-computed
 * fields that reflect the current Git repository state. Computed fields are
 * never stored in CARD.meta.json.
 */
export interface BranchInfo {
  /**
   * Branch name (may contain slashes, e.g., "feature/auth").
   * This is the Git ref name, not a filesystem path.
   */
  name: string;

  /**
   * Optional worktree path associated with this branch.
   * Copied from WorkspaceBranch.worktree if present.
   */
  worktree?: string;

  /**
   * ISO 8601 timestamp when branch was added.
   * Copied from WorkspaceBranch.addedAt.
   */
  addedAt: string;

  /**
   * Whether the branch still exists in git (computed at read time).
   * False if the branch ref has been deleted.
   */
  exists?: boolean;

  /**
   * Whether the branch tip is merged into requesting workspace HEAD.
   * Computed at read time, never stored. Only meaningful when exists=true.
   */
  isMerged?: boolean;

  /**
   * Commit SHAs reachable from this branch but not from HEAD (computed at read time).
   * Empty array if branch is fully merged or does not exist.
   */
  commits?: string[];
}

/**
 * Response shape for GET /cards/:id/branches.
 *
 * Returns all tracked branches for a card with computed runtime fields.
 */
export interface BranchesResponse {
  /**
   * List of tracked branches with computed fields.
   * Sorted by addedAt timestamp (oldest first).
   */
  branches: BranchInfo[];
}

/**
 * Request body for POST /cards/:id/branches.
 *
 * Used to add a new branch to a card's workspace tracking block.
 */
export interface AddBranchRequest {
  /**
   * Branch name to track.
   * Must be a valid Git ref name (may contain slashes).
   */
  name: string;

  /**
   * Optional worktree path.
   * Should be an absolute path to a valid worktree directory.
   */
  worktree?: string;
}
