/**
 * Client SDK type definitions for the Cards V2 HTTP API.
 *
 * This module provides SDK-specific types (configuration, convenience options)
 * and re-exports shared API types from @cards/protocol for consistency.
 *
 * @module types/client
 */

import type { CardStatus, Comment as ProtocolComment } from '../../protocol/index.js';

// Re-export shared API types from protocol for backwards compatibility
// These are the canonical wire-level types used by both client and server
export type {
  AttachmentResponse,
  CardCreateGates,
  CardResponse,
  CommitAttributionResponse,
  CreateAttachmentRequest,
  CreateCardRequest,
  CreateCommentRequest,
  EnvironmentInfo,
  EnvironmentsResponse,
  GateName,
  HasUpdatesResponse,
  ListCardsRequest,
  ListTagsRequest,
  PlanResponse,
  TagsResponse,
  TimelineRequest,
  TimelineResponse,
  UpdateCardRequest,
  UpdateCommentRequest,
  UpdatePlanRequest
} from '../../protocol/index.js';

// ============================================================================
// SDK Configuration Types
// ============================================================================

/**
 * Configuration options for the CardsClient.
 *
 * This is SDK-specific configuration, not an API request type.
 */
export interface CardsClientOptions {
  /** Base URL of the Cards V2 server API (including scheme and host). */
  baseUrl: string;
  /** Access token for authentication (if required by the server). */
  accessToken?: string;
  /** Workspace path for scoping API requests. */
  workspacePath?: string;
}

// ============================================================================
// SDK Convenience Types
// ============================================================================

/**
 * Options for filtering cards when listing.
 *
 * This is a convenience type for the SDK - the actual API request includes
 * workspacePath from CardsClientOptions automatically.
 */
export interface ListCardsOptions {
  /** Filter by card status. */
  status?: CardStatus;
  /** Filter by a single tag name. */
  tag?: string;
  /** Search query string (server-side). */
  search?: string;
  /** Maximum number of results to return. */
  limit?: number;
  /** Offset for pagination. */
  offset?: number;
}

/**
 * Options for fetching timeline entries.
 *
 * This is a convenience type matching TimelineRequest from protocol.
 */
export interface TimelineOptions {
  /** Fetch entries before this cursor. */
  before?: string;
  /** Maximum number of entries to return. */
  limit?: number;
}

// ============================================================================
// SDK Input Types (User-facing, without infrastructure fields)
// ============================================================================

/**
 * Data required to create a new card (SDK input).
 *
 * This is the user-facing type for card creation. The SDK automatically adds
 * workspacePath from CardsClientOptions before sending to the API.
 *
 * @see CreateCardRequest for the full wire-level type including workspacePath
 */
export interface CardCreateData {
  /** Title of the card. */
  title: string;
  /** Description of the card in markdown. */
  description: string;
  /** Optional tags for categorization and search. */
  tags?: string[];
  /** Optional environment name for deployment targeting. */
  environmentName?: string;
  /** Optional repository key for linking to source control. */
  repositoryKey?: string;
  /** Optional gate requirements for the card. */
  gates?: {
    planRequired?: boolean;
    reviewRequired?: boolean;
  };
}

/**
 * Data for updating an existing card (SDK input).
 *
 * @see UpdateCardRequest for the canonical wire-level type
 */
export interface CardUpdateData {
  /** New title for the card. */
  title?: string;
  /** New description for the card. */
  description?: string;
  /** New status for the card. */
  status?: CardStatus;
  /** New tags for the card. */
  tags?: string[];
  /** Whether the card is pinned. */
  isPinned?: boolean;
  /** Display order for sorting within status. */
  order?: number;
}

/**
 * Data required to create a new comment (SDK input).
 *
 * Note: The server's CreateCommentRequest requires 'author', but the SDK
 * may default this. This type matches the SDK's public interface.
 */
export interface CommentCreateData {
  /** Content of the comment in markdown. */
  content: string;
  /** Optional author name (SDK may provide default). */
  author?: string;
}

/**
 * Data for updating an existing comment (SDK input).
 */
export interface CommentUpdateData {
  /** New content for the comment. */
  content?: string;
}

// ============================================================================
// Response Types (SDK-specific aliases)
// ============================================================================

/**
 * A comment on a card (SDK response type).
 *
 * This extends the protocol Comment type for SDK contexts.
 */
export interface Comment extends ProtocolComment {
  /** ID of the parent card (SDK convenience field). */
  cardId?: string;
}

/**
 * Response from approving a gate.
 *
 * This is an SDK-specific response type. The actual API returns the updated card.
 */
export interface GateApprovalResponse {
  /** ID of the card the gate belongs to. */
  cardId: string;
  /** Name of the gate that was approved. */
  gateName: 'plan' | 'review';
  /** Whether the gate was successfully approved. */
  approved: boolean;
  /** ISO 8601 timestamp when the gate was approved. */
  approvedAt: string;
}

/**
 * Information about a commit associated with a card.
 */
export interface CommitInfo {
  /** Git commit SHA. */
  sha: string;
  /** ISO 8601 timestamp when the commit was added. */
  createdAt: string;
}
