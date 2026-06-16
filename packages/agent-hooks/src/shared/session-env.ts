/**
 * Shared session-environment persistence helper.
 *
 * Extracted from {@link ../claude/runtime/session-start} so both the `runtime`
 * and `core` SessionStart hooks can persist the same env vars without
 * duplicating the logic.
 *
 * @summary Persist CARDS_SESSION_ID and CARDS_TRANSCRIPT_PATH into the shell env
 * @module session-env
 */

/** Name of the env var that carries the current session identifier. */
const CARDS_SESSION_ID_ENV = 'CARDS_SESSION_ID';

/** Name of the env var that carries the path to the session transcript file. */
const CARDS_TRANSCRIPT_PATH_ENV = 'CARDS_TRANSCRIPT_PATH';

/**
 * Persists the Cards session identity vars into the Bash tool shell environment.
 *
 * Writes `CARDS_SESSION_ID` and `CARDS_TRANSCRIPT_PATH` so they are available
 * to all subsequent Bash tool invocations in the session — including `card
 * create` and the worktree-create hook that writes the unbound-candidate entry.
 *
 * @param sessionId - Session identifier from the hook `input.session_id`.
 * @param transcriptPath - Transcript file path from the hook `input.transcript_path`.
 * @param persistEnvVar - The `persistEnvVar` callback provided by the hook framework.
 */
export function persistSessionEnv(
  sessionId: string,
  transcriptPath: string,
  persistEnvVar: (name: string, value: string) => void
): void {
  persistEnvVar(CARDS_SESSION_ID_ENV, sessionId);
  persistEnvVar(CARDS_TRANSCRIPT_PATH_ENV, transcriptPath);
}
