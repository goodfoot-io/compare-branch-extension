/**
 * Core card metadata for the Cards V2 protocol.
 *
 * These shapes model the metadata stored in `CARD.json` as well as the
 * derived card object used by the UI and APIs. The metadata fields are the
 * canonical source of truth for card identity and lifecycle state.
 *
 * Cards follow a directory-based storage model where each card lives in its own
 * folder containing `CARD.json` (metadata), `DESCRIPTION.md` (description),
 * optional plan documents, attachments, and typed files.
 *
 *
 * @summary Core card metadata for the Cards V2 protocol
 * @example
 * ```json
 * // CARD.json metadata
 * {
 *   "id": "main-0001",
 *   "title": "Implement authentication",
 *   "status": "in_progress",
 *   "tags": ["feature", "security"],
 *   "gates": {
 *     "planRequired": true,
 *     "planApproved": true,
 *     "reviewRequired": true,
 *     "reviewApproved": false
 *   },
 *   "isPinned": false,
 *   "order": 1,
 *   "repositoryId": "main"
 * }
 * ```
 *
 * @module types/card
 */

import type { CardStatus } from './status.js';

// --- Card Gates ---

/**
 * Gate flags that express workflow requirements and approval state for a card.
 *
 * Gates enforce development process discipline by requiring certain milestones
 * before a card can progress. The `*Required` flags indicate what the workflow
 * demands; the `*Approved` flags track whether those requirements have been met.
 *
 * Gates are evaluated by automation and UI to decide whether a card can move
 * to a later lifecycle state. They are stored with the card so the workflow
 * intent remains durable even if tooling changes.
 *
 * @example
 * ```typescript
 * // A card requiring plan approval before work starts
 * const gates: CardGates = {
 *   planRequired: true,
 *   planApproved: false,  // Cannot start until approved
 *   reviewRequired: true,
 *   reviewApproved: false
 * };
 *
 * // After plan is approved, card can move to in_progress
 * gates.planApproved = true;
 * ```
 *
 * @see {@link CardCreateGates} for the client-facing subset used during creation
 * @see {@link DEFAULT_CARD_GATES} for the default configuration
 */
export interface CardGates {
  /**
   * Whether a plan document is required before implementation begins.
   * When true, the card cannot transition from `todo` to `in_progress`
   * until `planApproved` is also true.
   */
  planRequired: boolean;

  /**
   * Whether the plan has been approved by a reviewer.
   * Set via the `POST /cards/:id/gates/plan/approve` endpoint.
   */
  planApproved: boolean;

  /**
   * Whether review is required before the card can be marked done.
   * When true, the card must pass through `needs_review` status and
   * have `reviewApproved` set before transitioning to `done`.
   */
  reviewRequired: boolean;

  /**
   * Whether the review requirement has been satisfied.
   * Set via the `POST /cards/:id/gates/review/approve` endpoint.
   */
  reviewApproved: boolean;
}

/**
 * Default gate configuration used when a card declares no explicit gates.
 *
 * All requirements and approvals default to `false`, allowing cards to
 * progress through statuses without workflow enforcement.
 */
export const DEFAULT_CARD_GATES: CardGates = {
  planRequired: false,
  planApproved: false,
  reviewRequired: false,
  reviewApproved: false
};

// --- Card Metadata ---

/**
 * File-persisted metadata stored in `CARD.json`.
 *
 * These fields are stored in the card's JSON metadata file and power sorting,
 * filtering, and workflow enforcement in the application. Timestamps
 * (`createdAt`, `updatedAt`) are derived from Git history at read time and not
 * persisted in the JSON file.
 *
 * @example
 * ```typescript
 * const metadata: CardMetadata = {
 *   id: 'main-0001',
 *   title: 'Implement user login',
 *   status: 'in_progress',
 *   tags: ['feature', 'auth'],
 *   gates: DEFAULT_CARD_GATES,
 *   isPinned: false,
 *   order: 1,
 *   repositoryId: 'main',
 *   environment: 'default'
 * };
 * ```
 */
