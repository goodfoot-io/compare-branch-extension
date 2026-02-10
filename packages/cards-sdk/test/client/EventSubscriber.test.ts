import { TestWebSocketServer } from '@cards/test-utils';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import { calculateBackoffMs, EventSubscriber } from '../../src/client/eventSubscriber.js';
import type { WebSocketFactory } from '../../src/client/types/websocket.js';

/**
 * Test WebSocket factory that creates real WebSocket connections.
 * Used with TestWebSocketServer for integration testing.
 */
class RealWebSocketFactory implements WebSocketFactory {
  public createdSockets: Array<{ url: string; protocols?: string | string[] }> = [];

  create(url: string, protocols?: string | string[]): WebSocket {
    this.createdSockets.push({ url, protocols });
    return new WebSocket(url, protocols);
  }
}

/**
 * Mock WebSocket for unit testing without real network I/O.
 * Allows tests to control when events fire.
 */
class MockWebSocket {
  public url: string;
  public readyState: number = WebSocket.CONNECTING;
  public onopen: ((ev: Event) => void) | null = null;
  public onclose: ((ev: CloseEvent) => void) | null = null;
  public onerror: ((ev: Event) => void) | null = null;
  public onmessage: ((ev: MessageEvent) => void) | null = null;

  private eventListeners: Map<string, Set<EventListener>> = new Map();

  constructor(url: string) {
    this.url = url;
  }

  addEventListener(type: string, listener: EventListener): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.eventListeners.get(type)?.delete(listener);
  }

  private dispatchEvent(type: string, event: Event): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      for (const listener of listeners) {
        listener(event);
      }
    }
  }

  // Test controls
  simulateOpen(): void {
    this.readyState = WebSocket.OPEN;
    const event = new Event('open');
    this.onopen?.(event);
    this.dispatchEvent('open', event);
  }

  simulateClose(code = 1000, reason = ''): void {
    this.readyState = WebSocket.CLOSED;
    const event = new CloseEvent('close', { code, reason });
    this.onclose?.(event);
    this.dispatchEvent('close', event);
  }

  simulateError(): void {
    const event = new Event('error');
    this.onerror?.(event);
    this.dispatchEvent('error', event);
  }

  simulateMessage(data: unknown): void {
    const event = new MessageEvent('message', { data: JSON.stringify(data) });
    this.onmessage?.(event);
    this.dispatchEvent('message', event);
  }

  close(): void {
    this.simulateClose();
  }

  send(_data: string): void {
    // No-op for testing
  }
}

/**
 * Mock WebSocket factory that creates MockWebSocket instances.
 * Tracks all created instances for test assertions.
 */
class MockWebSocketFactory implements WebSocketFactory {
  public instances: MockWebSocket[] = [];

  create(url: string): WebSocket {
    const ws = new MockWebSocket(url);
    this.instances.push(ws);
    return ws as unknown as WebSocket;
  }

  /** Gets the most recently created MockWebSocket */
  get latest(): MockWebSocket {
    return this.instances[this.instances.length - 1]!;
  }
}

/** Helper to get the last setTimeout callback from a spy */
function getLastTimeoutCallback(spy: MockInstance): () => void {
  const calls = spy.mock.calls;
  const lastCall = calls[calls.length - 1];
  if (!lastCall) throw new Error('No setTimeout calls recorded');
  return lastCall[0] as () => void;
}

/** Helper to get the last setTimeout delay from a spy */
function getLastTimeoutDelay(spy: MockInstance): number {
  const calls = spy.mock.calls;
  const lastCall = calls[calls.length - 1];
  if (!lastCall) throw new Error('No setTimeout calls recorded');
  return lastCall[1] as number;
}

describe('calculateBackoffMs', () => {
  it('should start at 1000ms for attempt 0', () => {
    expect(calculateBackoffMs(0)).toBe(1000);
  });

  it('should double each attempt', () => {
    expect(calculateBackoffMs(0)).toBe(1000);
    expect(calculateBackoffMs(1)).toBe(2000);
    expect(calculateBackoffMs(2)).toBe(4000);
    expect(calculateBackoffMs(3)).toBe(8000);
    expect(calculateBackoffMs(4)).toBe(16000);
  });

  it('should cap at 30000ms by default', () => {
    expect(calculateBackoffMs(5)).toBe(30000);
    expect(calculateBackoffMs(6)).toBe(30000);
    expect(calculateBackoffMs(10)).toBe(30000);
    expect(calculateBackoffMs(100)).toBe(30000);
  });

  it('should respect custom maxMs parameter', () => {
    expect(calculateBackoffMs(0, 500)).toBe(500);
    expect(calculateBackoffMs(5, 10000)).toBe(10000);
    expect(calculateBackoffMs(10, 60000)).toBe(60000);
  });
});

