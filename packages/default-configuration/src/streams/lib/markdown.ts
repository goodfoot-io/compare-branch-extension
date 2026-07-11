/**
 * Markdown rendering utilities shared across the stream renderers.
 *
 * Renders markdown to React nodes by walking `marked`'s token tree directly
 * (never round-tripping through an HTML string), plus `stripMarkup` for
 * compact one-line display and `looksLikeMarkdown` for format detection.
 *
 * @summary Markdown-to-React-node conversion and text sanitization helpers
 * @module streams/lib/markdown
 */

import { marked, type Token, type Tokens } from 'marked';
import { createElement, type ReactNode } from 'react';

/**
 * Renders markdown text to React nodes by walking `marked`'s lexer token
 * tree. Raw HTML found in the source (a `html` token, block or inline) is
 * never parsed or injected — it is rendered as literal text so its content
 * stays visible without executing or being silently dropped. Link/image
 * hrefs are dropped (falling back to plain text/alt text) unless
 * {@link isSafeHref} allows the scheme.
 * @param text - Markdown source text.
 * @param keyPrefix - Stable prefix for React keys.
 * @returns React nodes representing the rendered markdown.
 */
export function renderMarkdownNodes(text: string, keyPrefix: string): ReactNode[] {
  const source = String(text);
  let tokens: Token[];
  try {
    tokens = marked.lexer(source, { breaks: true, gfm: true });
  } catch (error) {
    console.warn('renderMarkdownNodes: marked.lexer failed, using fallback', error);
    return [source];
  }
  return renderChildren(tokens, keyPrefix);
}

/**
 * Detects whether a text blob is likely to be markdown-formatted, so callers
 * can choose between markdown rendering and plain pre-wrapped text. Balances
 * against false positives on plain prose or logs by requiring a marker with
 * clear markdown syntax (not just a leading `-`/number, which prose and logs
 * commonly contain).
 * @param text - The text to test.
 * @returns True when the text appears to contain markdown formatting.
 */
