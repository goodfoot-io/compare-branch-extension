/**
 * Component-level tests for the codex-session `TranscriptItemView` renderer
 * and its `deriveStatus` header-status helper.
 *
 * Rendered via `react-dom/server` (this package has no jsdom — see
 * `attachment-render.test.ts`), asserting on the resulting HTML string for
 * the shared-component compositions (`Boundary`, `RawFallback`,
 * `ReasoningAccordion`) and the codex-specific error/image-note markup added
 * per the visual-language migration.
 *
 * @summary Unit tests for the codex-session TranscriptItemView and deriveStatus
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  deriveStatus,
  TranscriptItemView
} from '../src/streams/codex-session/www/components/expanded/TranscriptItemView.js';
import type { TranscriptItem } from '../src/streams/codex-session/www/lib/render-transcript.js';

function render(item: TranscriptItem): string {
  return renderToStaticMarkup(createElement(TranscriptItemView, { item }));
}

describe('TranscriptItemView — session_header', () => {
  it('renders nothing inline (rendered once, above the transcript, by CodexExpandedView itself)', () => {
    const html = render({ kind: 'session_header', model: 'gpt-5-codex' });
    expect(html).toBe('');
  });
});

describe('TranscriptItemView — error events', () => {
  it('renders the error icon, label, and message via markdown', () => {
    const html = render({ kind: 'error', message: 'context window exceeded' });
    expect(html).toContain('class="cx-error-block"');
    expect(html).toContain('codicon-error');
    expect(html).toContain('Error');
    expect(html).toContain('context window exceeded');
  });

  it('renders error message content through markdown, not literal syntax', () => {
    const html = render({ kind: 'error', message: '**bold failure**' });
    expect(html).toContain('<strong>bold failure</strong>');
    expect(html).not.toContain('**bold failure**');
  });
});

describe('TranscriptItemView — task_started / task_complete', () => {
  it('renders task_started as a muted status line', () => {
    const html = render({ kind: 'task_started' });
    expect(html).toContain('Task started');
    expect(html).toContain('stream-status-line');
  });

  it('renders task_complete as a shared result Boundary with a formatted duration', () => {
    const html = render({ kind: 'task_complete', durationMs: 65000 });
    expect(html).toContain('data-boundary-kind="result"');
    expect(html).toContain('Turn complete');
    expect(html).toContain('1m 5s');
  });

  it('renders task_complete with a bare label when durationMs is absent', () => {
    const html = render({ kind: 'task_complete' });
    expect(html).toContain('data-boundary-kind="result"');
    expect(html).toContain('Turn complete');
  });

  it('renders a truncated last-agent-message status line when present', () => {
    const html = render({ kind: 'task_complete', lastAgentMessage: 'All done, ran the tests.' });
    expect(html).toContain('All done, ran the tests.');
  });

  it('omits the status line entirely when lastAgentMessage is absent', () => {
    const html = render({ kind: 'task_complete', durationMs: 1000 });
    // Only one stream-status-line-bearing element (the Boundary has none of its own).
    expect(html.match(/stream-status-line/g)).toBeNull();
  });
});

describe('TranscriptItemView — nested compaction variants render via shared Boundary', () => {
  it('renders the compaction kind as a shared Boundary with no detail body when message is empty', () => {
    const html = render({ kind: 'compaction', message: '' });
    expect(html).toContain('data-boundary-kind="compaction"');
    expect(html).toContain('Context compacted');
  });

  it('renders the compaction message body via markdown when present', () => {
    const html = render({ kind: 'compaction', message: 'Summarized 10 turns.' });
    expect(html).toContain('data-boundary-kind="compaction"');
    expect(html).toContain('Summarized 10 turns.');
  });
});

describe('TranscriptItemView — turn_boundary renders via shared Boundary', () => {
  it('renders the turn id in the boundary label', () => {
    const html = render({ kind: 'turn_boundary', turnId: 'turn-7' });
    expect(html).toContain('data-boundary-kind="turn"');
    expect(html).toContain('Turn turn-7');
  });
});

describe('TranscriptItemView — unknown_item / malformed via shared RawFallback', () => {
  it('renders unknown_item with info severity (never colored as an error)', () => {
    const html = render({ kind: 'unknown_item', raw: { type: 'future_variant' } });
    expect(html).toContain('codicon-info');
    expect(html).toContain('Unrecognized item');
    expect(html).toContain('var(--stream-fg-muted)');
    expect(html).not.toContain('codicon-error');
  });

  it('renders malformed with warning severity', () => {
    const html = render({ kind: 'malformed', rawLine: '{"broken":' });
    expect(html).toContain('codicon-warning');
    expect(html).toContain('Malformed line');
    expect(html).toContain('var(--stream-severity-warning-fg)');
  });
});

describe('TranscriptItemView — image placeholders', () => {
  it('renders a singular "Image" note for a user message with imageCount 1', () => {
    const html = render({ kind: 'user_message', text: 'look', imageCount: 1 });
    expect(html).toContain('codicon-file-media');
    expect(html).toContain('>Image<');
  });

  it('renders a plural "N Images" note for imageCount > 1', () => {
    const html = render({ kind: 'assistant_message', text: '', imageCount: 3 });
    expect(html).toContain('3 Images');
  });

  it('renders no image note when imageCount is absent', () => {
    const html = render({ kind: 'user_message', text: 'no images' });
    expect(html).not.toContain('codicon-file-media');
  });

  it('renders the image note as a ToolAccordion footer when a tool_call has outputImageCount', () => {
    const html = render({
      kind: 'tool_call',
      name: 'screenshot',
      callId: 'call-1',
      argumentsText: '',
      prettyPrinted: false,
      hasOutput: true,
      outputText: 'Screenshot captured.',
      outputImageCount: 1
    });
    expect(html).toContain('codicon-file-media');
    expect(html).toContain('>Image<');
  });

  it('renders no image note in orphan_output when imageCount is absent', () => {
    const html = render({ kind: 'orphan_output', callId: 'call-2', outputText: 'plain output' });
    expect(html).not.toContain('codicon-file-media');
  });
});

describe('deriveStatus', () => {
  it('is always "running" while the stream is active, regardless of errors present', () => {
    const items: TranscriptItem[] = [{ kind: 'error', message: 'boom' }];
    expect(deriveStatus(items, true)).toBe('running');
  });

  it('is "success" when inactive with no error signal', () => {
    const items: TranscriptItem[] = [{ kind: 'assistant_message', text: 'done' }];
    expect(deriveStatus(items, false)).toBe('success');
  });

  it('is "error" when inactive and a session-level error item is present', () => {
    const items: TranscriptItem[] = [{ kind: 'error', message: 'boom' }];
    expect(deriveStatus(items, false)).toBe('error');
  });

  it('is "error" when inactive and a tool_call escalated to error severity is present', () => {
    const items: TranscriptItem[] = [
      {
        kind: 'tool_call',
        name: 'shell',
        callId: 'c1',
        argumentsText: '',
        prettyPrinted: false,
        hasOutput: true,
        severity: 'error',
        errorLabel: '✗ exit 1'
      }
    ];
    expect(deriveStatus(items, false)).toBe('error');
  });

  it('is "success" for an empty transcript when inactive', () => {
    expect(deriveStatus([], false)).toBe('success');
  });
});
