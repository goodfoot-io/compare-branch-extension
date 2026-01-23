/**
 * Type definitions for Compare Branch Extension hooks.
 *
 * This module provides:
 * - Hook input types (environment variable based)
 * - Hook event name union type
 * - Type helper for extracting input type from event name
 * @see documentation/issues-v2-planning/hook-based-workflow.md
 * @module
 */
/**
 * Hook event name literal union.
 *
 * All valid hook event names for Compare Branch Extension hooks.
 */
export type HookEventName = 'StartIssue' | 'EndIssue' | 'StartInterview' | 'EndInterview';
/**
 * All hook event names as a readonly array.
 *
 * Useful for iteration and validation.
 * @example
 * ```typescript
 * for (const eventName of HOOK_EVENT_NAMES) {
 *   console.log(`Supported hook: ${eventName}`);
 * }
 * ```
 */
export declare const HOOK_EVENT_NAMES: readonly ["StartIssue", "EndIssue", "StartInterview", "EndInterview"];
/**
 * Base input fields present in all hook inputs.
 *
 * Every hook receives these base fields providing execution context.
 * Hook-specific inputs extend this base with additional fields.
 * @example
 * ```typescript
 * const handleAnyHook = (input: BaseHookInput) => {
 *   console.log(`Issue: ${input.issueId}`);
 *   console.log(`Wrapper PID: ${input.executionWrapperPid}`);
 *   console.log(`IPC Socket: ${input.hookIpcSocket}`);
 * };
 * ```
 */
export interface BaseHookInput {
    /**
     * Unique identifier for the current issue.
     */
    issueId: string;
    /**
     * Process ID of the execution wrapper.
     */
    executionWrapperPid: number;
    /**
     * Path to the IPC socket for hook-to-wrapper communication.
     * Created by execution-wrapper.mjs for each hook process.
     */
    hookIpcSocket: string;
}
/**
 * Input for issue-level hooks (StartIssue, EndIssue).
 *
 * Uses only the base input fields - no task-specific context.
 */
export interface IssueHookInput extends BaseHookInput {
}
/**
 * Input for interview hooks (StartInterview, EndInterview).
 *
 * Uses only the base input fields - interviews are always interactive.
 */
export interface InterviewHookInput extends BaseHookInput {
}
/**
 * Input type for StartIssue hooks.
 */
export type StartIssueInput = IssueHookInput;
/**
 * Input type for EndIssue hooks.
 */
export type EndIssueInput = IssueHookInput;
/**
 * Input type for StartInterview hooks.
 */
export type StartInterviewInput = InterviewHookInput;
/**
 * Input type for EndInterview hooks.
 */
export type EndInterviewInput = InterviewHookInput;
/**
 * Discriminated union of all hook input types.
 *
 * Use this type when handling multiple hook types in a single handler
 * or when the hook type is not known statically.
 * @example
 * ```typescript
 * function handleHook(input: HookInput) {
 *   switch (input.hookEventName) {
 *     case 'StartIssue':
 *       console.log(`Issue: ${input.issueId}`);
 *       break;
 *     case 'StartInterview':
 *       console.log(`Interview for issue: ${input.issueId}`);
 *       break;
 *   }
 * }
 * ```
 */
export type HookInput = ({
    hookEventName: 'StartIssue';
} & StartIssueInput) | ({
    hookEventName: 'EndIssue';
} & EndIssueInput) | ({
    hookEventName: 'StartInterview';
} & StartInterviewInput) | ({
    hookEventName: 'EndInterview';
} & EndInterviewInput);
/**
 * Type helper for extracting input type from event name.
 *
 * @template T - The hook event name
 * @example
 * ```typescript
 * type StartIssueIn = HookInputForEvent<'StartIssue'>;
 * // StartIssueIn is StartIssueInput & { hookEventName: 'StartIssue' }
 * ```
 */
export type HookInputForEvent<T extends HookEventName> = Extract<HookInput, {
    hookEventName: T;
}>;
//# sourceMappingURL=types.d.ts.map