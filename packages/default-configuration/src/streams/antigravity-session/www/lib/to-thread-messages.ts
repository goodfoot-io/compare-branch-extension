/**
 * Pure transform: flat Antigravity `TranscriptItem[]` → assistant-ui
 * `ThreadMessageLike[]`.
 *
 * Groups the flat, idx-ordered item list from
 * {@link renderAntigravityTranscript} into messages for the shared
 * `StreamThread` (../../../../lib/aui). There is no role signal in the
 * destination-record contract (`stepType`/`status` are opaque numbers with
 * unpinned semantics, so no user/assistant split is invented): every step's
 * content renders as text parts folded into alternating content runs, and
 * every anomaly/malformed item renders as a full-width service run
 * (`metadata: { custom: { service: true } }`) so structural rows never render
 * under a captioned "Assistant" turn.
 *
 * Nothing is silently dropped: every `TranscriptItem` kind maps to at least
 * one part. Anomalies go through the `agy-anomaly` data part
 * (../components/expanded/AntigravityDataParts) with per-kind treatment —
 * host-drift and flush-partial carry their content as evidence;
 * format-unknown withholds the undecodable payload (byte count only).
 * Malformed lines render through the shared `raw` part as labeled,
 * warning-severity fail-closed evidence.
 *
 * The `role: 'system'` shape is never used — a hard assistant-ui runtime
 * constraint rejects `system` messages whose content is not exactly one text
 * part, so `data` parts can never live in a `system`-role message (same
 * constraint documented in the codex-session converter).
 *
 * @summary Antigravity TranscriptItem[] → ThreadMessageLike[] converter for the shared StreamThread
 * @module streams/antigravity-session/www/lib/to-thread-messages
 */

import { STREAM_DATA_PART_NAME, type ThreadMessageLike } from '../../../lib/aui/types';
import type { SessionStatus } from '../../../lib/SessionHeader';
import type { TranscriptItem } from './render-transcript.js';

/** One content part of a ThreadMessageLike message being assembled by this converter. */
type ThreadPart = { type: 'text'; text: string } | { type: 'data'; name: string; data: unknown };

/** Result of {@link toThreadMessages}: the grouped messages plus the thread-level running flag. */
export interface ToThreadMessagesResult {
  /** The full transcript as `ThreadMessageLike` messages, in display order. */
  messages: ThreadMessageLike[];
  /** Whether the session is still actively producing content. */
  isRunning: boolean;
}

/**
 * Data payload for the `agy-anomaly` data part — one named anomaly event with
 * per-kind evidence treatment.
 */
export interface AnomalyData {
  /**
   * Which named anomaly this is (drives the label and icon).
   * `schema-drift` is the renderer's presentation kind for the engine's
   * `idx: -1` mid-stream schema-fingerprint sentinel — a host-drift-class,
   * session-level event rather than a per-step one.
   */
  kind: 'host-drift' | 'flush-partial' | 'format-unknown' | 'schema-drift';
  /** Source row index the anomaly attaches to; omitted for the session-level schema-drift sentinel. */
  idx?: number;
  /** Engine-provided detail text. */
  detail: string;
  /**
   * The record's content when it is safe evidence (`host-drift` revised
   * content, `flush-partial` partial content, schema-drift detail); omitted
   * for `format-unknown`, whose payload is undecodable and never rendered.
   */
  content?: string;
  /** For `format-unknown`: the withheld payload's byte count. */
  withheldBytes?: number;
}

/**
 * Derives the sticky `SessionHeader`'s live status from stream liveness and
 * whether the transcript carries parse-level corruption. While the stream is
 * still active the status always reads `running`. A settled transcript reads
 * `error` only when malformed lines exist — a destination line that failed
 * the pinned record shape is real corruption. Named anomalies (host-drift,
 * flush-partial, format-unknown) are designed-for engine signals rendered as
 * visible events; they do not flip the session header by themselves.
 *
 * @param items - The rendered transcript items.
 * @param isActive - Whether the underlying stream is still live.
 * @returns The session status for the header's indicator dot.
 */
