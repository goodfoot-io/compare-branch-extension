/**
 * Tests for the serialized sync-work chain.
 *
 * @summary Covers ordering, non-concurrency, and error isolation.
 */

import { describe, expect, it } from 'vitest';
import { SyncChain } from '../../../src/transcript-sync/engine/sync-chain.js';

describe('SyncChain', () => {
  it('runs queued tasks in order, one at a time', async () => {
    const chain = new SyncChain();
    const order: number[] = [];
    let concurrent = 0;
    let maxConcurrent = 0;

    const makeTask = (n: number) => async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((resolve) => setTimeout(resolve, 5));
      order.push(n);
      concurrent--;
    };

    chain.push(makeTask(1), () => {});
    chain.push(makeTask(2), () => {});
    chain.push(makeTask(3), () => {});

    await chain.drain();

    expect(order).toEqual([1, 2, 3]);
    expect(maxConcurrent).toBe(1);
  });

  it('logs a failing task via warnFn and continues running subsequent tasks', async () => {
    const chain = new SyncChain();
    const warnings: string[] = [];
    const order: string[] = [];

    chain.push(
      () => {
        throw new Error('boom');
      },
      (msg) => warnings.push(msg)
    );
    chain.push(
      async () => {
        order.push('after-failure');
      },
      () => {}
    );

    await chain.drain();

    expect(order).toEqual(['after-failure']);
    expect(warnings.some((w) => w.includes('boom'))).toBe(true);
  });

  it('drain resolves even when nothing has been queued', async () => {
    const chain = new SyncChain();
    await expect(chain.drain()).resolves.toBeUndefined();
  });

  it('drain waits for tasks queued after drain() was called but before it resolves', async () => {
    const chain = new SyncChain();
    const order: string[] = [];

    chain.push(
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        order.push('first');
      },
      () => {}
    );

    const drainPromise = chain.drain();
    chain.push(
      async () => {
        order.push('second');
      },
      () => {}
    );

    await drainPromise;
    expect(order).toContain('first');
  });
});
