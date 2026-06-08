/**
 * Single hook row shared by nested and orphan hook presentations.
 *
 * Renders one `hook_*` attachment as a glyph + summary line with an in-place
 * expandable body when the hook carries one — used both inside a tool's
 * {@link HookSection} (nested) and as a standalone {@link OrphanHookRow}
 * (when no tool was rendered for the hook). Factoring the row into one
 * component keeps both paths at parity: an orphan `hook_blocking_error`
 * reveals the same `blockingError.blockingError` + `command` body a nested one
 * does, and the escalation styling is identical.
 *
 * Glyph and summary derive from the pure {@link classifyAttachment} classifier.
 * Color rides the glyph only: `!` (non-blocking) uses `editorWarning`, `✗`
 * (blocking) uses `errorForeground`; `✓`/`○` stay neutral. A
 * `hook_blocking_error` escalates the whole row to the `errorForeground`
 * variant with a left border. Bodies expand in place via a plain disclosure
 * (no nested accordion), holding the two-level nesting cap.
 *
 * Text-tag hooks (`context` / `message`) render the tag as a styled glyph and
 * drop the duplicated leading `{tag} · ` from the summary so the row reads the
 * tag once.
 *
 * @summary Shared single hook row (glyph + summary + in-place body) for nested and orphan use
 * @module components/accordions/HookRow
 */

import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import { type AttachmentGlyphSeverity, classifyAttachment } from '../../lib/classify-attachment';
import type {
  AttachmentPayload,
  HookAdditionalContextAttachment,
  HookBlockingErrorAttachment,
  HookNonBlockingErrorAttachment,
  HookSuccessAttachment,
  HookSystemMessageAttachment
} from '../../lib/parse-session';

/** Glyphs that are short text tags rather than symbols. */
const TEXT_TAG_GLYPHS = new Set<string>(['context', 'message']);

/**
 * Maps a classifier glyph severity to its VS Code theme color token.
 * Only `warning` and `error` carry color; neutral glyphs inherit foreground.
 * @param severity - Glyph severity from the classifier descriptor.
 * @returns A CSS color value, or undefined for neutral.
 */
function glyphColor(severity: AttachmentGlyphSeverity): string | undefined {
  if (severity === 'warning') return 'var(--vscode-editorWarning-foreground, #cca700)';
  if (severity === 'error') return 'var(--vscode-errorForeground)';
  return undefined;
}

/**
 * Extracts the expandable body text for a hook payload, if any.
 * Reads only the fields relevant per subtype: stdout/stderr/content for run
 * hooks, the nested blockingError string plus its command for blocking errors.
 * @param hook - A hook attachment payload.
 * @returns Joined body text, or null when the hook has no body.
 */
export function hookBodyText(hook: AttachmentPayload): string | null {
  switch (hook.type) {
    case 'hook_success': {
      const h = hook as HookSuccessAttachment;
      const parts = [h.stdout, h.stderr, h.content].filter((p): p is string => typeof p === 'string' && p.length > 0);
      return parts.length > 0 ? parts.join('\n') : null;
    }
    case 'hook_non_blocking_error': {
      const h = hook as HookNonBlockingErrorAttachment;
      const parts = [h.stderr, h.stdout].filter((p): p is string => typeof p === 'string' && p.length > 0);
      return parts.length > 0 ? parts.join('\n') : null;
    }
    case 'hook_additional_context': {
      const h = hook as HookAdditionalContextAttachment;
      const content = h.content;
      return Array.isArray(content) && content.length > 0 ? content.join('\n') : null;
    }
    case 'hook_system_message': {
      const h = hook as HookSystemMessageAttachment;
      return typeof h.content === 'string' && h.content.length > 0 ? h.content : null;
    }
    case 'hook_blocking_error': {
      const h = hook as HookBlockingErrorAttachment;
      const reason = h.blockingError?.blockingError;
      const command = h.blockingError?.command;
      const parts = [reason, command].filter((p): p is string => typeof p === 'string' && p.length > 0);
      return parts.length > 0 ? parts.join('\n\n') : null;
    }
    default:
      return null;
  }
}

