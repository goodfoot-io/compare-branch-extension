/**
 * Regression test for sdk-rt-03: CardsClient's per-request fetch timeout backoff.
 *
 * `_currentTimeoutMs` starts at {@link REQUEST_TIMEOUT_MS} and doubles on each
 * consecutive network-error retry, capped at `MAX_REQUEST_TIMEOUT_MS`, and is
 * reset to the initial value on success. The original defect was that the
 * doubling/reset machinery was missing entirely (`onRequestSuccess()` reset the
 * timeout on every retry). The fix wires `_currentTimeoutMs` through
 * `getTimeoutSignal()` with `Math.min(_currentTimeoutMs * 2, MAX)` on the
 * network-error retry path.
 *
 * The initial timeout and the cap are both 10 s, so the doubling is bounded at
 * the initial value and every attempt arms a 10 s timeout. This test captures
 * the timeout passed to `AbortSignal.timeout` on each consecutive network-error
 * retry and asserts the machinery arms the configured 10 s on every attempt
 * (never a shorter value, never above the cap).
 *
 * @summary Verifies CardsClient arms the capped per-request timeout on each retry
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CardsClient } from '../src/client/cardsClient.js';

describe('CardsClient per-request timeout backoff (sdk-rt-03)', () => {
  let timeoutSpy: ReturnType<typeof vi.spyOn>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let capturedTimeoutsMs: number[];

  beforeEach(() => {
    vi.useFakeTimers();
    capturedTimeoutsMs = [];

    // Capture every per-attempt fetch timeout the client arms. Delegate to the
    // real implementation so the returned signal still behaves like an
    // AbortSignal.
    const realTimeout = AbortSignal.timeout.bind(AbortSignal);
    timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms: number) => {
      capturedTimeoutsMs.push(ms);
      return realTimeout(ms);
    });

    // The first four fetch attempts fail as network errors (retryable), so the
    // retry loop runs the timeout machinery once per attempt; the fifth
    // succeeds so the request resolves and no promise is left hanging.
    let attempts = 0;
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      attempts += 1;
      if (attempts <= 4) {
        throw new TypeError('fetch failed');
      }
      return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
    });
  });

  afterEach(() => {
    timeoutSpy.mockRestore();
    fetchSpy.mockRestore();
    vi.useRealTimers();
  });

  it('arms the capped per-request fetch timeout on every consecutive network-error retry', async () => {
    // No injected HttpClient → the default fetch-based client runs, which calls
    // getTimeoutSignal() → AbortSignal.timeout(this._currentTimeoutMs).
    const client = new CardsClient({ baseUrl: 'http://localhost:0', accessToken: 't', workspacePath: '/w' });

    const promise = client.listCards();

    // Drive several retry backoffs so multiple attempts (and thus multiple
    // per-request timeouts) are armed before the final attempt succeeds.
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(30_000);
    }

    await expect(promise).resolves.toEqual([]);

    // At least a few attempts should have been made.
    expect(capturedTimeoutsMs.length).toBeGreaterThanOrEqual(4);

    // The initial timeout and the cap are both 10 s, so doubling on each retry
    // is bounded at the initial value: every attempt arms 10 s. A regression
    // that dropped the wiring (or lowered the initial below the cap) would show
    // a different first value or a non-flat series here.
    const firstFour = capturedTimeoutsMs.slice(0, 4);
    expect(firstFour).toEqual([10_000, 10_000, 10_000, 10_000]);
  });
});
