/**
 * Tests for `classifyCoordination`/`isCoordinationContent` and their
 * integration into `AssistantTurn`/`UserTurn`.
 *
 * Coordination content (JSON/XML machine-generated blocks — team messages,
 * task ids) used to be silently dropped when a turn's text block matched the
 * coordination pattern. It now renders as a muted one-liner instead, with only
 * `idle_notification` payloads suppressed by design.
 *
 * Rendered via `react-dom/server` (this package has no jsdom — see
 * `attachment-render.test.ts`), asserting on the resulting HTML string.
 *
 * @summary Unit + integration tests for coordination-content rendering
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AssistantTurn } from '../src/streams/claude-code-session/www/components/expanded/messages/AssistantTurn.js';
import {
  classifyCoordination,
  isCoordinationContent
} from '../src/streams/claude-code-session/www/components/expanded/messages/CoordinationLine.js';
import { UserTurn } from '../src/streams/claude-code-session/www/components/expanded/messages/UserTurn.js';
import type { ContentBlock } from '../src/streams/claude-code-session/www/lib/parse-session.js';

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

describe('classifyCoordination', () => {
  it('suppresses idle_notification JSON payloads entirely', () => {
    expect(classifyCoordination('{"type":"idle_notification"}', 'k')).toHaveLength(0);
  });

  it('renders a from/type summary line for a non-suppressed JSON payload', () => {
    const nodes = classifyCoordination('{"from":"planner-1","type":"task_update"}', 'k');
    expect(nodes).toHaveLength(1);
    const html = renderToStaticMarkup(nodes[0] as Parameters<typeof renderToStaticMarkup>[0]);
    expect(html).toContain('planner-1: task update');
  });

  it('renders one line per XML element, suppressing only the idle_notification ones', () => {
    const raw = '<msg>{"from":"a","type":"idle_notification"}</msg><msg>{"from":"b","type":"task_started"}</msg>';
    const nodes = classifyCoordination(raw, 'k');
    expect(nodes).toHaveLength(1);
    const html = renderToStaticMarkup(nodes[0] as Parameters<typeof renderToStaticMarkup>[0]);
    expect(html).toContain('b: task started');
  });

  it('returns an empty array for ordinary prose (caller renders it as human text)', () => {
    expect(classifyCoordination('Please fix the bug in index.ts', 'k')).toHaveLength(0);
  });
});

describe('AssistantTurn — coordination lines', () => {
  it('renders a coordination line for a JSON text block instead of dropping it', () => {
    const blocks: ContentBlock[] = [{ type: 'text', text: '{"from":"reviewer","type":"approval"}' }];
    const html = renderToStaticMarkup(createElement(AssistantTurn, { blocks }));
    expect(html).toContain('reviewer: approval');
  });

  it('still suppresses idle_notification and renders null when it is the only block', () => {
    const blocks: ContentBlock[] = [{ type: 'text', text: '{"type":"idle_notification"}' }];
    const html = renderToStaticMarkup(createElement(AssistantTurn, { blocks }));
    expect(html).toBe('');
  });

  it('renders both a coordination line and the human-prose bubble when a turn has both', () => {
    const blocks: ContentBlock[] = [
      { type: 'text', text: '{"from":"reviewer","type":"approval"}' },
      { type: 'text', text: 'Looks good to merge.' }
    ];
    const html = renderToStaticMarkup(createElement(AssistantTurn, { blocks }));
    expect(html).toContain('reviewer: approval');
    expect(html).toContain('Looks good to merge.');
  });
});

describe('UserTurn — coordination lines', () => {
  it('renders a coordination line for a JSON text block instead of dropping it', () => {
    const html = renderToStaticMarkup(createElement(UserTurn, { textBlocks: ['{"from":"user","type":"task_id"}'] }));
    expect(html).toContain('user: task id');
  });

  it('renders null when the only block is a suppressed idle_notification', () => {
    const html = renderToStaticMarkup(createElement(UserTurn, { textBlocks: ['{"type":"idle_notification"}'] }));
    expect(html).toBe('');
  });
});
