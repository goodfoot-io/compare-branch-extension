/**
 * Shared API request and response types for the Cards V2 REST API.
 *
 * These types define the wire-level contract between clients and server.
 * Both the server (for validation) and clients (for request construction)
 * compile against these shapes to ensure compatibility across the ecosystem.
 *
 * Request types model JSON payloads sent in HTTP bodies or query strings.
 * Response types model the JSON structures returned by endpoints. All
 * timestamps use ISO 8601 format for consistent parsing across platforms.
 *
 *
 * @summary Shared API request and response types for the Cards V2 REST API
 * @example
 * ```typescript
 * // Creating a card
 * const request: CreateCardRequest = {
 *   title: 'Implement auth flow',
 *   description: '## Goals\n- OAuth2 support',
 *   workspacePath: '/home/user/project',
 *   tags: ['backend', 'security'],
 *   gates: { planRequired: true }
 * };
 *
 * // Listing cards with filters
 * const query: ListCardsRequest = {
 *   workspacePath: '/home/user/project',
 *   status: 'in_progress',
 *   limit: 20
 * };
 * ```
 *
 * @module types/api-requests
 */

import type { Card } from './card.js';
import type { CardStatus } from './status.js';
import type { Comment, TimelineItem } from './timeline.js';

// ============================================================================
// Card API Types
// ============================================================================

/**
 * Gate configuration for card creation requests.
 *
 * Unlike {@link CardGates}, this interface only includes requirement flags,
 * not approval state. Approval flags are managed server-side and cannot be
 * set by clients during creation.
 *
 * @example
 * ```typescript
 * const gates: CardCreateGates = {
 *   planRequired: true,    // Must have approved plan before starting work
 *   reviewRequired: true   // Must pass review before marking done
 * };
 * ```
 *
 * @see {@link CardGates} for the full gate state including approvals
 */
export interface CardCreateGates {
  /**
   * Whether a plan document is required before implementation begins.
   * When true, the card cannot transition to `in_progress` until the
   * plan is approved.
   */
  planRequired?: boolean;

  /**
   * Whether review is required before the card can be marked done.
   * When true, the card must transition through `needs_review` before
   * reaching `done` status.
   */
  reviewRequired?: boolean;
}

/**
 * Request body for `POST /cards`.
 *
 * Creates a new card with the specified metadata. The server generates
 * an ID based on the workspace branch prefix and an incrementing counter,
 * then populates `createdAt` and `updatedAt` timestamps automatically.
 *
 * @example
 * ```typescript
 * const request: CreateCardRequest = {
 *   title: 'Add user authentication',
 *   description: '## Overview\nImplement OAuth2 flow...',
 *   workspacePath: '/home/user/my-project',
 *   tags: ['feature', 'auth'],
 *   environment: 'production',
 *   gates: { planRequired: true, reviewRequired: true }
 * };
 * ```
 */
export interface CreateCardRequest {
  /**
   * Human-facing title shown in lists and headers.
   * Subject to {@link MAX_TITLE_LENGTH} validation.
   */
  title: string;

  /**
   * Markdown description content for the card body.
   * Subject to {@link MAX_DESCRIPTION_LENGTH} validation.
   */
  description: string;

  /**
   * Absolute filesystem path to the workspace repository.
   * Used to scope the card and derive its branch-based ID prefix.
   */
  workspacePath: string;

  /**
   * Tags for filtering and grouping.
   * Each tag is normalized to lowercase and validated against {@link TAG_PATTERN}.
   */
  tags?: string[];

  /**
   * Environment name for action execution targeting.
   * Must match a key in the settings.json `environments` object.
   * Defaults to `'default'` if omitted.
   */
  environment?: string;

  /**
   * Display order within the status column for drag-and-drop layouts.
   * Lower values appear first. Server assigns a default if omitted.
   */
  order?: number;

  /**
   * Gate requirements for the card's workflow.
   * Omitted gates default to `false` (not required).
   */
  gates?: CardCreateGates;

  /**
   * Full git author identity for commit attribution, e.g. `user <user@cards.local>`.
   * When omitted, commits use the card repo's git config default.
   */
  author?: string;
}

/**
 * Request body for `PATCH /cards/:id`.
 *
 * All fields are optional; only provided fields are updated. The `id` field
 * cannot be changed through this endpoint, and approval flags (`planApproved`,
 * `reviewApproved`) are protected and managed through dedicated gate endpoints.
 *
 * @example
 * ```typescript
 * // Update status and add a tag
 * const update: UpdateCardRequest = {
 *   status: 'in_progress',
 *   tags: ['feature', 'auth', 'urgent']
 * };
 * ```
 */
