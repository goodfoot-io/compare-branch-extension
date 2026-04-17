/**
 * Type definitions for the stream store SDK.
 *
 * These types define the message protocol between the host (extension) and
 * iframe renderers, as well as the store state managed by Zustand.
 *
 * @summary Stream store type definitions for iframe-based renderers
 * @module stream-store/types
 */

// ============================================================================
// Stream Metadata
// ============================================================================

/** Per-file metadata from the host. */
export interface StreamMeta {
  /** Current lifecycle status of the stream. */
  status: string;
  /** Number of lines appended so far. */
  lineCount: number;
  /** Opaque session identifier for grouping related streams. */
  sessionId?: string;
  /** Human-readable title for UI display. */
  title?: string;
  /** ISO-8601 timestamp when the stream was closed. */
  closedAt?: string;
}

// ============================================================================
// Display Mode
// ============================================================================

/** Host-selected display mode for a stream iframe. */
export type StreamDisplayMode = 'compact' | 'expanded';

// ============================================================================
// Store State
// ============================================================================

/** State for a single stream file. */
export interface StreamFile {
  /** Filename of the stream (e.g., "session.jsonl"). */
  filename: string;
  /** Metadata from the host. */
  meta: StreamMeta;
  /** Accumulated lines from the stream. */
  lines: string[];
  /** Whether this file is currently subscribed to receive updates. */
  isSubscribed: boolean;
  /** Whether a subscribe request is in flight. */
  isLoading: boolean;
  /** Error message from a failed subscribe, or null. */
  error: string | null;
}

/** Root store state. */
export interface StreamStoreState {
  /** Filename of the primary stream file. */
  primary: string;
  /** Map of filename to StreamFile state. */
  files: Map<string, StreamFile>;
  /** List of all available stream filenames from the host. */
  availableFiles: string[];
  /** Whether the postMessage connection to the host is active. */
  connected: boolean;
  /** Current host-controlled display mode for this iframe. */
  mode: StreamDisplayMode;
}

// ============================================================================
// Initialization Data
// ============================================================================

/** Data set on window.__STREAM_INIT__ by the host before loading the iframe. */
export interface StreamInitData {
  /** Filename of the primary stream file. */
  primary: string;
  /** Initial file data keyed by filename. */
  files: Record<string, { meta: StreamMeta; lines: string[] }>;
  /** List of all available stream filenames. */
  availableFiles: string[];
  /** Initial display mode set by the host. */
  mode: StreamDisplayMode;
}

// ============================================================================
// Host -> Iframe Messages
// ============================================================================

/** Messages sent from the host to the iframe renderer. */
export type HostToIframeMessage =
  | { type: 'stream:line'; filename: string; line: string }
  | { type: 'stream:started'; filename: string; meta: StreamMeta }
  | { type: 'stream:ended'; filename: string; meta: StreamMeta }
  | { type: 'availableFiles:update'; files: string[] }
  | { type: 'subscribe:response'; filename: string; lines: string[]; meta: StreamMeta; error?: string }
  | { type: 'theme:change'; themeKind: 1 | 2 | 3; cssVariables: Record<string, string> };

// ============================================================================
// Iframe -> Host Messages
// ============================================================================

/** Messages sent from the iframe renderer to the host. */
export type IframeToHostMessage =
  | { type: 'close' }
  | { type: 'openFile'; path: string; line?: number }
  | { type: 'showDiff'; sha: string; filePath?: string }
  | { type: 'claim'; filenames: string[] }
  | { type: 'subscribe'; filename: string }
  | { type: 'requestCollapse' };
