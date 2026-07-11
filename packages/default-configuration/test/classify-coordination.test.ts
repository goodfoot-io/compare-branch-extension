/**
 * Tests for `classifyCoordinationText`/`isCoordinationContent`.
 *
 * Coordination content (JSON/XML machine-generated blocks — team messages,
 * task ids) used to be silently dropped when a turn's text block matched the
 * coordination pattern. It now reduces to muted `status-line` display
 * strings instead, with only `idle_notification` payloads suppressed by
 * design.
 *
 * Replaces the former `coordination-line.test.ts`, which exercised the
 * retired JSX-producing `CoordinationLine.tsx` through the (also retired)
 * `AssistantTurn`/`UserTurn` components. That integration coverage now lives
 * in `cc-thread-converter.test.ts`, which asserts the same text reaches the
 * converter's `status-line` data parts.
 *
 * @summary Unit tests for the pure JSON/XML coordination-content classifier
 */

import { describe, expect, it } from 'vitest';
import {
  classifyCoordinationText,
  isCoordinationContent
} from '../src/streams/claude-code-session/www/lib/classify-coordination.js';

describe('isCoordinationContent', () => {
  it('recognizes JSON- and XML-shaped text as coordination content', () => {
    expect(isCoordinationContent('{"type":"team_message"}')).toBe(true);
    expect(isCoordinationContent('[1, 2, 3]')).toBe(true);
    expect(isCoordinationContent('<task id="1">note</task>')).toBe(true);
  });

  it('does not classify ordinary prose as coordination content', () => {
    expect(isCoordinationContent('Please fix the bug in index.ts')).toBe(false);
  });
});

describe('classifyCoordinationText', () => {
  it('suppresses idle_notification JSON payloads entirely', () => {
    expect(classifyCoordinationText('{"type":"idle_notification"}')).toHaveLength(0);
  });

  it('renders a from/type summary line for a non-suppressed JSON payload', () => {
    const lines = classifyCoordinationText('{"from":"planner-1","type":"task_update"}');
    expect(lines).toEqual(['planner-1: task update']);
  });

  it('falls back to a truncated raw preview for malformed JSON', () => {
    const lines = classifyCoordinationText('{not valid json');
    expect(lines).toEqual(['{not valid json']);
  });

  it('renders one line per XML element, suppressing only the idle_notification ones', () => {
    const raw = '<msg>{"from":"a","type":"idle_notification"}</msg><msg>{"from":"b","type":"task_started"}</msg>';
    const lines = classifyCoordinationText(raw);
    expect(lines).toEqual(['b: task started']);
  });

  it('renders plain-text XML element bodies verbatim', () => {
    const lines = classifyCoordinationText('<note>build finished</note>');
    expect(lines).toEqual(['build finished']);
  });

  it('strips markup and falls back to plain text when no XML elements are found', () => {
    const lines = classifyCoordinationText('<not-an-element-body-really-no-closing-tag');
    expect(lines).toEqual(['<not-an-element-body-really-no-closing-tag']);
  });

  it('returns an empty array for ordinary prose (caller renders it as human text)', () => {
    expect(classifyCoordinationText('Please fix the bug in index.ts')).toHaveLength(0);
  });
});
