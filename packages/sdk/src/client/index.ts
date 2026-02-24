/**
 * HTTP client for CRUD operations against the Cards V2 REST API and a
 * WebSocket event subscriber for real-time card, timeline, and stream
 * change notifications.
 *
 * @summary REST client, WebSocket event subscriber, and API discovery for the Cards V2 API
 * @module
 */

// Compare types (re-exported from protocol for convenience)
export type {
  CompareBranchRangeRequest,
  CompareDynamicRequest,
  CompareFixedAttributionRequest,
  CompareMode,
  CompareRequest,
  CompareState
} from '../protocol/index.js';
export { CardsClient } from './cardsClient.js';
export { calculateBackoffMs, EventSubscriber } from './eventSubscriber.js';
// Client types
export type {
  AddBranchRequest,
  AttachmentResponse,
  BranchesResponse,
  BranchInfo,
  CardCreateData,
  CardsClientOptions,
  CardUpdateData,
  ListCardsOptions,
  StreamResult,
  StreamWriter,
  StreamWriterOptions,
  TimelineOptions,
  TypeSchemaInfo,
  TypeSchemasResponse
} from './types/client.js';
// Error classes
export { ApiError, NetworkError } from './types/errors.js';
// Event types
export type { EventCallback, EventMap, EventSubscriberOptions } from './types/events.js';
// WebSocket types
export type { WebSocketFactory } from './types/websocket.js';
