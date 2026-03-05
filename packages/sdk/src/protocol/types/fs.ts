/**
 * Filesystem commit types for card repository git history.
 *
 * These types are shared between the Cards server and webview clients to ensure
 * consistent representation of git commit data over HTTP and WebSocket transports.
 *
 * @summary Filesystem commit types for card repository git history
 * @module types/fs
 */

/**
 * A single file changed in a commit.
 */
export interface FsCommitFile {
  /** Relative path to the file within the card repository. */
  file: string;
  /** Git status code: 'A' (added), 'M' (modified), 'D' (deleted), 'R' (renamed), 'C' (copied). */
  status: string;
  /** Source path for renames (only present when status starts with 'R'). */
  from?: string;
  /** Whether the file is binary (non-text). */
  binary: boolean;
}

/**
 * A single git commit from a card repository's history.
 *
 * Field names mirror simple-git's `DefaultLogFields` to make server-side
 * construction straightforward, but this interface has no runtime dependency
 * on simple-git — it stays browser-safe.
 */
export interface FsCommit {
  /** Full commit SHA. */
  hash: string;
  /** ISO 8601 commit date string. */
  date: string;
  /** Commit subject line. */
  message: string;
  /** Git refs (branches, tags) pointing at this commit, comma-separated. */
  refs: string;
  /** Commit body (multi-line description after the subject). */
  body: string;
  /** Commit author display name. */
  author_name: string;
  /** Commit author email address. */
  author_email: string;
  /** Files changed in this commit. */
  diff: {
    /** Number of files changed. */
    changed: number;
    /** Per-file change records. */
    files: FsCommitFile[];
  };
}