interface HookRowProps {
  /** The hook attachment to render as a single row. */
  hook: AttachmentPayload;
}

/**
 * Renders a single hook row: glyph + summary, with an in-place expandable body
 * when the hook carries one. A `hook_blocking_error` escalates the row to the
 * `errorForeground` variant with a left border. Plain disclosure (no nested
 * accordion) keeps the two-level cap. Shared by {@link HookSection} (nested)
 * and {@link OrphanHookRow} (standalone) so both stay at parity.
 * @param root0 - The component props.
 * @param root0.hook - The hook attachment to render.
 * @returns Rendered hook row element.
 */
export function HookRow({ hook }: HookRowProps): React.ReactElement {
  const descriptor = classifyAttachment(hook);
  const body = hookBodyText(hook);
  const hasBody = body !== null;
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(() => {
    if (!hasBody) return;
    setOpen((prev) => {
      const next = !prev;
      if (next && bodyRef.current) {
        const el = bodyRef.current;
        el.style.opacity = '0';
        requestAnimationFrame(() => {
          el.style.opacity = '1';
        });
      }
      return next;
    });
  }, [hasBody]);

  const isBlocking = descriptor.kind === 'hook_blocking_error';
  const isTextTag = descriptor.glyph !== undefined && TEXT_TAG_GLYPHS.has(descriptor.glyph);

  // A text-tag hook (`context` / `message`) carries its tag word as the glyph;
  // its summary is `"{tag} · {hookName}"`. Render the tag once by stripping the
  // duplicated `"{tag} · "` prefix from the summary, leaving just the hook name.
  const summaryText =
    isTextTag && descriptor.glyph && descriptor.summary.startsWith(`${descriptor.glyph} · `)
      ? descriptor.summary.slice(descriptor.glyph.length + 3)
      : descriptor.summary;

  const color = glyphColor(descriptor.glyphSeverity);
  const glyphNode = descriptor.glyph ? (
    <span className="shrink-0" style={color ? { color } : undefined}>
      {descriptor.glyph}
    </span>
  ) : null;

  const headerRow = (
    <span className="flex items-center gap-2 flex-1 overflow-hidden">
      {glyphNode}
      <span className="overflow-hidden text-ellipsis whitespace-nowrap">{summaryText}</span>
    </span>
  );

  const wrapperStyle: React.CSSProperties = isBlocking
    ? { color: 'var(--vscode-errorForeground)', borderLeft: '2px solid var(--vscode-errorForeground)' }
    : { color: 'var(--vscode-foreground)' };

  if (!hasBody) {
    return (
      <div className="flex items-center gap-2 w-full font-vscode text-[11px] py-0.5 px-2" style={wrapperStyle}>
        {headerRow}
      </div>
    );
  }

  return (
    <div className="px-2" style={isBlocking ? wrapperStyle : undefined}>
      <button
        type="button"
        aria-expanded={open}
        onClick={handleToggle}
        className="flex items-center gap-2 w-full text-left bg-transparent border-none font-vscode text-[11px] cursor-pointer py-0.5"
        style={isBlocking ? { color: 'var(--vscode-errorForeground)' } : { color: 'var(--vscode-foreground)' }}
      >
        {headerRow}
        <span
          className="cc-chevron shrink-0"
          style={{ color: 'var(--vscode-disabledForeground)', transform: open ? 'rotate(90deg)' : undefined }}
        >
          ▷
        </span>
      </button>
      <div
        ref={bodyRef}
        className="cc-accordion-body"
        style={{ display: open ? 'block' : 'none', opacity: open ? 1 : 0, transition: 'opacity 0.1s ease' }}
      >
        <div className="text-[11px] text-vscode-foreground font-vscode-editor whitespace-pre-wrap break-words pb-1.5">
          {body}
        </div>
      </div>
    </div>
  );
}
