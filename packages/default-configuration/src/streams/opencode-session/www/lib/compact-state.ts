/**
 * Folds an OpenCode transcript into the bounded state the compact timeline
 * view shows.
 *
 * The compact view bootstraps from the stream store, then folds the full line
 * array on each update. {@link buildOpencodeCompactState} is therefore a pure
 * rebuild from `lines` — it holds no watermark, so a stream shrink/reset
 * produces correct state from the replacement lines alone.
 *
 * @summary Builds bounded compact-view state from OpenCode transcript lines
 * @module streams/opencode-session/www/lib/compact-state
 */

import type { OpencodeLine } from './parser.js';
import { parseOpencodeLine } from './parser.js';
import { extractToolPart } from './render-transcript.js';

/**
 * A single bounded entry in the compact view's recent-activity tail.
 *
 * `kind` distinguishes an assistant/user message from a tool call from an
 * error; `text` is the already-trimmed display string.
 */
export interface OpencodeTailEvent {
  kind: 'message' | 'tool' | 'event';
  text: string;
  /** Escalation level — present only when the entry represents an error. */
  severity?: 'error';
}

/**
 * Bounded summary state for the OpenCode compact timeline view.
 *
 * `durationMs` is derived from the first and most recent line timestamps
 * rather than a lifecycle event, so it is available even for sessions that
 * ended abnormally (OpenCode has no session-end event). `tail` is capped at
 * roughly five items with the newest last.
 */
export interface OpencodeCompactState {
  isActive: boolean;
  headlineText: string;
  turnCount: number;
  toolCallCount: number;
  tokenCount: { input: number; output: number } | undefined;
  model: string | undefined;
  durationMs: number | undefined;
  tail: OpencodeTailEvent[];
  /** `true` when at least one tool call in the session errored. */
  hasErrors: boolean;
}

/** Maximum number of items retained in the bounded recent-activity tail. */
const MAX_TAIL = 5;

/**
 * Parses the elapsed milliseconds between two ISO timestamps.
 *
 * @param first - The earliest line timestamp.
 * @param last - The most recent line timestamp.
 * @returns The non-negative duration, or `undefined` when either timestamp is unusable.
 */
function durationBetween(first: string | undefined, last: string | undefined): number | undefined {
  if (first === undefined || last === undefined) {
    return undefined;
  }
  const start = Date.parse(first);
  const end = Date.parse(last);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return undefined;
  }
  const delta = end - start;
  return delta >= 0 ? delta : undefined;
}

/**
 * Reads the owning message id off a part payload.
 *
 * @param line - The parsed part line.
 * @returns The message id, or `''` when absent.
 */
function partMessageId(line: Extract<OpencodeLine, { kind: 'part' }>): string {
  const id = line.data['messageID'];
  return typeof id === 'string' ? id : '';
}

/**
 * Rebuilds {@link OpencodeCompactState} from the full transcript line array.
 *
 * Pure with respect to `lines`: counts, headline, token totals, duration, and
 * the bounded tail are all recomputed from scratch, so passing a shorter
 * replacement array after a reset yields fresh state with no stale carryover.
 *
 * Streaming behaviors are absorbed explicitly:
 * - Part updates re-fire for the same part id as tools progress; tool counts
 *   and tail entries key by part identity so updates replace rather than stack,
 *   and a later update's error escalates the existing entry in place.
 * - Text parts stream incrementally; their tail entry mutates to the latest
 *   text so the card shows current content without duplicates.
 * - Turn counts key by user message id, so re-emitted message records count
 *   once.
 *
 * @param lines - The authoritative accumulated transcript NDJSON lines.
 * @param isActive - Whether the underlying stream is still live.
 * @returns The bounded compact-view state.
 */
