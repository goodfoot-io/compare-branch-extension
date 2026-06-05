/**
 * Pure classifier for attachment payloads.
 *
 * Converts a parsed `AttachmentPayload` into an `AttachmentDescriptor` that
 * encodes the render-or-hide decision, scope, tier, glyph, summary, and
 * linkPath without any React dependency. Presenters consume the descriptor
 * and apply styling — all meaning is derived here.
 *
 * @summary Pure render-or-hide classifier for attachment payloads
 * @module lib/classify-attachment
 */

import type { AttachmentPayload } from './parse-session.js';

// ============================================================================
// Descriptor types — the load-bearing classifier contract
// ============================================================================

/**
 * Placement scope for an attachment row.
 *
 * - `'tool'`    — rendered inside the ToolAccordion that owns the toolUseID.
 * - `'turn'`    — rendered as a standalone row in the turn timeline.
 * - `'session'` — rendered as a session-level boundary marker.
 */
export type AttachmentScope = 'tool' | 'turn' | 'session';

/**
 * Visual weight tier within the expanded transcript.
 *
 * - `'content'`  — full-weight row; shown by default alongside tool rows.
 * - `'ambient'`  — muted row; grouped into an AmbientGroup when consecutive.
 */
export type AttachmentTier = 'content' | 'ambient';

/**
 * Severity level for the row's left-edge glyph.
 *
 * - `'neutral'`  — informational; no color.
 * - `'warning'`  — non-blocking problem; uses `warningForeground`.
 * - `'error'`    — blocking or fatal problem; uses `errorForeground`.
 */
export type AttachmentGlyphSeverity = 'neutral' | 'warning' | 'error';

/**
 * The output of `classifyAttachment` — everything the presenter needs to
 * render or hide a single attachment row without re-deriving meaning.
 *
 * @summary Classifier output consumed by AttachmentRouter and its presenters
 */
export interface AttachmentDescriptor {
  /**
   * Discriminator copied from `attachment.type`; used by `AttachmentRouter`
   * to pick a presenter.  Unknown types produce `'__unknown__'` so the router
   * maps them to `RawJsonFallback`.
   */
  kind: string;
  /** Placement scope for this row. */
  scope: AttachmentScope;
  /** Visual weight tier within the turn timeline. */
  tier: AttachmentTier;
  /**
   * Collapsed one-line summary, already interpolated
   * (e.g. `"Memory · CLAUDE.md"`).
   */
  summary: string;
  /**
   * Left-edge glyph character or short text-tag
   * (e.g. `'✓'`, `'!'`, `'✗'`, `'○'`, `'·'`, `'context'`).
   * Absent when the type has no designated glyph.
   */
  glyph?: string;
  /** Severity driving the glyph color token. */
  glyphSeverity: AttachmentGlyphSeverity;
  /**
   * When `true`, render nothing for this attachment.
   * The fail-closed hide decision lives here — a hide fires only when its
   * emptiness condition is provably met; any populated payload renders.
   */
  hidden: boolean;
  /**
   * For `scope === 'tool'`: the `toolUseID` to nest this row under.
   * Undefined for all other scopes.
   */
  toolUseID?: string;
  /**
   * Workspace-relative path to linkify in the summary
   * (`displayPath ?? filename`).  Absent when no path is available or
   * relevant.
   */
  linkPath?: string;
  /**
   * `true` when the row has an expandable body (e.g. hook stdout, file
   * snippet, memory content).  `false` for leaf rows with no body.
   */
  expandable: boolean;
}

// ============================================================================
// Classifier stub — Phase 3 implements this
// ============================================================================

/**
 * Classifies a parsed attachment payload into an `AttachmentDescriptor`.
 *
 * Decides: scope, tier, glyph/severity, one-line summary, hide predicate,
 * toolUseID, linkPath, and expandability.  Unknown `attachment.type` values
 * return a descriptor with `kind: '__unknown__'` so `AttachmentRouter` maps
 * them to `RawJsonFallback`.
 *
 * @param _attachment - Parsed attachment payload from a JSONL line.
 * @returns Descriptor encoding the render-or-hide decision and all metadata.
 * @throws {Error} Always — implementation is pending (Phase 3).
 *
 * @summary Pure render-or-hide classifier; stub throws until Phase 3
 */
export function classifyAttachment(_attachment: AttachmentPayload): AttachmentDescriptor {
  throw new Error('Not Implemented');
}
