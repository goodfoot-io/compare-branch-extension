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
 * Result returned by the discovery function.
 *
 * On success, provides the current WebSocket URL and access token.
 * On failure, provides an error message describing why discovery failed.
 */
export type DiscoverResult = { wsUrl: string; accessToken: string } | { error: string };

/**
 * Configuration options for {@link EventSubscriber}.
 */
export interface EventSubscriberOptions {
  /** WebSocket endpoint URL. */
  wsUrl: string;
  /** Bearer token appended as a `?token=` query parameter. */
  accessToken: string;
  /**
   * Called before each reconnection attempt to resolve the current server URL
   * and access token. Required to handle server restarts on new ports.
   */
  discover: () => Promise<DiscoverResult>;
  /** Maximum reconnection attempts before giving up (default Infinity). */
  maxReconnectAttempts?: number;
}
