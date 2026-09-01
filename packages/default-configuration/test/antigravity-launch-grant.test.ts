/**
 * Contract checks for the Antigravity launch-grant seam
 * (`CARDS_AGENT_LAUNCH_GRANT`): the validator consumes the extension-issued,
 * base64url-encoded, agent-bound, TTL-bounded grant immediately before spawn
 * and refuses with a named reason when it is absent, malformed,
 * wrong-versioned, agent-mismatched, or expired.
 *
 * @summary Antigravity launch-grant validation matrix
 * @module
 */

import { describe, expect, it } from 'vitest';
import {
  type AgentLaunchGrant,
  CARDS_AGENT_LAUNCH_GRANT_ENV_VAR,
  LaunchGrantRefusalError,
  validateAgentLaunchGrant
} from '../src/lib/launch-grant.js';

const AGENT = 'antigravity-cli';
const NOW_MS = 1_700_000_000_000;
const TTL_MS = 60_000;

/**
 * Encodes a grant payload the way the extension's single writer helper does:
 * base64url-encoded JSON.
 *
 * @param grant - Grant payload to encode.
 * @returns The base64url-encoded envelope.
 */
function encodeGrant(grant: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(grant), 'utf-8').toString('base64url');
}

/**
 * Builds a valid grant bound to {@link AGENT}, expiring {@link TTL_MS} after {@link NOW_MS}.
 *
 * @param overrides - Field overrides merged over the valid payload.
 * @returns The base64url-encoded grant envelope.
 */
function validGrant(overrides: Record<string, unknown> = {}): string {
  return encodeGrant({
    v: 1,
    agent: AGENT,
    issuedAtMs: NOW_MS - 1_000,
    expiresAtMs: NOW_MS + TTL_MS,
    probeFingerprint: 'probe-fingerprint-1',
    ...overrides
  });
}

/**
 * Asserts that the validator refuses with exactly the named reason.
 *
 * @param encoded - Raw grant env value under test.
 * @param reason - Expected refusal reason.
 */
function expectRefusal(encoded: string | undefined, reason: string): void {
  try {
    validateAgentLaunchGrant(encoded, AGENT, NOW_MS);
    expect.unreachable(`expected a LaunchGrantRefusalError (${reason})`);
  } catch (error) {
    expect(error).toBeInstanceOf(LaunchGrantRefusalError);
    const refusal = error as LaunchGrantRefusalError;
    expect(refusal.reason).toBe(reason);
    expect(refusal.expectedAgent).toBe(AGENT);
    expect(refusal.message).toContain(reason);
    expect(refusal.message).toContain(CARDS_AGENT_LAUNCH_GRANT_ENV_VAR);
  }
}

describe('validateAgentLaunchGrant', () => {
  it('accepts a current, agent-bound grant and returns the decoded payload', () => {
    const grant: AgentLaunchGrant = validateAgentLaunchGrant(validGrant(), AGENT, NOW_MS);
    expect(grant).toEqual({
      v: 1,
      agent: AGENT,
      issuedAtMs: NOW_MS - 1_000,
      expiresAtMs: NOW_MS + TTL_MS,
      probeFingerprint: 'probe-fingerprint-1'
    });
  });

  it('refuses an absent grant', () => {
    expectRefusal(undefined, 'absent');
    expectRefusal('', 'absent');
    expectRefusal('   ', 'absent');
  });

  it('refuses a malformed grant (bad base64url, non-JSON, non-object, bad field shapes)', () => {
    expectRefusal('!!!not-base64url!!!', 'malformed');
    expectRefusal(Buffer.from('plain text', 'utf-8').toString('base64url'), 'malformed');
    expectRefusal(encodeGrant(['not', 'an', 'object']), 'malformed');
    expectRefusal(
      encodeGrant({ v: 1, agent: 7, issuedAtMs: NOW_MS, expiresAtMs: NOW_MS + 1, probeFingerprint: 'p' }),
      'malformed'
    );
    expectRefusal(
      encodeGrant({ v: 1, agent: AGENT, issuedAtMs: 'x', expiresAtMs: NOW_MS + 1, probeFingerprint: 'p' }),
      'malformed'
    );
    expectRefusal(
      encodeGrant({
        v: 1,
        agent: AGENT,
        issuedAtMs: NOW_MS,
        expiresAtMs: Number.POSITIVE_INFINITY,
        probeFingerprint: 'p'
      }),
      'malformed'
    );
    expectRefusal(
      encodeGrant({ v: 1, agent: AGENT, issuedAtMs: NOW_MS, expiresAtMs: NOW_MS + 1, probeFingerprint: '' }),
      'malformed'
    );
  });

  it('refuses a wrong grant version, including a missing version field', () => {
    expectRefusal(validGrant({ v: 2 }), 'wrong-version');
    expectRefusal(
      encodeGrant({ agent: AGENT, issuedAtMs: NOW_MS, expiresAtMs: NOW_MS + 1, probeFingerprint: 'p' }),
      'wrong-version'
    );
  });

  it('refuses a grant bound to a different agent', () => {
    expectRefusal(validGrant({ agent: 'codex-cli' }), 'agent-mismatch');
  });

  it('refuses an expired grant, with expiry exactly at now counting as expired', () => {
    expectRefusal(validGrant({ expiresAtMs: NOW_MS - 1 }), 'expired');
    expectRefusal(validGrant({ expiresAtMs: NOW_MS }), 'expired');
  });
});