export function deriveStatus(items: TranscriptItem[], isActive: boolean): SessionStatus {
  if (isActive) {
    return 'running';
  }
  const hasMalformed = items.some((item) => item.kind === 'malformed');
  return hasMalformed ? 'error' : 'success';
}

/**
 * Converts the flat, idx-ordered `TranscriptItem[]` from
 * `renderAntigravityTranscript` into `ThreadMessageLike[]` for the shared
 * `StreamThread`.
 *
 * Consecutive step contents fold into one content run; every anomaly or
 * malformed item splits the run into a full-width service run. No timestamps
 * exist on destination records, so no `createdAt` is synthesized.
 *
 * @param items - The flat transcript items.
 * @param isActive - Whether the underlying stream is still live.
 * @returns The grouped messages and the thread-level running flag.
 */
export function toThreadMessages(items: TranscriptItem[], isActive: boolean): ToThreadMessagesResult {
  const messages: ThreadMessageLike[] = [];
  let seq = 0;

  let runParts: ThreadPart[] = [];
  let runIsService = false;

  const flushRun = (): void => {
    if (runParts.length === 0) {
      return;
    }
    seq += 1;
    messages.push({
      id: `assistant-${seq}`,
      role: 'assistant',
      status: { type: 'complete', reason: 'stop' },
      content: runParts,
      ...(runIsService ? { metadata: { custom: { service: true } } } : {})
    } as ThreadMessageLike);
    runParts = [];
  };

  const pushPart = (part: ThreadPart): void => {
    const service = part.type === 'data';
    if (runParts.length > 0 && service !== runIsService) {
      flushRun();
    }
    if (runParts.length === 0) {
      runIsService = service;
    }
    runParts.push(part);
  };

  for (const item of items) {
    switch (item.kind) {
      case 'step':
        pushPart({ type: 'text', text: item.content });
        break;

      case 'partial':
        pushPart({
          type: 'data',
          name: 'agy-anomaly',
          data: {
            kind: 'flush-partial',
            idx: item.idx,
            detail: item.detail,
            content: item.content
          } satisfies AnomalyData
        });
        break;

      case 'drift':
        pushPart({
          type: 'data',
          name: 'agy-anomaly',
          data: {
            kind: 'host-drift',
            idx: item.idx,
            detail: item.detail,
            content: item.content
          } satisfies AnomalyData
        });
        break;

      case 'unreadable':
        pushPart({
          type: 'data',
          name: 'agy-anomaly',
          data: {
            kind: 'format-unknown',
            idx: item.idx,
            detail: item.detail,
            withheldBytes: item.withheldBytes
          } satisfies AnomalyData
        });
        break;

      case 'schema_drift':
        // Session-level host-drift-class event (the engine's idx -1 sentinel):
        // named and visible, but never presented as a numbered step.
        pushPart({
          type: 'data',
          name: 'agy-anomaly',
          data: {
            kind: 'schema-drift',
            detail: item.detail,
            content: item.content
          } satisfies AnomalyData
        });
        break;

      case 'malformed':
        pushPart({
          type: 'data',
          name: STREAM_DATA_PART_NAME.raw,
          data: { data: item.rawLine, label: `Malformed stream record (${item.reason})`, severity: 'warning' }
        });
        break;

      default:
        break;
    }
  }
  flushRun();

  // The last content run reflects live stream status (drives the shared
  // ReasoningPart's auto-expand-while-running and the running affordances);
  // every earlier message is complete.
  let lastAssistantIndex = -1;
  messages.forEach((message, index) => {
    if (message.role === 'assistant') {
      lastAssistantIndex = index;
    }
  });
  if (lastAssistantIndex !== -1 && isActive) {
    (messages[lastAssistantIndex] as { status?: unknown }).status = { type: 'running' };
  }

  return { messages, isRunning: isActive };
}
