/**
 * Hook configuration types for Cards V2 lifecycle events.
 *
 * Hooks allow external scripts to observe or react to card lifecycle events.
 * When a hook event fires, the configured script is executed with event-specific
 * JSON payload on stdin. Scripts can perform side effects like sending
 * notifications, updating external systems, or triggering CI pipelines.
 *
 * Hook configuration lives in `settings.json` and is merged from project,
 * user, and default settings with complete override semantics (later sources
 * replace earlier ones entirely rather than merging).
 *
 * Note: The hooks system is being superseded by the actions-based architecture
 * defined in {@link Settings}. New integrations should prefer actions with
 * typed file lifecycle commands.
 *
 * @example
 * ```json
 * // settings.json
 * {
 *   "hooks": {
 *     "StartCard": {
 *       "path": "./scripts/notify-start.sh",
 *       "timeout": 5000
 *     },
 *     "EndCard": {
 *       "path": "./scripts/cleanup.sh"
 *     }
 *   }
 * }
 * ```
 *
 * @module types/hooks
 */

/**
 * Lifecycle event names that can trigger hook scripts.
 *
 * These events correspond to significant moments in a card's lifecycle:
 *
 * - `StartCard`: Card work session begins (action invoked)
 * - `EndCard`: Card work session ends (action completes or is cancelled)
 * - `StartInterview`: Interactive interview session begins
 * - `EndInterview`: Interactive interview session ends
 * - `TypedFileCreated`: A new typed file is validated and stored
 * - `TypedFileUpdated`: An existing typed file is updated
 * - `TypedFileDeleted`: A typed file is removed
 *
 * @see {@link HookConfig} for mapping events to scripts
 * @see {@link TypedFileHookInput} for typed file event payloads
 */
export type HookEvent =
  | 'StartCard'
  | 'EndCard'
  | 'StartInterview'
  | 'EndInterview'
  | 'TypedFileCreated'
  | 'TypedFileUpdated'
  | 'TypedFileDeleted';

/**
 * Configuration for a single hook script invocation.
 *
 * Scripts are executed with the working directory set to the workspace root.
 * Event-specific JSON payload is provided on stdin. The script's exit code
 * is logged but does not affect the triggering operation.
 *
 * @example
 * ```typescript
 * const script: HookScript = {
 *   path: './scripts/on-card-start.sh',
 *   timeout: 10000  // 10 second timeout
 * };
 * ```
 */
export interface HookScript {
  /**
   * Path to the script to execute.
   * Absolute paths are used as-is; relative paths are resolved from the
   * workspace root. The script must be executable.
   */
  path: string;

  /**
   * Timeout in milliseconds before the script is terminated.
   * If omitted, the script may run indefinitely. Set this to prevent
   * runaway scripts from blocking operations.
   */
  timeout?: number;
}

/**
 * Mapping of hook events to their script configuration.
 *
 * Keys should align with {@link HookEvent} values. Unknown keys are ignored
 * with a warning during configuration loading.
 *
 * @example
 * ```typescript
 * const hooks: HookConfig = {
 *   StartCard: { path: './scripts/notify.sh', timeout: 5000 },
 *   EndCard: { path: './scripts/cleanup.sh' },
 *   TypedFileCreated: { path: './scripts/process-typed-file.sh', timeout: 30000 }
 * };
 * ```
 */
export interface HookConfig {
  /**
   * Hook event names mapped to script definitions.
   * Only events listed in {@link HookEvent} are processed.
   */
  [event: string]: HookScript;
}