describe('EventSubscriber', () => {
  const defaultOptions = {
    wsUrl: 'ws://localhost:3000/events',
    accessToken: 'test-token'
  };

  describe('constructor and configuration', () => {
    it('should create subscriber without DI (backward compatible)', () => {
      const subscriber = new EventSubscriber({ wsUrl: 'ws://localhost:3000/events' });
      expect(subscriber).toBeInstanceOf(EventSubscriber);
    });

    it('should create subscriber with WebSocketFactory injection', () => {
      const wsFactory = new RealWebSocketFactory();
      const subscriber = new EventSubscriber(defaultOptions, wsFactory);
      expect(subscriber).toBeInstanceOf(EventSubscriber);
    });

    it('should return configured WebSocket URL', () => {
      const subscriber = new EventSubscriber({ wsUrl: 'ws://localhost:8080/events' });
      expect(subscriber.getWsUrl()).toBe('ws://localhost:8080/events');
    });

    it('should return false from hasWebSocketFactory when no factory injected', () => {
      const subscriber = new EventSubscriber(defaultOptions);
      expect(subscriber.hasWebSocketFactory()).toBe(false);
    });

    it('should return true from hasWebSocketFactory when factory injected', () => {
      const wsFactory = new RealWebSocketFactory();
      const subscriber = new EventSubscriber(defaultOptions, wsFactory);
      expect(subscriber.hasWebSocketFactory()).toBe(true);
    });
  });

  describe('Event Subscription', () => {
    it('should register callback for card:metadataChanged event', () => {
      const wsFactory = new RealWebSocketFactory();
      const subscriber = new EventSubscriber(defaultOptions, wsFactory);
      const callback = () => {};
      subscriber.on('card:metadataChanged', callback);
      // Verifies on() doesn't throw
    });

    it('should remove callback when off() is called', () => {
      const wsFactory = new RealWebSocketFactory();
      const subscriber = new EventSubscriber(defaultOptions, wsFactory);
      const callback = () => {};
      subscriber.on('card:metadataChanged', callback);
      subscriber.off('card:metadataChanged', callback);
      // Verifies off() doesn't throw
    });

    it('should support multiple callbacks for same event', () => {
      const wsFactory = new RealWebSocketFactory();
      const subscriber = new EventSubscriber(defaultOptions, wsFactory);
      const callback1 = () => {};
      const callback2 = () => {};
      subscriber.on('card:metadataChanged', callback1);
      subscriber.on('card:metadataChanged', callback2);
      // Verifies multiple registrations don't throw
    });
  });

  describe('Connection Lifecycle', () => {
    it('should create WebSocket via factory when connect() is called', async () => {
      const wsFactory = new MockWebSocketFactory();
      const subscriber = new EventSubscriber(defaultOptions, wsFactory);

      const connectPromise = subscriber.connect();
      wsFactory.latest.simulateOpen();
      await connectPromise;

      expect(wsFactory.instances).toHaveLength(1);
      expect(wsFactory.latest.url).toContain('token=test-token');
    });

    it('should use accessToken in connection URL', async () => {
      const wsFactory = new MockWebSocketFactory();
      const subscriber = new EventSubscriber(defaultOptions, wsFactory);

      const connectPromise = subscriber.connect();
      wsFactory.latest.simulateOpen();
      await connectPromise;

      expect(wsFactory.latest.url).toBe('ws://localhost:3000/events?token=test-token');
    });

    it('should close WebSocket when disconnect() is called', () => {
      const wsFactory = new MockWebSocketFactory();
      const subscriber = new EventSubscriber(defaultOptions, wsFactory);
      // disconnect() should not throw even when not connected
      subscriber.disconnect();
    });

    it('should set connected state on successful connection', async () => {
      const wsFactory = new MockWebSocketFactory();
      const subscriber = new EventSubscriber(defaultOptions, wsFactory);

      expect(subscriber.isConnected()).toBe(false);

      const connectPromise = subscriber.connect();
      wsFactory.latest.simulateOpen();
      await connectPromise;

      expect(subscriber.isConnected()).toBe(true);
    });

    it('should reject on connection error', async () => {
      const wsFactory = new MockWebSocketFactory();
      const subscriber = new EventSubscriber(defaultOptions, wsFactory);

      const connectPromise = subscriber.connect();
      wsFactory.latest.simulateError();

      await expect(connectPromise).rejects.toThrow('WebSocket connection failed');
    });
  });

  describe('Message Handling', () => {
    let warnSpy: MockInstance;

    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('should invoke callback when message received', async () => {
      const wsFactory = new MockWebSocketFactory();
      const subscriber = new EventSubscriber(defaultOptions, wsFactory);

      const receivedEvents: unknown[] = [];
      subscriber.on('card:metadataChanged', (event) => {
        receivedEvents.push(event);
      });

      const connectPromise = subscriber.connect();
      wsFactory.latest.simulateOpen();
      await connectPromise;

      wsFactory.latest.simulateMessage({
        type: 'card:metadataChanged',
        cardId: 'card-123',
        changes: ['title']
      });

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0]).toMatchObject({
        cardId: 'card-123',
        changes: ['title']
      });
    });

    it('should stop receiving events after unsubscribe', async () => {
      const wsFactory = new MockWebSocketFactory();
      const subscriber = new EventSubscriber(defaultOptions, wsFactory);

      const receivedEvents: unknown[] = [];
      const callback = (event: unknown) => {
        receivedEvents.push(event);
      };
      subscriber.on('card:metadataChanged', callback);

      const connectPromise = subscriber.connect();
      wsFactory.latest.simulateOpen();
      await connectPromise;

      subscriber.off('card:metadataChanged', callback);

      wsFactory.latest.simulateMessage({
        type: 'card:metadataChanged',
        cardId: 'card-123',
        changes: ['title']
      });

      expect(receivedEvents).toHaveLength(0);
    });
  });

  describe('Reconnection with Exponential Backoff', () => {
    let setTimeoutSpy: MockInstance;
    let warnSpy: MockInstance;

    beforeEach(() => {
      setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      setTimeoutSpy.mockRestore();
      warnSpy.mockRestore();
    });

    it('should schedule reconnect with 1000ms delay on first attempt', async () => {
      const wsFactory = new MockWebSocketFactory();
      const subscriber = new EventSubscriber({ ...defaultOptions, maxReconnectAttempts: 5 }, wsFactory);

      const connectPromise = subscriber.connect();
      wsFactory.latest.simulateOpen();
      await connectPromise;

      // Connection drops
      wsFactory.latest.simulateClose();

      // Verify first reconnect scheduled at 1000ms
      expect(getLastTimeoutDelay(setTimeoutSpy)).toBe(1000);

      subscriber.disconnect();
    });

    it('should use exponential backoff delays: 1s, 2s, 4s, 8s...', async () => {
      const wsFactory = new MockWebSocketFactory();
      const subscriber = new EventSubscriber({ ...defaultOptions, maxReconnectAttempts: 5 }, wsFactory);

      const connectPromise = subscriber.connect();
      wsFactory.latest.simulateOpen();
      await connectPromise;

      // Connection drops, triggers first reconnect
      wsFactory.latest.simulateClose();
      expect(getLastTimeoutDelay(setTimeoutSpy)).toBe(1000);

      // Fire timeout callback, simulate failed reconnect
      getLastTimeoutCallback(setTimeoutSpy)();
      wsFactory.latest.simulateError();
      wsFactory.latest.simulateClose();
      expect(getLastTimeoutDelay(setTimeoutSpy)).toBe(2000);

      // Fire and fail again
      getLastTimeoutCallback(setTimeoutSpy)();
      wsFactory.latest.simulateError();
      wsFactory.latest.simulateClose();
      expect(getLastTimeoutDelay(setTimeoutSpy)).toBe(4000);

      // Fire and fail again
      getLastTimeoutCallback(setTimeoutSpy)();
      wsFactory.latest.simulateError();
      wsFactory.latest.simulateClose();
      expect(getLastTimeoutDelay(setTimeoutSpy)).toBe(8000);

      subscriber.disconnect();
    });

    it('should create new WebSocket on each reconnection attempt', async () => {
      const wsFactory = new MockWebSocketFactory();
      const subscriber = new EventSubscriber({ ...defaultOptions, maxReconnectAttempts: 3 }, wsFactory);

      const connectPromise = subscriber.connect();
      wsFactory.latest.simulateOpen();
      await connectPromise;
      expect(wsFactory.instances).toHaveLength(1);

      // Connection drops
      wsFactory.latest.simulateClose();

      // Fire timeout, new WebSocket created
      getLastTimeoutCallback(setTimeoutSpy)();
      expect(wsFactory.instances).toHaveLength(2);

      // Fail and trigger next reconnect
      wsFactory.latest.simulateError();
      wsFactory.latest.simulateClose();
      getLastTimeoutCallback(setTimeoutSpy)();
      expect(wsFactory.instances).toHaveLength(3);

      subscriber.disconnect();
    });

    it('should call exhaustion callback after max attempts', async () => {
      const wsFactory = new MockWebSocketFactory();
      const subscriber = new EventSubscriber({ ...defaultOptions, maxReconnectAttempts: 3 }, wsFactory);

      const exhaustedFn = vi.fn();
      subscriber.onExhausted(exhaustedFn);

      const connectPromise = subscriber.connect();
      wsFactory.latest.simulateOpen();
      await connectPromise;

      // Connection drops
      wsFactory.latest.simulateClose();

      // Simulate 3 failed reconnection attempts
      for (let i = 0; i < 3; i++) {
        getLastTimeoutCallback(setTimeoutSpy)();
        wsFactory.latest.simulateError();
        wsFactory.latest.simulateClose();
      }

      expect(exhaustedFn).toHaveBeenCalledTimes(1);
      expect(wsFactory.instances).toHaveLength(4); // 1 initial + 3 retries
    });

    it('should stop reconnection after max attempts reached', async () => {
      const wsFactory = new MockWebSocketFactory();
      const subscriber = new EventSubscriber({ ...defaultOptions, maxReconnectAttempts: 2 }, wsFactory);

      const connectPromise = subscriber.connect();
      wsFactory.latest.simulateOpen();
      await connectPromise;

      // Connection drops - schedules first reconnect (attempt 0 -> 1)
      wsFactory.latest.simulateClose();
      const callCountAfterFirstClose = setTimeoutSpy.mock.calls.length;

      // First retry: fires timeout, connect fails, schedules second reconnect (attempt 1 -> 2)
      getLastTimeoutCallback(setTimeoutSpy)();
      wsFactory.latest.simulateError();
      wsFactory.latest.simulateClose();

      // Second retry: fires timeout, connect fails, triggers exhaustion (no new setTimeout)
      getLastTimeoutCallback(setTimeoutSpy)();
      wsFactory.latest.simulateError();
      wsFactory.latest.simulateClose();

      // Only 1 more setTimeout was added (from first retry), not 2
      // The second retry triggers exhaustion, so no setTimeout is scheduled
      const callCountAfterExhaustion = setTimeoutSpy.mock.calls.length;
      expect(callCountAfterExhaustion).toBe(callCountAfterFirstClose + 1);

      subscriber.disconnect();
    });

    it('should call all registered exhaustion callbacks', async () => {
      const wsFactory = new MockWebSocketFactory();
      const subscriber = new EventSubscriber({ ...defaultOptions, maxReconnectAttempts: 1 }, wsFactory);

      const callbacks = [vi.fn(), vi.fn(), vi.fn()];
      callbacks.forEach((cb) => {
        subscriber.onExhausted(cb);
      });

      const connectPromise = subscriber.connect();
      wsFactory.latest.simulateOpen();
      await connectPromise;

      wsFactory.latest.simulateClose();
      getLastTimeoutCallback(setTimeoutSpy)();
      wsFactory.latest.simulateError();
      wsFactory.latest.simulateClose();

      callbacks.forEach((cb) => {
        expect(cb).toHaveBeenCalledTimes(1);
      });

      subscriber.disconnect();
    });

    it('should allow unsubscribing from exhaustion callbacks', async () => {
      const wsFactory = new MockWebSocketFactory();
      const subscriber = new EventSubscriber({ ...defaultOptions, maxReconnectAttempts: 1 }, wsFactory);

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsubscribe1 = subscriber.onExhausted(callback1);
      subscriber.onExhausted(callback2);

      unsubscribe1();

      const connectPromise = subscriber.connect();
      wsFactory.latest.simulateOpen();
      await connectPromise;

      wsFactory.latest.simulateClose();
      getLastTimeoutCallback(setTimeoutSpy)();
      wsFactory.latest.simulateError();
      wsFactory.latest.simulateClose();

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);

      subscriber.disconnect();
    });

    it('should reset attempt counter on successful reconnection', async () => {
      const wsFactory = new MockWebSocketFactory();
      const subscriber = new EventSubscriber({ ...defaultOptions, maxReconnectAttempts: 5 }, wsFactory);

      const connectPromise = subscriber.connect();
      wsFactory.latest.simulateOpen();
      await connectPromise;

      // First disconnect
      wsFactory.latest.simulateClose();
      expect(getLastTimeoutDelay(setTimeoutSpy)).toBe(1000);

      // Reconnect succeeds
      getLastTimeoutCallback(setTimeoutSpy)();
      wsFactory.latest.simulateOpen();

      // Second disconnect - should reset to 1000ms, not continue to 2000ms
      wsFactory.latest.simulateClose();
      expect(getLastTimeoutDelay(setTimeoutSpy)).toBe(1000);

      subscriber.disconnect();
    });

    it('should keep event callbacks registered after exhaustion', async () => {
      const wsFactory = new MockWebSocketFactory();
      const subscriber = new EventSubscriber({ ...defaultOptions, maxReconnectAttempts: 1 }, wsFactory);

      const receivedEvents: unknown[] = [];
      subscriber.on('card:metadataChanged', (event) => {
        receivedEvents.push(event);
      });

      const connectPromise = subscriber.connect();
      wsFactory.latest.simulateOpen();
      await connectPromise;

      // Exhaust reconnection attempts
      wsFactory.latest.simulateClose();
      getLastTimeoutCallback(setTimeoutSpy)();
      wsFactory.latest.simulateError();
      wsFactory.latest.simulateClose();

      // Manually reconnect
      const reconnectPromise = subscriber.connect();
      wsFactory.latest.simulateOpen();
      await reconnectPromise;

      // Event callback should still work
      wsFactory.latest.simulateMessage({
        type: 'card:metadataChanged',
        cardId: 'card-456',
        changes: ['status']
      });

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0]).toMatchObject({ cardId: 'card-456' });

      subscriber.disconnect();
    });
  });

  describe('Integration with TestWebSocketServer', () => {
    let server: TestWebSocketServer;
    let warnSpy: MockInstance;

    beforeEach(async () => {
      server = new TestWebSocketServer();
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(async () => {
      warnSpy.mockRestore();
      await server.stop();
    });

    it('should connect to real WebSocket server', async () => {
      const port = await server.start();
      const wsFactory = new RealWebSocketFactory();
      const subscriber = new EventSubscriber(
        { wsUrl: `ws://localhost:${port}/events`, accessToken: 'test-token' },
        wsFactory
      );

      await subscriber.connect();

      expect(server.getClientCount()).toBe(1);
      expect(subscriber.isConnected()).toBe(true);

      subscriber.disconnect();
    });

    it('should include auth token in WebSocket URL', async () => {
      const port = await server.start({ authToken: 'test-token' });
      const wsFactory = new RealWebSocketFactory();
      const subscriber = new EventSubscriber(
        { wsUrl: `ws://localhost:${port}/events`, accessToken: 'test-token' },
        wsFactory
      );

      await subscriber.connect();

      expect(wsFactory.createdSockets[0]?.url).toContain('token=test-token');

      subscriber.disconnect();
    });

    it('should receive events from server', async () => {
      const port = await server.start();
      const wsFactory = new RealWebSocketFactory();
      const subscriber = new EventSubscriber(
        { wsUrl: `ws://localhost:${port}/events`, accessToken: 'test-token' },
        wsFactory
      );

      const receivedEvents: unknown[] = [];
      subscriber.on('card:metadataChanged', (event) => {
        receivedEvents.push(event);
      });

      await subscriber.connect();

      server.broadcast({
        type: 'card:metadataChanged',
        cardId: 'card-123',
        changes: ['title']
      });

      // Wait for async event delivery
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0]).toMatchObject({
        cardId: 'card-123',
        changes: ['title']
      });

      subscriber.disconnect();
    });

    it('should reconnect after server restart (event-based)', async () => {
      const port = await server.start();
      const wsFactory = new RealWebSocketFactory();
      const subscriber = new EventSubscriber(
        { wsUrl: `ws://localhost:${port}/events`, accessToken: 'test-token', maxReconnectAttempts: 3 },
        wsFactory
      );

      await subscriber.connect();
      expect(server.getClientCount()).toBe(1);

      // Stop server - triggers reconnection attempts (which will fail)
      await server.stop();

      // Restart server on same port
      await server.start({ port });

      // Wait for reconnection EVENT, not for time to pass
      await server.awaitConnection(5000);

      // Wait for the subscriber to process the 'open' event and update its state
      // The server sees the connection before the client's open event fires
      const waitForConnected = async (timeout = 1000): Promise<void> => {
        const start = Date.now();
        while (!subscriber.isConnected() && Date.now() - start < timeout) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      };
      await waitForConnected();

      expect(subscriber.isConnected()).toBe(true);
      expect(server.getClientCount()).toBe(1);

      subscriber.disconnect();
    });
  });
});
