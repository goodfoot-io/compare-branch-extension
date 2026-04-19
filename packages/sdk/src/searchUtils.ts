/**
 * Pure utilities that power card search parsing and tag filtering.
 *
 * These helpers interpret `#tag` filters and compute derived tags.
 * ID-match ranking and MiniSearch-specific sort helpers have been removed;
 * the server now returns BM25-ranked results via the FTS5 index.
 *
 * @see [[Card Pseudotags]] for the full taxonomy of derived tags, relation
 * pseudotags, and semantically-styled user tags.
 *
 * @summary Pure utilities that power card search parsing and tag filtering
 * @module utils/searchUtils
 */

import type { CardListSummary } from './cardSummary.js';
import type { CardRelation } from './protocol/index.js';

/**
 * Derived tag names that can be searched with `#tag` syntax.
 *
 * These tags are computed from card properties rather than stored in `card.tags`.
 *
 * @see [[Card Pseudotags]] for computation rules and display semantics.
 */
export const DERIVED_TAGS = ['planning', 'merge-requested', 'merged', 'unmerged'] as const;

/**
 * Type for derived tag names.
 */
export type DerivedTag = (typeof DERIVED_TAGS)[number];

/**
 * Tailwind border + text classes for each derived tag's outlined TagChip.
 *
 * Consumers should pass these values as the `colorClasses` prop of TagChip.
 */
export const DERIVED_TAG_CLASSES: Record<DerivedTag, string> = {
  planning: 'border-purple-500 text-purple-500',
  'merge-requested': 'border-amber-500 text-amber-500',
  merged: 'border-green-500 text-green-500',
  unmerged: 'border-amber-500 text-amber-500'
};

/**
 * Tailwind border + text classes for well-known user tags.
 *
 * Tags listed here carry semantic meaning in the runtime workflow
 * (e.g. "blocked" halts routing until resolved) and are visually
 * distinguished from ordinary user tags.
 *
 * @see [[Card Pseudotags]] for the full list of semantically-styled user tags.
 */
export const USER_TAG_CLASSES: Record<string, string> = {
  blocked: 'border-red-500 text-red-500'
};

/**
 * Compute derived tags for a card based on its properties.
 *
 * Derived tags are virtual tags that aren't stored in the card.tags array
 * but can be searched using the same #tag syntax:
 *
 * **Plan gates** (whenever plan is required but not approved):
 * - `planning`: Plan required but not yet approved — applies regardless of
 *   commit history, so cards re-enter planning when a new plan file resets
 *   `planApproved` to false.
 *
 * **Merge request gates** (only when unmerged commits exist, not approved, and not active):
 * - `merge-requested`: Merge request required but not yet approved (mutually exclusive with `unmerged`)
 *
 * **Merge status** (suppressed while card is in `active` status or in planning):
 * - `merged`: All workspace commits merged into the viewer's HEAD (suppressed
 *   when `planRequired && !planApproved` — a new unapproved plan takes priority)
 * - `unmerged`: Has unmerged workspace commits and no pending merge review
 *
 * @param card - Card summary used to derive virtual search tags.
 * @returns Virtual tag names that should be searchable for this card.
 * @see [[Card Pseudotags]] for the full computation rules and suppression conditions.
 */
export function getDerivedTags(card: CardListSummary): DerivedTag[] {
  const tags: DerivedTag[] = [];

  // Plan gates: card is in a planning phase whenever a plan is required but not
  // yet approved — regardless of prior commit history.  A new plan file resets
  // planApproved to false, re-entering the planning state even after earlier
  // commits were merged.
  if (card.planRequired && !card.planApproved) {
    tags.push('planning');
  }

  // Merge-related tags are suppressed while the card is actively being worked on.
  if (card.status !== 'active') {
    // Merge request gates: only when unmerged commits exist and review not yet approved.
    // Reviewing and unmerged are mutually exclusive — reviewing implies unmerged.
    if (card.mergeRequestRequired && card.isMerged === false && !card.mergeApproved) {
      tags.push('merge-requested');
    }

    // Merge status — suppressed when plan documents are newer than the latest commit
    // (hasStaleMerge signals that old merged commits are stale relative to a new plan cycle).
    if (card.isMerged === true && !card.hasStaleMerge) {
      tags.push('merged');
    }
    if (card.isMerged === false && (!card.mergeRequestRequired || card.mergeApproved)) {
      tags.push('unmerged');
    }
  }

  return tags;
}

// --- Relation Pseudotags ---

/**
 * A pseudotag representing a relation to another card.
 *
 * Tracks direction so the detail view can route removal to the correct
 * card (outgoing relations live on the current card; incoming relations
 * live on the source card).
 */
export interface RelationPseudotag {
  /** The target card ID (e.g., "main-5"). */
  cardId: string;
  /** Whether this card has an outgoing relation to the target. */
  outgoing: boolean;
  /** Whether the target has an incoming relation to this card. */
  incoming: boolean;
}

