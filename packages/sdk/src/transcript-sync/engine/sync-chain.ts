/**
 * Serialized sync-work queue for the transcript-sync engine.
 *
 * Ports the `syncChain` pattern from `bin/transcript-watcher.ts`: filesystem
 * watch events and periodic reconcile passes both queue their work through a
 * single promise chain, so no two sync passes for the same session ever run
 * concurrently (which would otherwise race on shared cursor state). Errors
 * from a queued task are logged and never break the chain — one failed task
 * must not stall or drop everything queued after it.
 *
 * @summary Single serialized promise chain for sync work
 * @module
 */

/**
 * A FIFO chain of async tasks that always run one at a time, in the order
 * they were pushed.
 */
export class SyncChain {
  private chain: Promise<void> = Promise.resolve();

  /**
   * Queues a task to run after every previously-queued task completes.
   *
   * @param task - The async task to run.
   * @param warnFn - Called with a message if the task throws or rejects.
   */
  push(task: () => Promise<void>, warnFn: (message: string) => void): void {
    this.chain = this.chain.then(async () => {
      try {
        await task();
      } catch (error) {
        warnFn(`sync-chain: queued task failed: ${String(error)}`);
      }
    });
  }

  /**
   * Resolves once every task queued so far has completed (including any
   * queued after this call was made but before the chain drains).
   */
  async drain(): Promise<void> {
    await this.chain;
  }
}
