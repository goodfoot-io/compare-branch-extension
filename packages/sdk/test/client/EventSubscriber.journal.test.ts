/**
 * Tests for EventSubscriber's per-card journal subscribe/replay support:
 * `subscribeToCard`/`unsubscribeFromCard`, automatic re-subscribe with
 * `sinceSeq` on reconnect, gap detection on live `card:journalEvent`
 * messages, and `onStaleness` surfacing a fail-closed state when the server
 * cannot assemble a snapshot.
 *
 * @summary Tests for EventSubscriber's journal subscribe/replay support
 * @module test/client/EventSubscriber.journal
 */

import { TestWebSocketServer } from '@cards.management/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventSubscriber } from '../../src/client/eventSubscriber.js';
import type { CardStalenessEvent } from '../../src/client/types/events.js';

describe('EventSubscriber journal subscribe/replay', () => {
  let server: TestWebSocketServer;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    server = new TestWebSocketServer();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    warnSpy.mockRestore();
    await server.stop();
  });

  async function connectSubscriber(): Promise<EventSubscriber> {
    const port = await server.start();
    const subscriber = new EventSubscriber({
      wsUrl: `ws://localhost:${port}/events`,
      accessToken: 'test-token',
      discover: () => Promise.resolve({ wsUrl: `ws://localhost:${port}/events`, accessToken: 'test-token' })
    });
    await subscriber.connect();
    return subscriber;
  }

  it('sends card:subscribe with no sinceSeq on the first subscribe', async () => {
    const subscriber = await connectSubscriber();
    subscriber.subscribeToCard('card-1');

    const message = await server.awaitMessage();
    expect(message).toEqual({ type: 'card:subscribe', cardId: 'card-1' });
    subscriber.disconnect();
  });

  it('tracks seq from a card:snapshot and includes it in a later re-subscribe', async () => {
    const subscriber = await connectSubscriber();
    subscriber.subscribeToCard('card-1');
    await server.awaitMessage();

    server.broadcast({
      type: 'card:snapshot',
      cardId: 'card-1',
      card: { id: 'card-1' },
      mergeStatus: { isMerged: null, hasStaleMerge: false },
      seq: 7
    });
    // No public getter for cardSeq — give the async message delivery a tick
    // before asserting indirectly via the next subscribe's sinceSeq.
    await new Promise((r) => setTimeout(r, 30));

    subscriber.subscribeToCard('card-1');
    const message = await server.awaitMessage();
    expect(message).toEqual({ type: 'card:subscribe', cardId: 'card-1', sinceSeq: 7 });
    subscriber.disconnect();
  });

  it('tracks latestSeq from a card:replay', async () => {
    const subscriber = await connectSubscriber();
    subscriber.subscribeToCard('card-1');
    await server.awaitMessage();

    server.broadcast({
      type: 'card:replay',
      cardId: 'card-1',
      entries: [{ seq: 3, type: 'cards:metadata', payload: {}, timestamp: new Date().toISOString() }],
      latestSeq: 3
    });
    await new Promise((r) => setTimeout(r, 30));

    subscriber.subscribeToCard('card-1');
    const message = await server.awaitMessage();
    expect(message).toEqual({ type: 'card:subscribe', cardId: 'card-1', sinceSeq: 3 });
    subscriber.disconnect();
  });

  it('dispatches an in-order card:journalEvent and advances seq', async () => {
    const subscriber = await connectSubscriber();
    const received: unknown[] = [];
    subscriber.on('card:journalEvent', (event) => received.push(event));

    subscriber.subscribeToCard('card-1');
    await server.awaitMessage();
    server.broadcast({
      type: 'card:snapshot',
      cardId: 'card-1',
      card: {},
      mergeStatus: { isMerged: null, hasStaleMerge: false },
      seq: 5
    });

    server.broadcast({
      type: 'card:journalEvent',
      cardId: 'card-1',
      seq: 6,
      entryType: 'cards:metadata',
      payload: { title: 'x' },
      timestamp: new Date().toISOString()
    });

    await vi.waitFor(() => {
      expect(received).toHaveLength(1);
    });

    // A second in-order event (seq 7) should also dispatch without a re-subscribe.
    server.clearReceivedMessages();
    server.broadcast({
      type: 'card:journalEvent',
      cardId: 'card-1',
      seq: 7,
      entryType: 'cards:metadata',
      payload: { title: 'y' },
      timestamp: new Date().toISOString()
    });
    await vi.waitFor(() => {
      expect(received).toHaveLength(2);
    });
    subscriber.disconnect();
  });

  it('detects a seq gap, drops the event, and re-subscribes with the last known-good seq', async () => {
    const subscriber = await connectSubscriber();
    const received: unknown[] = [];
    subscriber.on('card:journalEvent', (event) => received.push(event));

    subscriber.subscribeToCard('card-1');
    await server.awaitMessage();
    server.broadcast({
      type: 'card:snapshot',
      cardId: 'card-1',
      card: {},
      mergeStatus: { isMerged: null, hasStaleMerge: false },
      seq: 5
    });

    // Jump straight to seq 8, skipping 6 and 7 — a gap.
    server.broadcast({
      type: 'card:journalEvent',
      cardId: 'card-1',
      seq: 8,
      entryType: 'cards:metadata',
      payload: { title: 'gap' },
      timestamp: new Date().toISOString()
    });

    const resubscribe = await server.awaitMessage();
    expect(resubscribe).toEqual({ type: 'card:subscribe', cardId: 'card-1', sinceSeq: 5 });
    // The gapped event must never be dispatched to callers.
    expect(received).toHaveLength(0);
    subscriber.disconnect();
  });

  it('surfaces onStaleness("stale") on card:subscribeFailed and "ok" on a later snapshot', async () => {
    const subscriber = await connectSubscriber();
    const stalenessEvents: CardStalenessEvent[] = [];
    subscriber.onStaleness((event) => stalenessEvents.push(event));

    subscriber.subscribeToCard('card-1');
    await server.awaitMessage();

    server.broadcast({ type: 'card:subscribeFailed', cardId: 'card-1', reason: 'Card not found' });
    await vi.waitFor(() => {
      expect(stalenessEvents).toHaveLength(1);
    });
    expect(stalenessEvents[0]).toEqual({ cardId: 'card-1', state: 'stale', reason: 'Card not found' });

    server.broadcast({
      type: 'card:snapshot',
      cardId: 'card-1',
      card: {},
      mergeStatus: { isMerged: null, hasStaleMerge: false },
      seq: 1
    });
    await vi.waitFor(() => {
      expect(stalenessEvents).toHaveLength(2);
    });
    expect(stalenessEvents[1]).toEqual({ cardId: 'card-1', state: 'ok', reason: undefined });
    subscriber.disconnect();
  });

  it('does not re-notify onStaleness for a repeated identical state', async () => {
    const subscriber = await connectSubscriber();
    const stalenessEvents: CardStalenessEvent[] = [];
    subscriber.onStaleness((event) => stalenessEvents.push(event));

    subscriber.subscribeToCard('card-1');
    await server.awaitMessage();

    server.broadcast({ type: 'card:subscribeFailed', cardId: 'card-1', reason: 'first' });
    await vi.waitFor(() => {
      expect(stalenessEvents).toHaveLength(1);
    });
    server.broadcast({ type: 'card:subscribeFailed', cardId: 'card-1', reason: 'second' });
    // Give the second message a moment to be processed before asserting no growth.
    await new Promise((r) => setTimeout(r, 50));
    expect(stalenessEvents).toHaveLength(1);
    subscriber.disconnect();
  });

  it('re-subscribes with sinceSeq on reconnect for every tracked card', async () => {
    const port = await server.start();
    const subscriber = new EventSubscriber({
      wsUrl: `ws://localhost:${port}/events`,
      accessToken: 'test-token',
      discover: () => Promise.resolve({ wsUrl: `ws://localhost:${port}/events`, accessToken: 'test-token' }),
      maxReconnectAttempts: 3
    });
    await subscriber.connect();

    subscriber.subscribeToCard('card-1');
    await server.awaitMessage();
    server.broadcast({
      type: 'card:snapshot',
      cardId: 'card-1',
      card: {},
      mergeStatus: { isMerged: null, hasStaleMerge: false },
      seq: 9
    });
    await new Promise((r) => setTimeout(r, 20));

    await server.stop();
    await server.start({ port });
    await server.awaitConnection(5000);

    const resubscribe = await server.awaitMessage(5000);
    expect(resubscribe).toEqual({ type: 'card:subscribe', cardId: 'card-1', sinceSeq: 9 });
    subscriber.disconnect();
  });

  it('unsubscribeFromCard forgets seq so a later subscribe omits sinceSeq', async () => {
    const subscriber = await connectSubscriber();
    subscriber.subscribeToCard('card-1');
    await server.awaitMessage();
    server.broadcast({
      type: 'card:snapshot',
      cardId: 'card-1',
      card: {},
      mergeStatus: { isMerged: null, hasStaleMerge: false },
      seq: 4
    });
    await new Promise((r) => setTimeout(r, 20));

    subscriber.unsubscribeFromCard('card-1');
    const unsubscribeMessage = await server.awaitMessage();
    expect(unsubscribeMessage).toEqual({ type: 'card:unsubscribe', cardId: 'card-1' });

    subscriber.subscribeToCard('card-1');
    const resubscribe = await server.awaitMessage();
    expect(resubscribe).toEqual({ type: 'card:subscribe', cardId: 'card-1' });
    subscriber.disconnect();
  });
});
