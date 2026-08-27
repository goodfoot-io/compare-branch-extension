/**
 * Public coding-agent identifiers and validation for action requests.
 *
 * @summary Supported one-shot coding-agent selections
 */

/** Coding agents that may be selected for a one-shot card action. */
export const CODING_AGENT_IDS = ['claude-code-cli', 'codex-cli', 'opencode-cli'] as const;

/** Public identifier for a supported coding agent. */
export type CodingAgentId = (typeof CODING_AGENT_IDS)[number];

/**
 * Returns whether a wire value is a supported coding-agent identifier.
 *
 * @param value - Untrusted value from a CLI or protocol boundary.
 * @returns Whether the value is a supported coding-agent identifier.
 */
export function isCodingAgentId(value: unknown): value is CodingAgentId {
  return typeof value === 'string' && (CODING_AGENT_IDS as readonly string[]).includes(value);
}
