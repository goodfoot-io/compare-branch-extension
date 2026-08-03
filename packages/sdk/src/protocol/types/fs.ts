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
}

/**
 * Explains why a commit's diff could not be read.
 *
 * A card repository can hold an object git cannot inflate — a storage-layer bit
 * flip, a truncated write, a deleted object. The commit that references such an
 * object still has readable metadata (subject, author, date all live in the
 * commit object itself), so the walk surfaces the commit with this marker in
 * place of its file list rather than dropping the commit or failing the whole
 * response.
 */
export interface CardCommitDiffUnavailable {
  /** Human-readable summary of what went wrong, suitable for direct display. */
  message: string;
  /** Trimmed git stderr from the failed diff, for operators reading detail. */
  detail: string;
  /**
   * Absolute path of the card repository holding the unreadable object. Names
   * the repository to repair — the failing git command runs in a card
   * repository, not the workspace repository an operator would check first.
   */
  repositoryPath: string;
  /** Shell command an operator can run to diagnose the damage. */
  repairCommand: string;
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
  /**
   * Absent on every commit whose diff was read successfully — its absence is
   * the assertion that `diff` is complete. Present only on a commit whose diff
   * git refused to produce, in which case `diff` is `{ changed: 0, files: [] }`
   * because no file list exists, not because nothing changed. Consumers that
   * render a file list must check this field to tell those two cases apart.
   */
  diffUnavailable?: CardCommitDiffUnavailable;
}

/**
 * A snapshot of a card repository's full commit history and non-binary file contents.
 *
 * Returned by `GET /cards/:id/snapshot`. Only non-binary files are included;
 * attachment blobs (`attachments/att-*` files without a `.meta.json` extension)
 * are excluded.
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
    /** UTF-8 file content. */
    content: string;
  }>;
}
