/**
 * Type contract between the assistant-ui foundation (`streams/lib/aui`) and
 * each provider's stream-to-`ThreadMessageLike` converter (claude-code-session,
 * codex-session).
 *
 * Re-exports `ThreadMessageLike` so converters have a single import path, and
 * defines the payload shape for each of the four shared `data` part names —
 * `boundary`, `raw`, `status-line`, `error-line` — that {@link StreamThread}
 * (./StreamThread.tsx) renders out of the box via `MessagePrimitive.Content`'s
 * `data.by_name` registry. A converter emits `{ type: 'data', name: 'boundary',
 * data: BoundaryData }` (etc.) and the matching payload type applies.
 *
 * @summary Converter contract: ThreadMessageLike re-export + shared data-part payload types
 * @module streams/lib/aui/types
 */

import type { ThreadMessageLike } from '@assistant-ui/react';
import type { RawFallbackSeverity } from '../RawFallback';

export type { ThreadMessageLike };

/** The exact `data` part `name` values converters must use to reach the shared renderers. */
export const STREAM_DATA_PART_NAME = {
  boundary: 'boundary',
  raw: 'raw',
  statusLine: 'status-line',
  errorLine: 'error-line'
} as const;

/** Payload for the `boundary` data part — the shared line-label-line structural marker (turn/result/compaction). */
export interface BoundaryData {
  /** Which kind of structural marker this separator represents. */
  kind: 'turn' | 'result' | 'compaction';
  /** Label text shown between the two divider lines. */
  label: string;
}

/** Payload for the `raw` data part — unrecognized/malformed content shown as labeled, severity-aware JSON. */
export interface RawData {
  /** The value to display as pretty-printed JSON (or a raw string). */
  data: unknown;
  /** Optional label shown before the payload. */
  label?: string;
  /** Severity of the fallback content. Defaults to `info`. */
  severity?: RawFallbackSeverity;
}

/** Payload for the `status-line` data part — a muted single-line system status (e.g. "Compacting context…"). */
export interface StatusLineData {
  /** Status text to display. */
  text: string;
}

/** Payload for the `error-line` data part — an error-severity block, optionally with structured detail. */
export interface ErrorLineData {
  /** Error message text. */
  message: string;
  /** Optional structured detail rendered as a pretty-printed JSON block. */
  detail?: unknown;
}
