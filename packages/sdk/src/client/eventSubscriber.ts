/**
 * WebSocket event subscriber for the Cards V2 real-time API.
 *
 *
 * @summary WebSocket event subscriber for the Cards V2 real-time API
 * @module sdk/EventSubscriber
 */

import type {
  DiscoverResult,
  EventCallback,
  EventMap,
  EventSubscriberLogger,
  EventSubscriberOptions
} from './types/events.js';

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
  private readonly logger: EventSubscriberLogger;
  private rawHandlers: Array<(message: Record<string, unknown>) => void> = [];
  /**
   * Monotonically increasing counter incremented on every manual `connect()` call.
   * Each scheduled reconnect timer captures the generation at scheduling time and
   * bails if the generation has advanced, preventing stale timer callbacks from
   * creating phantom sockets after a manual reconnect supersedes them.
   */
  private connectGeneration: number = 0;

  // --- Heartbeat state ---
  /** App-level ping interval timer. Set after a successful connect, cleared on disconnect. */
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  /**
   * Number of consecutive pings that received no pong reply.
   * Incremented on each ping send, reset to 0 on each pong received.
   * The socket is closed and reconnection triggered after
   * {@link MISSED_PONG_LIMIT} consecutive misses.
   */
  private missedPongs: number = 0;
  /**
   * Number of consecutive missed pongs that triggers a forced disconnect.
   * Set to 2 so a dead connection is detected within ~60 s (2 × 30 s) even
   * when one pong response is lost due to throttled background timers in
   * VS Code webviews.
   */
  private static readonly MISSED_PONG_LIMIT = 2;
  /** Interval between client-initiated app-level ping messages, in ms. */
  private static readonly HEARTBEAT_INTERVAL_MS = 30_000;

  /**
   * Creates a new EventSubscriber instance.
   *
   * @param options - WebSocket URL, auth token, discover function, and reconnect limits.
   */
  constructor(private readonly options: EventSubscriberOptions) {
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? Infinity;
    this.logger = options.logger ?? { warn: (message, details) => console.warn(message, details) };
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
   * The access token is always appended as a `?token=` query parameter.
   * Connection failures reject the returned promise. If a newer `connect()`
   * call supersedes this one before its socket opens, the returned promise
   * rejects with an `'Superseded by a newer connect()'` error rather than
   * hanging.
   *
   * Any pending backoff timer is cancelled and the reconnect-attempt counter is
   * reset so the next auto-reconnect sequence (should this call also fail) starts
   * fresh at 1 000 ms rather than continuing from wherever a prior sequence left
   * off.
   *
   * @returns Promise that resolves when the socket opens.
   */
  async connect(): Promise<void> {
    // Advance the generation counter so any stale timer callbacks scheduled
    // before this call will bail out when they fire and find their captured
    // generation no longer matches.
    this.connectGeneration++;

    // Cancel any pending backoff timer so a manual connect() call does not race
    // with a scheduled reconnect that would create a second socket once the
    // timer fires.
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Reset the attempt counter so that if this manual connect also fails,
    // the subsequent auto-reconnect backoff sequence starts fresh at 1000 ms
    // rather than continuing from wherever a prior sequence left off.
    this.reconnectAttempts = 0;

    return this._openSocket(this.options.wsUrl, this.options.accessToken);
  }

  /**
   * Opens a WebSocket to the given URL and token.
   *
   * This is the internal socket-creation path shared by the public {@link connect}
   * and the auto-reconnect scheduler. It does NOT advance the generation counter,
   * cancel pending timers, or reset the attempt counter — callers are responsible
   * for those invariants.
   *
   * @param wsUrl - WebSocket endpoint URL.
   * @param accessToken - Bearer token appended as `?token=`.
   * @returns Promise that resolves when the socket opens.
   */
  private async _openSocket(wsUrl: string, accessToken: string): Promise<void> {
    const url = `${wsUrl}?token=${encodeURIComponent(accessToken)}`;

    // Close any existing socket before creating a new one to prevent parallel
    // reconnect loops from orphaned sockets whose close handler still fires.
    // Null this.ws BEFORE closing so the close handler's stale-socket guard
    // (ws !== this.ws) suppresses connectionChange callbacks for the old socket.
    this._stopHeartbeat();
    const oldWs = this.ws;
    this.ws = null;
    if (oldWs) {
      oldWs.close();
    }

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
        // Ignore open events from a stale socket that has already been replaced
        // by a concurrent connect() call. Reject this promise so the superseded
        // caller does not hang; the newer connect()'s promise governs state.
        if (ws !== this.ws) {
          cleanup();
          reject(new Error('Superseded by a newer connect()'));
          return;
        }
        this.connected = true;
        this.hasConnected = true;
        this.reconnectAttempts = 0;
        cleanup();
        this._startHeartbeat();
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
        // Ignore events from stale sockets that have already been replaced
        // (e.g., by a concurrent connect() call). Only the current socket's
        // close event should trigger state changes and reconnection.
        if (ws !== this.ws) return;

        this.connected = false;
        this._stopHeartbeat();
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
        // Ignore messages from a stale socket that has already been replaced.
        if (ws !== this.ws) return;
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

    this._stopHeartbeat();

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

    // Capture the current generation so the callback can detect whether a
    // manual connect() call has superseded this scheduled attempt.
    const generation = this.connectGeneration;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (!this.shouldReconnect || this.connectGeneration !== generation) {
        return;
      }

      this.options
        .discover()
        .then((result: DiscoverResult) => {
          if (!this.shouldReconnect) {
            return;
          }
          if ('error' in result) {
            this.logger.warn(
              `[EventSubscriber] Discovery failed before reconnect attempt ${this.reconnectAttempts}:`,
              result.error
            );
            this.scheduleReconnect();
            return;
          }
          // Connection failure triggers close handler which calls scheduleReconnect
          this._openSocket(result.wsUrl, result.accessToken).catch((err) => {
            this.logger.warn(
              `[EventSubscriber] Reconnection attempt ${this.reconnectAttempts} failed:`,
              err instanceof Error ? err.message : String(err)
            );
          });
        })
        .catch((err: unknown) => {
          if (!this.shouldReconnect) {
            return;
          }
          this.logger.warn(
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
  /**
   * Starts the app-level heartbeat. Sends `{ type: 'ping' }` every
   * {@link HEARTBEAT_INTERVAL_MS} and tracks missed pongs; closes the socket
   * after {@link MISSED_PONG_LIMIT} consecutive misses to trigger reconnection.
   *
   * Protocol-level pings (sent by the server every 30 s) are invisible to
   * browser JavaScript, so an app-level exchange is required for liveness
   * detection. Two consecutive misses tolerate one lost response (e.g., due
   * to throttled timers in a backgrounded VS Code webview).
   *
   * Defensive: any pre-existing heartbeat interval is stopped first so a second
   * invocation can never leak a timer.
   */
  private _startHeartbeat(): void {
    this._stopHeartbeat();
    this.missedPongs = 0;
    this.heartbeatInterval = setInterval(() => {
      if (!this.isConnected()) return;
      this.missedPongs++;
      if (this.missedPongs >= EventSubscriber.MISSED_PONG_LIMIT) {
        this.logger.warn(`[EventSubscriber] Missed ${this.missedPongs} pongs — closing connection for reconnect`);
        if (this.ws) {
          this.ws.close();
          this.ws = null;
        }
        this.connected = false;
        this._stopHeartbeat();
        if (this.hasConnected) {
          for (const cb of this.connectionChangeCallbacks) {
            cb(false);
          }
        }
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
        return;
      }
      try {
        this.send({ type: 'ping' });
      } catch (err) {
        // send() throws when not connected — possible race between
        // isConnected() check and a socket close. The missed-pong
        // counter above will trigger reconnect naturally.
        this.logger.warn('[EventSubscriber] heartbeat ping failed:', err);
      }
    }, EventSubscriber.HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Stops the heartbeat interval timer.
   */
  private _stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleMessage(event: MessageEvent): void {
    let message: { type: keyof EventMap; [key: string]: unknown } | undefined;
    try {
      message = JSON.parse(event.data as string);

      // Handle app-level pong — reset missed counter so the heartbeat
      // timer doesn't force a disconnect.
      if ((message as { type: string }).type === 'pong') {
        this.missedPongs = 0;
        return;
      }

      const callbacks = this.callbacks.get(message!.type);
      if (callbacks) {
        for (const callback of callbacks) {
          (callback as (event: unknown) => void)(message);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to parse WebSocket message:', error);
    }
    if (message !== undefined) {
      for (const handler of this.rawHandlers) {
        handler(message as Record<string, unknown>);
      }
    }
  }
}
