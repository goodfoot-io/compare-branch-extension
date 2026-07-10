/**
 * Execution proof for the assistant-ui integration spike: renders the spike
 * `App` (headless ThreadPrimitive/MessagePrimitive composition over a custom
 * `useExternalStoreRuntime`) and asserts the resulting markup contains the
 * hardcoded text/markdown, reasoning, tool-call, and data-part content.
 *
 * Rendered via `react-dom/server` — this package has no jsdom, per the
 * existing `attachment-render.test.ts` convention.
 *
 * @summary Render proof for the _aui-spike assistant-ui integration spike
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from '../src/streams/_aui-spike/app.js';

describe('assistant-ui spike App', () => {
  it('renders GFM markdown (table, fenced code, list), reasoning, tool-call, and data-part content', () => {
    const html = renderToStaticMarkup(createElement(App));

    // Markdown: GFM table, fenced code block, list.
    expect(html).toContain('Files changed');
    expect(html).toContain('greet');
    expect(html).toContain('first item');

    // Reasoning part.
    expect(html).toContain('Checking whether the file exists before reading it.');

    // Tool-call part: args + result via the custom read-file renderer.
    expect(html).toContain('read-file');
    expect(html).toContain('/tmp/example.txt');
    expect(html).toContain('file contents: hello world');

    // Data part via the custom status-summary renderer.
    expect(html).toContain('Build status');
    expect(html).toContain('passing');
  });
});
