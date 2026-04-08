/**
 * Markdown rendering utilities for the claude-code-session stream renderer.
 *
 * Provides a `marked`-backed HTML renderer with an `escapeHtml` fallback,
 * plus `stripMarkup` for compact one-line display.
 *
 * @summary Markdown-to-HTML conversion and text sanitization helpers
 * @module lib/markdown
 */

import { marked } from 'marked';

/**
 * Escapes HTML special characters to prevent XSS in raw string insertion.
 * @param text - Raw text to escape
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
 * @param text - Markdown source text
 * @returns HTML string rendered from the markdown input.
 */
export function renderMarkdown(text: string): string {
  try {
    const result = marked.parse(String(text), { async: false, breaks: true });
    if (typeof result === 'string') return result;
  } catch (error) {
    console.warn('renderMarkdown: marked.parse failed, using fallback', error);
  }
  return escapeHtml(String(text)).replace(/\n/g, '<br>');
}

/**
 * Strips XML/HTML tags, markdown syntax, and collapses whitespace for
 * compact one-line display.
 * @param text - Raw text that may contain HTML/markdown
 * @returns Plain text with tags and markup removed, whitespace collapsed.
 */
export function stripMarkup(text: string): string {
  return String(text ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/`[^`]+`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Truncates a string to a given length, appending an ellipsis if truncated.
 * @param str - Source string
 * @param len - Maximum length (default: 80)
 * @returns Truncated string with ellipsis appended if it exceeded the limit.
 */
export function truncate(str: string, len = 80): string {
  const s = String(str ?? '');
  return s.length > len ? `${s.slice(0, len)}…` : s;
}

/**
 * Formats a tool input value as a truncated HTML string for display.
 * @param value - Tool input value (any JSON-serializable type)
 * @returns HTML-escaped, truncated string representation of the value.
 */
export function formatInputValue(value: unknown): string {
  if (value === null || value === undefined) return '<em>null</em>';
  if (typeof value === 'string') return escapeHtml(truncate(value, 200));
  return escapeHtml(truncate(JSON.stringify(value), 200));
}
