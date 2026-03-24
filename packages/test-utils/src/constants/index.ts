/**
 * Canonical test identifiers, socket paths, and protocol status vocabularies
 * shared across Cards test suites. Keeping deterministic fixture values in one
 * place prevents silent drift when the protocol evolves.
 *
 * @summary Define stable test constants and status vocabularies for Cards V2
 */

import type { CardStatus } from '@cards/sdk/protocol';

/** Lifecycle stages for adaptive cards. Defined locally to avoid coupling to @cards/protocol. */
type AdaptiveCardStatus = 'active' | 'completed';

/**
 * Common test constants for use across test suites.
 *
 * Why: reuse identical IDs/paths when assertions must be deterministic.
 *
 * Constraint: these are not meant to reflect production data; avoid using
 * them in tests that should validate real-world variability.
 *
 * @example
 * ```typescript
 * import { TEST_CONSTANTS } from '@cards/test-utils';
 *
 * const context = createContext({
 *   cardId: TEST_CONSTANTS.CARD_ID,
 *   sessionId: TEST_CONSTANTS.SESSION_ID
 * });
 * ```
 */
export const TEST_CONSTANTS = {
  CARD_ID: 'TEST-001',
  SESSION_ID: 'session-test-001',
  NONCE: 'test-nonce-12345',
  SOCKET_PATH: '/tmp/test-ipc.sock'
} as const;

/**
 * All valid card status values as a readonly array.
 *
 * Why: drive parameterized tests from the canonical status vocabulary.
 *
 * Behavior: mirrors the protocol enum order used in production, so tests fail
 * loudly if a status is added or removed.
 *
 * @example
 * ```typescript
 * import { CARD_STATUSES } from '@cards/test-utils';
 *
 * for (const status of CARD_STATUSES) {
 *   it(`handles ${status} status`, () => { ... });
 * }
 * ```
 */
export const CARD_STATUSES = [
  'todo',
  'active',
  'needs_review',
  'done',
  'archived'
] as const satisfies readonly CardStatus[];

/**
 * All valid adaptive card status values as a readonly array.
 *
 * Why: keep adaptive card tests in sync with protocol status rules.
 *
 * Behavior: a small, stable list intended for loops and snapshot fixtures.
 *
 * @example
 * ```typescript
 * import { ADAPTIVE_CARD_STATUSES } from '@cards/test-utils';
 *
 * for (const status of ADAPTIVE_CARD_STATUSES) {
 *   it(`handles ${status} status`, () => { ... });
 * }
 * ```
 */
export const ADAPTIVE_CARD_STATUSES = ['active', 'completed'] as const satisfies readonly AdaptiveCardStatus[];
