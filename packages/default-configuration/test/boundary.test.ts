/**
 * Tests for the shared `Boundary` component.
 *
 * Rendered via `react-dom/server` (this package has no jsdom — see
 * `attachment-render.test.ts`), asserting on the resulting HTML string.
 *
 * @summary Unit tests for streams/lib/Boundary
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Boundary } from '../src/streams/lib/Boundary';

function render(kind: 'turn' | 'result' | 'compaction', label: string): string {
  return renderToStaticMarkup(createElement(Boundary, { kind, label }));
}

describe('Boundary', () => {
  it('renders the line-label-line shape with the kind as a data attribute', () => {
    const html = render('turn', 'Turn');
    expect(html).toBe(
      '<div class="stream-boundary" data-boundary-kind="turn">' +
        '<span class="stream-boundary__line"></span>' +
        '<span class="stream-boundary__label">Turn</span>' +
        '<span class="stream-boundary__line"></span>' +
        '</div>'
    );
  });

  it('uses the identical shape for result boundaries, varying only the label and kind attribute', () => {
    const html = render('result', 'Session complete · 4 turns · 12s');
    expect(html).toBe(
      '<div class="stream-boundary" data-boundary-kind="result">' +
        '<span class="stream-boundary__line"></span>' +
        '<span class="stream-boundary__label">Session complete · 4 turns · 12s</span>' +
        '<span class="stream-boundary__line"></span>' +
        '</div>'
    );
  });

  it('uses the identical shape for compaction boundaries', () => {
    const html = render('compaction', 'Compacted');
    expect(html).toBe(
      '<div class="stream-boundary" data-boundary-kind="compaction">' +
        '<span class="stream-boundary__line"></span>' +
        '<span class="stream-boundary__label">Compacted</span>' +
        '<span class="stream-boundary__line"></span>' +
        '</div>'
    );
  });
});
