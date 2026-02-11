/**
 * Timeline entity types for Cards V2 activity streams.
 *
 * Timeline items capture user-authored content, adaptive card updates, and
 * commit metadata so the UI can render a chronological history of work.
 *
 * @module types/timeline
 */

import type { TypedFileMetadata } from './custom-types.js';

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
 * Generic timeline item for any registered typed file.
 *
 * Replaces per-type timeline items (NoteTimelineItem, AdaptiveCardTimelineItem)
 * with a single generic shape. The `type` field contains the typed file type name
 * (e.g. 'note', 'adaptive-card').
 */
export interface TypedFileTimelineItem {
  /** Typed file type name (e.g. 'note', 'adaptive-card'). Used as discriminator in TimelineItem union. */
  type: string;
  /** Logical ID extracted from content (e.g., .meta.json .id field or parsed from content) */
  id: string;
  /** File name within the typed file directory */
  fileName: string;
  /** Typed file metadata from .meta.json sidecar */
  metadata?: TypedFileMetadata;
  /** Raw parsed content (JSON object for JSON types, string for text types, undefined for binary files) */
  content?: unknown;
  /** ISO 8601 timestamp. Resolution: from metadata createdAt if available, else fs.stat mtime */
  createdAt: string;
}

/**
 * Union of all possible timeline items.
 */
export type TimelineItem = CommentTimelineItem | TypedFileTimelineItem | CommitTimelineItem;
