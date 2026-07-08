/**
 * Claude-specific wrapper around the shared, provider-neutral tool accordion.
 *
 * Keeps the same module path and export name (`ToolAccordion`) as before the
 * lift so `MessageRouter.tsx`'s referential `node.type === ToolAccordion`
 * tool-run grouping check keeps working unchanged. This wrapper owns every
 * Claude-specific concern — preview summarization, hook-driven escalation,
 * the Skill input-hiding rule, and nesting the {@link HookSection} footer —
 * then delegates all rendering to the shared `ToolAccordion`.
 *
 * @summary Claude wrapper: computes preview/escalation/footer, renders the shared accordion
 * @module components/accordions/ToolAccordion
 */

import type React from 'react';
import { ToolAccordion as SharedToolAccordion, type ToolSeverity } from '../../../../lib/accordions';
import { truncate } from '../../../../lib/markdown';
import type { AttachmentPayload, HookBlockingErrorAttachment } from '../../lib/parse-session';
import { summarizeTool } from '../../lib/tool-summary';
import { HookSection } from './HookSection';

/** Input keys skipped in the tool input table (shown elsewhere or redundant). */
const SKIP_INPUT_KEYS = new Set([
  'description',
  'timeout',
  'dangerouslyDisableSandbox',
  'run_in_background',
  'saveAllEditors',
  'summary'
]);

interface ToolAccordionProps {
  /** Name of the tool that was called. */
  toolName: string;
  /** Tool input object (may be empty). */
  input: Record<string, unknown>;
  /** Tool result string (may be null if no result yet). */
  result: string | null;
  /** Supplemental result from isMeta injection (e.g. skill content). Replaces result when present. */
  supplementalResult?: string | null;
  /** Hook attachments that fired for this tool, nested inside the body. */
  hooks?: AttachmentPayload[];
}

/**
 * Finds the first `hook_blocking_error` among a tool's hooks, if any.
 * Drives the collapsed-header escalation (rule 5): a blocking error tints the
 * row to errorForeground and surfaces the offending hook name even when closed.
 * @param hooks - Hook attachments for the tool.
 * @returns The blocking-error hook, or undefined when none blocked.
 */
function findBlockingHook(hooks: AttachmentPayload[] | undefined): HookBlockingErrorAttachment | undefined {
  return hooks?.find((h): h is HookBlockingErrorAttachment => h.type === 'hook_blocking_error');
}

/**
 * Collapsible accordion for a tool use + result pair.
 * @param root0 - The component props.
 * @param root0.toolName - Name of the tool that was called.
 * @param root0.input - Tool input object (may be empty).
 * @param root0.result - Tool result string (may be null if no result yet).
 * @param root0.supplementalResult - Supplemental result from isMeta injection (e.g. skill content). Replaces result when present.
 * @param root0.hooks - Hook attachments that fired for this tool, nested inside the body.
 * @returns Rendered collapsible tool accordion element.
 */
export function ToolAccordion({
  toolName,
  input,
  result,
  supplementalResult,
  hooks
}: ToolAccordionProps): React.ReactElement {
  const blockingHook = findBlockingHook(hooks);
  const severity: ToolSeverity = blockingHook !== undefined ? 'error' : 'normal';
  const errorLabel = blockingHook !== undefined ? `✗ blocked by ${blockingHook.hookName}` : undefined;

  // Build preview string from summarizeTool or first input value
  let summary = summarizeTool(toolName, input);
  if (!summary) {
    const entries = Object.entries(input);
    if (entries.length > 0) {
      const [, firstVal] = entries[0] as [string, unknown];
      const valStr = typeof firstVal === 'string' ? firstVal : JSON.stringify(firstVal);
      summary = truncate(valStr, 60);
    }
  }

  return (
    <SharedToolAccordion
      toolName={toolName}
      summary={summary}
      input={input}
      inputSkipKeys={SKIP_INPUT_KEYS}
      hideInput={toolName === 'Skill'}
      result={supplementalResult ?? result}
      severity={severity}
      errorLabel={errorLabel}
      footer={hooks !== undefined && hooks.length > 0 ? <HookSection hooks={hooks} /> : undefined}
    />
  );
}
