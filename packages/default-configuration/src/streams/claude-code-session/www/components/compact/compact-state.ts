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
import type { CompactEvent, ContentBlock } from '../../lib/parse-session';

/** Subagent filename pattern: two UUID segments separated by a hyphen. */
const SUBAGENT_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/;

/** Tool names whose `input.file_path` represents a file the session touched. */
const FILE_TOUCH_TOOLS = new Set(['Edit', 'Write', 'MultiEdit']);

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
  /** Top-level `uuid`s already folded in, so the doubled transcript counts once. */
  seenUuids: Set<string>;
  /** De-duplicated count of `tool_use` blocks across assistant and subagent turns. */
  toolCallCount: number;
  /** De-duplicated count of `Agent` tool calls (sub-agent dispatches). */
  subagentCount: number;
  /** Distinct file paths written via Edit/Write/MultiEdit. */
  filesTouched: Set<string>;
  /** Latest assistant `message.model`, with any leading `claude-` prefix stripped. */
  model: string;
  /** Σ `message.usage.input_tokens`, de-duplicated by line `uuid`. */
  inputTokensTotal: number;
  /** Earliest line `timestamp` in epoch ms; 0 when unset. */
  firstTimestamp: number;
  /** Latest line `timestamp` in epoch ms; 0 when unset. */
  lastTimestamp: number;
  /** Most recent sanitized assistant text, used as a headline fallback. */
  lastAssistantText: string;
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
    awaySummary: '',
    seenUuids: new Set<string>(),
    toolCallCount: 0,
    subagentCount: 0,
    filesTouched: new Set<string>(),
    model: '',
    inputTokensTotal: 0,
    firstTimestamp: 0,
    lastTimestamp: 0,
    lastAssistantText: ''
  };
}

/**
 * Derives initial status from stream file meta.
 * @param isActive - Whether the stream is live (not yet committed).
 * @returns Normalized session status string.
 */
export function deriveInitialStatus(isActive: boolean): string {
  if (isActive) return 'running';
  // Committed streams: treat as success by default; error status requires a result event
  return 'success';
}

/** Prefixes that mark runtime control traffic rather than genuine prose. */
const CONTROL_PREFIXES = ['Load the', 'Base directory', 'Stop hook feedback:'];

/**
 * Raw wrapper-markup markers whose mere presence means the line is a
 * slash-command expansion or routing message, not genuine prose. These are
 * matched against the *raw* text — `stripMarkup` would otherwise drop the tags
 * and leave their machine-generated inner text looking like real prose (the
 * markup-leak the redesign exists to fix).
 */
const CONTROL_MARKERS = /<command-(?:message|name)|<skill-format|<teammate-message/i;

/**
 * Reports whether `text` parses as a complete JSON value.
 * @param text - Candidate string.
 * @returns True when `JSON.parse` accepts the input.
 * @throws Re-throws any non-`SyntaxError` raised by `JSON.parse`.
 */
function isJsonValue(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch (error) {
    if (error instanceof SyntaxError) return false;
    throw error;
  }
}

/**
 * Reduces a candidate headline string to genuine human/assistant prose, or `''`.
 *
 * Rejects (returns `''`) any line carrying `<command-*>` / `<skill-format>` /
 * `<teammate-message` wrapper markup wholesale — these are slash-command
 * expansions or routing messages whose stripped inner text is the markup leak
 * the redesign exists to fix. Otherwise it strips benign inline tags and
 * markdown (via {@link stripMarkup}) and then rejects anything that is empty,
 * JSON-ish (`^\s*[{[<]`), or runtime control traffic: lines that start with
 * `Load the`, `Base directory`, or `Stop hook feedback:`, or that parse as JSON.
 *
 * This is the single source of truth for "is this genuine prose"; the
 * parse-session user-text guard imports it rather than re-deriving the rules.
 *
 * @param text - Raw candidate text (may contain wrapper markup).
 * @returns Sanitized prose, or `''` when nothing genuine remains.
 */
