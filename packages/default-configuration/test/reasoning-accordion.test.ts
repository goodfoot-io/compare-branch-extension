/**
 * Tests for the shared `ReasoningAccordion` component.
 *
 * Rendered via `react-dom/server` (this package has no jsdom — see
 * `attachment-render.test.ts`), asserting on the resulting HTML string.
 *
 * @summary Unit tests for streams/lib/ReasoningAccordion
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReasoningAccordion } from '../src/streams/lib/ReasoningAccordion';

describe('ReasoningAccordion', () => {
  it('renders collapsed by default with a codicon chevron (no hand-drawn glyph)', () => {
    const html = renderToStaticMarkup(createElement(ReasoningAccordion, { thinking: 'hmm' }));
    expect(html).toBe(
      '<div class="my-1 rounded-r" style="background:var(--stream-aside-bg);border-left:3px solid var(--stream-aside-border)">' +
        '<button type="button" aria-expanded="false" class="inline-flex items-center gap-1 px-2 py-1 w-full text-left bg-transparent border-none text-vscode-descriptionForeground font-vscode text-[0.85em] italic cursor-pointer opacity-80 hover:opacity-100 hover:text-vscode-foreground">' +
        '<span class="codicon codicon-chevron-right cc-chevron not-italic" style="font-size:0.75em"></span>' +
        '<span>Thinking…</span>' +
        '</button>' +
        '<div class="cc-accordion-body px-2 pb-2 text-[0.85em] text-vscode-descriptionForeground whitespace-pre-wrap break-words font-normal" style="display:none;opacity:0;transition:opacity 0.1s ease">hmm</div>' +
        '</div>'
    );
  });

  it('does not use the old hand-drawn ▶ glyph', () => {
    const html = renderToStaticMarkup(createElement(ReasoningAccordion, { thinking: 'hmm' }));
    expect(html).not.toContain('▶');
  });
});
