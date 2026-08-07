/**
 * Card list summary types for the cards web package.
 *
 * These types describe the lean representation used by list views and search.
 *
 *
 * @summary Card list summary types for the cards web package
 * @module types/cardSummary
 */

import type { Card, CardRelation, CardStatus } from './protocol/index.js';
import { DEFAULT_CARD_GATES } from './protocol/index.js';

/**
 * Simplified card representation for list views.
 *
 * Excludes git commit fields and other heavy relations that are not needed for
 * list rendering or client-side search indexing.
 */
export interface CardListSummary {
  /** Unique identifier for the card. */
  id: string;
  /** Repository identifier the card belongs to. */
  repositoryId: string;
  /** Title shown in list and detail views. */
  title: string;
  /** Current status of the card. */
  status: CardStatus;
  /** Tags for categorization and search. */
  tags: string[];
  /** Whether this card is pinned to the top of lists. */
  isPinned: boolean;
  /** ISO 8601 timestamp when the card was created. */
  createdAt: string;
  /** ISO 8601 timestamp when the card was last updated. */
  updatedAt: string;
  /** Display order within a status column (for drag/drop). */
  order: number;

  // Gate fields (flattened from card.gates object)
  /** Whether a plan document is required before implementation. */
  planRequired: boolean;
  /** Whether the plan gate has been approved. */
  planApproved: boolean;
  /** Whether a merge request gate is required before closing. */
  mergeRequestRequired: boolean;
  /** Whether the merge request gate has been approved. */
  mergeApproved: boolean;

  // Derived fields for tags
  /** Three-state merge status: `true` when all workspace commits are merged, `false` when commits exist but are not merged, `null` when the card has no workspace commits. Used for `merged` and `unmerged` tag computation. */
  isMerged: boolean | null;
  /**
   * Whether plan documents are newer than the latest workspace commit.
   * When `true`, the `merged` pseudotag is suppressed even if `isMerged === true`.
   */
  hasPlanDrift: boolean;

  /**
   * Whether the card has unread activity since the user last viewed its timeline.
   *
   * Derived from HybridStore read-state; defaults to `false`.
   */
  hasUnread: boolean;

  // Relation fields
  /** Outgoing relations from this card. */
  relations: CardRelation[];
  /** Incoming relations targeting this card (derived from card_relations at read time). */
  incomingRelations: CardRelation[];

  /**
   * Workspace branch the card was created from (e.g., 'main').
   */
  parentBranch: string;
}

/**
 * Converts a {@link Card} to a {@link CardListSummary}.
 *
 * Flattens `card.gates`, derives `hasPlanContent` from `planContent`, and
 * sets timeline counts to zero (no timeline fetch is performed here). If gate
 * metadata is unexpectedly missing, the function logs the offending payload to
 * `console.error` before mapping to help diagnose upstream shape drift.
 *
 * @param card - Full API card payload to normalize for list/search views.
 * @returns Flattened summary optimized for list rendering and indexing.
 *
 * @example
 * ```typescript
 * const card: Card = await client.getCard('card-123');
 * const summary: CardListSummary = toCardListSummary(card);
 * ```
 */
export function toCardListSummary(card: Card): CardListSummary {
  // Debug logging to trace gates undefined error
  if (!card.gates) {
    console.error('[toCardListSummary] card.gates is undefined for card:', JSON.stringify(card, null, 2));
  }
  const gates = card.gates ?? DEFAULT_CARD_GATES;
  return {
    id: card.id,
    repositoryId: card.repositoryId,
    title: card.title,
    status: card.status,
    tags: card.tags,
    isPinned: card.isPinned,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
    order: card.order,

    // Flatten gate fields
    planRequired: gates.planRequired,
    planApproved: gates.planApproved,
    mergeRequestRequired: gates.mergeRequestRequired,
    mergeApproved: gates.mergeApproved,

    // Derived fields
    isMerged: card.isMerged,
    hasPlanDrift: card.hasPlanDrift,
    hasUnread: card.hasUnread,
    relations: card.relations ?? [],
    incomingRelations: card.incomingRelations ?? [],
    parentBranch: card.parentBranch
  };
}

/**
 * Converts an array of {@link Card} objects to {@link CardListSummary} objects.
 *
 * @param cards - API card payloads to normalize in batch.
 * @returns Flattened summaries in the same order as the input.
 *
 * @example
 * ```typescript
 * const cards: Card[] = await client.listCards();
 * const summaries: CardListSummary[] = toCardListSummaries(cards);
 * ```
 */
export function toCardListSummaries(cards: Card[]): CardListSummary[] {
  return cards.map(toCardListSummary);
}