export interface UpdateCardRequest {
  /**
   * Updated title for the card.
   * Subject to {@link MAX_TITLE_LENGTH} validation.
   */
  title?: string;

  /**
   * Updated lifecycle status.
   * Transitions may be blocked by gate requirements.
   */
  status?: CardStatus;

  /**
   * Updated tags array. Replaces existing tags entirely rather than merging.
   * To add a tag, include all existing tags plus the new one.
   */
  tags?: string[];

  /**
   * Updated description content.
   * Subject to {@link MAX_DESCRIPTION_LENGTH} validation.
   */
  description?: string;

  /**
   * Whether the card should be pinned to the top of lists.
   * Pinned cards appear before unpinned cards regardless of order value.
   */
  isPinned?: boolean;

  /**
   * Updated display order within the status column.
   * Only affects position among cards with the same pinned state.
   */
  order?: number;

  /**
   * Full git author identity for commit attribution, e.g. `user <user@cards.local>`.
   * When omitted, commits use the card repo's git config default.
   */
  author?: string;
}

/**
 * Query parameters for `GET /cards`.
 *
 * All filter parameters are optional except `workspacePath`. Filters are
 * combined with AND semantics, so a card must match all specified criteria.
 *
 * @example
 * ```typescript
 * // Find in-progress cards tagged 'urgent'
 * const query: ListCardsRequest = {
 *   workspacePath: '/home/user/project',
 *   status: 'in_progress',
 *   tag: 'urgent',
 *   limit: 50
 * };
 * ```
 */
export interface ListCardsRequest {
  /**
   * Absolute filesystem path to the workspace repository.
   * Cards are scoped to this path.
   */
  workspacePath: string;

  /**
   * Filter by card status.
   * Only cards with this exact status are returned.
   */
  status?: CardStatus;

  /**
   * Filter by a single tag.
   * Cards must have this tag in their tags array.
   */
  tag?: string;

  /**
   * Full-text search query.
   * Searches title and description content.
   */
  search?: string;

  /**
   * Maximum number of cards to return.
   * Defaults to server configuration if omitted.
   */
  limit?: number;

  /**
   * Pagination offset.
   * Skip this many cards before returning results.
   */
  offset?: number;
}

/**
 * Response from card endpoints.
 *
 * This is an alias for the {@link Card} type, used here for clarity in
 * API contexts where the response shape is being documented.
 */
export type CardResponse = Card;

/**
 * Response from `GET /cards/:id/has-updates`.
 *
 * Used for polling-based update detection. Clients can compare the
 * `updatedAt` timestamp against their cached version to decide whether
 * to fetch fresh data.
 */
export interface HasUpdatesResponse {
  /**
   * Whether the card has updates since the baseline timestamp.
   * The baseline is typically the client's last known `updatedAt` value.
   */
  hasUpdates: boolean;

  /**
   * ISO 8601 timestamp of the card's most recent update.
   * Compare this with cached values to detect changes.
   */
  updatedAt: string;
}

// ============================================================================
// Comment API Types
// ============================================================================

/**
 * Request body for `POST /cards/:id/comments`.
 *
 * Creates a new comment on the specified card. The server generates
 * the comment ID and timestamps automatically.
 */
export interface CreateCommentRequest {
  /**
   * Full git author identity for commit attribution, e.g. `user <user@cards.local>`.
   * Passed verbatim as the git `--author` flag.
   */
  author: string;

  /**
   * Comment body content.
   * May contain markdown for rich formatting.
   */
  content: string;
}

/**
 * Request body for `PATCH /cards/:id/comments/:commentId`.
 *
 * Updates an existing comment's content. The `updatedAt` timestamp
 * is refreshed automatically by the server.
 */
export interface UpdateCommentRequest {
  /**
   * Updated comment content.
   * Replaces the existing content entirely.
   */
  content: string;
}

/**
 * Response from comment endpoints.
 *
 * This is an alias for the {@link Comment} type, used here for clarity in
 * API contexts where the response shape is being documented.
 */
export type CommentResponse = Comment;

// ============================================================================
// Attachment API Types
// ============================================================================

/**
 * Request body for `POST /cards/:id/attachments`.
 *
 * Uploads a file attachment to the specified card. The file data must be
 * base64-encoded. The server validates the content, generates a unique ID,
 * and stores the file in the card's attachments directory.
 */
export interface CreateAttachmentRequest {
  /**
   * Original filename of the attachment.
   * Used for display purposes and to derive the stored filename.
   */
  name: string;

  /**
   * Base64-encoded file data.
   * The server decodes this and validates the content type.
   */
  data: string;
}

