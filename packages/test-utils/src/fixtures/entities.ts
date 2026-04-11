/**
 * Domain entity factories for test fixtures.
 *
 * Why: create valid domain objects with minimal ceremony while keeping tests
 * explicit about the values they care about.
 *
 * Behavior:
 * - Generates IDs with `randomUUID()` unless overridden.
 * - Uses `now()` for timestamps unless overridden.
 * - Applies partial overrides per factory call.
 *
 * Constraint: these factories do not validate domain rules; they are meant
 * for test setup, not production enforcement.
 *
 * Note: Row factories (CardRow, RepositoryIdentityRow, etc.) remain in hybrid-store
 * due to their dependency on local row types.
 *
 *
 * @summary Domain entity factories for test fixtures
 * @module test-utils/fixtures/entities
 */
import { randomUUID } from 'node:crypto';
import type { Card, CardMetadata } from '@cards/sdk/protocol';
import { DEFAULT_CARD_GATES } from '@cards/sdk/protocol';
import { now } from './time.js';

/** Lifecycle stages for adaptive cards. Defined locally to avoid coupling to @cards/protocol. */
export type AdaptiveCardStatus = 'active' | 'completed';

/** Frontmatter metadata for an adaptive card. Defined locally. */
export interface AdaptiveCardFrontmatter {
  id: string;
  summary: string;
  author: string;
  status: AdaptiveCardStatus;
}

/** Full adaptive card representation. Defined locally. */
export interface AdaptiveCard extends AdaptiveCardFrontmatter {
  payload: Record<string, unknown>;
  output?: Record<string, unknown>;
}

// --- Card Factories ---

/**
 * Creates a CardMetadata with sensible defaults.
 *
 * Behavior: uses `DEFAULT_CARD_GATES` when no gates are provided.
 *
 * Constraint: when `overrides.gates` is set, it replaces the defaults rather
 * than merging, so provide a full gate set if you override it.
 *
 * @param overrides Partial fields to override
 * @returns A complete CardMetadata
 */
export function createCardMetadata(overrides: Partial<CardMetadata> = {}): CardMetadata {
  const id = overrides.id ?? randomUUID();
  return {
    id,
    title: overrides.title ?? `Test Card ${id.slice(0, 8)}`,
    status: overrides.status ?? 'todo',
    tags: overrides.tags ?? [],
    gates: overrides.gates ?? { ...DEFAULT_CARD_GATES },
    isPinned: overrides.isPinned ?? false,
    order: overrides.order ?? 0,
    repositoryId: overrides.repositoryId ?? 'main',
    environment: overrides.environment ?? 'default',
    ...(overrides.parentBranch !== undefined ? { parentBranch: overrides.parentBranch } : {})
  };
}

/**
 * Creates a Card with sensible defaults.
 *
 * Behavior: builds metadata via `createCardMetadata` and adds timestamps,
 * description, and optional runtime properties.
 *
 * @param overrides Partial fields to override
 * @returns A complete Card
 */
export function createCard(overrides: Partial<Card> = {}): Card {
  const metadata = createCardMetadata(overrides);
  const timestamp = now();
  return {
    ...metadata,
    createdAt: overrides.createdAt ?? timestamp,
    updatedAt: overrides.updatedAt ?? timestamp,
    isMerged: overrides.isMerged ?? null,
    hasStaleMerge: overrides.hasStaleMerge ?? true,
    hasUnread: overrides.hasUnread ?? false,
    repositoryPath: overrides.repositoryPath ?? `/tmp/cards/${metadata.id}`
  };
}

// --- Adaptive Card Factories ---

/**
 * Creates an AdaptiveCardFrontmatter with sensible defaults.
 *
 * Behavior: uses a synthetic author and `active` status unless overridden.
 *
 * @param overrides Partial fields to override
 * @returns A complete AdaptiveCardFrontmatter
 */
export function createAdaptiveCardFrontmatter(
  overrides: Partial<AdaptiveCardFrontmatter> = {}
): AdaptiveCardFrontmatter {
  const id = overrides.id ?? randomUUID();
  return {
    id,
    summary: overrides.summary ?? `Test Adaptive Card ${id.slice(0, 8)}`,
    author: overrides.author ?? 'test-author',
    status: overrides.status ?? 'active'
  };
}

/**
 * Creates an AdaptiveCard with sensible defaults.
 *
 * Behavior: defaults `payload` to an empty object and only includes `output`
 * when explicitly supplied.
 *
 * @param overrides Partial fields to override
 * @returns A complete AdaptiveCard
 */
export function createAdaptiveCard(overrides: Partial<AdaptiveCard> = {}): AdaptiveCard {
  const frontmatter = createAdaptiveCardFrontmatter(overrides);
  return {
    ...frontmatter,
    payload: overrides.payload ?? {},
    output: overrides.output
  };
}

// --- Comment Factory ---

