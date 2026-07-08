/**
 * Groups consecutive `tool_call` transcript items into tool-run batches.
 *
 * A run of one or more adjacent `tool_call` items renders inside one shared
 * `ToolGroup` zone (see `CodexExpandedView`); any other item kind flushes the
 * run. This is a pure run-length pass over the flat `TranscriptItem[]`
 * produced by `renderCodexTranscript`, kept separate from the component so the
 * grouping boundary logic is unit-testable without a DOM.
 *
 * @summary Pure run-length grouping of consecutive Codex tool_call items
 * @module streams/codex-session/www/lib/group-tool-calls
 */

import type { TranscriptItem } from './render-transcript.js';

/** One grouped chunk of a transcript: either a run of tool_call items, or a single other item. */
export type TranscriptGroup =
  | { kind: 'tool_run'; items: Extract<TranscriptItem, { kind: 'tool_call' }>[] }
  | { kind: 'single'; item: TranscriptItem };

/**
 * Coalesces consecutive `tool_call` items into `tool_run` groups, preserving
 * source order and every item exactly once.
 *
 * @param items - The flat transcript items from `renderCodexTranscript`.
 * @returns The grouped items in source order.
 */
export function groupToolCalls(items: TranscriptItem[]): TranscriptGroup[] {
  const groups: TranscriptGroup[] = [];
  let run: Extract<TranscriptItem, { kind: 'tool_call' }>[] = [];

  const flush = (): void => {
    if (run.length === 0) return;
    groups.push({ kind: 'tool_run', items: run });
    run = [];
  };

  for (const item of items) {
    if (item.kind === 'tool_call') {
      run.push(item);
      continue;
    }
    flush();
    groups.push({ kind: 'single', item });
  }
  flush();

  return groups;
}
