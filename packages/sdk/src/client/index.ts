/**
 * @cards/sdk/client
 *
 * REST client and WebSocket event subscriber for Cards V2 API.
 *
 * @module
 */

export { CardsClient } from './cardsClient.js';
export { calculateBackoffMs, EventSubscriber } from './eventSubscriber.js';
// Client types
export type {
  AttachmentResponse,
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
