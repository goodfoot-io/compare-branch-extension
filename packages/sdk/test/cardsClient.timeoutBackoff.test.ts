/**
 * Regression test for sdk-rt-03: CardsClient's per-request fetch timeout is
 * documented (cardsClient.ts:100-101, 165-167) to "start at 3 seconds and
 * double on consecutive failures up to 10 seconds", but the doubling is never
 * implemented — `_currentTimeoutMs` is only ever read or reset to 3 s, and the
 * network-error retry path calls `onRequestSuccess()` which resets it.
 *
 * This test exercises the default fetch-based HTTP client (no injected
 * HttpClient, so `getTimeoutSignal()` runs) and captures the timeout passed to
 * `AbortSignal.timeout` on each consecutive network-error retry. The documented
 * contract requires those values to grow (3000 → 6000 → ... up to 10000); the
 * defect pins every attempt at 3000.
 *
 * @summary Reproduces missing per-request timeout backoff in CardsClient
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

  it('doubles the per-request fetch timeout on consecutive network-error retries', async () => {
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

    // First attempt starts at 3000 ms.
    expect(capturedTimeoutsMs[0]).toBe(3_000);

    // Documented contract: the per-request timeout doubles on consecutive
    // failures (up to a 10 s cap). Under the bug it stays pinned at 3000, so
    // this assertion fails.
    const firstFour = capturedTimeoutsMs.slice(0, 4);
    expect(firstFour).toEqual([3_000, 6_000, 10_000, 10_000]);
  });
});
