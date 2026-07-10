/**
 * Tests for the shared assistant-ui foundation (`streams/lib/aui`) both
 * stream renderers build their expanded transcript on.
 *
 * Rendered via `react-dom/server` (this package has no jsdom — see
 * `attachment-render.test.ts`), asserting on the resulting HTML string.
 * `renderToStaticMarkup` renders only the initial state, so the
 * reasoning-part tests assert the *initial* expanded/collapsed state driven
 * by each message's `status`, not any post-toggle behavior.
 *
 * @summary Unit tests for streams/lib/aui (StreamThread and its parts)
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StreamThread } from '../src/streams/lib/aui/StreamThread';
import type { ThreadMessageLike } from '../src/streams/lib/aui/types';

const MARKDOWN_SAMPLE = `| Metric | Value |
| --- | --- |
| Files changed | 3 |

\`\`\`ts
function greet(name: string): string {
  return name;
}
\`\`\`

- first item
- second item
`;

function render(messages: readonly ThreadMessageLike[], isRunning = false): string {
  return renderToStaticMarkup(createElement(StreamThread, { messages, isRunning }));
}

describe('StreamThread', () => {
  it('renders a user turn with the role label and right-shifted turn class', () => {
    const html = render([{ id: 'u1', role: 'user', content: [{ type: 'text', text: 'Summarize the readme.' }] }]);
    expect(html).toContain('class="stream-turn stream-turn--user"');
    expect(html).toContain('data-turn="user"');
    expect(html).toContain('<div class="stream-role-label">User</div>');
    expect(html).toContain('Summarize the readme.');
  });

  it('renders an assistant turn with the role label and transparent full-width turn class', () => {
    const html = render([
      {
        id: 'a1',
        role: 'assistant',
        status: { type: 'complete', reason: 'stop' },
        content: [{ type: 'text', text: 'Sure thing.' }]
      }
    ]);
    expect(html).toContain('class="stream-turn stream-turn--assistant"');
    expect(html).toContain('data-turn="assistant"');
    expect(html).toContain('<div class="stream-role-label">Assistant</div>');
  });

  it('renders a system turn with the role label and the new --system turn class', () => {
    const html = render([{ id: 's1', role: 'system', content: [{ type: 'text', text: 'Session initialized.' }] }]);
    expect(html).toContain('class="stream-turn stream-turn--system"');
    expect(html).toContain('data-turn="system"');
    expect(html).toContain('<div class="stream-role-label">System</div>');
    expect(html).toContain('Session initialized.');
  });

  it('renders GFM markdown (table, fenced code, list) through MarkdownText', () => {
    const html = render([
      {
        id: 'a1',
        role: 'assistant',
        status: { type: 'complete', reason: 'stop' },
        content: [{ type: 'text', text: MARKDOWN_SAMPLE }]
      }
    ]);
    expect(html).toContain('class="aui-markdown"');
    expect(html).toContain('<table>');
    expect(html).toContain('Files changed');
    expect(html).toContain('<pre class=""><code class="language-ts">');
    expect(html).toContain('function greet');
    expect(html).toContain('<li>first item</li>');
  });

  it('auto-expands a reasoning part while its message is running', () => {
    const html = render([
      {
        id: 'a-running',
        role: 'assistant',
        status: { type: 'running' },
        content: [{ type: 'reasoning', text: 'Weighing whether to read the file first.' }]
      }
    ]);
    expect(html).toContain('data-status="running"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).not.toContain('style="display:none');
    expect(html).toContain('Weighing whether to read the file first.');
  });

  it('collapses a reasoning part once its message is complete', () => {
    const html = render([
      {
        id: 'a-complete',
        role: 'assistant',
        status: { type: 'complete', reason: 'stop' },
        content: [{ type: 'reasoning', text: 'This reasoning already finished.' }]
      }
    ]);
    expect(html).toContain('data-status="complete"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('style="display:none');
  });

  it('renders an unregistered tool call as a ToolFallbackPart accordion with args and result', () => {
    const html = render([
      {
        id: 'a1',
        role: 'assistant',
        status: { type: 'complete', reason: 'stop' },
        content: [
          {
            type: 'tool-call',
            toolCallId: 'call_1',
            toolName: 'read_file',
            args: { path: '/tmp/example.txt' },
            result: 'file contents: hello world'
          }
        ]
      }
    ]);
    expect(html).toContain('read_file');
    expect(html).toContain('/tmp/example.txt');
    expect(html).toContain('file contents: hello world');
    expect(html).toContain('codicon-check');
  });

  it('escalates an isError tool call to the error severity treatment', () => {
    const html = render([
      {
        id: 'a1',
        role: 'assistant',
        status: { type: 'complete', reason: 'stop' },
        content: [
          {
            type: 'tool-call',
            toolCallId: 'call_2',
            toolName: 'run_shell',
            args: { command: 'exit 1' },
            result: 'command failed',
            isError: true
          }
        ]
      }
    ]);
    expect(html).toContain('run_shell');
    expect(html).toContain('command failed');
    expect(html).toContain('codicon-error');
  });

  it('renders the boundary data part as the shared line-label-line separator', () => {
    const html = render([
      {
        id: 'a1',
        role: 'assistant',
        status: { type: 'complete', reason: 'stop' },
        content: [
          { type: 'data', name: 'boundary', data: { kind: 'result', label: 'Session complete · 2 turns · 5s' } }
        ]
      }
    ]);
    expect(html).toContain('class="stream-boundary" data-boundary-kind="result"');
    expect(html).toContain('Session complete · 2 turns · 5s');
  });

  it('renders the raw data part as a labeled, severity-aware JSON block', () => {
    const html = render([
      {
        id: 'a1',
        role: 'assistant',
        status: { type: 'complete', reason: 'stop' },
        content: [
          {
            type: 'data',
            name: 'raw',
            data: { data: { weird: true }, label: 'Unrecognized message', severity: 'warning' }
          }
        ]
      }
    ]);
    expect(html).toContain('Unrecognized message');
    expect(html).toContain('codicon-warning');
    expect(html).toContain('&quot;weird&quot;: true');
  });

  it('renders the status-line data part as a muted italic single line', () => {
    const html = render([
      {
        id: 'a1',
        role: 'assistant',
        status: { type: 'complete', reason: 'stop' },
        content: [{ type: 'data', name: 'status-line', data: { text: 'Compacting context…' } }]
      }
    ]);
    expect(html).toContain('class="stream-status-line');
    expect(html).toContain('Compacting context…');
  });

  it('renders the error-line data part with the error icon and optional structured detail', () => {
    const html = render([
      {
        id: 'a1',
        role: 'assistant',
        status: { type: 'complete', reason: 'stop' },
        content: [{ type: 'data', name: 'error-line', data: { message: 'Tool execution failed', detail: { code: 1 } } }]
      }
    ]);
    expect(html).toContain('class="aui-error-line"');
    expect(html).toContain('codicon-error');
    expect(html).toContain('Tool execution failed');
    expect(html).toContain('&quot;code&quot;: 1');
  });

  it('falls back to a labeled warning JSON block for an unregistered data part name', () => {
    const html = render([
      {
        id: 'a1',
        role: 'assistant',
        status: { type: 'complete', reason: 'stop' },
        content: [{ type: 'data', name: 'totally-unknown', data: { anything: 'here' } }]
      }
    ]);
    expect(html).toContain('Unrecognized data part: totally-unknown');
    expect(html).toContain('codicon-warning');
    expect(html).toContain('&quot;anything&quot;: &quot;here&quot;');
  });
});
