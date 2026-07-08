/**
 * Hooks subsection rendered inside a ToolAccordion body.
 *
 * Lists the `hook_*` attachments that fired for one tool, grouped by
 * `hookEvent` (PreToolUse before PostToolUse). Each row is the shared
 * {@link HookRow}, so a nested hook and a standalone orphan hook render
 * identically — glyph, summary, and the same in-place expandable body (a
 * labeled disclosure like ToolResult, never a third-generation accordion).
 * This enforces the two-level nesting cap: ToolAccordion → hook body, no
 * deeper.
 *
 * @summary Grouped in-place hook rows inside a tool accordion (two-level cap)
 * @module components/accordions/HookSection
 */

import type React from 'react';
import type { AttachmentPayload } from '../../lib/parse-session';
import { HookRow } from './HookRow';

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
 * Reads the `hookEvent` discriminator off a hook payload for grouping.
 * @param hook - A hook attachment payload.
 * @returns The hookEvent string, or empty when absent.
 */
function hookEventOf(hook: AttachmentPayload): string {
  return (hook as { hookEvent?: string }).hookEvent ?? '';
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
        borderTop: '0.5px solid var(--stream-border-subtle)',
        background: 'color-mix(in srgb, var(--stream-fg) 3%, transparent)'
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
