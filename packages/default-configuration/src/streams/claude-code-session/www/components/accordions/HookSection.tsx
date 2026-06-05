/**
 * Hooks subsection rendered inside a ToolAccordion body.
 *
 * Lists the `hook_*` attachments that fired for one tool, grouped by
 * `hookEvent` (PreToolUse before PostToolUse), each row deriving its glyph and
 * summary from the pure {@link classifyAttachment} classifier. A row with body
 * content (stdout / stderr / content / blockingError) expands that body
 * **in place** — a labeled disclosure like ToolResult, never a third-generation
 * accordion. This enforces the two-level nesting cap: ToolAccordion → hook body,
 * and no deeper.
 *
 * Color rides the glyph only: `!` (non-blocking) uses `editorWarning`, `✗`
 * (blocking) uses `errorForeground`; `✓` success and `○` cancelled stay
 * neutral. Body text is always monochrome.
 *
 * @summary Grouped in-place hook rows inside a tool accordion (two-level cap)
 * @module components/accordions/HookSection
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

interface HookSectionProps {
  /** Hook attachments that fired for the owning tool, in arrival order. */
  hooks: AttachmentPayload[];
}

/** Ordering weight for hook events; PreToolUse renders before PostToolUse. */
const HOOK_EVENT_ORDER: Record<string, number> = {
  PreToolUse: 0,
  PostToolUse: 1
};

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
 * hooks, the nested blockingError string for blocking errors.
 * @param hook - A hook attachment payload.
 * @returns Joined body text, or null when the hook has no body.
 */
function hookBodyText(hook: AttachmentPayload): string | null {
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
      return h.blockingError?.blockingError ?? null;
    }
    default:
      return null;
  }
}

/**
 * Reads the `hookEvent` discriminator off a hook payload for grouping.
 * @param hook - A hook attachment payload.
 * @returns The hookEvent string, or empty when absent.
 */
function hookEventOf(hook: AttachmentPayload): string {
  return (hook as { hookEvent?: string }).hookEvent ?? '';
}

interface HookRowProps {
  /** The hook attachment to render as a single row. */
  hook: AttachmentPayload;
}

/**
 * Renders a single hook row: glyph + summary, with an in-place expandable body
 * when the hook carries one. Plain disclosure (no nested accordion) keeps the
 * two-level cap.
 * @param root0 - The component props.
 * @param root0.hook - The hook attachment to render.
 * @returns Rendered hook row element.
 */
function HookRow({ hook }: HookRowProps): React.ReactElement {
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

  const color = glyphColor(descriptor.glyphSeverity);
  const glyphNode = descriptor.glyph ? (
    <span className="shrink-0" style={color ? { color } : undefined}>
      {descriptor.glyph}
    </span>
  ) : null;

  const headerRow = (
    <span className="flex items-center gap-2 flex-1 overflow-hidden">
      {glyphNode}
      <span className="overflow-hidden text-ellipsis whitespace-nowrap">{descriptor.summary}</span>
    </span>
  );

  if (!hasBody) {
    return (
      <div
        className="flex items-center gap-2 w-full font-vscode text-[11px] py-0.5"
        style={{ color: 'var(--vscode-foreground)' }}
      >
        {headerRow}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={handleToggle}
        className="flex items-center gap-2 w-full text-left bg-transparent border-none font-vscode text-[11px] cursor-pointer py-0.5"
        style={{ color: 'var(--vscode-foreground)' }}
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

/**
 * Renders the Hooks subsection inside a tool accordion body. Hooks are stably
 * sorted by `hookEvent` (PreToolUse before PostToolUse) while preserving fire
 * order within each event.
 * @param root0 - The component props.
 * @param root0.hooks - Hook attachments that fired for the owning tool.
 * @returns Rendered Hooks subsection element.
 */
export function HookSection({ hooks }: HookSectionProps): React.ReactElement {
  const ordered = hooks
    .map((hook, index) => ({ hook, index }))
    .sort((a, b) => {
      const ea = HOOK_EVENT_ORDER[hookEventOf(a.hook)] ?? Number.MAX_SAFE_INTEGER;
      const eb = HOOK_EVENT_ORDER[hookEventOf(b.hook)] ?? Number.MAX_SAFE_INTEGER;
      return ea === eb ? a.index - b.index : ea - eb;
    })
    .map((entry) => entry.hook);

  // Build stable, collision-free keys from hook identity (type/event/name),
  // disambiguating identical rows with an occurrence counter rather than the
  // array index, so keys survive a hook being inserted earlier in the list.
  const seen = new Map<string, number>();
  const keyed = ordered.map((hook) => {
    const name = (hook as { hookName?: string }).hookName ?? '';
    const base = `hook-${hook.type}-${hookEventOf(hook)}-${name}`;
    const occurrence = seen.get(base) ?? 0;
    seen.set(base, occurrence + 1);
    return { hook, key: `${base}-${occurrence}` };
  });

  return (
    <div
      style={{
        borderTop: '0.5px solid var(--vscode-inlineChatInput-border, var(--vscode-editorWidget-border, #454545))',
        background: 'color-mix(in srgb, var(--vscode-foreground, #cccccc) 3%, transparent)'
      }}
    >
      <div className="text-[10px] text-vscode-descriptionForeground opacity-60 font-vscode-editor pt-1 pb-0.5 uppercase tracking-wider">
        Hooks
      </div>
      {keyed.map(({ hook, key }) => (
        <HookRow key={key} hook={hook} />
      ))}
    </div>
  );
}
