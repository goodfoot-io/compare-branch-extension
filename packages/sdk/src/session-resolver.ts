/**
 * Centralized session identity resolver for the Cards SDK.
 *
 * @summary Resolves the current session id via a fixed environment-variable
 *   precedence chain, falling back to a PID-based id when no env var is set.
 * @module session-resolver
 */

import { findAgentPid } from './process-tree.js';

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
