/**
 * Tests for the shared `RawFallback` component.
 *
 * Rendered via `react-dom/server` (this package has no jsdom — see
 * `attachment-render.test.ts`), asserting on the resulting HTML string.
 * `renderToStaticMarkup` renders only the initial state, so these assert the
 * collapsed-by-default disclosure row — the JSON body is present in markup
 * but hidden (`display:none`), never dropped.
 *
 * @summary Unit tests for streams/lib/RawFallback
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RawFallback, type RawFallbackSeverity } from '../src/streams/lib/RawFallback';

function render(data: unknown, label?: string, severity?: RawFallbackSeverity): string {
  return renderToStaticMarkup(createElement(RawFallback, { data, label, severity }));
}

describe('RawFallback', () => {
  it('collapses by default, showing the label but hiding the JSON body', () => {
    const html = render({ a: 1 }, 'Unrecognized message');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('Unrecognized message');
    expect(html).toContain('style="display:none');
    expect(html).toContain('&quot;a&quot;: 1');
  });

  it('defaults to info severity: muted color, info icon, no error/warning coloring', () => {
    const html = render({ a: 1 }, 'Unrecognized message');
    expect(html).toContain('codicon-info');
    expect(html).toContain('color:var(--stream-fg-muted)');
    expect(html).not.toContain('codicon-warning');
    expect(html).not.toContain('codicon-error');
  });

  it('falls back to a "Raw data" label when none is given', () => {
    const html = render('plain text');
    expect(html).toContain('Raw data');
    expect(html).toContain('plain text');
  });

  it('renders error severity with the error icon and severity-error token color', () => {
    const html = render({ msg: 'boom' }, 'Tool error', 'error');
    expect(html).toContain('codicon-error');
    expect(html).toContain('color:var(--stream-severity-error-fg)');
    expect(html).toContain('Tool error');
    expect(html).toContain('&quot;msg&quot;: &quot;boom&quot;');
  });

  it('renders warning severity with the warning icon and severity-warning token color', () => {
    const html = render({ note: 'careful' }, 'Malformed line', 'warning');
    expect(html).toContain('codicon-warning');
    expect(html).toContain('Malformed line');
    expect(html).toContain('border-left:2px solid var(--stream-severity-warning-fg)');
  });
});
