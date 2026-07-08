/**
 * Tests for the shared `JsonBlock` component.
 *
 * Rendered via `react-dom/server` (this package has no jsdom — see
 * `attachment-render.test.ts`), asserting on the resulting HTML string.
 *
 * @summary Unit tests for streams/lib/JsonBlock
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { JsonBlock } from '../src/streams/lib/JsonBlock';

function render(value: unknown): string {
  return renderToStaticMarkup(createElement(JsonBlock, { value }));
}

describe('JsonBlock', () => {
  it('pretty-prints an object with 2-space indentation', () => {
    const html = render({ a: 1, b: { c: 2 } });
    expect(html).toBe(
      '<pre class="json-block"><code>{\n  &quot;a&quot;: 1,\n  &quot;b&quot;: {\n    &quot;c&quot;: 2\n  }\n}</code></pre>'
    );
  });

  it('parses a JSON string and pretty-prints the parsed value', () => {
    const html = render('{"a":1,"b":[1,2,3]}');
    expect(html).toBe(
      '<pre class="json-block"><code>{\n  &quot;a&quot;: 1,\n  &quot;b&quot;: [\n    1,\n    2,\n    3\n  ]\n}</code></pre>'
    );
  });

  it('falls back to the raw string when it is not valid JSON', () => {
    const html = render('not json at all');
    expect(html).toBe('<pre class="json-block"><code>not json at all</code></pre>');
  });

  it('pretty-prints an array value', () => {
    const html = render([1, 2, 3]);
    expect(html).toBe('<pre class="json-block"><code>[\n  1,\n  2,\n  3\n]</code></pre>');
  });

  it('renders null and undefined without throwing', () => {
    expect(render(null)).toBe('<pre class="json-block"><code>null</code></pre>');
    expect(render(undefined)).toBe('<pre class="json-block"><code>undefined</code></pre>');
  });
});