/**
 * Comment interface for test fixtures.
 *
 * Constraint: this is intentionally smaller than the production comment shape
 * to keep tests lightweight.
 */
export interface Comment {
  id: string;
  content: string;
  createdAt: string;
}

/**
 * Creates a Comment with sensible defaults.
 *
 * Behavior: generates a new ID and `createdAt` timestamp unless overridden.
 *
 * @param overrides Partial fields to override
 * @returns A complete Comment
 */
export function createComment(overrides: Partial<Comment> = {}): Comment {
  const id = overrides.id ?? randomUUID();
  return {
    id,
    content: overrides.content ?? 'Test comment content',
    createdAt: overrides.createdAt ?? now()
  };
}

// --- Note Factory ---

/**
 * Note interface for test fixtures.
 *
 * Constraint: simplified fields make it easy to set up note-related tests
 * without bringing in the full domain type.
 */
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

/**
 * Creates a Note with sensible defaults.
 *
 * Behavior: generates a new ID and `createdAt` timestamp unless overridden.
 *
 * @param overrides Partial fields to override
 * @returns A complete Note
 */
export function createNote(overrides: Partial<Note> = {}): Note {
  const id = overrides.id ?? randomUUID();
  return {
    id,
    title: overrides.title ?? `Test Note ${id.slice(0, 8)}`,
    content: overrides.content ?? 'Test note content',
    createdAt: overrides.createdAt ?? now()
  };
}

// --- Composite Builders ---

/**
 * Options for creating a complete card with related entities.
 *
 * Behavior: each array entry is passed through its respective factory, so
 * partial overrides become fully populated entities.
 */
export interface CreateCompleteCardOptions {
  card?: Partial<Card>;
  adaptiveCards?: Array<Partial<AdaptiveCard>>;
  comments?: Array<Partial<Comment>>;
}

/**
 * Result of creating a complete card.
 *
 * Behavior: all related arrays are always defined (never `undefined`).
 */
export interface CompleteCard {
  card: Card;
  adaptiveCards: AdaptiveCard[];
  comments: Comment[];
}

/**
 * Creates a complete card with optional adaptive cards and comments.
 *
 * Why: bundle related entities for tests that need a cohesive card graph.
 *
 * Behavior: missing arrays default to empty arrays; each entry is normalized
 * through the corresponding factory for consistent defaults.
 *
 * @example
 * ```typescript
 * const bundle = createCompleteCard({
 *   card: { title: 'Pinned card', isPinned: true },
 *   adaptiveCards: [{ summary: 'Adaptive 1' }],
 *   comments: [{ content: 'First comment' }]
 * });
 * ```
 *
 * @param options Options for creating the complete card
 * @returns A complete card with related entities
 */
export function createCompleteCard(options: CreateCompleteCardOptions = {}): CompleteCard {
  const card = createCard(options.card);
  const adaptiveCards = (options.adaptiveCards ?? []).map((c) => createAdaptiveCard(c));
  const comments = (options.comments ?? []).map((c) => createComment(c));

  return { card, adaptiveCards, comments };
}

// --- Multiple Entity Helpers ---

/**
 * Creates multiple cards with sensible defaults.
 *
 * Behavior: each card is created independently, so IDs and timestamps are
 * unique per entry.
 *
 * @example
 * ```typescript
 * const cards = createMultipleCards(3, { status: 'done' });
 * ```
 *
 * @param count Number of cards to create
 * @param overrides Partial fields to apply to all cards
 * @returns Array of cards
 */
export function createMultipleCards(count: number, overrides: Partial<Card> = {}): Card[] {
  return Array.from({ length: count }, () => createCard(overrides));
}

/**
 * Creates multiple adaptive cards with sensible defaults.
 *
 * Behavior: each adaptive card gets its own ID unless overridden.
 *
 * @param count Number of adaptive cards to create
 * @param overrides Partial fields to apply to all adaptive cards
 * @returns Array of adaptive cards
 */
export function createMultipleAdaptiveCards(count: number, overrides: Partial<AdaptiveCard> = {}): AdaptiveCard[] {
  return Array.from({ length: count }, () => createAdaptiveCard(overrides));
}

/**
 * Creates multiple comments with sensible defaults.
 *
 * Behavior: each comment is created independently, so IDs are unique.
 *
 * @param count Number of comments to create
 * @param overrides Partial fields to apply to all comments
 * @returns Array of comments
 */
export function createMultipleComments(count: number, overrides: Partial<Comment> = {}): Comment[] {
  return Array.from({ length: count }, () => createComment(overrides));
}

/**
 * Creates multiple notes with sensible defaults.
 *
 * Behavior: each note is created independently, so IDs are unique.
 *
 * @param count Number of notes to create
 * @param overrides Partial fields to apply to all notes
 * @returns Array of notes
 */
export function createMultipleNotes(count: number, overrides: Partial<Note> = {}): Note[] {
  return Array.from({ length: count }, () => createNote(overrides));
}
