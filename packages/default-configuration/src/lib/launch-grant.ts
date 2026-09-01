/**
 * Launch-grant consumption for Antigravity spawn paths.
 *
 * The extension performs the current managed-health and authentication probe
 * immediately before dispatch and writes a bounded, agent-bound launch grant
 * into the Cards action environment (`CARDS_AGENT_LAUNCH_GRANT`, one writer
 * helper at its two env-construction sites). The Antigravity spawn paths
 * consume the grant here: they re-validate agent binding and TTL at spawn and
 * refuse to launch — named refusal, no spawn, no session state — when the
 * grant is absent, malformed, wrong-versioned, agent-mismatched, or expired.
 * The grant is how the launch "consumes a current probe immediately before
 * spawning" without importing extension internals.
 *
 * Wire format: base64url-encoded JSON
 * `{ v: 1, agent, issuedAtMs, expiresAtMs, probeFingerprint }`.
 *
 * @summary Antigravity launch-grant validation
 * @module
 */

/** Environment variable carrying the base64url-encoded launch grant. */
export const CARDS_AGENT_LAUNCH_GRANT_ENV_VAR = 'CARDS_AGENT_LAUNCH_GRANT';

/**
 * Decoded launch-grant payload the extension writes before dispatch.
 */
export interface AgentLaunchGrant {
  /** Grant format version; exactly `1`. */
  v: 1;
  /** Agent id the grant was issued for (must equal the resolved agent). */
  agent: string;
  /** Issuance timestamp in epoch milliseconds. */
  issuedAtMs: number;
  /** Expiry timestamp in epoch milliseconds; the grant is dead at `expiresAtMs`. */
  expiresAtMs: number;
  /** Fingerprint of the health/auth probe the grant was issued from. */
  probeFingerprint: string;
}

/**
 * Named reasons a launch grant can be refused. Every refusal names its reason
 * in {@link LaunchGrantRefusalError.reason} and in the error message.
 */
export type AgentLaunchGrantRefusalReason = 'absent' | 'malformed' | 'wrong-version' | 'agent-mismatch' | 'expired';

/**
 * Error thrown when an Antigravity spawn path refuses to launch because the
 * launch grant failed validation. Throwing happens before any spawn and
 * before any client, worktree, or session state is created.
 */
export class LaunchGrantRefusalError extends Error {
  override readonly name = 'LaunchGrantRefusalError';

  /**
   * Creates the named refusal error.
   *
   * @param reason - Named refusal reason.
   * @param expectedAgent - Agent id the spawn path resolved.
   * @param detail - Human-readable refusal description.
   */
  constructor(
    public readonly reason: AgentLaunchGrantRefusalReason,
    public readonly expectedAgent: string,
    detail: string
  ) {
    super(`[${reason}] Refusing to launch ${expectedAgent}: ${CARDS_AGENT_LAUNCH_GRANT_ENV_VAR} ${detail}`);
  }
}

/**
 * Validates the `CARDS_AGENT_LAUNCH_GRANT` environment value for one resolved
 * agent, immediately before spawn.
 *
 * Refusals, in contract order: absent env value, base64url/JSON decode
 * failure or payload shape violations (`malformed`), a version other than
 * `1` (`wrong-version`), an agent field that disagrees with the resolved
 * agent (`agent-mismatch`), and `expiresAtMs <= now` (`expired`).
 *
 * @param encoded - Raw `CARDS_AGENT_LAUNCH_GRANT` env value; `undefined`/empty means absent.
 * @param expectedAgent - Agent id the spawn path resolved (e.g. `'antigravity-cli'`).
 * @param nowMs - Current time in epoch milliseconds (injected for testability).
 * @returns The decoded, validated grant payload.
 * @throws {LaunchGrantRefusalError} When any validation rule fails; the error names the reason.
 */
export function validateAgentLaunchGrant(
  encoded: string | undefined,
  expectedAgent: string,
  nowMs: number
): AgentLaunchGrant {
  if (encoded === undefined || encoded.trim().length === 0) {
    throw new LaunchGrantRefusalError(
      'absent',
      expectedAgent,
      'is not set. Re-run the action so the extension re-probes health and issues a current launch grant.'
    );
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'));
  } catch (error) {
    throw new LaunchGrantRefusalError(
      'malformed',
      expectedAgent,
      `is not base64url JSON (${error instanceof Error ? error.message : String(error)}).`
    );
  }

  if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) {
    throw new LaunchGrantRefusalError('malformed', expectedAgent, 'does not decode to a JSON object.');
  }

  const record = decoded as Record<string, unknown>;
  const { v, agent, issuedAtMs, expiresAtMs, probeFingerprint } = record;

  if (v !== 1) {
    throw new LaunchGrantRefusalError(
      'wrong-version',
      expectedAgent,
      `has unsupported grant version ${String(v)} (expected 1). ` +
        `Re-run the action so the extension issues a current grant.`
    );
  }

  if (
    typeof agent !== 'string' ||
    agent.length === 0 ||
    typeof issuedAtMs !== 'number' ||
    !Number.isFinite(issuedAtMs) ||
    typeof expiresAtMs !== 'number' ||
    !Number.isFinite(expiresAtMs) ||
    typeof probeFingerprint !== 'string' ||
    probeFingerprint.length === 0
  ) {
    throw new LaunchGrantRefusalError(
      'malformed',
      expectedAgent,
      'is missing or has malformed agent/issuedAtMs/expiresAtMs/probeFingerprint fields.'
    );
  }

  if (agent !== expectedAgent) {
    throw new LaunchGrantRefusalError(
      'agent-mismatch',
      expectedAgent,
      `is bound to agent '${agent}'. Re-run the action so the extension issues a grant for the resolved agent.`
    );
  }

  if (expiresAtMs <= nowMs) {
    throw new LaunchGrantRefusalError(
      'expired',
      expectedAgent,
      `expired at ${new Date(expiresAtMs).toISOString()} (now ${new Date(nowMs).toISOString()}). ` +
        `Re-run the action so the extension re-probes and issues a fresh grant.`
    );
  }

  return { v: 1, agent, issuedAtMs, expiresAtMs, probeFingerprint } satisfies AgentLaunchGrant;
}
