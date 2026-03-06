/**
 * Stream protocol types for JSONL streaming.
 *
 * A stream is an append-only JSONL file attached to a card. The server accepts
 * chunked POST requests, applies a per-line transform (ESM module), persists
 * raw lines to `streams/{streamType}/{filename}`, and broadcasts transformed output over
 * WebSocket in real time. Metadata lives in a sibling `.meta.json` file and
 * is committed to the card repository at stream creation and close.
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
 *   which transform module applies to a given `streamType`.
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
 *   which transform module applies to a given `streamType`.
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
 * points to an ESM transform module and sets size guardrails.
 *
 * @example
 * ```json
 * {
 *   "streams": {
 *     "claude-session": {
 *       "version": 1,
 *       "transform": { "path": "./transforms/claude.mjs", "timeout": 5000 },
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

  /** Transform module configuration. */
  transform: {
    /**
     * Path to the ESM transform module.
     *
     * Absolute paths are used as-is. Relative paths resolve from
     * `{workspacePath}/.cards/transforms/`. Path traversal (`..`) is rejected.
     */
    path: string;

    /**
     * Maximum time in milliseconds allowed for a single transform call.
     * If the transform exceeds this, the raw line is returned and a
     * `stream:error` event is broadcast. Defaults to 5000.
     */
    timeout?: number;
  };

  /** Maximum bytes per line before truncation (default 1 MB). Lines exceeding this are clipped with a `...[truncated]` suffix. */
  maxLineLength?: number;

  /** Maximum cumulative bytes per stream file before auto-close with `'size_limit'` status (default 100 MB). */
  maxStreamSize?: number;
}

/**
 * Context provided once at stream initialization.
 *
 * If the transform module exports an `init` function, it receives this context
 * when the stream begins. The `state` Map is created fresh for each stream and
 * shared with all subsequent `transform()` calls, allowing the init function
 * to prepare session-level data (e.g., parsers, counters, caches) that persists
 * across all lines in the stream. The state Map never crosses the thread boundary;
 * it exists only within the worker for the duration of the stream.
 *
 * @example
 * ```typescript
 * // .cards/transforms/session-counter.mjs
 * export function init(ctx: StreamInitContext): void {
 *   ctx.state.set('counter', 0);
 *   ctx.state.set('sessionId', ctx.headers['x-stream-session-id'] ?? 'unknown');
 * }
 *
 * export default function transform(line: string, ctx: TransformContext): string {
 *   const count = (ctx.state.get('counter') as number) + 1;
 *   ctx.state.set('counter', count);
 *   return `[${count}] ${line}`;
 * }
 * ```
 */
export interface StreamInitContext {
  /** Stream type key matching the environment config entry. */
  streamType: string;

  /** The stream filename (e.g., `"session.log"`). */
  filename: string;

  /** HTTP request headers from the POST that initiated this stream. */
  headers: Record<string, string>;

  /** Card metadata for the card this stream belongs to. */
  card: {
    /** Card identifier. */
    id: string;

    /** Card title, if set. */
    title?: string;

    /** Card metadata. */
    metadata: Record<string, unknown>;
  };

  /**
   * Mutable state Map shared with all `transform()` calls.
   *
   * The same Map instance is passed to both `init()` and `transform()` functions,
   * allowing transforms to store session-level state (counters, parsers, caches)
   * that persists across all lines within the stream. The state is created in the
   * worker thread and never serialized or sent across the thread boundary.
   */
  state: Map<string, unknown>;
}

/**
 * Context provided to each invocation of a transform function.
 *
 * Transform modules receive the raw line string as their first argument and
 * this context as the second. The context properties (except `state`) are
 * reconstructed fresh for every line, but the `state` Map is the same instance
 * across all lines in the stream, allowing transforms to maintain session-level
 * data initialized in the optional `init()` function.
 *
 * @example
 * ```typescript
 * // .cards/transforms/prefixer.mjs
 * export default function transform(line: string, ctx: TransformContext): string {
 *   return `[${ctx.streamType}:${ctx.lineNumber}] ${line}`;
 * }
 * ```
 */
export interface TransformContext {
  /** 1-based line number within the current stream. */
  lineNumber: number;

  /** Stream type key matching the environment config entry. */
  streamType: string;

  /**
   * Mutable state Map shared with the `init()` function and all `transform()` calls.
   *
   * The same Map instance is passed to both `init()` (if exported) and every
   * `transform()` call, allowing transforms to store session-level state that
   * persists across all lines. The state is created in the worker thread and
   * never crosses the thread boundary.
   *
   * This property is optional for backward compatibility with existing transforms
   * that don't use worker isolation. When present, it's always a valid Map instance.
   */
  state?: Map<string, unknown>;
}
