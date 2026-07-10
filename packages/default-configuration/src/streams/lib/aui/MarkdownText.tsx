/**
 * Shared GFM markdown text-part renderer for `MessagePrimitive.Content`'s
 * `Text` slot.
 *
 * Wraps `@assistant-ui/react-markdown`'s `MarkdownTextPrimitive` with
 * `remark-gfm` (tables, strikethrough, task lists) and the `.aui-markdown`
 * class tree (./aui.css), matching the existing `.cc-transcript`/`.cc-text`
 * visual treatment (heading ladder, tables, blockquote-as-aside, fenced code
 * blocks). No `SyntaxHighlighter` is configured, so code blocks render
 * through the primitive's built-in plain `<pre><code>` fallback rather than
 * shiki — the stream panel's CSP forbids WASM.
 *
 * @summary Shared GFM markdown text-part renderer (no syntax highlighting — CSP forbids WASM)
 * @module streams/lib/aui/MarkdownText
 */

import type { TextMessagePartComponent } from '@assistant-ui/react';
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown';
import type React from 'react';
import remarkGfm from 'remark-gfm';

/**
 * Renders a text message part as GFM markdown, styled by `.aui-markdown` in aui.css.
 * @returns Rendered markdown text element.
 */
export const MarkdownText: TextMessagePartComponent = (): React.ReactElement => (
  <MarkdownTextPrimitive className="aui-markdown" remarkPlugins={[remarkGfm]} />
);
