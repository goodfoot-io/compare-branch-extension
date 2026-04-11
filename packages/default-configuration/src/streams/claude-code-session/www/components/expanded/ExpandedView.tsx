/**
 * Expanded session transcript view for the claude-code-session renderer.
 *
 * Subscribes to the stream store, parses all JSONL lines, and renders the
 * SessionHeader + Transcript. Appends new lines incrementally as they arrive
 * via store subscription. Re-renders from scratch on mode transition.
 *
 * @summary Expanded session view: header + full transcript
 * @module components/expanded/ExpandedView
 */

import { streamStore } from '@cards/sdk/stream-store';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Distance from bottom (px) within which auto-scroll activates. */
const SCROLL_THRESHOLD = 80;

import type { SessionMsg } from '../../lib/parse-session';
import { mergeConsecutiveMessages, parseLines } from '../../lib/parse-session';
import type { SessionStatus } from './SessionHeader';
import { SessionHeader } from './SessionHeader';
import { Transcript } from './Transcript';

interface ExpandedState {
  messages: SessionMsg[];
  model: string;
  cwd: string;
  status: SessionStatus;
}

function buildExpandedState(lines: string[]): ExpandedState {
  return {
    messages: mergeConsecutiveMessages(parseLines(lines)),
    model: '',
    cwd: '',
    status: 'running'
  };
}

/**
 * Expanded view that renders the full session transcript with a sticky header.
 * @returns Rendered expanded transcript view element.
 */
export function ExpandedView(): React.ReactElement {
  const [state, setState] = useState<ExpandedState>(() => {
    const storeState = streamStore.getState();
    const file = storeState.files.get(storeState.primary);
    return buildExpandedState(file ? file.lines : []);
  });

  const lastLineCountRef = useRef<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef<boolean>(true);

  useEffect(() => {
    const storeState = streamStore.getState();
    const file = storeState.files.get(storeState.primary);
    lastLineCountRef.current = file ? file.lines.length : 0;
  }, []);

  const handleInit = useCallback((model: string, cwd: string) => {
    setState((prev) => ({ ...prev, model, cwd }));
  }, []);

  const handleResult = useCallback((status: 'success' | 'error') => {
    setState((prev) => ({ ...prev, status }));
  }, []);

  useEffect(() => {
    const unsubscribe = streamStore.subscribe((newState) => {
      const file = newState.files.get(newState.primary);
      const lines = file ? file.lines : [];
      const newLineCount = lines.length;

      if (newLineCount > lastLineCountRef.current) {
        const newLines = lines.slice(lastLineCountRef.current);
        lastLineCountRef.current = newLineCount;
        const newMessages = parseLines(newLines);
        setState((prev) => ({
          ...prev,
          // Re-merge across the boundary: the last accumulated message may
          // need to absorb the first new message if they share an author.
          messages: mergeConsecutiveMessages([...prev.messages, ...newMessages])
        }));
      } else if (newLineCount < lastLineCountRef.current) {
        // File reset: rebuild from scratch
        lastLineCountRef.current = newLineCount;
        setState(buildExpandedState(lines));
      }
    });

    return unsubscribe;
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD;
  }, []);

  // Scroll to bottom when new messages arrive, if already near bottom
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || !isAtBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  return (
    <div className="flex flex-col min-h-0 overflow-hidden">
      <SessionHeader model={state.model} cwd={state.cwd} status={state.status} />
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0" onScroll={handleScroll}>
        <Transcript messages={state.messages} onInit={handleInit} onResult={handleResult} />
      </div>
    </div>
  );
}
