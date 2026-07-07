/**
 * Markdown rendering utilities for the codex-session stream renderer.
 *
 * Mirrors the claude-code-session renderer's `marked`-backed HTML renderer
 * (`lib/markdown.ts`) so Codex user/assistant/reasoning text gets the same
 * headings/lists/tables treatment instead of showing raw markdown source.
 *
 * @summary Markdown-to-React-node conversion for Codex message text
 * @module lib/markdown
 */

import { marked } from 'marked';
import { createElement, type ReactNode } from 'react';

/**
 * Escapes HTML special characters to prevent XSS in raw string insertion.
 * @param text - Raw text to escape.
 * @returns HTML-escaped string safe for insertion into HTML.
 */
export function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Renders markdown text to HTML. Uses `marked` when available, falls back
 * to `escapeHtml` + `<br>` for newlines.
 * @param text - Markdown source text.
 * @returns HTML string rendered from the markdown input.
 */
export function renderMarkdown(text: string): string {
  try {
    const result = marked.parse(escapeHtml(String(text)), { async: false, breaks: true });
    if (typeof result === 'string') return result;
  } catch (error) {
    console.warn('renderMarkdown: marked.parse failed, using fallback', error);
  }
  return escapeHtml(String(text)).replace(/\n/g, '<br>');
}

/**
 * Renders markdown text to React nodes without `dangerouslySetInnerHTML`.
 * Parsed HTML is reconstructed through a small DOM whitelist.
 * @param text - Markdown source text.
 * @param keyPrefix - Stable prefix for React keys.
 * @returns React nodes representing the rendered markdown.
 */
export function renderMarkdownNodes(text: string, keyPrefix: string): ReactNode[] {
  if (typeof DOMParser === 'undefined') {
    return [String(text)];
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(`<body>${renderMarkdown(text)}</body>`, 'text/html');
  return Array.from(document.body.childNodes)
    .map((node, index) => domNodeToReact(node, `${keyPrefix}-${index}`))
    .filter((node): node is ReactNode => node !== null);
}

function domNodeToReact(node: Node, key: string): ReactNode | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();
  const children = Array.from(element.childNodes)
    .map((child, index) => domNodeToReact(child, `${key}-${index}`))
    .filter((child): child is ReactNode => child !== null);
  const props: Record<string, unknown> = { key };

  switch (tagName) {
    case 'a': {
      const href = element.getAttribute('href');
      if (href && isSafeHref(href)) {
        props['href'] = href;
      }
      break;
    }
    case 'code':
    case 'pre':
    case 'p':
    case 'em':
    case 'strong':
    case 'ul':
    case 'ol':
    case 'li':
    case 'blockquote':
    case 'br':
      break;
    default:
      return children.length > 0 ? createElement('span', props, ...children) : null;
  }

  return createElement(tagName, props, ...children);
}

function isSafeHref(href: string): boolean {
  return /^(https?:|file:|\/|#)/.test(href);
}
