/**
 * Tests for the shared markdown-to-React-node renderer and the
 * `looksLikeMarkdown` detector.
 *
 * `renderMarkdownNodes` walks `marked`'s token tree directly (never an
 * HTML-string round-trip), so these tests render its output to a static HTML
 * string via `react-dom/server` and assert on that string — this package has
 * no jsdom (see `attachment-render.test.ts`), and `renderToStaticMarkup`
 * needs no DOM. The two BLOCKING regressions this pins: fenced/inline code
 * must show literal special characters exactly once (no double-escaping),
 * and unsafe link hrefs / raw HTML in the source must never execute or
 * inject live markup.
 *
 * @summary Unit tests for streams/lib/markdown
 */

import { marked } from 'marked';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { looksLikeMarkdown, renderMarkdownNodes } from '../src/streams/lib/markdown';

function render(text: string): string {
  return renderToStaticMarkup(createElement('div', null, ...renderMarkdownNodes(text, 'k')));
}

describe('renderMarkdownNodes', () => {
  it('renders fenced code with quotes/angle brackets/ampersands as literal characters exactly once', () => {
    const html = render('```\n"quoted" <tag> a & b\n```');
    expect(html).toContain('<pre><code>&quot;quoted&quot; &lt;tag&gt; a &amp; b</code></pre>');
    // Guards against double-escaping (e.g. `&amp;quot;` from escaping twice).
    expect(html).not.toContain('&amp;quot;');
    expect(html).not.toContain('&amp;lt;');
    expect(html).not.toContain('&amp;amp;');
  });

  it('renders inline code with quotes/angle brackets/ampersands as literal characters exactly once', () => {
    const html = render('before `"q" <t> a & b` after');
    expect(html).toContain('<code>&quot;q&quot; &lt;t&gt; a &amp; b</code>');
    expect(html).not.toContain('&amp;quot;');
    expect(html).not.toContain('&amp;lt;');
    expect(html).not.toContain('&amp;amp;');
  });

  it('drops javascript: link hrefs, rendering the link text with no href', () => {
    const html = render('[x](javascript:alert(1))');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('href');
    expect(html).toContain('>x<');
  });

  it('keeps safe http(s)/relative/hash hrefs', () => {
    expect(render('[a](https://example.com)')).toContain('href="https://example.com"');
    expect(render('[a](/local/path)')).toContain('href="/local/path"');
    expect(render('[a](#anchor)')).toContain('href="#anchor"');
  });

  it('renders raw block HTML as literal escaped text — never executed, never dropped', () => {
    const html = render('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('renders raw inline HTML (e.g. an onerror image tag) as literal escaped text', () => {
    const html = render('before <img src=x onerror="alert(1)"> after');
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(html).not.toContain('<img');
  });

  it('renders headings, lists, blockquotes, strong/em, and tables', () => {
    expect(render('# Title')).toContain('<h1>Title</h1>');
    expect(render('- a\n- b')).toBe('<div><ul><li>a</li><li>b</li></ul></div>');
    expect(render('> quoted')).toContain('<blockquote><p>quoted</p></blockquote>');
    expect(render('**bold** and *em*')).toContain('<strong>bold</strong> and <em>em</em>');
    expect(render('| a | b |\n| - | - |\n| 1 | 2 |')).toContain('<table>');
  });

  it('falls back to the raw string when the lexer throws', () => {
    const lexerSpy = vi.spyOn(marked, 'lexer').mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(renderMarkdownNodes('# Heading', 'k')).toEqual(['# Heading']);
      expect(warnSpy).toHaveBeenCalledOnce();
    } finally {
      lexerSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });
});

describe('looksLikeMarkdown', () => {
  it('detects headings, lists, tables, fenced code, blockquotes, links, bold, and inline code', () => {
    expect(looksLikeMarkdown('# Heading')).toBe(true);
    expect(looksLikeMarkdown('- item one')).toBe(true);
    expect(looksLikeMarkdown('1. item one')).toBe(true);
    expect(looksLikeMarkdown('| a | b |')).toBe(true);
    expect(looksLikeMarkdown('```\ncode\n```')).toBe(true);
    expect(looksLikeMarkdown('> a quote')).toBe(true);
    expect(looksLikeMarkdown('see [here](https://example.com)')).toBe(true);
    expect(looksLikeMarkdown('this is **bold**')).toBe(true);
    expect(looksLikeMarkdown('this is __bold__ too')).toBe(true);
    expect(looksLikeMarkdown('run `some code`')).toBe(true);
  });

  it('does not false-positive on plain prose or logs', () => {
    expect(looksLikeMarkdown('Hello, this is a plain sentence.')).toBe(false);
    expect(looksLikeMarkdown('2026-07-08T12:00:00Z INFO starting up')).toBe(false);
    expect(looksLikeMarkdown('Error: file not found at /tmp/x - retrying')).toBe(false);
    expect(looksLikeMarkdown('a * b * c is not emphasis')).toBe(false);
  });
});
