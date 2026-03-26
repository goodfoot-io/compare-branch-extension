/**
 * Stream protocol types for JSONL streaming.
 *
 * A stream is an append-only JSONL file attached to a card. The server accepts
 * chunked POST requests, persists raw lines to `streams/{streamType}/{filename}`,
 * and broadcasts output over WebSocket in real time. An iframe-based renderer
 * (served from the stream definition's `wwwRoot` directory) displays stream
 * content in the extension UI. Metadata lives in a sibling `.meta.json` file
 * and is committed to the card repository at stream creation and close.
 *
 *
 * @summary Stream protocol types for JSONL streaming
 * @module types/stream
 */

// --- Attachment Info ---

/**
 * File-persisted metadata for a card attachment.
 *
 * Stored in the card's attachment metadata sidecar.
 * Timestamps (`createdAt`) are derived from Git history at read time
 * and not persisted in the JSON file.
 *
 * @see AttachmentInfo for the API shape that includes computed timestamps.
 *
 * @example
 * ```typescript
 * const attachmentFile: AttachmentInfoFile = {
 *   id: 'screenshot-2024-01-15.png',
 *   name: 'screenshot-2024-01-15.png',
 *   originalName: 'Screenshot 2024-01-15 at 10.30.00.png',
 *   size: 1024000,
 *   mimeType: 'image/png'
 * };
 * ```
 */
export interface AttachmentInfoFile {
  /** Stable identifier for the attachment. Used in attachment URLs and references. */
  id: string;

  /** Display name for the attachment. */
  name: string;

  /** Original filename as provided by the client during upload. */
  originalName: string;

  /** File size in bytes. */
  size: number;

  /** MIME type of the attachment. */
  mimeType: string;
}

/**
 * Lifecycle status of a stream.
 *
 * Status is a runtime database concern only — it is not persisted to the
 * filesystem or git. Pre-existing streams default to `'completed'` on startup.
 * A stream becomes `'active'` only when explicitly opened via `createStream()`
 * or `resumeStream()`.
 *
 * - `'active'`      -- Receiving data; the only status that permits appends.
 * - `'completed'`   -- Sender closed the connection normally (HTTP body ended).
 * - `'error'`       -- Closed due to a stream-level error (e.g., transport).
 * - `'interrupted'`  -- Client disconnected mid-stream.
 * - `'size_limit'`  -- Cumulative size exceeded {@link StreamDefinition.maxStreamSize}.
 */
export type StreamStatus = 'active' | 'completed' | 'error' | 'interrupted' | 'size_limit';

/**
 * File-persisted metadata for a single stream.
 *
 * Stored as `streams/{streamType}/{filename}.meta.json` inside the card directory.
 * This represents the static file fields only. Lifecycle status and close timestamp
 * are NOT persisted in the JSON file — they live in SQLite and are populated into
 * {@link StreamMeta} at read time.
 *
 * @see StreamDefinition for the environment-level configuration that governs
 *   rendering for a given `streamType`.
 * @see StreamMeta for the API shape that includes lifecycle status and timestamps from SQLite.
 */
export interface StreamMetaFile {
  /** User-specified filename (e.g., `"session.log"`). Unique within a card's `streams/` directory. */
  filename: string;

  /** Stream type key that maps to a {@link StreamDefinition} in the environment config. */
  streamType: string;

  /** Human-readable title for UI display. Supplied via `X-Stream-Title` header. */
  title?: string;

  /** Opaque session identifier for grouping related streams. Supplied via `X-Stream-Session-Id` header. */
  sessionId?: string;

  /**
   * Agent identifier extracted from the stream filename when the filename matches the
   * `{uuid}-{uuid}.jsonl` pattern (e.g. Claude Code session files). Absent for streams
   * whose filenames do not follow this convention.
   */
  agentId?: string;

  /**
   * First ~40 characters of `message.content` from line 1 of the JSONL stream, stripped
   * of any `<teammate-message>` XML wrapper. Populated lazily for subagents and team
   * members once the first line is processed; absent for orchestrators (whose first line
   * is a progress event with no user message) and until the first line arrives.
   */
  taskContent?: string;

  /**
   * Human-readable slug derived from the first matching JSONL line after the stream is
   * processed. Populated lazily once a suitable line is found; absent until then and for
   * streams that never produce a matching line.
   */
  slug?: string;

  /** Number of lines appended so far. Updated in-memory on each append; persisted on close. */
  lineCount: number;
}

/**
 * Persisted metadata for a single stream with lifecycle status and timestamps.
 *
 * This is the API shape used throughout the application. It extends
 * {@link StreamMetaFile} with lifecycle status and timestamps. The `status` and
 * `closedAt` fields are sourced from SQLite (write-through cache), while
 * `createdAt` is derived from Git history. `lineCount` is kept in sync by
 * each append and reflects the authoritative count from SQLite.
 *
 * @see StreamDefinition for the environment-level configuration that governs
 *   rendering for a given `streamType`.
 */
export interface StreamMeta extends StreamMetaFile {
  /** Current lifecycle status from SQLite. Only `'active'` streams accept appends. */
  status: StreamStatus;

  /** ISO-8601 timestamp when the stream was created. Derived from Git history. */
  createdAt: string;

  /** ISO-8601 timestamp when the stream was closed. From SQLite `closed_at` (seeded from git commit timestamp at close). Absent while `status` is `'active'`. */
  closedAt?: string;
}

/**
 * Environment-level configuration for a stream type.
 *
 * Declared under `environments.{name}.streams` in `settings.json`, keyed by
 * a lowercase-hyphenated type name (e.g., `"claude-session"`). Each definition
 * points to a static directory (`wwwRoot`) containing an iframe renderer and
 * sets size guardrails.
 *
 * @example
 * ```json
 * {
 *   "streams": {
 *     "claude-session": {
 *       "version": 1,
 *       "wwwRoot": "./renderers/claude-session",
 *       "entrypoint": "index.html",
 *       "maxLineLength": 1048576,
 *       "maxStreamSize": 104857600
 *     }
 *   }
 * }
 * ```
 */
export interface StreamDefinition {
  /** Schema version for forward compatibility. */
  version: number;

  /**
   * Path to the directory containing the iframe renderer's static assets.
   *
   * Relative paths resolve from the settings.json file location.
   */
  wwwRoot: string;

  /**
   * Entry point HTML file within the wwwRoot directory.
   *
   * Defaults to `"index.html"` when omitted.
   */
  entrypoint?: string;

  /** Maximum bytes per line before truncation (default 1 MB). Lines exceeding this are clipped with a `...[truncated]` suffix. */
  maxLineLength?: number;

  /** Maximum cumulative bytes per stream file before auto-close with `'size_limit'` status (default 100 MB). */
  maxStreamSize?: number;
}
