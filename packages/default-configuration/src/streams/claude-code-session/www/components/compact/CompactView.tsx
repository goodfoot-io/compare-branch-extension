/**
 * Compact micro-card view for the claude-code-session stream renderer.
 *
 * Subscribes to the stream store, processes all JSONL lines through the
 * compact state machine, and renders the badge/header/tail/footer layout.
 * Manages a short highlight flash on the newest tail line when new events
 * arrive via store subscription.
 *
 * @summary Compact session card: badge, title, two-line tail, footer
 * @module components/compact/CompactView
 */

import { streamStore } from '@cards/sdk/stream-store';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { parseLineEvents, stripMarkup } from '../../lib';
import type { CompactEvent } from '../../lib/parse-session';
import type { BadgeVariant } from './Badge';
import { CompactFooter } from './CompactFooter';
import { CompactHeader } from './CompactHeader';
import { Tail } from './Tail';

/** Subagent filename pattern: two UUID segments separated by a hyphen. */
const SUBAGENT_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/;

interface CompactState {
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
}

function makeInitialState(): CompactState {
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
    errorCount: 0
  };
}

/**
 * Derives initial status from stream file meta.
 * @param metaStatus - The raw meta status string from the file, or undefined.
 * @returns Normalized session status string.
 */
function deriveInitialStatus(metaStatus: string | undefined): string {
  if (metaStatus === 'completed') return 'success';
  if (metaStatus === 'error') return 'error';
  return 'running';
}

/**
 * Processes a single JSONL line into the mutable compact state.
 * @param state - The mutable compact state to update in place.
 * @param line - Raw JSONL line string to process.
 */
function processLine(state: CompactState, line: string): void {
  if (!line || !line.trim()) return;
  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(line) as Record<string, unknown>;
  } catch {
    return;
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
 * @param metaStatus - Raw meta status string from the file, or undefined.
 * @returns Fully populated compact state derived from all lines.
 */
function buildState(lines: string[], primaryFilename: string, metaStatus: string | undefined): CompactState {
  const state = makeInitialState();
  state.sessionStatus = deriveInitialStatus(metaStatus);
  state.isSubagent = SUBAGENT_PATTERN.test(primaryFilename);
  for (const line of lines) {
    processLine(state, line);
  }
  return state;
}

/**
 * Formats output token count as a compact string.
 * @param total - Total output token count.
 * @returns Formatted token string (e.g. "1.2k") or empty string if zero.
 */
function formatTokens(total: number): string {
  if (total >= 1000) return `${(total / 1000).toFixed(1)}k`;
  if (total > 0) return String(total);
  return '';
}

/**
 * Formats duration as seconds string.
 * @param durationS - Session duration in seconds from the result message.
 * @param totalDurationMs - Accumulated turn duration in milliseconds.
 * @returns Formatted duration string (e.g. "42s") or empty string if unknown.
 */
function formatDuration(durationS: number, totalDurationMs: number): string {
  if (durationS > 0) return `${durationS}s`;
  if (totalDurationMs > 0) return `${Math.round(totalDurationMs / 1000)}s`;
  return '';
}

/**
 * Compact session micro-card. Processes all stream lines and renders a
 * badge/title/tail/footer summary. Highlights the newest tail line briefly
 * when new events arrive.
 * @returns Rendered compact session card element.
 */
export function CompactView(): React.ReactElement {
  const [compactState, setCompactState] = useState<CompactState>(() => {
    const storeState = streamStore.getState();
    const file = storeState.files.get(storeState.primary);
    return buildState(file ? file.lines : [], storeState.primary, file?.meta.status);
  });

  const [metaTitle, setMetaTitle] = useState<string>(() => {
    const storeState = streamStore.getState();
    const file = storeState.files.get(storeState.primary);
    return file?.meta.title ?? '';
  });

  const [highlight, setHighlight] = useState(false);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLineCountRef = useRef<number>(0);

  // Initialize line count tracking
  useEffect(() => {
    const storeState = streamStore.getState();
    const file = storeState.files.get(storeState.primary);
    lastLineCountRef.current = file ? file.lines.length : 0;
  }, []);

  const triggerHighlight = useCallback(() => {
    setHighlight(true);
    if (highlightTimerRef.current !== null) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      setHighlight(false);
      highlightTimerRef.current = null;
    }, 300);
  }, []);

  useEffect(() => {
    const unsubscribe = streamStore.subscribe((newState) => {
      const file = newState.files.get(newState.primary);
      const lines = file ? file.lines : [];
      const newLineCount = lines.length;

      if (newLineCount > lastLineCountRef.current) {
        // Incremental update: process only new lines
        const newLines = lines.slice(lastLineCountRef.current);
        lastLineCountRef.current = newLineCount;

        setCompactState((prev) => {
          // Clone the state for mutation
          const next: CompactState = {
            ...prev,
            tail: [...prev.tail] as [CompactEvent | null, CompactEvent | null]
          };
          for (const line of newLines) {
            processLine(next, line);
          }
          return next;
        });
        triggerHighlight();
      } else if (newLineCount < lastLineCountRef.current) {
        // File reset: rebuild from scratch
        lastLineCountRef.current = newLineCount;
        setCompactState(buildState(lines, newState.primary, file?.meta.status));
        setMetaTitle(file?.meta.title ?? '');
      }
    });

    return unsubscribe;
  }, [triggerHighlight]);

  // Clean up highlight timer on unmount
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current !== null) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  const s = compactState;
  const title = s.promptText || metaTitle || 'Claude Code session';
  const durationStr = formatDuration(s.durationS, s.totalDurationMs);
  const tokenStr = formatTokens(s.outputTokensTotal);

  const variant: BadgeVariant = s.hasErrors ? 'error' : s.isSubagent ? 'agent' : 'orchestrator';

  return (
    <div className="px-2 pt-0.5 pb-1 font-vscode-editor text-[0.85em] overflow-hidden">
      <CompactHeader variant={variant} title={title} durationStr={durationStr} />
      <Tail prev={s.tail[0]} curr={s.tail[1]} highlight={highlight} />
      <CompactFooter
        turnCount={s.turnCount}
        tokenStr={tokenStr}
        errorCount={s.errorCount}
        sessionStatus={s.sessionStatus}
      />
    </div>
  );
}
