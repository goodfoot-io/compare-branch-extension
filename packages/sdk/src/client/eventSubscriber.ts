/**
 * WebSocket event subscriber for the Cards V2 real-time API.
 *
 *
 * @summary WebSocket event subscriber for the Cards V2 real-time API
 * @module sdk/EventSubscriber
 */

import type { DiscoverResult, EventCallback, EventMap, EventSubscriberOptions } from './types/events.js';

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
 * Before each reconnection attempt, the `discover` function is called to
 * resolve the current server URL and access token, enabling resilient
 * reconnection when the server restarts on a new port.
 *
 * @example
 * ```typescript
 * const events = new EventSubscriber({
 *   wsUrl: 'ws://localhost:3000/events',
 *   accessToken: 'token',
 *   discover: async () => ({ wsUrl: 'ws://localhost:3000/events', accessToken: 'token' })
 * });
 *
 * events.on('cards:metadata', (e) => {
 *   console.log(`Card ${e.cardId} metadata updated`);
 * });
 *
 * await events.connect();
 * ```
 */
export class EventSubscriber {
  private ws: WebSocket | null = null;
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private callbacks: Map<string, Set<EventCallback<keyof EventMap>>> = new Map();
  private shouldReconnect: boolean = false;
  private connectionChangeCallbacks: Set<(connected: boolean) => void> = new Set();
  private hasConnected: boolean = false;
  private readonly maxReconnectAttempts: number;
  private rawHandlers: Array<(message: Record<string, unknown>) => void> = [];

  /**
   * Creates a new EventSubscriber instance.
   *
   * @param options - WebSocket URL, auth token, discover function, and reconnect limits.
   */
  constructor(private readonly options: EventSubscriberOptions) {
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? Infinity;
  }

  /**
   * Gets the WebSocket URL.
   *
   * Returns the construction-time URL from options. Discovered URLs are transient
   * and are not reflected here.
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
   * Registers a callback invoked when the connection state changes.
   *
   * Callbacks are only invoked after the first successful connection. This
   * prevents a spurious `false` during the initial connection attempt.
   *
   * @param callback - Function called with `true` on connect, `false` on disconnect.
   * @returns Unsubscribe function to remove this callback.
   */
  onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionChangeCallbacks.add(callback);
    return () => {
      this.connectionChangeCallbacks.delete(callback);
    };
  }

  /**
   * Connects to the WebSocket server and starts listening for events.
   *
   * When `overrides` are provided (e.g. from a discovery result), those values
   * are used for this connection instead of the construction-time options.
   * The access token is always appended as a `?token=` query parameter.
   * Connection failures reject the returned promise.
   *
   * @param overrides - Optional URL and token to use instead of construction-time options.
   * @param overrides.wsUrl - WebSocket URL to connect to.
   * @param overrides.accessToken - Bearer token for authentication.
   * @returns Promise that resolves when the socket opens.
   */
  async connect(overrides?: { wsUrl: string; accessToken: string }): Promise<void> {
    const wsUrl = overrides?.wsUrl ?? this.options.wsUrl;
    const accessToken = overrides?.accessToken ?? this.options.accessToken;
    const url = `${wsUrl}?token=${encodeURIComponent(accessToken)}`;

    this.ws = new globalThis.WebSocket(url);
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
        this.hasConnected = true;
        this.reconnectAttempts = 0;
        cleanup();
        for (const cb of this.connectionChangeCallbacks) {
          cb(true);
        }
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
        if (this.hasConnected) {
          for (const cb of this.connectionChangeCallbacks) {
            cb(false);
          }
        }
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
   * Sends a JSON-serialized message on the active WebSocket connection.
   *
   * Throws if the subscriber is not currently connected (fail closed).
   *
   * @param data - Arbitrary key-value payload to JSON-serialize and send.
   * @throws Error when the subscriber is not connected.
   */
  send(data: Record<string, unknown>): void {
    if (!this.isConnected()) {
      throw new Error('Cannot send: EventSubscriber is not connected');
    }
    this.ws!.send(JSON.stringify(data));
  }

  /**
   * Schedules a reconnection attempt with exponential backoff.
   *
   * Before connecting, calls `discover()` to resolve the current server URL and
   * access token. If discovery returns an error or throws, the attempt is counted
   * toward `maxReconnectAttempts` and the next attempt is scheduled.
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Check if we've exhausted reconnection attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.shouldReconnect = false;
      return;
    }

    const backoffMs = calculateBackoffMs(this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (!this.shouldReconnect) {
        return;
      }

      this.options
        .discover()
        .then((result: DiscoverResult) => {
          if (!this.shouldReconnect) {
            return;
          }
          if ('error' in result) {
            console.warn(
              `[EventSubscriber] Discovery failed before reconnect attempt ${this.reconnectAttempts}:`,
              result.error
            );
            this.scheduleReconnect();
            return;
          }
          // Connection failure triggers close handler which calls scheduleReconnect
          this.connect({ wsUrl: result.wsUrl, accessToken: result.accessToken }).catch((err) => {
            console.warn(
              `[EventSubscriber] Reconnection attempt ${this.reconnectAttempts} failed:`,
              err instanceof Error ? err.message : String(err)
            );
          });
        })
        .catch((err: unknown) => {
          if (!this.shouldReconnect) {
            return;
          }
          console.warn(
            `[EventSubscriber] Discovery threw before reconnect attempt ${this.reconnectAttempts}:`,
            err instanceof Error ? err.message : String(err)
          );
          this.scheduleReconnect();
        });
    }, backoffMs);
  }

  /**
   * Registers a handler invoked for every successfully parsed incoming message,
   * regardless of type. Fires after typed callbacks, and is not suppressed by
   * errors thrown inside typed callbacks.
   *
   * @param handler - Function called with the raw parsed message object.
   * @returns Unsubscribe function to remove this handler.
   */
  onRawMessage(handler: (message: Record<string, unknown>) => void): () => void {
    this.rawHandlers.push(handler);
    return () => {
      const i = this.rawHandlers.indexOf(handler);
      if (i !== -1) this.rawHandlers.splice(i, 1);
    };
  }

  /**
   * Handles incoming WebSocket messages and dispatches to registered callbacks.
   *
   * Messages are expected to be JSON with a `type` field matching {@link EventMap}.
   *
   * @param event - Browser WebSocket message event containing the serialized payload.
   */
  private handleMessage(event: MessageEvent): void {
    let message: { type: keyof EventMap; [key: string]: unknown } | undefined;
    try {
      message = JSON.parse(event.data as string);
      const callbacks = this.callbacks.get(message!.type);
      if (callbacks) {
        for (const callback of callbacks) {
          (callback as (event: unknown) => void)(message);
        }
      }
    } catch (error) {
      console.warn('Failed to parse WebSocket message:', error);
    }
    if (message !== undefined) {
      for (const handler of this.rawHandlers) {
        handler(message as Record<string, unknown>);
      }
    }
  }
}
