/**
 * Centralized session identity resolver for the Cards SDK.
 *
 * @summary Resolves the current session id via a fixed environment-variable
 *   precedence chain, falling back to a PID-based id when no env var is set.
 * @module session-resolver
 */

import { findAgentPid } from './process-tree.js';
import { readUnboundCandidates } from './unboundWorktreeCandidates.js';

/**
 * Resolves the session id for the current process using a fixed precedence
 * chain.
 *
 * Precedence (B2):
 *   CARDS_SESSION_ID → CLAUDE_CODE_SESSION_ID → CODEX_THREAD_ID →
 *   OPENCODE_RUN_ID → CURSOR_TRACE_ID → first-non-shell-ancestor-PID-as-id
 *
 * Empty-string and whitespace-only values are treated as absent (B2).
 *
 * The PID tier is the final fallback. It is never reached mid-session because
 * session-start persists CARDS_SESSION_ID before any subsequent hook fires
 * (B3). The PID is returned as a string id for transient in-session keying and
 * is never written to a persistent store by this function (B5).
 *
 * @returns The resolved session id string, or `null` when no id can be
 *   determined.
 */
export async function resolveSessionId(): Promise<string | null> {
  for (const name of [
    'CARDS_SESSION_ID',
    'CLAUDE_CODE_SESSION_ID',
    'CODEX_THREAD_ID',
    'OPENCODE_RUN_ID',
    'CURSOR_TRACE_ID'
  ]) {
    const val = (process.env[name] ?? '').trim();
    if (val) return val;
  }
  // Final tier: PID-as-id. Never reached mid-session (CARDS_SESSION_ID is
  // persisted by session-start before any hook fires — see B3 / Phase 2.1).
  const pid = findAgentPid();
  return pid !== null ? String(pid) : null;
}

/**
 * Resolves the current session's agent runtime from the same runtime-specific
 * environment variables {@link resolveSessionId} consults for identity.
 *
 * Unlike {@link resolveSessionId}, the generic `CARDS_SESSION_ID` var is
 * deliberately NOT consulted here — it is persisted by the Claude Code
 * SessionStart hook onto every subsequent Bash invocation in that session (see
 * `persistSessionEnv`), so its presence does not distinguish a runtime; only
 * the agent-specific vars each CLI actually sets do. `OPENCODE_RUN_ID` and
 * `CURSOR_TRACE_ID` are recognized by {@link resolveSessionId} for identity but
 * have no {@link SessionSyncManifest} adapter yet (Phase 1 built only
 * `claude-code` and `codex`), so they resolve to `null` here rather than a
 * runtime string a caller cannot act on — fail closed, never guess.
 *
 * @returns `'claude-code'`, `'codex'`, or `null` when no supported runtime's
 *   env var is set.
 */
export async function resolveRuntime(): Promise<'claude-code' | 'codex' | null> {
  if ((process.env['CLAUDE_CODE_SESSION_ID'] ?? '').trim()) return 'claude-code';
  if ((process.env['CODEX_THREAD_ID'] ?? '').trim()) return 'codex';
  return null;
}

/**
 * Resolves the transcript path for the current session using a two-tier
 * precedence chain.
 *
 * Precedence:
 *   CARDS_TRANSCRIPT_PATH (env var) → unbound-candidate record for the given
 *   worktree → empty string (no transcript available).
 *
 * Empty-string and whitespace-only values in `CARDS_TRANSCRIPT_PATH` are
 * treated as absent, consistent with {@link resolveSessionId}.
 *
 * When the env var is absent, the function looks up the per-session
 * unbound-candidate record for `worktreeDir`. If a matching entry carries a
 * `transcriptPath`, that path is returned. This allows `card create` and
 * `card bind` to recover the transcript recorded at worktree-creation time even
 * when the env var was not inherited.
 *
 * An empty string is returned when neither tier resolves — callers must treat
 * this as a degraded path (transcript streaming disabled but not a hard error,
 * consistent with {@link outfitWorktreeForCard} warn-and-skip behaviour).
 *
 * @param sessionId - The resolved session id (from {@link resolveSessionId}).
 * @param worktreeDir - Absolute path to the worktree being bound.
 * @returns The resolved transcript path, or an empty string when unavailable.
 */
export async function resolveTranscriptPath(sessionId: string, worktreeDir: string): Promise<string> {
  const envVal = (process.env['CARDS_TRANSCRIPT_PATH'] ?? '').trim();
  if (envVal) return envVal;

  const candidates = await readUnboundCandidates(sessionId);
  const match = candidates.find((c) => c.worktreeDir === worktreeDir);
  return match?.transcriptPath ?? '';
}
