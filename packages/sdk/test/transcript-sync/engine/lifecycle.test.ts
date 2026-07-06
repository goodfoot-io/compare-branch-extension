/**
 * Tests for the injectable four-exit-condition polling loop.
 *
 * @summary Covers all four exit paths via dependency injection, no real clocks/timers.
 */

import { describe, expect, it } from 'vitest';
import { type LifecycleDeps, MAX_LIFETIME_MS, runWatcherLoop } from '../../../src/transcript-sync/engine/lifecycle.js';

interface DepsOverrides {
  signal?: { stopped: boolean };
  checkSentinel?: () => Promise<boolean>;
  checkAlive?: () => boolean;
  onTick?: () => Promise<number>;
  onMaxLifetime?: () => void;
  maxLifetimeMs?: number;
}

function makeDeps(overrides: DepsOverrides = {}): LifecycleDeps {
  let clock = 0;
  return {
    signal: overrides.signal ?? { stopped: false },
    checkSentinel: overrides.checkSentinel ?? (() => Promise.resolve(false)),
    checkAlive: overrides.checkAlive ?? (() => true),
    now: () => clock,
    sleep: (ms: number): Promise<void> => {
      clock += ms;
      return Promise.resolve();
    },
    onTick: overrides.onTick,
    onMaxLifetime: overrides.onMaxLifetime,
    maxLifetimeMs: overrides.maxLifetimeMs ?? MAX_LIFETIME_MS
  };
}

describe('runWatcherLoop', () => {
  it('exits via stop-control when signal.stopped is set before the first iteration', async () => {
    const result = await runWatcherLoop(makeDeps({ signal: { stopped: true } }));
    expect(result).toEqual({ maxLifetimeExceeded: false, stopRequested: true });
  });

  it('exits via sentinel detection', async () => {
    const result = await runWatcherLoop(makeDeps({ checkSentinel: () => Promise.resolve(true) }));
    expect(result).toEqual({ maxLifetimeExceeded: false, stopRequested: false });
  });

  it('exits via process death when checkAlive returns false', async () => {
    const result = await runWatcherLoop(makeDeps({ checkAlive: () => false }));
    expect(result).toEqual({ maxLifetimeExceeded: false, stopRequested: false });
  });

  it('exits via max-lifetime timeout and invokes onMaxLifetime', async () => {
    let onMaxLifetimeCalled = false;
    const result = await runWatcherLoop(
      makeDeps({ maxLifetimeMs: 0, onMaxLifetime: () => (onMaxLifetimeCalled = true) })
    );
    expect(result).toEqual({ maxLifetimeExceeded: true, stopRequested: false });
    expect(onMaxLifetimeCalled).toBe(true);
  });

  it('calls onTick each surviving iteration and sleeps the interval it returns', async () => {
    let aliveChecks = 0;
    let tickCalls = 0;
    const sleepDurations: number[] = [];
    let clock = 0;

    const result = await runWatcherLoop({
      signal: { stopped: false },
      checkSentinel: () => Promise.resolve(false),
      checkAlive: () => {
        aliveChecks += 1;
        return aliveChecks < 3;
      },
      now: () => clock,
      sleep: (ms: number) => {
        sleepDurations.push(ms);
        clock += ms;
        return Promise.resolve();
      },
      onTick: async () => {
        tickCalls += 1;
        return tickCalls === 1 ? 250 : 5000;
      }
    });

    expect(result).toEqual({ maxLifetimeExceeded: false, stopRequested: false });
    expect(tickCalls).toBe(2);
    expect(sleepDurations).toEqual([250, 5000]);
  });

  it('defaults to the steady tick interval when onTick is omitted', async () => {
    let aliveChecks = 0;
    const sleepDurations: number[] = [];
    let clock = 0;

    await runWatcherLoop({
      signal: { stopped: false },
      checkSentinel: () => Promise.resolve(false),
      checkAlive: () => {
        aliveChecks += 1;
        return aliveChecks < 2;
      },
      now: () => clock,
      sleep: (ms: number) => {
        sleepDurations.push(ms);
        clock += ms;
        return Promise.resolve();
      }
    });

    expect(sleepDurations).toEqual([5000]);
  });
});
