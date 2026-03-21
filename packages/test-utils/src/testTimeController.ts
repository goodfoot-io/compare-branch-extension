/**
 * Test utility for controlling git commit timestamps deterministically.
 *
 * Git commit timestamps have 1-second resolution. Without this controller,
 * tests that create multiple commits in rapid succession may receive identical
 * timestamps, causing sort-order non-determinism. By setting
 * `GIT_AUTHOR_DATE` and `GIT_COMMITTER_DATE` before each commit the test
 * controls the exact timestamp without any real delay.
 *
 * @summary Control git commit timestamps deterministically in tests
 */

/**
 * Fixed starting epoch used by `TestTimeController`.
 * All times advance from this base.
 */
const BASE_EPOCH_ISO = '2024-01-01T10:00:00Z';

/**
 * Controls git commit timestamps by manipulating `GIT_AUTHOR_DATE` and
 * `GIT_COMMITTER_DATE` environment variables.
 *
 * Call `setup()` in `beforeEach`, `cleanup()` in `afterEach`, and
 * `advance(seconds)` between operations that must have distinct timestamps.
 *
 * ```typescript
 * const timeController = new TestTimeController();
 *
 * beforeEach(() => timeController.setup());
 * afterEach(() => timeController.cleanup());
 *
 * it('orders commits by creation time', async () => {
 *   await testRepo.commitFile('a.ts', 'content');
 *   timeController.advance(2);
 *   await testRepo.commitFile('b.ts', 'content');
 * });
 * ```
 *
 * @summary Control git commit timestamps deterministically in tests
 */
export class TestTimeController {
  private currentMs: number;
  private originalAuthorDate: string | undefined;
  private originalCommitterDate: string | undefined;

  constructor() {
    this.currentMs = new Date(BASE_EPOCH_ISO).getTime();
  }

  /**
   * Saves the current `GIT_AUTHOR_DATE` / `GIT_COMMITTER_DATE` env vars and
   * sets them to the controller's initial timestamp.
   *
   * Call this in `beforeEach`.
   */
  setup(): void {
    this.originalAuthorDate = process.env['GIT_AUTHOR_DATE'];
    this.originalCommitterDate = process.env['GIT_COMMITTER_DATE'];
    this._applyEnv();
  }

  /**
   * Restores the original `GIT_AUTHOR_DATE` / `GIT_COMMITTER_DATE` env vars.
   *
   * Call this in `afterEach`.
   */
  cleanup(): void {
    if (this.originalAuthorDate === undefined) {
      delete process.env['GIT_AUTHOR_DATE'];
    } else {
      process.env['GIT_AUTHOR_DATE'] = this.originalAuthorDate;
    }

    if (this.originalCommitterDate === undefined) {
      delete process.env['GIT_COMMITTER_DATE'];
    } else {
      process.env['GIT_COMMITTER_DATE'] = this.originalCommitterDate;
    }

    // Reset internal clock for next test
    this.currentMs = new Date(BASE_EPOCH_ISO).getTime();
  }

  /**
   * Advances the internal clock by the given number of seconds and
   * immediately updates `GIT_AUTHOR_DATE` / `GIT_COMMITTER_DATE`.
   *
   * @param seconds - Number of seconds to advance. Must be positive.
   */
  advance(seconds: number): void {
    this.currentMs += seconds * 1000;
    this._applyEnv();
  }

  /**
   * Returns the current controlled timestamp as an ISO 8601 string.
   *
   * @returns Current timestamp in ISO 8601 format.
   */
  get currentTimestamp(): string {
    return new Date(this.currentMs).toISOString();
  }

  private _applyEnv(): void {
    const iso = this.currentTimestamp;
    process.env['GIT_AUTHOR_DATE'] = iso;
    process.env['GIT_COMMITTER_DATE'] = iso;
  }
}