export interface CardMetadata {
  /**
   * Stable identifier used in URLs, filenames, and API routes.
   * Format: `{branch-prefix}-{counter}` (e.g., `main-0001`).
   * Subject to {@link MAX_CARD_ID_LENGTH} validation.
   */
  id: string;

  /**
   * Human-facing title shown in lists and headers.
   * Subject to {@link MAX_TITLE_LENGTH} validation.
   */
  title: string;

  /**
   * Current lifecycle state for the card.
   * Controls visibility in board columns and available actions.
   */
  status: CardStatus;

  /**
   * Tags used for filtering and grouping.
   * Each tag is normalized to lowercase and must match {@link TAG_PATTERN}.
   */
  tags: string[];

  /**
   * Workflow gate configuration for this card.
   * Controls status transition rules and approval requirements.
   */
  gates: CardGates;

  /**
   * Whether the card should be pinned to the top of lists.
   * Pinned cards appear before unpinned cards regardless of order value.
   */
  isPinned: boolean;

  /**
   * Relative order within a status column for drag-and-drop layouts.
   * Lower values appear first. Only compared among cards with the same
   * pinned state.
   */
  order: number;

  /**
   * Repository identifier for this card.
   * Used to associate cards with their Git repositories and scope queries.
   * Derived from the workspace's git remote URL or commit hash via
   * {@link resolveRepositoryId}.
   */
  repositoryId: string;

  /**
   * Environment name for action execution.
   * Determines which actions are available in the card's action menu.
   * Persisted in CARD.meta.json. Defaults to `'default'` at creation time.
   */
  environment: string;
}

// --- Card ---

/**
 * Full card representation including metadata and body content.
 *
 * This is the primary card type used throughout the application. It extends
 * {@link CardMetadata} with computed fields (timestamps derived from Git),
 * the description body, and runtime properties not persisted in CARD.meta.json.
 *
 * @example
 * ```typescript
 * const card: Card = {
 *   id: 'main-0001',
 *   title: 'Implement OAuth2',
 *   status: 'in_progress',
 *   tags: ['feature', 'auth'],
 *   gates: { planRequired: true, planApproved: true, reviewRequired: true, reviewApproved: false },
 *   isPinned: false,
 *   order: 1,
 *   repositoryId: 'main',
 *   environment: 'default',
 *   createdAt: '2024-01-15T10:30:00Z',
 *   updatedAt: '2024-01-16T14:22:00Z',
 *   description: '## Goals\n- Support Google and GitHub OAuth...',
 *   repositoryPath: '/home/user/project'
 * };
 * ```
 */
export interface Card extends CardMetadata {
  /**
   * ISO 8601 timestamp of when the card was created.
   * Derived from Git history at read time.
   */
  createdAt: string;

  /**
   * ISO 8601 timestamp of the most recent metadata update.
   * Derived from Git history at read time.
   */
  updatedAt: string;

  /**
   * Markdown description content from DESCRIPTION.md.
   * Subject to {@link MAX_DESCRIPTION_LENGTH} validation.
   */
  description: string;

  /**
   * Markdown content of the implementation plan from PLAN.md.
   *
   * Present only when the card's repository contains a non-empty PLAN.md file.
   * Used by the web client to derive the `hasPlanContent` flag for the
   * "planned" derived tag.
   */
  planContent?: string;

  /**
   * Whether all attributed workspace commits are merged into the viewer's current branch HEAD.
   *
   * This is a computed, workspace-relative field. It is not persisted in CARD.meta.json.
   * The store defaults this to `false`; the Router overwrites it with the actual computed
   * value before sending API responses. Cards with zero workspace commits return `false`.
   */
  isMerged: boolean;

  /**
   * Absolute filesystem path to the repository containing the card directory.
   * Used for resolving relative paths in actions and typed files.
   */
  repositoryPath?: string;
}
