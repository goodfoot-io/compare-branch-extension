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
export interface CardCommitFile {
  /** Relative path to the file within the card repository. */
  file: string;
  /** Git status code: 'A' (added), 'M' (modified), 'D' (deleted), 'R' (renamed), 'C' (copied). */
  status: string;
  /** Source path for renames (only present when status starts with 'R'). */
  from?: string;
  /** Whether the file is binary (non-text). */
  binary: boolean;
  /** Unified diff patch text for text files. Absent for binary files and merge commits. */
  patch?: string;
}

/**
 * A single git commit from a card repository's history.
 *
 * Field names mirror simple-git's `DefaultLogFields` to make server-side
 * construction straightforward, but this interface has no runtime dependency
 * on simple-git — it stays browser-safe.
 */
export interface CardCommit {
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
    files: CardCommitFile[];
  };
}

/**
 * A snapshot of a card repository's full commit history and non-binary file contents.
 *
 * Returned by `GET /cards/:id/snapshot`. File contents are base64-encoded so the
 * snapshot can be serialized into `window.__INIT_DATA__` without binary escaping.
 *
 * Only non-binary files are included; attachment blobs (`attachment/att-*` files
 * without a `.meta.json` extension) are excluded.
 */
export interface CardSnapshot {
  /** Full commit history, same shape as `GET /cards/:id/git/log`. */
  commits: CardCommit[];
  /** Non-binary file entries at HEAD. */
  files: Array<{
    /** Relative path within the card repository. */
    path: string;
    /** Git blob SHA for this file. */
    sha: string;
    /** Base64-encoded file content. */
    content: string;
  }>;
}
