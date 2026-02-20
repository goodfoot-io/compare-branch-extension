/**
 * Integration tests for the detached transcript watcher streaming loop.
 *
 * Verifies the full streaming lifecycle using real filesystem operations
 * and the actual `runStreamingLoop` function, with only the Cards API
 * client mocked.
 *
 * @summary Integration tests for transcript-watcher streaming loop
 */

import { appendFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/api-discovery.js', () => ({
  createCardsClient: vi.fn()
}));

import {
  IDLE_TIMEOUT_MS,
  POLL_INTERVAL_MS,
  runStreamingLoop,
  sentinelFileExists,
  type TranscriptWatcherArgs
} from '../../src/bin/transcript-watcher.js';
import { createCardsClient } from '../../src/lib/api-discovery.js';

const mockCreateCardsClient = vi.mocked(createCardsClient);

describe('transcript-watcher integration', () => {
  let testDir: string;
  let transcriptPath: string;
  let sessionId: string;

  // Save a reference to the real setTimeout before fake timers are installed.
  // Used to yield to the real event loop (libuv I/O callbacks) between
  // fake timer advances.
  const realSetTimeout = globalThis.setTimeout;

  let mockWrite: ReturnType<typeof vi.fn>;
  let mockClose: ReturnType<typeof vi.fn>;
  let mockOpenStream: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionId = `sess-integ-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    testDir = join(tmpdir(), `watcher-integration-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    transcriptPath = join(testDir, 'transcript.jsonl');

    mockWrite = vi.fn();
    mockClose = vi.fn().mockResolvedValue({
      filename: `${sessionId}.jsonl`,
      streamType: 'claude-code-session',
      lineCount: 0,
      status: 'complete'
    });
    mockOpenStream = vi.fn().mockReturnValue({ write: mockWrite, close: mockClose });
    const mockClient = { openStream: mockOpenStream };
    mockCreateCardsClient.mockResolvedValue(mockClient as never);

    vi.useFakeTimers();

    // Default: PID alive
    vi.spyOn(process, 'kill').mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    rmSync(testDir, { recursive: true, force: true });
  });

  function makeArgs(): TranscriptWatcherArgs {
    return {
      pid: 12345,
      sessionId,
      transcriptPath,
      cardId: 'card-integ',
      cardRepoPath: testDir
    };
  }

  /**
   * Yields to the real event loop so libuv I/O callbacks (file reads, access
   * checks) can complete between fake timer advances.
   *
   * @returns A promise that resolves after a real 5ms delay.
   */
  function yieldToMicrotasks(): Promise<void> {
    return new Promise((resolve) => realSetTimeout(resolve, 5));
  }

  /**
   * Advances fake timers by the given duration in POLL_INTERVAL_MS steps,
   * yielding to the real event loop between each step.
   *
   * @param totalMs - Total milliseconds to advance.
   */
  async function advanceTimeInSteps(totalMs: number): Promise<void> {
    const steps = Math.ceil(totalMs / POLL_INTERVAL_MS);
    for (let i = 0; i < steps; i++) {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
      await yieldToMicrotasks();
    }
  }

  /**
   * Writes the sentinel flush file for the current session.
   */
  function writeSentinelNow(): void {
    const sentinelDir = join(testDir, 'streams', 'claude-code-session');
    mkdirSync(sentinelDir, { recursive: true });
    writeFileSync(join(sentinelDir, `${sessionId}.flush`), '');
  }

  /**
   * Writes the sentinel file after a fake-timer delay.
   *
   * @param delayMs - Fake-timer delay before writing the sentinel.
   */
  function writeSentinelAfter(delayMs: number): void {
    setTimeout(() => {
      writeSentinelNow();
    }, delayMs);
  }

  /**
   * Makes the mocked PID report as dead after a fake-timer delay.
   *
   * @param delayMs - Fake-timer delay before simulating PID death.
   */
  function killPidAfter(delayMs: number): void {
    const originalKill = process.kill as ReturnType<typeof vi.fn>;
    setTimeout(() => {
      originalKill.mockImplementation(() => {
        const err = new Error('kill ESRCH') as NodeJS.ErrnoException;
        err.code = 'ESRCH';
        throw err;
      });
    }, delayMs);
  }

  // -----------------------------------------------------------------------
  // Test 1: Full lifecycle -- write, stream, sentinel, exit
  // -----------------------------------------------------------------------
  it('full lifecycle: writes are streamed, sentinel triggers flush and exit, sentinel file removed', async () => {
    // Start with an empty transcript file
    writeFileSync(transcriptPath, '');

    const promise = runStreamingLoop(makeArgs());

    // Advance one poll -- no data yet
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    await yieldToMicrotasks();

    expect(mockOpenStream).not.toHaveBeenCalled();

    // Simulate Claude writing lines incrementally
    appendFileSync(transcriptPath, '{"type":"init","ts":1}\n');

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    await yieldToMicrotasks();

    // Stream should now be open and the line written
    expect(mockOpenStream).toHaveBeenCalledTimes(1);
    expect(mockWrite).toHaveBeenCalledWith('{"type":"init","ts":1}');

    // Write more lines
    appendFileSync(transcriptPath, '{"type":"message","content":"hello"}\n{"type":"message","content":"world"}\n');

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    await yieldToMicrotasks();

    expect(mockWrite).toHaveBeenCalledWith('{"type":"message","content":"hello"}');
    expect(mockWrite).toHaveBeenCalledWith('{"type":"message","content":"world"}');

    // Write sentinel to trigger graceful exit
    writeSentinelAfter(POLL_INTERVAL_MS + 50);

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
    await yieldToMicrotasks();

    await promise;

    // Stream was closed
    expect(mockClose).toHaveBeenCalledTimes(1);
    // Sentinel file was removed
    expect(await sentinelFileExists(testDir, sessionId)).toBe(false);
    const sentinelPath = join(testDir, 'streams', 'claude-code-session', `${sessionId}.flush`);
    expect(existsSync(sentinelPath)).toBe(false);
  });

  // -----------------------------------------------------------------------
  // Test 2: Idle timeout closes and resumes stream
  // -----------------------------------------------------------------------
  it('idle timeout closes stream, new data resumes with a new openStream call', async () => {
    writeFileSync(transcriptPath, '{"type":"first-batch"}\n');

    // PID dies well after the idle timeout + resume cycle
    const exitTime = IDLE_TIMEOUT_MS + POLL_INTERVAL_MS * 20;
    killPidAfter(exitTime);

    // Set up second writer for the resumed stream
    const mockWrite2 = vi.fn();
    const mockClose2 = vi.fn().mockResolvedValue({
      filename: `${sessionId}.jsonl`,
      streamType: 'claude-code-session',
      lineCount: 2,
      status: 'complete'
    });
    let openCount = 0;
    mockOpenStream.mockImplementation(() => {
      openCount++;
      if (openCount === 1) return { write: mockWrite, close: mockClose };
      return { write: mockWrite2, close: mockClose2 };
    });

    const promise = runStreamingLoop(makeArgs());

    // Advance past first poll to pick up data and open stream
    await advanceTimeInSteps(POLL_INTERVAL_MS * 2);

    expect(mockOpenStream).toHaveBeenCalledTimes(1);
    expect(mockWrite).toHaveBeenCalledWith('{"type":"first-batch"}');

    // Advance past idle timeout -- stream should close
    await advanceTimeInSteps(IDLE_TIMEOUT_MS + POLL_INTERVAL_MS * 2);

    expect(mockClose).toHaveBeenCalledTimes(1);

    // Write new data to resume the stream
    appendFileSync(transcriptPath, '{"type":"second-batch"}\n');

    await advanceTimeInSteps(POLL_INTERVAL_MS * 3);

    // A new stream should have been opened
    expect(mockOpenStream).toHaveBeenCalledTimes(2);
    expect(mockWrite2).toHaveBeenCalledWith('{"type":"second-batch"}');

    // Let the loop exit via PID death
    await advanceTimeInSteps(exitTime);
    await promise;

    // Second writer should also have been closed
    expect(mockClose2).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Test 3: PID death triggers flush and exit
  // -----------------------------------------------------------------------
  it('PID death triggers final flush of remaining lines and stream close', async () => {
    writeFileSync(transcriptPath, '{"type":"before-death"}\n');

    // Schedule more data to appear, then kill PID
    setTimeout(() => {
      appendFileSync(transcriptPath, '{"type":"just-before-death"}\npartial-no-newline');
    }, POLL_INTERVAL_MS - 50);

    killPidAfter(POLL_INTERVAL_MS + 50);

    const promise = runStreamingLoop(makeArgs());
    await advanceTimeInSteps(POLL_INTERVAL_MS * 5);
    await promise;

    // The initial line should have been written
    expect(mockWrite).toHaveBeenCalledWith('{"type":"before-death"}');
    // Stream was closed (final flush + cleanup)
    expect(mockClose).toHaveBeenCalledTimes(1);
    // The stream was opened since there was data
    expect(mockOpenStream).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Test 4: Zero-line session -- no stream opened
  // -----------------------------------------------------------------------
  it('zero-line session: no stream is opened when transcript has no data', async () => {
    // Do NOT create the transcript file at all -- simulating no data
    killPidAfter(POLL_INTERVAL_MS * 2 + 50);

    const promise = runStreamingLoop(makeArgs());
    await advanceTimeInSteps(POLL_INTERVAL_MS * 5);
    await promise;

    // openStream should never have been called
    expect(mockOpenStream).not.toHaveBeenCalled();
    expect(mockWrite).not.toHaveBeenCalled();
    expect(mockClose).not.toHaveBeenCalled();
  });
});
