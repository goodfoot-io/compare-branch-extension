/**
 * Tests for the createWatcher primitive.
 *
 * @summary Tests for watcher lifecycle, handshake, and control flow
 */

import { describe, it } from 'vitest';

describe('createWatcher', () => {
  it.skip('handshake happy path: POST returns socketPath → dial → hello → hello-ack → handler runs → returns → run() resolves', async () => {
    // Phase 4: set up a mock server that listens on a Unix socket, register a
    // watcher via createWatcher, assert that the watcher sends hello, receives
    // hello-ack, the handler is invoked with a WatcherContext, and run()
    // resolves once the handler returns.
  });

  it.skip('extension-down throws WatcherRegistrationError', async () => {
    // Phase 4: when the POST /internal/watchers endpoint is unreachable,
    // createWatcher should reject with WatcherRegistrationError.
  });

  it.skip('duplicate watcherId: server closes first socket — existing watcher run() rejects with specific error', async () => {
    // Phase 4: when the same watcherId is registered twice, the server closes
    // the first connection; the first watcher's run() should reject with a
    // descriptive error rather than hanging.
  });

  it.skip('onControl("stop") callback fires on incoming control, then stop-ack is sent, then socket closes cleanly', async () => {
    // Phase 4: send a control { type: "stop" } message from the server side;
    // assert the handler registered via onControl("stop") is called, that
    // stop-ack is written back on the socket, and that the socket is then
    // closed cleanly.
  });

  it.skip('unregistered control command types are warned-and-ignored', async () => {
    // Phase 4: send a control message with an unknown command type; assert no
    // crash and that a warning is emitted via the logger.
  });

  it.skip('events emitted before hello-ack are buffered; events emitted after stop-ack are dropped', async () => {
    // Phase 4: call ctx.emit() before hello-ack arrives and verify the event
    // is queued; then call ctx.emit() after stop-ack is sent and verify it is
    // silently dropped.
  });
});
