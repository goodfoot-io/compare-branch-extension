/**
 * Pure transform: Codex rollout JSONL lines → rendered transcript items.
 *
 * This module converts an array of raw rollout JSONL strings into a list of
 * {@link TranscriptItem} values that the `CodexExpandedView` renders. The
 * transform is stateless and rebuilds from scratch on every call, so an
 * incremental append or a file reset produces correct output from the
 * replacement lines alone.
 *
 * Three defensive contracts hold throughout:
 * 1. `function_call.arguments` is a raw string — pretty-print is attempted
 *    inside a try/catch and falls back to the raw string on failure.
 * 2. `function_call_output.output` is `string | ContentItem[]` — both shapes
 *    are handled without throwing on the other.
 * 3. Orphan `function_call_output` (no preceding `function_call` with a
 *    matching `call_id`) is rendered standalone in source order, not dropped.
 *
 * @summary Pure transform from raw Codex rollout lines to rendered transcript items
 * @module streams/codex-session/www/lib/render-transcript
 */

import type { CodexRolloutLine } from './parser.js';

/**
 * A rendered transcript item produced by {@link renderCodexTranscript}.
 */
export type TranscriptItem =
  | { kind: 'session_header'; model?: string; cwd?: string; timestamp?: string }
  | { kind: 'user_message'; text: string; timestamp?: string }
  | { kind: 'assistant_message'; text: string; timestamp?: string }
  | { kind: 'reasoning'; summaryText: string; timestamp?: string }
  | {
      kind: 'tool_call';
      name: string;
      callId: string;
      argumentsText: string;
      prettyPrinted: boolean;
      outputText?: string;
      hasOutput: boolean;
      timestamp?: string;
    }
  | { kind: 'orphan_output'; callId: string; outputText: string; timestamp?: string }
  | { kind: 'unknown_item'; rawJson: string; timestamp?: string }
  | { kind: 'malformed'; rawLine: string };

/**
 * Converts raw rollout JSONL lines into a flat list of transcript items.
 *
 * Source order is preserved. `function_call` and `function_call_output` are
 * paired by `call_id` when available; unpaired calls render without an output
 * block; orphan outputs render standalone in source order. Malformed lines
 * produce an isolated error block so the rest of the transcript is unaffected.
 *
 * @param _lines - Raw rollout JSONL lines from the stream store.
 * @returns Flat list of transcript items in display order.
 * @throws Error 'not implemented' — Phase 1 stub.
 */
export function renderCodexTranscript(_lines: string[]): TranscriptItem[] {
  throw new Error('not implemented');
}

/**
 * Parses a `function_call.arguments` raw string for display.
 *
 * Attempts `JSON.parse` and pretty-prints on success. Falls back to the raw
 * string on failure — no throw, no blank output. This is the only place that
 * wraps `JSON.parse` for arguments; callers never call `JSON.parse` directly
 * on this value.
 *
 * @param _raw - The raw arguments string from the `function_call` payload.
 * @returns `{ text, prettyPrinted }` — the display string and whether it was pretty-printed.
 * @throws Error 'not implemented' — Phase 1 stub.
 */
export function parseArguments(_raw: string): { text: string; prettyPrinted: boolean } {
  throw new Error('not implemented');
}

/**
 * Extracts a flat display string from a `function_call_output` or
 * `custom_tool_call_output` output value (`string | ContentItem[]`).
 *
 * A plain string is returned as-is. A `ContentItem[]` has its `input_text`
 * and `output_text` items concatenated in source order. Neither shape throws
 * on the other.
 *
 * @param _output - The output value from the function call output payload.
 * @returns The flat display string.
 * @throws Error 'not implemented' — Phase 1 stub.
 */
export function extractOutputText(_output: unknown): string {
  throw new Error('not implemented');
}

/**
 * Converts a {@link CodexRolloutLine} into zero or more transcript items.
 *
 * Accepts a pre-parsed line so callers can reuse a single parse pass.
 * Returns an empty array for lines that do not produce visible output
 * (e.g. `turn_context`, `compacted` markers); returns a single-element
 * array for most visible lines; may return more than one item only for
 * `response_item` lines that carry both a message and embedded reasoning.
 *
 * @param _line - A pre-parsed Codex rollout line.
 * @param _pendingCalls - Map of `call_id` → partially-built tool-call items
 *   that have been seen but not yet paired with their output. The caller
 *   maintains this map across the full transcript and passes it on each call.
 * @returns Zero or more transcript items derived from this line.
 * @throws Error 'not implemented' — Phase 1 stub.
 */
export function lineToItems(
  _line: CodexRolloutLine,
  _pendingCalls: Map<string, { name: string; argumentsText: string; prettyPrinted: boolean; timestamp?: string }>
): TranscriptItem[] {
  throw new Error('not implemented');
}