/**
 * Compute relation pseudotags from outgoing and incoming relations.
 *
 * Deduplicates by cardId — if the same card appears in both directions,
 * one pseudotag is produced with both flags set.
 *
 * @param outgoing - Outgoing relations from the current card.
 * @param incoming - Incoming relations targeting the current card.
 * @returns Deduplicated pseudotags with direction flags.
 * @see [[Card Pseudotags]] for rendering and removal routing details.
 */
export function getRelationPseudotags(outgoing: CardRelation[], incoming: CardRelation[]): RelationPseudotag[] {
  const map = new Map<string, RelationPseudotag>();
  for (const r of outgoing) {
    const existing = map.get(r.cardId);
    if (existing) {
      existing.outgoing = true;
    } else {
      map.set(r.cardId, { cardId: r.cardId, outgoing: true, incoming: false });
    }
  }
  for (const r of incoming) {
    const existing = map.get(r.cardId);
    if (existing) {
      existing.incoming = true;
    } else {
      map.set(r.cardId, { cardId: r.cardId, outgoing: false, incoming: true });
    }
  }
  return Array.from(map.values());
}

// --- Search Parsing ---

/**
 * Parsed search query with text, tag filters, and relation filters separated.
 */
export interface ParsedSearchQuery {
  /** Text portion of the query (after removing #tag and @cardId patterns). */
  text: string;
  /** Tag names extracted from #tag patterns, normalized to lowercase. */
  tags: string[];
  /** Card IDs extracted from @cardId patterns for relational neighborhood queries. */
  relatedTo: string[];
}

/**
 * Parse a search query into text, `#tag` filters, and `@cardId` relation filters.
 *
 * Tag pattern: `#tag-name`, where the tag is `[\w-]+`. Tags are normalized
 * to lowercase for case-insensitive matching.
 *
 * Relation pattern: `@card-id`, where the card ID is `[\w-]+`. Card IDs are
 * preserved as-is (case-sensitive).
 *
 * @param query - Raw search query string.
 * @returns Text query, normalized tag filters, and relation filters.
 *
 * @example
 * ```ts
 * parseSearchQuery('#auth @main-5 login')
 * // Returns: { text: 'login', tags: ['auth'], relatedTo: ['main-5'] }
 * ```
 */
export function parseSearchQuery(query: string): ParsedSearchQuery {
  const tagPattern = /#([\w-]+)/g;
  const relationPattern = /@([\w-]+)/g;
  const tags: string[] = [];
  const relatedTo: string[] = [];

  let match = tagPattern.exec(query);
  while (match !== null) {
    const tagName = match[1];
    if (tagName) {
      tags.push(tagName.toLowerCase());
    }
    match = tagPattern.exec(query);
  }

  match = relationPattern.exec(query);
  while (match !== null) {
    const cardId = match[1];
    if (cardId) {
      relatedTo.push(cardId);
    }
    match = relationPattern.exec(query);
  }

  const text = query.replace(tagPattern, '').replace(relationPattern, '').trim();
  return { text, tags, relatedTo };
}

/**
 * Filter cards by tag and relation filters.
 *
 * Tag filtering uses OR logic: a card matches if it has at least one stored
 * or derived tag in the filter list.
 *
 * Relation filtering uses OR logic: a card matches if its ID equals a
 * `relatedTo` entry, or if it has an outgoing or incoming relation whose
 * `cardId` matches a `relatedTo` entry.
 *
 * When both tag and relation filters are present, a card must match at
 * least one of each (AND between filter types).
 *
 * @param cards - Cards to filter.
 * @param filterTags - Tag names to match, typically lowercase.
 * @param relatedTo - Card IDs for relational neighborhood filtering.
 * @returns Cards matching the filter criteria.
 */
export function filterCardsByTags(
  cards: CardListSummary[],
  filterTags: string[],
  relatedTo: string[] = []
): CardListSummary[] {
  if (filterTags.length === 0 && relatedTo.length === 0) return cards;

  return cards.filter((card) => {
    // Tag filtering (OR logic)
    let matchesTags = false;
    if (filterTags.length > 0) {
      const hasStoredTag = card.tags?.some((tag) => filterTags.includes(tag.toLowerCase()));
      if (hasStoredTag) {
        matchesTags = true;
      } else {
        const derivedTags = getDerivedTags(card);
        matchesTags = derivedTags.some((tag) => filterTags.includes(tag));
      }
    }

    // Relation filtering — card matches if its ID equals a relatedTo entry,
    // or has a relation (outgoing or incoming) to a relatedTo entry
    let matchesRelation = false;
    if (relatedTo.length > 0) {
      matchesRelation =
        relatedTo.includes(card.id) ||
        (card.relations ?? []).some((r) => relatedTo.includes(r.cardId)) ||
        card.incomingRelations.some((r) => relatedTo.includes(r.cardId));
    }

    // AND between filter types when both present; OR when only one
    if (filterTags.length > 0 && relatedTo.length > 0) return matchesTags && matchesRelation;
    return matchesTags || matchesRelation;
  });
}