/**
 * Response from attachment endpoints.
 *
 * Contains metadata about the stored attachment, including its sanitized
 * filename and detected MIME type. The `id` can be used to construct
 * URLs for retrieval or deletion.
 */
export interface AttachmentResponse {
  /**
   * Unique identifier for the attachment.
   * Format: `att-{uuid}_{sanitized-filename}`.
   */
  id: string;

  /**
   * Stored filename after sanitization.
   * May differ from `originalName` if special characters were removed.
   */
  name: string;

  /**
   * Original filename as uploaded by the client.
   * Preserved for display purposes even when the stored name differs.
   */
  originalName: string;

  /**
   * File size in bytes after decoding from base64.
   */
  size: number;

  /**
   * MIME type detected from the file content.
   * Used for content-type headers when serving the file.
   */
  mimeType: string;
}

// ============================================================================
// Timeline API Types
// ============================================================================

/**
 * Query parameters for `GET /cards/:id/timeline`.
 *
 * Supports cursor-based pagination for efficient loading of large timelines.
 * Items are returned in reverse chronological order (newest first).
 */
export interface TimelineRequest {
  /**
   * Cursor for pagination.
   * Fetch entries created before this ID. Typically the last item's ID
   * from the previous page.
   */
  before?: string;

  /**
   * Maximum number of entries to return.
   * Defaults to server configuration if omitted.
   */
  limit?: number;
}

/**
 * Response from timeline endpoints.
 *
 * An array of {@link TimelineItem} entries in reverse chronological order.
 * Each item has a `type` discriminator for union narrowing.
 */
export type TimelineResponse = TimelineItem[];

// ============================================================================
// Plan API Types
// ============================================================================

/**
 * Request body for `PUT /cards/:id/plan`.
 *
 * Creates or updates the plan document for a card. Plans are stored as
 * separate markdown files and can be gated for approval before work begins.
 */
export interface UpdatePlanRequest {
  /**
   * Plan markdown content.
   * Typically includes goals, approach, and acceptance criteria.
   */
  content: string;
}

/**
 * Response from plan endpoints.
 *
 * Returns the current plan content for the card.
 */
export interface PlanResponse {
  /**
   * Plan markdown content.
   * Empty string if no plan has been created.
   */
  content: string;
}

// ============================================================================
// Commit API Types
// ============================================================================

/**
 * Request body for `POST /cards/:id/commits`.
 *
 * Associates a git commit with a card for timeline tracking. Commit details
 * (message, author, stats) are fetched from git at read time using the
 * workspace repository path stored in `repository_identities`.
 */
export interface AddCommitRequest {
  /**
   * Full 40-character git commit SHA hash.
   * Abbreviated hashes are not accepted.
   */
  sha: string;
}

/**
 * Response from commit attribution endpoints.
 *
 * Confirms the commit association and includes the timestamp of when
 * the association was created.
 */
export interface CommitAttributionResponse {
  /**
   * Full commit SHA as stored.
   */
  sha: string;

  /**
   * ISO 8601 timestamp when the commit was associated with the card.
   */
  createdAt: string;
}

// ============================================================================
// Gate API Types
// ============================================================================

/**
 * Valid gate names for approval endpoints.
 *
 * Used with `POST /cards/:id/gates/:gateName/approve` to approve
 * workflow gates.
 */
export type GateName = 'plan' | 'review';

/**
 * Response from `POST /cards/:id/gates/:gateName/approve`.
 *
 * Returns the updated card with the gate approval applied. The corresponding
 * `*Approved` flag in the card's gates will be `true`.
 */
export type GateApprovalResponse = CardResponse;

// ============================================================================
// Tags API Types
// ============================================================================

/**
 * Query parameters for `GET /tags`.
 *
 * Retrieves all unique tags used across cards in a workspace.
 */
export interface ListTagsRequest {
  /**
   * Absolute filesystem path to the workspace repository.
   * Tags are aggregated from all cards scoped to this path.
   */
  workspacePath: string;
}

/**
 * Response from `GET /tags`.
 *
 * An array of unique tag strings used across the workspace's cards.
 * Tags are normalized to lowercase.
 */
export type TagsResponse = string[];

// ============================================================================
// Environment API Types
// ============================================================================

/**
 * Summary of an action for environment API responses.
 *
 * Excludes command details for security - clients see only the metadata
 * needed to render UI buttons and tooltips. The actual commands are
 * executed server-side.
 */
export interface ActionSummaryResponse {
  /**
   * Stable identifier for the action.
   * Used for telemetry and localization keys.
   */
  id: string;

  /**
   * Display name shown on the action button.
   */
  name: string;

  /**
   * Human-readable description shown in the button tooltip.
   */
  description?: string;

