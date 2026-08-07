/**
 * Per-card event journal and subscribe/replay protocol types.
 *
 * Replaces "best-effort broadcast, hope nothing was dropped" with a
 * versioned protocol: clients subscribe with the last `seq` they saw, and the
 * server replies with either the ordered deltas since then or a full
 * snapshot when the journal no longer covers the gap.
 *
 * @summary Per-card event journal and subscribe/replay protocol types
 * @module types/journal
 */

import type { CardResponse } from './api-requests.js';

/** Merge status of workspace commits. `null` when unknown or no workspace commits exist. */
export type MergeStatusValue = boolean | null;

/**
 * Tri-state staleness of the merge status. `'unknown'` means the underlying
 * check failed or could not be computed — distinct from a confirmed
 * `true`/`false` so a failed derivation is never mistaken for a real value.
 */
export type PlanDriftValue = boolean | 'unknown';

/** Merge-status pair produced by the shared server-side derivation function. */
export interface MergeStatusSnapshot {
  isMerged: MergeStatusValue;
  hasPlanDrift: PlanDriftValue;
}

/**
 * One entry in a card's append-only event journal.
 *
 * `seq` is monotonically increasing per card, starting at 1, with no gaps
 * among entries the journal still retains — older entries may have been
 * evicted by the server's retention cap, in which case a client behind the
 * cap receives a snapshot instead of a replay.
 */
export interface CardJournalEntry {
  /** Per-card monotonically increasing sequence number, starting at 1. */
  seq: number;
  /**
   * Discriminator matching the corresponding legacy broadcast event's `type`
   * (e.g. `'cards:metadata'`, `'card:commit'`, `'stream:started'`).
   */
  type: string;
  /** Event payload — shape depends on `type`, matching the legacy broadcast payload. */
  payload: unknown;
  /** Commit SHA associated with this entry, when applicable. */
  commitSha?: string;
  /** ISO 8601 timestamp of when the entry was appended. */
  timestamp: string;
}

// --- Client -> Server messages ---

/**
 * Subscribes to a card's event journal.
 *
 * When `sinceSeq` is provided and the journal still covers
 * `sinceSeq + 1..latest`, the server replies with {@link CardReplayMessage};
 * otherwise (gap, or `sinceSeq` omitted) it replies with
 * {@link CardSnapshotMessage}.
 */
export interface CardSubscribeMessage {
  /** Message type discriminator. */
  type: 'card:subscribe';
  /** ID of the card to subscribe to. */
  cardId: string;
  /** Last sequence number the client has already applied, if any. */
  sinceSeq?: number;
}

/** Stops delivering `card:journalEvent` broadcasts for a card the client no longer tracks. */
export interface CardUnsubscribeMessage {
  /** Message type discriminator. */
  type: 'card:unsubscribe';
  /** ID of the card to unsubscribe from. */
  cardId: string;
}

// --- Server -> Client messages ---

/** Ordered catch-up deltas covering `sinceSeq + 1..latestSeq`. */
export interface CardReplayMessage {
  /** Message type discriminator. */
  type: 'card:replay';
  /** ID of the card these entries belong to. */
  cardId: string;
  /** Journal entries in ascending `seq` order. */
  entries: CardJournalEntry[];
  /** Latest sequence number in the journal at the time of this reply. */
  latestSeq: number;
}

/**
 * Full current-state snapshot.
 *
 * Sent when the requested `sinceSeq` is no longer covered by the journal
 * (gap) or was omitted. `seq` is the journal position the snapshot
 * reflects — subscribing again with `sinceSeq: seq` resumes live catch-up
 * from here.
 */
export interface CardSnapshotMessage {
  /** Message type discriminator. */
  type: 'card:snapshot';
  /** ID of the card this snapshot describes. */
  cardId: string;
  /** Full current card state. */
  card: CardResponse;
  /** Merge status as a tri-state value — never a fabricated fallback. */
  mergeStatus: MergeStatusSnapshot;
  /** Journal position this snapshot reflects. */
  seq: number;
}

/**
 * Sent instead of a snapshot when the server could not assemble one (e.g.
 * the card could not be read). Callers must treat the subscription as
 * stale — never apply subsequent `card:journalEvent` messages for this card
 * without a successful snapshot or replay first.
 */
export interface CardSubscribeFailedMessage {
  /** Message type discriminator. */
  type: 'card:subscribeFailed';
  /** ID of the card the subscribe request was for. */
  cardId: string;
  /** Human-readable reason the snapshot could not be assembled. */
  reason: string;
}

/**
 * Live journal entry, broadcast immediately after a successful journal
 * append — parallel to (and carrying the same payload as) the corresponding
 * legacy broadcast event. Sent to every connection, matching the existing
 * broadcast-to-all transport; consumers filter by `cardId` and track `seq`
 * per card to detect gaps.
 */
export interface CardJournalEventMessage {
  /** Message type discriminator. */
  type: 'card:journalEvent';
  /** ID of the card this entry belongs to. */
  cardId: string;
  /** Per-card monotonically increasing sequence number. */
  seq: number;
  /** Discriminator matching the corresponding legacy broadcast event's `type`. */
  entryType: string;
  /** Event payload — shape depends on `entryType`. */
  payload: unknown;
  /** Commit SHA associated with this entry, when applicable. */
  commitSha?: string;
  /** ISO 8601 timestamp of when the entry was appended. */
  timestamp: string;
}

/** Union of client -> server journal protocol messages. */
export type CardJournalClientMessage = CardSubscribeMessage | CardUnsubscribeMessage;

/** Union of server -> client journal protocol messages. */
export type CardJournalServerMessage =
  | CardReplayMessage
  | CardSnapshotMessage
  | CardSubscribeFailedMessage
  | CardJournalEventMessage;
