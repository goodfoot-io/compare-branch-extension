/**
 * Orphaned `isMeta` supplemental-content row for the expanded transcript.
 *
 * An `isMeta: true` user message (e.g. full skill instructions echoed back)
 * normally merges into the `ToolAccordion` of the tool it annotates via
 * `sourceToolUseID`. When that tool never reaches a render site — or the
 * message carries no `sourceToolUseID` at all — the content would otherwise
 * be silently dropped. This row surfaces it standalone instead, auto-detecting
 * JSON vs. markdown vs. plain text.
 *
 * @summary Standalone disclosure for orphaned isMeta injection content
 * @module components/expanded/messages/SupplementalContentRow
 */

import type React from 'react';
import { ExpandableRow } from '../../../../../lib/accordions';
import { JsonBlock } from '../../../../../lib/JsonBlock';
import { looksLikeMarkdown, renderMarkdownNodes } from '../../../../../lib/markdown';

/** Sentinel returned by {@link tryParseJson} when `text` does not parse as JSON. */
const NOT_JSON = Symbol('not-json');

/**
 * Attempts to parse `text` as JSON. A parse failure is an expected, common
 * outcome here (most injected content is prose, not JSON), so it resolves to
 * the {@link NOT_JSON} sentinel rather than throwing or logging.
 * @param text - Candidate text to parse.
 * @returns The parsed value, or {@link NOT_JSON} when `text` is not valid JSON.
 */
function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return NOT_JSON;
  }
}

interface SupplementalContentRowProps {
  /** The injected text content to disclose. */
  text: string;
}

/**
 * Renders an orphaned isMeta injection as a labeled, collapsed-by-default
 * disclosure that expands to its content, auto-detected as JSON, markdown, or
 * plain text.
 * @param root0 - The component props.
 * @param root0.text - The injected text content to disclose.
 * @returns Rendered supplemental-content disclosure row.
 */
export function SupplementalContentRow({ text }: SupplementalContentRowProps): React.ReactElement {
  const header = (
    <span
      className="overflow-hidden text-ellipsis whitespace-nowrap"
      style={{ color: 'var(--stream-fg-muted)', fontSize: 'var(--stream-text-label)' }}
    >
      Supplemental content
    </span>
  );

  const trimmed = text.trim();
  let body: React.ReactElement;
  const parsed = trimmed.startsWith('{') || trimmed.startsWith('[') ? tryParseJson(trimmed) : NOT_JSON;
  if (parsed !== NOT_JSON) {
    body = <JsonBlock value={parsed} />;
  } else if (looksLikeMarkdown(text)) {
    body = (
      <div
        className="cc-text aui-markdown pb-1.5 break-words overflow-wrap-anywhere min-w-0 max-w-full"
        style={{ fontSize: 'var(--stream-text-code)' }}
      >
        {renderMarkdownNodes(text, 'supplemental')}
      </div>
    );
  } else {
    body = (
      <div
        className="whitespace-pre-wrap break-words pb-1.5 font-vscode-editor"
        style={{ color: 'var(--stream-fg)', fontSize: 'var(--stream-text-code)' }}
      >
        {text}
      </div>
    );
  }

  return <ExpandableRow header={header}>{body}</ExpandableRow>;
}