  /**
   * Path to icon file for the action button.
   * May use path variables like `${workspaceRoot}`.
   */
  icon?: string;

  /**
   * Whether the execution mode toggle is shown.
   * When true, users can choose between interactive and background modes.
   */
  supportsBackgroundMode?: boolean;

  /**
   * Whether multiple instances can run on the same card simultaneously.
   * When false, starting a new instance cancels any existing one.
   */
  allowConcurrent?: boolean;
}

/**
 * Response item from `GET /environments`.
 *
 * Represents a single environment with its available actions.
 */
export interface EnvironmentInfo {
  /**
   * Environment name identifier.
   * Matches a key in the settings.json `environments` object.
   */
  name: string;

  /**
   * Human-readable description for the environment selector tooltip.
   */
  description?: string;

  /**
   * Actions available in this environment.
   * May be empty if the environment is misconfigured.
   */
  actions: ActionSummaryResponse[];
}

/**
 * Response from `GET /environments`.
 *
 * An array of available environments, each containing its action summaries.
 */
export type EnvironmentsResponse = EnvironmentInfo[];

// ============================================================================
// Health API Types
// ============================================================================

/**
 * Response from `GET /health`.
 *
 * Used for monitoring and load balancer health checks. The response
 * indicates the server is operational and accepting requests.
 */
export interface HealthResponse {
  /**
   * Health status indicator.
   * Currently always `'healthy'` when the endpoint responds.
   */
  status: 'healthy';

  /**
   * Server uptime in seconds since the process started.
   */
  uptime: number;

  /**
   * ISO 8601 timestamp of when this health check was performed.
   */
  timestamp: string;

  /**
   * Component health details.
   * Includes status of subsystems like WebSocket connections.
   */
  components: {
    websocket: {
      status: 'healthy';
      connections: number;
    };
  };
}

// ============================================================================
// Typed File API Types
// ============================================================================

/**
 * Response from typed file `PUT` endpoint.
 *
 * Returns metadata about the stored typed file after validation.
 * The validator may inject additional metadata which is included here.
 */
export interface TypedFileResponse {
  /**
   * Type name from configuration.
   * Matches a key in the environment's `types` object.
   */
  typeName: string;

  /**
   * File name within the type directory.
   * Sanitized from the original upload name.
   */
  fileName: string;

  /**
   * MIME content type of the stored file.
   * Detected from file content, not the extension.
   */
  contentType: string;

  /**
   * SHA-256 hash of the file content in hexadecimal.
   * Can be used for deduplication or integrity checks.
   */
  sha256: string;

  /**
   * Type identifier echoed from the validation response.
   */
  type: string;

  /**
   * Type version from the validator configuration.
   * Indicates which schema version was used for validation.
   */
  typeVersion: string;

  /**
   * Additional metadata produced by the type validator.
   * Schema varies by type definition.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Response from typed file list endpoint.
 *
 * Returns metadata for all typed files of a specific type within a card.
 */
export interface TypedFileListResponse {
  /**
   * Array of typed file metadata.
   * Empty array if no files of the requested type exist.
   */
  files: TypedFileResponse[];
}

// ============================================================================
// Internal API Types
// ============================================================================

/**
 * Request body for `POST /internal/reindex`.
 *
 * Triggers reindexing of card data in the database. This is an internal
 * endpoint used for maintenance and recovery operations.
 */
export interface ReindexRequest {
  /**
   * Specific card ID to reindex.
   * If omitted, all cards in the workspace are reindexed.
   */
  cardId?: string;

  /**
   * Workspace path for scoping the reindex operation.
   * Currently unused but reserved for future multi-workspace support.
   */
  workspacePath?: string;
}

/**
 * Response from `POST /internal/reindex`.
 *
 * Confirms the reindex operation completed successfully.
 */
export interface ReindexResponse {
  /**
   * Whether the operation succeeded.
   * Always `true` in the success response; errors throw instead.
   */
  success: true;
}

/**
 * Response from `GET /internal/connections`.
 *
 * Returns information about active WebSocket connections for debugging
 * and monitoring purposes.
 */
export interface ConnectionsResponse {
  /**
   * Number of active WebSocket connections.
   */
  count: number;

  /**
   * Connection identifiers.
   * Currently returns an empty array; reserved for future use.
   */
  connectionIds: string[];
}

/**
 * Response from `GET /internal/activity-state`.
 *
 * Indicates whether the server is considered active based on
 * connection count and recent activity.
 */
export interface ActivityStateResponse {
  /**
   * Number of active WebSocket connections.
   */
  activeConnections: number;

  /**
   * Whether the server is considered active.
   * True when at least one connection exists.
   */
  isActive: boolean;
}
