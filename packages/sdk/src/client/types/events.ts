/**
 * Client-side event types for the WebSocket event subscriber.
 *
 * @summary Client-side event types for the WebSocket event subscriber
 * @module client/types/events
 */

import type { DomainEvent } from '../../protocol/types/events.js';

/**
 * Maps each domain event's `type` discriminator to its full payload interface.
 *
 * Used by {@link EventSubscriber} to provide type-safe `on`/`off` methods.
 */
export type EventMap = {
  [E in DomainEvent as E['type']]: E;
};

/**
 * Type-safe callback for a specific event type.
 *
 * @template K - Event key from {@link EventMap}.
 */
export type EventCallback<K extends keyof EventMap> = (event: EventMap[K]) => void;

/**
 * Configuration options for {@link EventSubscriber}.
 */
export interface EventSubscriberOptions {
  /** WebSocket endpoint URL. */
  wsUrl: string;
  /** Optional bearer token appended as a `?token=` query parameter. */
  accessToken?: string;
  /** Maximum reconnection attempts before giving up (default Infinity). */
  maxReconnectAttempts?: number;
}
