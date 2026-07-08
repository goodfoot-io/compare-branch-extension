/**
 * Coordination message line for the expanded transcript.
 *
 * Renders JSON and XML machine-generated content blocks (e.g. team messages,
 * idle notifications) as compact dimmed lines, suppressing idle_notification
 * entries. Shared by both UserTurn and AssistantTurn to avoid duplication.
 *
 * @summary JSON/XML coordination message display (deduplicated)
 * @module components/expanded/messages/CoordinationLine
 */

import type React from 'react';
import { stripMarkup } from '../../../../../lib/markdown';

/** Return type for `classifyCoordination`. */
export interface CoordinationResult {
  /** Rendered React nodes, or empty array if nothing to render. */
  nodes: React.ReactElement[];
}

/**
 * Renders a single coordination line: a muted, left-bordered one-liner in the
 * shared `.stream-status-line` idiom.
 * @param key - React key for the element.
 * @param text - The line's display text.
 * @returns A rendered coordination line element.
 */
function coordinationLine(key: string, text: string): React.ReactElement {
  return (
    <div
      key={key}
      className="stream-status-line text-[11px] py-0.5 pl-2"
      style={{
        color: 'var(--stream-fg-muted)',
        borderLeft: '2px solid color-mix(in srgb, var(--stream-fg) 15%, transparent)'
      }}
    >
      {text}
    </div>
  );
}

/**
 * Reduces a parsed coordination payload to its display text: `"{from}: {type}"`
 * when either is present, otherwise a truncated preview of the raw source.
 * @param parsed - The parsed JSON payload.
 * @param raw - The original raw text, for the truncated-preview fallback.
 * @returns Display text for the coordination line.
 */
function summarizeParsed(parsed: Record<string, unknown>, raw: string): string {
  const parts: string[] = [];
  if (typeof parsed['from'] === 'string') parts.push(parsed['from']);
  if (parsed['type'] !== undefined) parts.push(String(parsed['type']).replace(/_/g, ' '));
  return parts.length > 0 ? parts.join(': ') : `${raw.slice(0, 80)}…`;
}

/**
 * Classifies and renders a single text block that may be machine-generated
 * coordination content (JSON or XML).
 *
 * Returns an array of React elements to append to the transcript, which may
 * be empty if the content should be suppressed (e.g. idle_notification).
 *
 * @param raw - Raw text content of the block
 * @param keyPrefix - Unique key prefix for React elements
 * @returns Array of React elements to render for this coordination block, empty if suppressed.
 */
export function classifyCoordination(raw: string, keyPrefix: string): React.ReactElement[] {
  if (/^\s*[{[]/.test(raw)) {
    // JSON coordination message
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed['type'] === 'idle_notification') return [];
      return [coordinationLine(keyPrefix, summarizeParsed(parsed, raw))];
    } catch {
      const text = raw.slice(0, 120) + (raw.length > 120 ? '…' : '');
      return [coordinationLine(keyPrefix, text)];
    }
  }

  if (/^\s*</.test(raw)) {
    // XML coordination message — extract inner content per element
    const result: React.ReactElement[] = [];
    let processedAny = false;
    let idx = 0;
    for (const match of raw.matchAll(/<[^/][^>]*>([\s\S]*?)<\/[^>]+>/g)) {
      processedAny = true;
      const innerRaw = match[1];
      if (innerRaw === undefined) continue;
      const inner = innerRaw.trim();
      if (!inner) continue;

      if (/^\s*\{/.test(inner)) {
        try {
          const parsed = JSON.parse(inner) as Record<string, unknown>;
          if (parsed['type'] === 'idle_notification') {
            idx++;
            continue;
          }
          result.push(coordinationLine(`${keyPrefix}-${idx}`, summarizeParsed(parsed, inner)));
        } catch {
          const text = inner.length > 120 ? `${inner.slice(0, 120)}…` : inner;
          result.push(coordinationLine(`${keyPrefix}-${idx}`, text));
        }
      } else {
        const text = inner.length > 120 ? `${inner.slice(0, 120)}…` : inner;
        result.push(coordinationLine(`${keyPrefix}-${idx}`, text));
      }
      idx++;
    }

    if (!processedAny) {
      const stripped = stripMarkup(raw).trim();
      if (stripped.length > 0) {
        const text = stripped.length > 120 ? `${stripped.slice(0, 120)}…` : stripped;
        return [coordinationLine(keyPrefix, text)];
      }
    }

    return result;
  }

  // Not coordination content — caller handles as human text
  return [];
}

/**
 * Returns true if the given raw text looks like machine-generated coordination
 * content (JSON or XML).
 * @param raw - Raw text to classify.
 * @returns True if the text starts with JSON or XML markers.
 */
export function isCoordinationContent(raw: string): boolean {
  return /^\s*[{[]/.test(raw) || /^\s*</.test(raw);
}
