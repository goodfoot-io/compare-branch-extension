/**
 * Tests for the shared `SessionHeader` component.
 *
 * Rendered via `react-dom/server` (this package has no jsdom — see
 * `attachment-render.test.ts`), asserting on the resulting HTML string.
 *
 * @summary Unit tests for streams/lib/SessionHeader
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SessionHeader } from '../src/streams/lib/SessionHeader';

describe('SessionHeader', () => {
  it('renders model, cwd, and a status dot for a bare Claude-style call (no provider/threadId)', () => {
    const html = renderToStaticMarkup(
      createElement(SessionHeader, { model: 'claude-opus-4-5', cwd: '/repo', status: 'running' })
    );
    expect(html).toBe(
      '<div class="flex items-center gap-2 px-3.5 py-1.5 text-[0.78em] text-vscode-descriptionForeground shrink-0 opacity-70" style="border-bottom:1px solid var(--stream-border-subtle)">' +
        '<span class="font-vscode-editor shrink-0">claude-opus-4-5</span>' +
        '<span class="opacity-30 shrink-0">·</span>' +
        '<span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-vscode-editor" title="/repo">/repo</span>' +
        '<span class="shrink-0 w-[6px] h-[6px] rounded-full ml-auto" style="background:var(--stream-severity-warning-fg)"></span>' +
        '</div>'
    );
  });

  it('renders agentId, provider, and threadId fields, in order, only when present', () => {
    const html = renderToStaticMarkup(
      createElement(SessionHeader, {
        model: 'gpt-5-codex',
        cwd: '/repo',
        status: 'success',
        agentId: 'sub-1',
        provider: 'codex',
        threadId: 'thread-123'
      })
    );
    expect(html).toContain('title="Subagent: sub-1">sub-1</span>');
    expect(html).toContain('>codex</span>');
    expect(html).toContain('title="thread-123">thread-123</span>');
    // Field order: agentId · model · provider · cwd · threadId
    expect(html.indexOf('sub-1')).toBeLessThan(html.indexOf('gpt-5-codex'));
    expect(html.indexOf('gpt-5-codex')).toBeLessThan(html.indexOf('>codex<'));
    expect(html.indexOf('>codex<')).toBeLessThan(html.indexOf('/repo'));
    expect(html.indexOf('/repo')).toBeLessThan(html.indexOf('thread-123'));
    expect(html).toContain('background:var(--stream-severity-success-fg)');
  });

  it('maps status to the shared severity triad tokens (no hardcoded hex)', () => {
    const errorHtml = renderToStaticMarkup(createElement(SessionHeader, { model: 'm', cwd: 'c', status: 'error' }));
    expect(errorHtml).toContain('background:var(--stream-severity-error-fg)');
  });

  it('renders nothing when model, cwd, and agentId are all empty', () => {
    const html = renderToStaticMarkup(createElement(SessionHeader, { model: '', cwd: '', status: 'running' }));
    expect(html).toBe('');
  });
});