export function buildOpencodeCompactState(lines: string[], isActive: boolean): OpencodeCompactState {
  let turnCount = 0;
  let toolCallCount = 0;
  let tokenCount: { input: number; output: number } | undefined;
  let model: string | undefined;

  let latestAssistantText: string | undefined;
  let latestToolName: string | undefined;
  let hasErrors = false;

  const tail: OpencodeTailEvent[] = [];
  const userMessageIds = new Set<string>();
  const seenToolParts = new Set<string>();
  const tailTextByKey = new Map<string, OpencodeTailEvent>();
  let firstTimestamp: string | undefined;
  let lastTimestamp: string | undefined;

  /**
   * Appends one entry to the bounded tail, dropping the oldest past the cap.
   *
   * @param event - The entry to append.
   * @returns The appended entry, so streaming updates can mutate it in place.
   */
  const pushTail = (event: OpencodeTailEvent): OpencodeTailEvent => {
    tail.push(event);
    if (tail.length > MAX_TAIL) {
      tail.shift();
    }
    return event;
  };

  for (const raw of lines) {
    const line: OpencodeLine = parseOpencodeLine(raw);
    if (line.kind === 'malformed') {
      continue;
    }

    // `unknown` envelopes carry an optional timestamp; known kinds a plain one.
    const currentTs = typeof line.ts === 'string' ? line.ts : undefined;
    if (currentTs !== undefined && currentTs.length > 0) {
      if (firstTimestamp === undefined) {
        firstTimestamp = currentTs;
      }
      lastTimestamp = currentTs;
    }

    switch (line.kind) {
      case 'message': {
        if (model === undefined && typeof line.data.modelID === 'string') {
          model = line.data.modelID;
        }
        const tokens = line.data.tokens;
        if (tokens !== undefined && typeof tokens['input'] === 'number' && typeof tokens['output'] === 'number') {
          tokenCount = { input: tokens['input'] as number, output: tokens['output'] as number };
        }
        // Each distinct user message opens a new turn.
        if (line.data.role === 'user' && typeof line.data.id === 'string' && !userMessageIds.has(line.data.id)) {
          userMessageIds.add(line.data.id);
          turnCount += 1;
        }
        break;
      }

      case 'part': {
        const messageId = partMessageId(line);
        const partId = typeof line.data.id === 'string' ? line.data.id : '';

        switch (line.data.type) {
          case 'text': {
            const text = typeof line.data.text === 'string' ? line.data.text.trim() : '';
            if (text.length === 0) {
              break;
            }
            const key = `text:${messageId}:${partId}`;
            const existing = tailTextByKey.get(key);
            if (existing !== undefined) {
              // Streaming update: refresh the entry's text in place.
              existing.text = text;
            } else {
              tailTextByKey.set(key, pushTail({ kind: 'message', text }));
            }
            if (!userMessageIds.has(messageId)) {
              latestAssistantText = text;
            }
            break;
          }

          case 'tool': {
            if (seenToolParts.has(partKeyOf(messageId, partId))) {
              break;
            }
            seenToolParts.add(partKeyOf(messageId, partId));
            const extracted = extractToolPart(line.data);
            toolCallCount += 1;
            latestToolName = extracted.name;
            if (extracted.severity === 'error') {
              hasErrors = true;
              pushTail({ kind: 'event', text: `${extracted.name} failed`, severity: 'error' });
            } else {
              pushTail({ kind: 'tool', text: extracted.name });
            }
            break;
          }

          default:
            break;
        }
        break;
      }

      default:
        break;
    }
  }

  return {
    isActive,
    headlineText: latestAssistantText ?? latestToolName ?? '',
    turnCount,
    toolCallCount,
    tokenCount,
    model,
    durationMs: durationBetween(firstTimestamp, lastTimestamp),
    tail,
    hasErrors
  };
}

/**
 * Builds the stable identity key for one part occurrence.
 *
 * @param messageId - Owning message id (possibly empty).
 * @param partId - Part id (possibly empty).
 * @returns The composite key.
 */
function partKeyOf(messageId: string, partId: string): string {
  return `${messageId}:${partId}`;
}
