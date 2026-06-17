/**
 * Reproduction tests for the `awaitMessage` listener leak.
 *
 * Why: `awaitMessage()` registers per-client `once('message')` handlers that
 * are never removed on resolution or timeout. Each stale handler fires on the
 * next inbound message for its client, shifts the buffer, and discards the
 * message silently — `resolve()` is a no-op on an already-settled promise.
 *
 * These tests exercise the three exercise pathways of the single root cause:
 * missing listener cleanup.
 *
 * @summary Reproduction tests for awaitMessage `once('message')` listener leak
 * @module test-utils/test/ws/TestWebSocketServer.awaitMessage-leak.test
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { TestWebSocketServer } from '../../src/ws/TestWebSocketServer.js';

/**
 * Helper: wait for a WebSocket client to open.
 */
function waitForOpen(client: WebSocket): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (client.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }
    client.on('open', () => resolve());
    client.on('error', reject);
  });
}

describe('awaitMessage listener leak', () => {
  let server: TestWebSocketServer;

  beforeEach(() => {
    server = new TestWebSocketServer();
  });

  afterEach(async () => {
    await server.stop();
  });

  /**
   * Pathway 1: interval-resolution leaves stale `once` handlers.
   *
   * The interval fires when a message is already buffered, resolves the
   * promise, but the per-client `once('message')` handlers are never
   * removed. The next inbound message on any client triggers the stale
   * handler, which shifts the buffer and discards the message.
   */
  it('drops subsequent messages after interval-path resolution', async () => {
    const port = await server.start();

    const client = new WebSocket(`ws://localhost:${port}`);
    await waitForOpen(client);

    // Send a message and wait for it to be fully received and buffered
    // before calling awaitMessage. This guarantees the interval path
    // resolves (the message is already queued) and the `once` handler
    // registered inside awaitMessage never fires — leaving it armed.
    client.send(JSON.stringify({ type: 'first' }));
    await new Promise((resolve) => setTimeout(resolve, 50));

    const data = await server.awaitMessage(1000);
    expect(data).toEqual({ type: 'first' });

    // The `once('message')` handler on `client` is still armed because
    // the interval resolved before it ever fired.

    server.clearReceivedMessages();

    // Send a second message. The connection handler pushes it into
    // receivedMessages, then the stale `once` handler fires and shifts
    // it out — silently dropping it.
    client.send(JSON.stringify({ type: 'second' }));
    await new Promise((resolve) => setTimeout(resolve, 50));

    const messages = server.getReceivedMessages();
    expect(messages.length, 'BUG: stale once handler dropped the buffered message').toBe(1);
    expect(messages[0]?.data).toEqual({ type: 'second' });

    client.close();
  });

  /**
   * Pathway 2: resolution via client A's `onMessage` leaves stale
   * handlers on other clients.
   *
   * When client A's message resolves the promise, clients B, C, … still
   * carry their `once` handlers. A later message from client B triggers
   * its stale handler, which shifts and discards the message.
   */
  it('drops subsequent messages from non-resolving clients after onMessage-path resolution', async () => {
    const port = await server.start();

    const clientA = new WebSocket(`ws://localhost:${port}`);
    const clientB = new WebSocket(`ws://localhost:${port}`);
    await Promise.all([waitForOpen(clientA), waitForOpen(clientB)]);

    // Start awaiting — no messages buffered, so `once` handlers are
    // registered on both clients.
    const messagePromise = server.awaitMessage(1000);

    // clientA sends a message → its `onMessage` fires, resolves the
    // promise. clientB's `once` handler is still armed.
    clientA.send(JSON.stringify({ type: 'fromA' }));
    const data = await messagePromise;
    expect(data).toEqual({ type: 'fromA' });

    // Clear so we can detect the drop from clientB cleanly.
    server.clearReceivedMessages();

    // clientB sends a message. The connection handler pushes it, then
    // clientB's stale `once` handler fires and shifts it out.
    clientB.send(JSON.stringify({ type: 'fromB' }));

    await new Promise((resolve) => setTimeout(resolve, 50));

    const messages = server.getReceivedMessages();
    expect(messages.length, 'BUG: stale once handler on clientB dropped the buffered message').toBe(1);
    expect(messages[0]?.data).toEqual({ type: 'fromB' });

    clientA.close();
    clientB.close();
  });

  /**
   * Pathway 3: timeout leaves stale `once` handlers.
   *
   * When `awaitMessage` times out, neither the interval nor the timeout
   * branch removes the per-client `once` handlers. A later message
   * triggers a stale handler and is silently discarded.
   */
  it('drops subsequent messages after timeout', async () => {
    const port = await server.start();

    const client = new WebSocket(`ws://localhost:${port}`);
    await waitForOpen(client);

    // awaitMessage times out — no message is sent.
    await expect(server.awaitMessage(100)).rejects.toThrow('Timeout waiting for message after 100ms');

    // The `once('message')` handler on `client` is still armed.

    // Send a message. The connection handler pushes it, then the stale
    // `once` handler fires and shifts it out.
    client.send(JSON.stringify({ type: 'afterTimeout' }));

    await new Promise((resolve) => setTimeout(resolve, 50));

    const messages = server.getReceivedMessages();
    expect(messages.length, 'BUG: stale once handler after timeout dropped the buffered message').toBe(1);
    expect(messages[0]?.data).toEqual({ type: 'afterTimeout' });

    client.close();
  });
});
