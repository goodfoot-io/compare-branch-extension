/**
 * Environment variable utilities for Compare Branch Extension hooks.
 *
 * Provides typed access to Compare Branch Extension's environment variables
 * and utilities for extracting hook input from the environment.
 *
 * ## Environment Variables
 *
 * The execution-wrapper sets these environment variables when running hooks:
 *
 * | Variable | Description | Available In |
 * |----------|-------------|--------------|
 * | `ISSUE_ID` | Unique issue identifier | All hooks |
 * | `TASK_ID` | Unique task identifier | Task hooks only |
 * | `EXECUTION_WRAPPER_PID` | Wrapper process ID | All hooks |
 * | `HOOK_IPC_SOCKET` | IPC socket path | All hooks |
 * | `INTERACTIVE_MODE` | "true" if interactive | Task hooks only |
 * @module
 */
import type { HookEventName, HookInputForEvent } from './types.js';
/**
 * Compare Branch Extension environment variable names.
 *
 * These are the environment variables that execution-wrapper.mjs sets when running hooks.
 */
export declare const COMPARE_BRANCH_ENV_VARS: {
  /**
   * Unique identifier for the current issue.
   * Available in all hooks.
   */
  readonly ISSUE_ID: 'ISSUE_ID';
  /**
   * Unique identifier for the current task.
   * Only available in task hooks (StartTask, EndTask).
   */
  readonly TASK_ID: 'TASK_ID';
  /**
   * Process ID of the execution wrapper.
   * Available in all hooks.
   */
  readonly EXECUTION_WRAPPER_PID: 'EXECUTION_WRAPPER_PID';
  /**
   * Path to the IPC socket for hook-to-wrapper communication.
   * Available in all hooks.
   */
  readonly HOOK_IPC_SOCKET: 'HOOK_IPC_SOCKET';
  /**
   * Whether the task is running in interactive mode.
   * Set to "true" if interactive, absent otherwise.
   * Only available in task hooks (StartTask, EndTask).
   */
  readonly INTERACTIVE_MODE: 'INTERACTIVE_MODE';
};
/**
 * Gets the issue ID from environment.
 *
 * @returns The issue ID
 * @throws Error if ISSUE_ID is not set
 * @example
 * ```typescript
 * const issueId = getIssueId();
 * console.log(`Processing issue: ${issueId}`);
 * ```
 */
export declare function getIssueId(): string;
/**
 * Gets the task ID from environment.
 *
 * @returns The task ID, or undefined if not set
 * @example
 * ```typescript
 * const taskId = getTaskId();
 * if (taskId) {
 *   console.log(`Processing task: ${taskId}`);
 * }
 * ```
 */
export declare function getTaskId(): string | undefined;
/**
 * Gets the execution wrapper PID from environment.
 *
 * @returns The execution wrapper process ID
 * @throws Error if EXECUTION_WRAPPER_PID is not set or invalid
 * @example
 * ```typescript
 * const pid = getExecutionWrapperPid();
 * console.log(`Wrapper PID: ${pid}`);
 * ```
 */
export declare function getExecutionWrapperPid(): number;
/**
 * Gets the IPC socket path from environment.
 *
 * @returns The IPC socket path
 * @throws Error if HOOK_IPC_SOCKET is not set
 * @example
 * ```typescript
 * const socketPath = getHookIpcSocket();
 * console.log(`IPC socket: ${socketPath}`);
 * ```
 */
export declare function getHookIpcSocket(): string;
/**
 * Checks if the current execution is in interactive mode.
 *
 * @returns true if INTERACTIVE_MODE is "true", false otherwise
 * @example
 * ```typescript
 * if (isInteractiveMode()) {
 *   // Show progress indicators
 * }
 * ```
 */
export declare function isInteractiveMode(): boolean;
/**
 * Extracts all environment variables into a typed input object based on hook type.
 *
 * This function reads environment variables and constructs the appropriate
 * typed input object for the specified hook event type.
 *
 * @template T - The hook event name
 * @param hookEventName - The type of hook being executed
 * @returns Typed input object with all relevant environment variables
 * @throws Error if required environment variables are missing
 * @example
 * ```typescript
 * // For a StartTask hook
 * const input = extractInput('StartTask');
 * console.log(input.taskId);  // TypeScript knows this exists
 * console.log(input.interactiveMode);  // TypeScript knows this is boolean
 *
 * // For a StartIssue hook
 * const issueInput = extractInput('StartIssue');
 * console.log(issueInput.issueId);  // TypeScript knows this exists
 * // issueInput.taskId  // TypeScript error - doesn't exist on IssueHookInput
 * ```
 */
export declare function extractInput<T extends HookEventName>(hookEventName: T): HookInputForEvent<T>;
//# sourceMappingURL=env.d.ts.map
