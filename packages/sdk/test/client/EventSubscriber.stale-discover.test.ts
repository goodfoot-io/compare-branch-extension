/**
 * Reproduction test for H2: discover() returns stale server info after connection drop.
 *
 * When the Cards API server dies and restarts on a new port, the EventSubscriber's
 * reconnection loop calls discover() to resolve the current server URL. In the
 * webview, discover() sends a postMessage round-trip to the extension host, which
 * reads from ServerInfoHolder. If ServerInfoHolder was never updated with the new
 * server's port and token, discover() returns stale info pointing at the dead server,
 * and every reconnection attempt targets the dead port — perpetually failing.
 *
 * This test simulates that exact scenario:
 * 1. Start server A on port X, connect subscriber.
 * 2. Kill server A, start server B on port Y.
 * 3. discover() still returns port X (stale) — simulating un-updated ServerInfoHolder.
 * 4. Assert that subscriber reconnects to the new server (port Y).
 *
 * The test MUST FAIL against the current (unfixed) code because discover() returns
 * stale info and nothing in the current pipeline corrects it.
 *
 * @summary Reproduction: stale discover() prevents EventSubscriber reconnection after server port change
 */

import { TestWebSocketServer } from '@cards/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventSubscriber } from '../../src/client/eventSubscriber.js';

describe('EventSubscriber: stale discover() after server port change (H2 reproduction)', () => {
  let serverA: TestWebSocketServer;
  let serverB: TestWebSocketServer;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    serverA = new TestWebSocketServer();
    serverB = new TestWebSocketServer();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    warnSpy.mockRestore();
    // Servers may already be stopped (serverA is killed mid-test); log but don't block cleanup.
    await serverA.stop().catch((err: unknown) => {
      console.debug('serverA cleanup:', err instanceof Error ? err.message : String(err));
    });
    await serverB.stop().catch((err: unknown) => {
      console.debug('serverB cleanup:', err instanceof Error ? err.message : String(err));
    });
  });

  it('should reconnect to the new server when the original server dies and restarts on a different port', async () => {
    // 1. Start the original server (server A) and connect the subscriber.
    const portA = await serverA.start();

    // The discover function simulates the extension host's behavior:
    // it reads from ServerInfoHolder which caches the ORIGINAL server info.
    // After server A dies and server B starts, ServerInfoHolder is never updated,
    // so discover() keeps returning server A's (now-dead) URL.
    //
    // This is the core of the bug: the discover function is the webview's only
    // mechanism to learn the current server URL during reconnection, but it
    // returns stale data.
    const currentDiscoverPort = portA;
    const discoverFn = vi.fn(async () => ({
      wsUrl: `ws://localhost:${currentDiscoverPort}/events`,
      accessToken: 'test-token'
    }));

    const subscriber = new EventSubscriber({
      wsUrl: `ws://localhost:${portA}/events`,
      accessToken: 'test-token',
      discover: discoverFn,
      maxReconnectAttempts: 5
    });

    await subscriber.connect();
    expect(subscriber.isConnected()).toBe(true);
    expect(serverA.getClientCount()).toBe(1);

    // 2. Kill server A, start server B on a different port.
    await serverA.stop();
    await serverB.start();

    // BUG: ServerInfoHolder is NOT updated here.
    // In the real system, the extension host never calls serverInfoHolder.update()
    // with the new port after API ownership changes. So discover() still returns
    // portA, which is now dead.
    //
    // If the bug were fixed, discover() would return the new port after the server
    // change is detected. We simulate the fix by uncommenting the next line:
    // currentDiscoverPort = serverB.getPort();  // <-- This is what the fix would do

    // 3. Wait for EventSubscriber to reconnect.
    // The subscriber should detect the new server and reconnect within a reasonable
    // time. With backoff delays of 1s, 2s, 4s, 8s, 16s and 5 max attempts,
    // we give it enough time.
    await serverB.awaitConnection(15_000);

    // Wait for the subscriber's internal state to reflect the connection
    await vi.waitFor(
      () => {
        expect(subscriber.isConnected()).toBe(true);
      },
      { timeout: 2_000 }
    );

    // 4. Verify the subscriber reconnected to the NEW server (port B).
    expect(serverB.getClientCount()).toBe(1);
    expect(subscriber.isConnected()).toBe(true);

    subscriber.disconnect();
  }, 30_000);
});