export function sanitizeHeadline(text: string): string {
  const raw = String(text ?? '');
  // Reject slash-command / skill / routing wrapper markup on the raw text:
  // stripMarkup would drop the tags and leave the machine inner text behind,
  // which is exactly the leak we must prevent.
  if (CONTROL_MARKERS.test(raw)) return '';
  const cleaned = stripMarkup(raw);
  if (!cleaned) return '';
  if (/^\s*[{[<]/.test(cleaned)) return '';
  for (const prefix of CONTROL_PREFIXES) {
    if (cleaned.startsWith(prefix)) return '';
  }
  if (isJsonValue(raw.trim())) return '';
  return cleaned;
}

/**
 * Selects the compact headline: the first non-empty of the sanitized
 * `away_summary`, the sanitized last assistant text, and the sanitized text of
 * the latest tail event (when that event is a text event).
 *
 * @param state - The compact state to read from.
 * @returns The headline string, or `''` when no genuine prose is available.
 */
export function headline(state: CompactState): string {
  const fromAway = sanitizeHeadline(state.awaySummary);
  if (fromAway) return fromAway;
  const fromAssistant = sanitizeHeadline(state.lastAssistantText);
  if (fromAssistant) return fromAssistant;
  const latestTail = state.tail[1] ?? state.tail[0];
  if (latestTail && latestTail.kind === 'text') {
    const fromTail = sanitizeHeadline(latestTail.text);
    if (fromTail) return fromTail;
  }
  return '';
}

/**
 * Parses an ISO `timestamp` into epoch ms, or `null` when absent/unparseable.
 * @param value - Raw `timestamp` field (expected ISO string).
 * @returns Epoch milliseconds, or null.
 */
function parseTimestamp(value: unknown): number | null {
  if (typeof value !== 'string' || !value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Processes a single JSONL line into the mutable compact state.
 * @param state - The mutable compact state to update in place.
 * @param line - Raw JSONL line string to process.
 */
export function processLine(state: CompactState, line: string): void {
  if (!line?.trim()) return;
  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(line) as Record<string, unknown>;
  } catch {
    return;
  }

  // De-dup first: the transcript is double-written, so every `uuid` arrives
  // twice. Fold each unique `uuid` once; the doubled copy is skipped before
  // any tally (turns, tokens, tool calls) can be inflated. Lines without a
  // `uuid` (e.g. some system/result lines) are never skipped.
  const uuid = msg['uuid'];
  if (typeof uuid === 'string' && uuid) {
    if (state.seenUuids.has(uuid)) return;
    state.seenUuids.add(uuid);
  }

  // Track the timestamp span (epoch ms) across all folded lines.
  const ts = parseTimestamp(msg['timestamp']);
  if (ts !== null) {
    state.firstTimestamp = state.firstTimestamp === 0 ? ts : Math.min(state.firstTimestamp, ts);
    state.lastTimestamp = Math.max(state.lastTimestamp, ts);
  }

  // Capture the model from assistant lines (latest wins), stripping the
  // display-noise `claude-` prefix (e.g. `claude-opus-4-8` → `opus-4-8`).
  if (msg['type'] === 'assistant') {
    const model = (msg['message'] as Record<string, unknown> | undefined)?.['model'];
    if (typeof model === 'string' && model) {
      state.model = model.startsWith('claude-') ? model.slice('claude-'.length) : model;
    }
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
      // Preserve original markdown so the renderer can format it.
      state.promptText = text.trim();
    }
  }

  // Collect distinct Edit/Write/MultiEdit file paths from this line's tool_use
  // blocks (assistant content and subagent progress content).
  collectTouchedFiles(state, msg);

  const events = parseLineEvents(line);
  for (const evt of events) {
    switch (evt.kind) {
      case 'tool-call':
      case 'text':
      case 'error':
      case 'subagent-tool-call': {
        if (evt.kind === 'tool-call' || evt.kind === 'subagent-tool-call') {
          state.toolCallCount++;
        }
        // Sub-agents are top-level `Agent` dispatches only — never the
        // `subagent-tool-call` progress lines emitted from inside a subagent.
        if (evt.kind === 'tool-call' && evt.toolName === 'Agent') {
          state.subagentCount++;
        }
        if (evt.kind === 'text' && evt.role === 'assistant') {
          const sanitized = sanitizeHeadline(evt.text);
          if (sanitized) state.lastAssistantText = sanitized;
        }
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
        if (evt.inputTokens != null) state.inputTokensTotal += evt.inputTokens;
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
 * Adds the `file_path` of every Edit/Write/MultiEdit `tool_use` block in this
 * line to {@link CompactState.filesTouched}. Walks both the assistant
 * `message.content` and subagent `data.content` block arrays.
 *
 * @param state - The mutable compact state to update.
 * @param msg - The parsed JSONL line.
 */
function collectTouchedFiles(state: CompactState, msg: Record<string, unknown>): void {
  const blockArrays: unknown[] = [];
  const message = msg['message'] as Record<string, unknown> | undefined;
  if (message && Array.isArray(message['content'])) blockArrays.push(message['content']);
  const data = msg['data'] as Record<string, unknown> | undefined;
  if (data && Array.isArray(data['content'])) blockArrays.push(data['content']);

  for (const blocks of blockArrays) {
    for (const block of blocks as ContentBlock[]) {
      if (block?.type !== 'tool_use' || !FILE_TOUCH_TOOLS.has(block.name)) continue;
      const filePath = (block.input as Record<string, unknown> | undefined)?.['file_path'];
      if (typeof filePath === 'string' && filePath) state.filesTouched.add(filePath);
    }
  }
}

/**
 * Builds the full compact state from an array of JSONL lines.
 * @param lines - Array of raw JSONL lines to process.
 * @param primaryFilename - Primary stream filename used to detect subagent sessions.
 * @param isActive - Whether the stream is live (not yet committed).
 * @returns Fully populated compact state derived from all lines.
 */
export function buildState(lines: string[], primaryFilename: string, isActive: boolean): CompactState {
  const state = makeInitialState();
  state.sessionStatus = deriveInitialStatus(isActive);
  state.isSubagent = SUBAGENT_PATTERN.test(primaryFilename);
  for (const line of lines) {
    processLine(state, line);
  }
  return state;
}
