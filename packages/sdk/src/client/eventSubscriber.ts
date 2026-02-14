/**
 * WebSocket event subscriber for the Cards V2 real-time API.
 *
 *
 * @summary WebSocket event subscriber for the Cards V2 real-time API
 * @module sdk/EventSubscriber
 */

import type { EventCallback, EventMap, EventSubscriberOptions } from './types/events.js';
import type { WebSocketFactory } from './types/websocket.js';

/**
 * Calculates exponential backoff delay for reconnection attempts.
 *
 * @param attempt - The current attempt number (0-indexed).
 * @param maxMs - Maximum delay in milliseconds (default 30000).
 * @returns Delay in milliseconds: 1000, 2000, 4000, 8000, 16000, capped at `maxMs`.
 */
export function calculateBackoffMs(attempt: number, maxMs = 30000): number {
  return Math.min(1000 * 2 ** attempt, maxMs);
}

/**
 * Real-time event subscriber with automatic reconnection.
 *
 * Provides a type-safe interface for subscribing to server-sent events over
 * WebSocket. Event handlers persist across reconnects, so listeners only need
 * to be registered once.
 *
 * @example
 * ```typescript
 * const events = new EventSubscriber({ wsUrl: 'ws://localhost:3000/events', accessToken: 'token' });
 *
 * events.on('card:metadataChanged', (e) => {
 *   console.log(`Card ${e.cardId} changed: ${e.changes.join(', ')}`);
 * });
 *
 * await events.connect();
 * ```
 */
export class EventSubscriber {
  private readonly wsFactory?: WebSocketFactory;
  private ws: WebSocket | null = null;
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private callbacks: Map<string, Set<EventCallback<keyof EventMap>>> = new Map();
  private shouldReconnect: boolean = false;
  private exhaustionCallbacks: Set<() => void> = new Set();
  private readonly maxReconnectAttempts: number;

  private readonly defaultWsFactory: WebSocketFactory = {
    create: (url: string, protocols?: string | string[]) => new WebSocket(url, protocols)
  };

  /**
   * Creates a new EventSubscriber instance.
   *
   * @param options - WebSocket URL, auth token, and reconnect limits.
   * @param wsFactory - Optional WebSocket factory for dependency injection.
   */
  constructor(
    private readonly options: EventSubscriberOptions,
    wsFactory?: WebSocketFactory
  ) {
    this.wsFactory = wsFactory;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;
  }

  /**
   * Returns whether a WebSocket factory was provided (for testing).
   *
   * @returns True when a custom WebSocket factory was injected.
   */
  hasWebSocketFactory(): boolean {
    return this.wsFactory !== undefined;
  }

  /**
   * Gets the WebSocket factory to use for creating connections.
   *
   * @returns The injected factory, or the default browser-backed implementation.
   */
  private getWsFactory(): WebSocketFactory {
    return this.wsFactory ?? this.defaultWsFactory;
  }

  /**
   * Gets the WebSocket URL.
   *
   * @returns The configured WebSocket endpoint URL.
   */
  getWsUrl(): string {
    return this.options.wsUrl;
  }

  /**
   * Returns whether the subscriber is currently connected.
   *
   * @returns True when the active socket connection is open.
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Subscribes to an event type.
   *
   * @param event - Event key from {@link EventMap}.
   * @param callback - Handler invoked for matching events.
   */
  on<K extends keyof EventMap>(event: K, callback: EventCallback<K>): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, new Set());
    }
    (this.callbacks.get(event) as Set<EventCallback<K>>).add(callback);
  }

  /**
   * Unsubscribes from an event type.
   *
   * @param event - Event key from {@link EventMap}.
   * @param callback - Previously registered handler.
   */
  off<K extends keyof EventMap>(event: K, callback: EventCallback<K>): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      (callbacks as Set<EventCallback<K>>).delete(callback);
    }
  }

  /**
   * Registers a callback invoked when reconnection attempts are exhausted.
   *
   * @param callback - Function to call when max reconnect attempts are reached.
   * @returns Unsubscribe function to remove this callback.
   */
  onExhausted(callback: () => void): () => void {
    this.exhaustionCallbacks.add(callback);
    return () => {
      this.exhaustionCallbacks.delete(callback);
    };
  }

  /**
   * Connects to the WebSocket server and starts listening for events.
   *
   * The access token is appended as a `?token=` query parameter when provided.
   * Connection failures reject the returned promise.
   *
   * @returns Promise that resolves when the socket opens.
   */
  async connect(): Promise<void> {
    let url = this.options.wsUrl;
    if (this.options.accessToken) {
      url = `${url}?token=${this.options.accessToken}`;
    }

    const factory = this.getWsFactory();
    this.ws = factory.create(url);
    this.shouldReconnect = true;

    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('Failed to create WebSocket'));
        return;
      }

      const ws = this.ws;

      const cleanup = (): void => {
        ws.removeEventListener('open', onOpen);
        ws.removeEventListener('error', onError);
      };

      const onOpen = (): void => {
        this.connected = true;
        this.reconnectAttempts = 0;
        cleanup();
        resolve();
      };

      const onError = (event: Event): void => {
        cleanup();
        reject(new Error(`WebSocket connection failed: ${event.type}`));
      };

      ws.addEventListener('open', onOpen);
      ws.addEventListener('error', onError);
      ws.addEventListener('close', () => {
        this.connected = false;
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      });
      ws.addEventListener('message', (event: MessageEvent) => {
        this.handleMessage(event);
      });
    });
  }

  /**
   * Disconnects from the WebSocket server and disables auto-reconnect.
   *
   * Registered callbacks are preserved, so calling {@link connect} again will
   * resume dispatching without re-registering listeners.
   */
  disconnect(): void {
    this.shouldReconnect = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connected = false;
  }

  /**
   * Schedules a reconnection attempt with exponential backoff.
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Check if we've exhausted reconnection attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.shouldReconnect = false;
      // Call all exhaustion callbacks
      for (const callback of this.exhaustionCallbacks) {
        callback();
      }
      return;
    }

    const backoffMs = calculateBackoffMs(this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.shouldReconnect) {
        // Connection failure triggers close handler which calls scheduleReconnect
        this.connect().catch((err) => {
          console.warn(
            `[EventSubscriber] Reconnection attempt ${this.reconnectAttempts} failed:`,
            err instanceof Error ? err.message : String(err)
          );
        });
      }
    }, backoffMs);
  }

  /**
   * Handles incoming WebSocket messages and dispatches to registered callbacks.
   *
   * Messages are expected to be JSON with a `type` field matching {@link EventMap}.
   *
   * @param event - Browser WebSocket message event containing the serialized payload.
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data as string) as { type: keyof EventMap; [key: string]: unknown };
      const callbacks = this.callbacks.get(message.type);
      if (callbacks) {
        for (const callback of callbacks) {
          (callback as (event: unknown) => void)(message);
        }
      }
    } catch (error) {
      console.warn('Failed to parse WebSocket message:', error);
    }
  }
}
