/**
 * Timeline entity types for Cards V2 activity streams.
 *
 * Timeline items capture user-authored comments and commit metadata so the
 * UI can render a chronological history of work.
 *
 *
 * @summary Timeline entity types for Cards V2 activity streams
 * @module types/timeline
 */

// --- Comment ---

/**
 * User-authored comment attached to a card.
 */
export interface Comment {
  /** Stable identifier for the comment. */
  id: string;
  /** Display name or handle of the author. */
  author: string;
  /** Comment body content as a string. */
  content: string;
  /** ISO 8601 timestamp when the comment was created. */
  createdAt: string;
  /** ISO 8601 timestamp of the most recent edit. */
  updatedAt: string;
}

// --- Timeline ---

/**
 * Timeline item representing a comment.
 */
export interface CommentTimelineItem extends Comment {
  /** Discriminator for comment timeline items. */
  type: 'comment';
}

// --- Commit ---

/**
 * File-level change stats for a commit.
 */
export interface FileChange {
  /** File path as reported by the underlying VCS. */
  path: string;
  /** Number of added lines. */
  additions: number;
  /** Number of deleted lines. */
  deletions: number;
}

/**
 * Aggregated change statistics for a commit.
 */
export interface CommitStats {
  /** Total lines added across the commit. */
  additions: number;
  /** Total lines deleted across the commit. */
  deletions: number;
  /** Per-file change details when available. */
  filesChanged: FileChange[];
  /** True if stats were truncated to keep payloads small. */
  truncated?: boolean;
}

/**
 * Author information captured from the version control system.
 */
export interface CommitAuthor {
  /** Author name as reported by the VCS. */
  name: string;
  /** Author email as reported by the VCS. */
  email: string;
  /** Author date in ISO 8601 format. */
  date: string;
}

/**
 * Detailed commit information for rich timeline rendering.
 */
export interface CommitDetails {
  /** Full commit message. */
  message: string;
  /** Author metadata for the commit. */
  author: CommitAuthor;
  /** Aggregate stats for the commit. */
  stats: CommitStats;
}

/**
 * Timeline item representing a commit entry.
 */
export interface CommitTimelineItem {
  /** Discriminator for commit timeline items. */
  type: 'commit';
  /** Commit SHA used for linking back to the repository. */
  sha: string;
  /** ISO 8601 timestamp when the commit was associated with the card. */
  createdAt: string;
  /** Optional commit message when available. */
  message?: string;
  /** Optional author details when available. */
  author?: CommitAuthor;
  /** Optional stats when available. */
  stats?: CommitStats;
}

/**
 * Union of all possible timeline items.
 */
export type TimelineItem = CommentTimelineItem | CommitTimelineItem;
