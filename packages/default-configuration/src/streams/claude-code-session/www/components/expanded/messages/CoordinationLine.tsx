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
import { stripMarkup } from '../../../lib/markdown';

/** Return type for `classifyCoordination`. */
export interface CoordinationResult {
  /** Rendered React nodes, or empty array if nothing to render. */
  nodes: React.ReactElement[];
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
      const parts: string[] = [];
      if (typeof parsed['from'] === 'string') parts.push(parsed['from']);
      if (parsed['type'] !== undefined) parts.push(String(parsed['type']).replace(/_/g, ' '));
      const text = parts.length > 0 ? parts.join(': ') : `${raw.slice(0, 80)}…`;
      return [
        <div key={keyPrefix} className="text-[0.8em] text-vscode-descriptionForeground italic py-0.5">
          {text}
        </div>
      ];
    } catch {
      const text = raw.slice(0, 120) + (raw.length > 120 ? '…' : '');
      return [
        <div key={keyPrefix} className="text-[0.8em] text-vscode-descriptionForeground italic py-0.5">
          {text}
        </div>
      ];
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
          const parts: string[] = [];
          if (typeof parsed['from'] === 'string') parts.push(parsed['from']);
          if (parsed['type'] !== undefined) parts.push(String(parsed['type']).replace(/_/g, ' '));
          const text = parts.length > 0 ? parts.join(': ') : `${inner.slice(0, 80)}…`;
          result.push(
            <div key={`${keyPrefix}-${idx}`} className="text-[0.8em] text-vscode-descriptionForeground italic py-0.5">
              {text}
            </div>
          );
        } catch {
          const text = inner.length > 120 ? `${inner.slice(0, 120)}…` : inner;
          result.push(
            <div key={`${keyPrefix}-${idx}`} className="text-[0.8em] text-vscode-descriptionForeground italic py-0.5">
              {text}
            </div>
          );
        }
      } else {
        const text = inner.length > 120 ? `${inner.slice(0, 120)}…` : inner;
        result.push(
          <div key={`${keyPrefix}-${idx}`} className="text-[0.8em] text-vscode-descriptionForeground italic py-0.5">
            {text}
          </div>
        );
      }
      idx++;
    }

    if (!processedAny) {
      const stripped = stripMarkup(raw).trim();
      if (stripped.length > 0) {
        const text = stripped.length > 120 ? `${stripped.slice(0, 120)}…` : stripped;
        return [
          <div key={keyPrefix} className="text-[0.8em] text-vscode-descriptionForeground italic py-0.5">
            {text}
          </div>
        ];
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
