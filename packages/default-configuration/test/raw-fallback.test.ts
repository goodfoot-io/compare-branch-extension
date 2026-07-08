/**
 * Tests for the shared `RawFallback` component.
 *
 * Rendered via `react-dom/server` (this package has no jsdom — see
 * `attachment-render.test.ts`), asserting on the resulting HTML string.
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
  it('defaults to info severity: muted color, info icon, no error/warning coloring', () => {
    const html = render({ a: 1 }, 'Unrecognized message');
    expect(html).toBe(
      '<div class="my-0.5" style="border-left:2px solid var(--stream-fg-muted)">' +
        '<div class="stream-block-label flex items-center gap-1" style="color:var(--stream-fg-muted)">' +
        '<span class="codicon codicon-info"></span>Unrecognized message' +
        '</div>' +
        '<pre class="json-block"><code>{\n  &quot;a&quot;: 1\n}</code></pre>' +
        '</div>'
    );
  });

  it('omits the label row entirely when no label is given', () => {
    const html = render('plain text');
    expect(html).toBe(
      '<div class="my-0.5" style="border-left:2px solid var(--stream-fg-muted)">' +
        '<pre class="json-block"><code>plain text</code></pre>' +
        '</div>'
    );
  });

  it('renders error severity with the error icon and severity-error token color', () => {
    const html = render({ msg: 'boom' }, 'Tool error', 'error');
    expect(html).toBe(
      '<div class="my-0.5" style="border-left:2px solid var(--stream-severity-error-fg)">' +
        '<div class="stream-block-label flex items-center gap-1" style="color:var(--stream-severity-error-fg)">' +
        '<span class="codicon codicon-error"></span>Tool error' +
        '</div>' +
        '<pre class="json-block"><code>{\n  &quot;msg&quot;: &quot;boom&quot;\n}</code></pre>' +
        '</div>'
    );
  });

  it('renders warning severity with the warning icon and severity-warning token color', () => {
    const html = render({ note: 'careful' }, 'Malformed line', 'warning');
    expect(html).toContain('<span class="codicon codicon-warning"></span>Malformed line');
    expect(html).toContain('border-left:2px solid var(--stream-severity-warning-fg)');
  });
});