export function looksLikeMarkdown(text: string): boolean {
  return (
    /^#{1,6}\s+\S/m.test(text) || // heading
    /^\s*(?:[-*+]|\d+\.)\s+\S/m.test(text) || // list item
    /^\s*\|.+\|\s*$/m.test(text) || // table row
    /^```/m.test(text) || // fenced code block
    /^\s*>\s+\S/m.test(text) || // blockquote
    /\[[^\]]+\]\([^)]+\)/.test(text) || // link
    /(?:\*\*[^*]+\*\*|__[^_]+__)/.test(text) || // bold
    /`[^`\n]+`/.test(text) // inline code
  );
}

/**
 * Strips XML/HTML tags, markdown syntax, and collapses whitespace for
 * compact one-line display.
 * @param text - Raw text that may contain HTML/markdown
 * @returns Plain text with tags and markup removed, whitespace collapsed.
 */
export function stripMarkup(text: string): string {
  return (
    String(text ?? '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
      // Unwrap code spans rather than deleting them — inline code in these
      // one-line previews is usually an identifier (a card id, a file name),
      // which is exactly the token the preview exists to show.
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim()
  );
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
 * Renders a list of `marked` tokens to React nodes. `text` tokens carrying
 * nested inline `tokens` (e.g. a plain line mixed with a link or emphasis)
 * are flattened into their parent's children rather than wrapped, matching
 * how `marked`'s own HTML renderer treats them.
 * @param tokens - Tokens to render, or undefined for none.
 * @param keyPrefix - Stable prefix for the React keys of this token list.
 * @returns Flattened React nodes for the given tokens.
 */
function renderChildren(tokens: Token[] | undefined, keyPrefix: string): ReactNode[] {
  if (!tokens) return [];
  const nodes: ReactNode[] = [];
  tokens.forEach((token, index) => {
    const key = `${keyPrefix}-${index}`;
    if (token.type === 'text' && token.tokens && token.tokens.length > 0) {
      nodes.push(...renderChildren(token.tokens, key));
      return;
    }
    const node = tokenToReact(token, key);
    if (node !== null) nodes.push(node);
  });
  return nodes;
}

/**
 * Converts a single `marked` token to a React node. Unknown/unhandled token
 * types fall back to their raw source text so content is never silently
 * dropped.
 * @param token - The token to convert.
 * @param key - Stable React key for this node.
 * @returns The rendered React node, or null when the token has no visible
 *   output (e.g. a link reference definition).
 */
function tokenToReact(token: Token, key: string): ReactNode | null {
  switch (token.type) {
    case 'space':
    case 'def':
      return null;
    case 'hr':
      return createElement('hr', { key });
    case 'br':
      return createElement('br', { key });
    case 'heading': {
      const tag = `h${Math.min(Math.max(Math.trunc(token.depth), 1), 6)}`;
      return createElement(tag, { key }, ...renderChildren(token.tokens, key));
    }
    case 'code':
      return createElement('pre', { key }, createElement('code', { key: `${key}-c` }, token.text));
    case 'codespan':
      return createElement('code', { key }, token.text);
    case 'blockquote':
      return createElement('blockquote', { key }, ...renderChildren(token.tokens, key));
    case 'list': {
      const tag = token.ordered ? 'ol' : 'ul';
      const props: Record<string, unknown> = { key };
      if (token.ordered && token.start !== '' && token.start !== 1) props['start'] = token.start;
      return createElement(
        tag,
        props,
        ...token.items.map((item: Tokens.ListItem, index: number) => tokenToReact(item, `${key}-${index}`))
      );
    }
    case 'list_item':
      return createElement('li', { key }, ...renderChildren(token.tokens, key));
    case 'checkbox':
      return createElement('input', { key, type: 'checkbox', checked: token.checked, disabled: true, readOnly: true });
    case 'paragraph':
      return createElement('p', { key }, ...renderChildren(token.tokens, key));
    case 'strong':
      return createElement('strong', { key }, ...renderChildren(token.tokens, key));
    case 'em':
      return createElement('em', { key }, ...renderChildren(token.tokens, key));
    case 'del':
      return createElement('del', { key }, ...renderChildren(token.tokens, key));
    case 'escape':
      return token.text;
    case 'link': {
      const props: Record<string, unknown> = { key };
      if (isSafeHref(token.href)) props['href'] = token.href;
      if (token.title) props['title'] = token.title;
      return createElement('a', props, ...renderChildren(token.tokens, key));
    }
    case 'image': {
      if (!isSafeHref(token.href)) return token.text;
      const props: Record<string, unknown> = { key, src: token.href, alt: token.text };
      if (token.title) props['title'] = token.title;
      return createElement('img', props);
    }
    case 'table': {
      const headerRow = createElement(
        'tr',
        { key: `${key}-h` },
        ...token.header.map((cell: Tokens.TableCell, index: number) =>
          createElement(
            'th',
            { key: `${key}-h${index}`, style: alignStyle(cell.align) },
            ...renderChildren(cell.tokens, `${key}-h${index}`)
          )
        )
      );
      const bodyRows = token.rows.map((row: Tokens.TableCell[], rowIndex: number) =>
        createElement(
          'tr',
          { key: `${key}-r${rowIndex}` },
          ...row.map((cell: Tokens.TableCell, cellIndex: number) =>
            createElement(
              'td',
              { key: `${key}-r${rowIndex}-${cellIndex}`, style: alignStyle(cell.align) },
              ...renderChildren(cell.tokens, `${key}-r${rowIndex}-${cellIndex}`)
            )
          )
        )
      );
      return createElement(
        'table',
        { key },
        createElement('thead', { key: `${key}-thead` }, headerRow),
        createElement('tbody', { key: `${key}-tbody` }, ...bodyRows)
      );
    }
    case 'html':
      // Raw HTML (block or inline) in the source: never parsed or injected —
      // shown as literal text so its content stays visible without executing.
      return token.text;
    case 'text':
      return token.text;
    default:
      // Unhandled/generic token types (custom extensions): fall back to raw
      // source text rather than silently dropping the content.
      return 'raw' in token && typeof token.raw === 'string' ? token.raw : null;
  }
}

function alignStyle(align: 'center' | 'left' | 'right' | null): Record<string, string> | undefined {
  return align ? { textAlign: align } : undefined;
}

function isSafeHref(href: string): boolean {
  return /^(https?:|file:|\/|#)/.test(href);
}
