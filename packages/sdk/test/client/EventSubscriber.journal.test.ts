/**
 * Tests for EventSubscriber's per-card journal subscribe/replay support:
 * `subscribeToCard`/`unsubscribeFromCard`, automatic re-subscribe with
 * `sinceSeq` on reconnect, gap detection on live `card:journalEvent`
 * messages, `onStaleness` surfacing a fail-closed state when the server
 * cannot assemble a snapshot, and fail-closed rejection of malformed
 * journal envelopes before any state mutation.
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

  function malformedDropWarnings(): number {
    return warnSpy.mock.calls.filter((call: unknown[]) => String(call[0]).includes('Dropping malformed')).length;
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
      mergeStatus: { isMerged: null, hasPlanDrift: false },
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
      mergeStatus: { isMerged: null, hasPlanDrift: false },
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

  it('dispatches a card:replay unchanged when none of its entries overlap the tracked seq', async () => {
    const subscriber = await connectSubscriber();
    const replays: { entries: Array<{ seq: number }> }[] = [];
    subscriber.on('card:replay', (event) => replays.push(event as { entries: Array<{ seq: number }> }));

    subscriber.subscribeToCard('card-1');
    await server.awaitMessage();
    server.broadcast({
      type: 'card:snapshot',
      cardId: 'card-1',
      card: {},
      mergeStatus: { isMerged: null, hasPlanDrift: false },
      seq: 5
    });
    await new Promise((r) => setTimeout(r, 20));

    server.broadcast({
      type: 'card:replay',
      cardId: 'card-1',
      entries: [
        { seq: 6, type: 'cards:metadata', payload: {}, timestamp: new Date().toISOString() },
        { seq: 7, type: 'cards:metadata', payload: {}, timestamp: new Date().toISOString() }
      ],
      latestSeq: 7
    });
    await vi.waitFor(() => {
      expect(replays).toHaveLength(1);
    });
    expect(replays[0]!.entries.map((e) => e.seq)).toEqual([6, 7]);
    subscriber.disconnect();
  });

  it('drops a replay entry already applied via a preceding live journalEvent, dispatching only the new one', async () => {
    const subscriber = await connectSubscriber();
    const journalEvents: { seq: number }[] = [];
    const replays: { entries: Array<{ seq: number }> }[] = [];
    subscriber.on('card:journalEvent', (event) => journalEvents.push(event as { seq: number }));
    subscriber.on('card:replay', (event) => replays.push(event as { entries: Array<{ seq: number }> }));

    subscriber.subscribeToCard('card-1');
    await server.awaitMessage();
    server.broadcast({
      type: 'card:snapshot',
      cardId: 'card-1',
      card: {},
      mergeStatus: { isMerged: null, hasPlanDrift: false },
      seq: 5
    });
    await new Promise((r) => setTimeout(r, 20));

    // A live, in-order journalEvent for seq 6 arrives and is applied normally.
    server.broadcast({
      type: 'card:journalEvent',
      cardId: 'card-1',
      seq: 6,
      entryType: 'cards:metadata',
      payload: { title: 'live' },
      timestamp: new Date().toISOString()
    });
    await vi.waitFor(() => {
      expect(journalEvents).toHaveLength(1);
    });

    // A replay assembled concurrently on the server redundantly includes seq
    // 6 (already applied above) alongside the genuinely new seq 7.
    server.broadcast({
      type: 'card:replay',
      cardId: 'card-1',
      entries: [
        { seq: 6, type: 'cards:metadata', payload: {}, timestamp: new Date().toISOString() },
        { seq: 7, type: 'cards:metadata', payload: {}, timestamp: new Date().toISOString() }
      ],
      latestSeq: 7
    });
    await vi.waitFor(() => {
      expect(replays).toHaveLength(1);
    });

    // Seq 6 was dispatched exactly once (via the live journalEvent, not the
    // replay); seq 7 was dispatched exactly once (via the replay).
    expect(journalEvents.map((e) => e.seq)).toEqual([6]);
    expect(replays[0]!.entries.map((e) => e.seq)).toEqual([7]);

    // cardSeq ended at latestSeq (7): a fresh subscribe omits neither seq nor
    // regresses it — sinceSeq reflects the replay's latestSeq.
    subscriber.subscribeToCard('card-1');
    const message = await server.awaitMessage();
    expect(message).toEqual({ type: 'card:subscribe', cardId: 'card-1', sinceSeq: 7 });
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
      mergeStatus: { isMerged: null, hasPlanDrift: false },
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
      mergeStatus: { isMerged: null, hasPlanDrift: false },
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
      mergeStatus: { isMerged: null, hasPlanDrift: false },
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

  it('ignores card:journalEvent for a card never subscribed to: no callback, no re-subscribe', async () => {
    const subscriber = await connectSubscriber();
    const received: unknown[] = [];
    subscriber.on('card:journalEvent', (event) => received.push(event));

    // Subscribe to a different card so the socket is live and awaitMessage()
    // below can distinguish "nothing sent" from "nothing sent yet".
    subscriber.subscribeToCard('card-1');
    await server.awaitMessage();
    server.clearReceivedMessages();

    server.broadcast({
      type: 'card:journalEvent',
      cardId: 'card-foreign',
      seq: 1,
      entryType: 'cards:metadata',
      payload: { title: 'leak' },
      timestamp: new Date().toISOString()
    });
    // Give the async message delivery a tick, then assert nothing was
    // dispatched or sent in response.
    await new Promise((r) => setTimeout(r, 50));
    expect(received).toHaveLength(0);
    expect(server.getReceivedMessages()).toHaveLength(0);
    subscriber.disconnect();
  });

  it('ignores card:snapshot and card:replay for a card never subscribed to', async () => {
    const subscriber = await connectSubscriber();
    const received: unknown[] = [];
    subscriber.on('card:snapshot', (event) => received.push(event));
    subscriber.on('card:replay', (event) => received.push(event));

    subscriber.subscribeToCard('card-1');
    await server.awaitMessage();

    server.broadcast({
      type: 'card:snapshot',
      cardId: 'card-foreign',
      card: { id: 'card-foreign' },
      mergeStatus: { isMerged: null, hasPlanDrift: false },
      seq: 42
    });
    server.broadcast({
      type: 'card:replay',
      cardId: 'card-foreign',
      entries: [{ seq: 1, type: 'cards:metadata', payload: {}, timestamp: new Date().toISOString() }],
      latestSeq: 1
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(received).toHaveLength(0);

    // Confirm no seq was recorded for the foreign card by subscribing to it
    // afresh: the subscribe should omit sinceSeq (as if never seen before).
    subscriber.subscribeToCard('card-foreign');
    const message = await server.awaitMessage();
    expect(message).toEqual({ type: 'card:subscribe', cardId: 'card-foreign' });
    subscriber.disconnect();
  });

  it('ignores card:subscribeFailed for a card never subscribed to', async () => {
    const subscriber = await connectSubscriber();
    const stalenessEvents: CardStalenessEvent[] = [];
    subscriber.onStaleness((event) => stalenessEvents.push(event));

    subscriber.subscribeToCard('card-1');
    await server.awaitMessage();

    server.broadcast({ type: 'card:subscribeFailed', cardId: 'card-foreign', reason: 'Card not found' });
    await new Promise((r) => setTimeout(r, 50));
    expect(stalenessEvents).toHaveLength(0);
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
      mergeStatus: { isMerged: null, hasPlanDrift: false },
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

  it('drops a card:snapshot with a string seq: no state mutation, no warn/re-subscribe loop', async () => {
    const subscriber = await connectSubscriber();
    const received: unknown[] = [];
    const stalenessEvents: CardStalenessEvent[] = [];
    subscriber.on('card:journalEvent', (event) => received.push(event));
    subscriber.onStaleness((event) => stalenessEvents.push(event));

    subscriber.subscribeToCard('card-1');
    await server.awaitMessage();
    server.clearReceivedMessages();

    // A string "7" previously reached cardSeq, turning expected into "71"
    // and every later live event into a spurious gap + re-subscribe.
    server.broadcast({
      type: 'card:snapshot',
      cardId: 'card-1',
      card: {},
      mergeStatus: { isMerged: null, hasPlanDrift: false },
      seq: '7'
    });
    await new Promise((r) => setTimeout(r, 30));

    expect(malformedDropWarnings()).toBe(1);

    // No seq was recorded and staleness never flipped: a fresh subscribe
    // omits sinceSeq.
    subscriber.subscribeToCard('card-1');
    const message = await server.awaitMessage();
    expect(message).toEqual({ type: 'card:subscribe', cardId: 'card-1' });
    expect(stalenessEvents).toHaveLength(0);
    server.clearReceivedMessages();

    // Live events apply cleanly from a clean slate — no gap loop.
    server.broadcast({
      type: 'card:journalEvent',
      cardId: 'card-1',
      seq: 1,
      entryType: 'cards:metadata',
      payload: { title: 'after' },
      timestamp: new Date().toISOString()
    });
    await vi.waitFor(() => {
      expect(received).toHaveLength(1);
    });
    expect(server.getReceivedMessages()).toHaveLength(0);
    subscriber.disconnect();
  });

  it('drops a card:journalEvent with a string seq without advancing seq or losing the next valid event', async () => {
    const subscriber = await connectSubscriber();
    const received: Array<{ seq: unknown }> = [];
    subscriber.on('card:journalEvent', (event) => received.push(event as { seq: unknown }));

    subscriber.subscribeToCard('card-1');
    await server.awaitMessage();
    server.broadcast({
      type: 'card:snapshot',
      cardId: 'card-1',
      card: {},
      mergeStatus: { isMerged: null, hasPlanDrift: false },
      seq: 5
    });
    await new Promise((r) => setTimeout(r, 20));
    server.clearReceivedMessages();

    server.broadcast({
      type: 'card:journalEvent',
      cardId: 'card-1',
      seq: '6',
      entryType: 'cards:metadata',
      payload: {},
      timestamp: new Date().toISOString()
    });
    await new Promise((r) => setTimeout(r, 30));

    // Dropped before gap detection could misread the string seq: no dispatch,
    // no re-subscribe request, exactly one diagnostic.
    expect(received).toHaveLength(0);
    expect(server.getReceivedMessages()).toHaveLength(0);
    expect(malformedDropWarnings()).toBe(1);

    // The malformed event neither advanced nor wedged seq: the valid successor
    // still applies.
    server.broadcast({
      type: 'card:journalEvent',
      cardId: 'card-1',
      seq: 6,
      entryType: 'cards:metadata',
      payload: { title: 'valid' },
      timestamp: new Date().toISOString()
    });
    await vi.waitFor(() => {
      expect(received).toHaveLength(1);
    });

    // Seq advanced exactly once (via the valid event only).
    subscriber.subscribeToCard('card-1');
    const message = await server.awaitMessage();
    expect(message).toEqual({ type: 'card:subscribe', cardId: 'card-1', sinceSeq: 6 });
    subscriber.disconnect();
  });

  it('drops a card:replay with missing entries without throwing or advancing seq', async () => {
    const subscriber = await connectSubscriber();
    const replays: unknown[] = [];
    subscriber.on('card:replay', (event) => replays.push(event));

    subscriber.subscribeToCard('card-1');
    await server.awaitMessage();
    server.broadcast({
      type: 'card:snapshot',
      cardId: 'card-1',
      card: {},
      mergeStatus: { isMerged: null, hasPlanDrift: false },
      seq: 5
    });
    await new Promise((r) => setTimeout(r, 20));
    server.clearReceivedMessages();

    // Previously advanced cardSeq to latestSeq first, then threw a TypeError
    // on entries.filter — an uncaught exception mid-listener.
    server.broadcast({ type: 'card:replay', cardId: 'card-1', latestSeq: 9 });
    await new Promise((r) => setTimeout(r, 30));

    expect(replays).toHaveLength(0);
    expect(malformedDropWarnings()).toBe(1);

    // Seq did not move: catch-up resumes from where it was.
    subscriber.subscribeToCard('card-1');
    const resubscribe = await server.awaitMessage();
    expect(resubscribe).toEqual({ type: 'card:subscribe', cardId: 'card-1', sinceSeq: 5 });
    subscriber.disconnect();
  });

  it('drops a card:replay containing a wrong-shape entry before mutating seq, then applies a valid replay', async () => {
    const subscriber = await connectSubscriber();
    const replays: Array<{ entries: Array<{ seq: unknown }> }> = [];
    subscriber.on('card:replay', (event) => replays.push(event as { entries: Array<{ seq: unknown }> }));

    subscriber.subscribeToCard('card-1');
    await server.awaitMessage();
    server.broadcast({
      type: 'card:snapshot',
      cardId: 'card-1',
      card: {},
      mergeStatus: { isMerged: null, hasPlanDrift: false },
      seq: 5
    });
    await new Promise((r) => setTimeout(r, 20));
    const stalenessEvents: CardStalenessEvent[] = [];
    subscriber.onStaleness((event) => stalenessEvents.push(event));
    server.clearReceivedMessages();

    server.broadcast({
      type: 'card:replay',
      cardId: 'card-1',
      entries: [
        { seq: 6, type: 'cards:metadata', payload: {}, timestamp: new Date().toISOString() },
        { seq: '7', type: 'cards:metadata', payload: {}, timestamp: new Date().toISOString() }
      ],
      latestSeq: 8
    });
    await new Promise((r) => setTimeout(r, 30));

    // Whole message rejected — no partial application, no staleness flip,
    // seq still at 5 despite the tempting latestSeq 8.
    expect(replays).toHaveLength(0);
    expect(stalenessEvents).toHaveLength(0);
    expect(server.getReceivedMessages()).toHaveLength(0);
    expect(malformedDropWarnings()).toBe(1);

    subscriber.subscribeToCard('card-1');
    const resubscribe = await server.awaitMessage();
    expect(resubscribe).toEqual({ type: 'card:subscribe', cardId: 'card-1', sinceSeq: 5 });
    server.clearReceivedMessages();

    // Subsequent fully well-formed catch-up still applies.
    server.broadcast({
      type: 'card:replay',
      cardId: 'card-1',
      entries: [{ seq: 6, type: 'cards:metadata', payload: {}, timestamp: new Date().toISOString() }],
      latestSeq: 6
    });
    await vi.waitFor(() => {
      expect(replays).toHaveLength(1);
    });
    expect(replays[0]!.entries.map((e) => e.seq)).toEqual([6]);
    subscriber.disconnect();
  });
});
