/**
 * Pure state machine for the compact claude-code-session view.
 *
 * Extracted from CompactView so that the state logic can be unit-tested
 * without a browser environment (streamStore requires window).
 *
 * @summary Compact session state types, factory, and reducer
 * @module components/compact/compact-state
 */

import { parseLineEvents, stripMarkup } from '../../lib';
import type { CompactEvent } from '../../lib/parse-session';

/** Subagent filename pattern: two UUID segments separated by a hyphen. */
const SUBAGENT_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/;

export interface CompactState {
  sessionStatus: string;
  hasErrors: boolean;
  isSubagent: boolean;
  promptText: string;
  durationS: number;
  tail: [CompactEvent | null, CompactEvent | null];
  turnCount: number;
  outputTokensTotal: number;
  totalDurationMs: number;
  errorCount: number;
  awaySummary: string;
}

/**
 * Creates a fresh compact state with all fields set to their initial defaults.
 * @returns Initial compact state.
 */
export function makeInitialState(): CompactState {
  return {
    sessionStatus: 'running',
    hasErrors: false,
    isSubagent: false,
    promptText: '',
    durationS: 0,
    tail: [null, null],
    turnCount: 0,
    outputTokensTotal: 0,
    totalDurationMs: 0,
    errorCount: 0,
    awaySummary: ''
  };
}

/**
 * Derives initial status from stream file meta.
 * @param closedAt - ISO-8601 timestamp when the stream was closed, or undefined if active.
 * @returns Normalized session status string.
 */
export function deriveInitialStatus(closedAt: string | undefined): string {
  // Active streams (closedAt undefined) are running
  if (closedAt === undefined) return 'running';
  // Closed streams: treat as success by default; error status requires a result event
  return 'success';
}

/**
 * Processes a single JSONL line into the mutable compact state.
 * @param state - The mutable compact state to update in place.
 * @param line - Raw JSONL line string to process.
 */
export function processLine(state: CompactState, line: string): void {
  if (!line || !line.trim()) return;
  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(line) as Record<string, unknown>;
  } catch {
    return;
  }

  // Extract away_summary content
  if (msg['type'] === 'system' && msg['subtype'] === 'away_summary') {
    const content = msg['content'];
    if (typeof content === 'string' && content.trim()) {
      state.awaySummary = content.trim();
    }
  }

  // Extract prompt text from user messages
  if (msg['type'] === 'user' && !msg['tool_use_result']) {
    const content = (msg['message'] as Record<string, unknown> | undefined)?.['content'];
    let text = '';
    if (typeof content === 'string') {
      text = content;
    } else if (Array.isArray(content)) {
      for (const block of content) {
        if ((block as Record<string, unknown>)?.['type'] === 'text') {
          const blockText = (block as Record<string, unknown>)['text'];
          if (typeof blockText === 'string') text += blockText;
        }
      }
    }
    const cleaned = stripMarkup(text);
    if (cleaned && !/^\s*[{[<]/.test(cleaned)) {
      state.promptText = cleaned;
    }
  }

  const events = parseLineEvents(line);
  for (const evt of events) {
    switch (evt.kind) {
      case 'tool-call':
      case 'text':
      case 'error':
      case 'subagent-tool-call': {
        if ((evt.kind === 'tool-call' || evt.kind === 'subagent-tool-call') && evt.isInfrastructure) {
          const hasNonInfra = state.tail.some((t) => {
            if (t === null) return false;
            if (t.kind !== 'tool-call' && t.kind !== 'subagent-tool-call') return true;
            return !t.isInfrastructure;
          });
          if (hasNonInfra) break;
        }
        state.tail[0] = state.tail[1];
        state.tail[1] = evt;
        if (evt.kind === 'error') {
          state.errorCount++;
          state.hasErrors = true;
        }
        break;
      }
      case 'turn-duration':
        state.totalDurationMs += evt.durationMs;
        state.turnCount++;
        break;
      case 'usage':
        state.outputTokensTotal += evt.outputTokens;
        break;
      case 'result':
        state.sessionStatus = evt.status;
        state.turnCount = evt.turns;
        state.durationS = evt.durationS;
        break;
    }
  }
}

/**
 * Builds the full compact state from an array of JSONL lines.
 * @param lines - Array of raw JSONL lines to process.
 * @param primaryFilename - Primary stream filename used to detect subagent sessions.
 * @param closedAt - ISO-8601 timestamp when the stream was closed, or undefined if active.
 * @returns Fully populated compact state derived from all lines.
 */
export function buildState(lines: string[], primaryFilename: string, closedAt: string | undefined): CompactState {
  const state = makeInitialState();
  state.sessionStatus = deriveInitialStatus(closedAt);
  state.isSubagent = SUBAGENT_PATTERN.test(primaryFilename);
  for (const line of lines) {
    processLine(state, line);
  }
  return state;
}
