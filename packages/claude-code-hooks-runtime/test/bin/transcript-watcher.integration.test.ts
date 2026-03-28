/**
 * Integration tests for the detached transcript watcher streaming loop.
 *
 * Verifies the full streaming lifecycle using real filesystem operations
 * and the actual `runStreamingLoop` function, with only the Cards API
 * client mocked.
 *
 * @summary Integration tests for transcript-watcher streaming loop
 */

import { EventEmitter } from 'node:events';
import { appendFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@cards/sdk/client/discovery', () => ({
  createCardsClient: vi.fn()
}));

import { createCardsClient } from '@cards/sdk/client/discovery';
import {
  POLL_INTERVAL_MS,
  runStreamingLoop,
  sentinelFileExists,
  type TranscriptWatcherArgs
} from '../../src/bin/transcript-watcher.js';

const mockCreateCardsClient = vi.mocked(createCardsClient);

describe('transcript-watcher integration', () => {
  let testDir: string;
  let transcriptPath: string;
  let sessionId: string;

  let mockWrite: ReturnType<typeof vi.fn>;
  let mockClose: ReturnType<typeof vi.fn>;
  let mockOpenStreamWebSocket: ReturnType<typeof vi.fn>;

  let emitter: EventEmitter;
  let loopDone: boolean;

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
    mockOpenStreamWebSocket = vi
      .fn()
      .mockResolvedValue({ write: mockWrite, close: mockClose, resumeFrom: 0, linesSent: 0 });
    const mockClient = { openStreamWebSocket: mockOpenStreamWebSocket };
    mockCreateCardsClient.mockResolvedValue(mockClient as never);

    emitter = new EventEmitter();
    loopDone = false;
    emitter.on('done', () => {
      loopDone = true;
    });

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
      cardRepoPath: testDir,
      emitter
    };
  }

  /**
   * Waits for the streaming loop to finish its current iteration.
   *
   * Listens for the loop's 'iterationEnd' event (emitted after all I/O in an
   * iteration completes, before the sleep timer) or 'done' (emitted after
   * post-loop cleanup). Returns immediately if the loop has already exited.
   *
   * @returns A promise that resolves when the current iteration completes.
   */
  function waitForLoopIdle(): Promise<void> {
    if (loopDone) return Promise.resolve();
    return new Promise((resolve) => {
      const handler = () => {
        emitter.off('iterationEnd', handler);
        emitter.off('done', handler);
        resolve();
      };
      emitter.on('iterationEnd', handler);
      emitter.on('done', handler);
    });
  }

  /**
   * Advances fake timers by the given duration in POLL_INTERVAL_MS steps,
   * waiting for the loop to complete each iteration before advancing further.
   *
   * @param totalMs - Total milliseconds to advance.
   */
  async function advanceTimeInSteps(totalMs: number): Promise<void> {
    const steps = Math.ceil(totalMs / POLL_INTERVAL_MS);
    for (let i = 0; i < steps; i++) {
      if (loopDone) return;
      const idle = waitForLoopIdle();
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
      await idle;
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
    const idle1 = waitForLoopIdle();
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    await idle1;

    expect(mockOpenStreamWebSocket).not.toHaveBeenCalled();

    // Simulate Claude writing lines incrementally
    appendFileSync(transcriptPath, '{"type":"init","ts":1}\n');

    const idle2 = waitForLoopIdle();
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    await idle2;

    // Session should now be open and the line written
    expect(mockOpenStreamWebSocket).toHaveBeenCalledTimes(1);
    expect(mockWrite).toHaveBeenCalledWith('{"type":"init","ts":1}');

    // Write more lines
    appendFileSync(transcriptPath, '{"type":"message","content":"hello"}\n{"type":"message","content":"world"}\n');

    const idle3 = waitForLoopIdle();
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    await idle3;

    expect(mockWrite).toHaveBeenCalledWith('{"type":"message","content":"hello"}');
    expect(mockWrite).toHaveBeenCalledWith('{"type":"message","content":"world"}');

    // Write sentinel to trigger graceful exit
    writeSentinelAfter(POLL_INTERVAL_MS + 50);

    await advanceTimeInSteps(POLL_INTERVAL_MS * 3);

    await promise;

    // Session was closed
    expect(mockClose).toHaveBeenCalledTimes(1);
    // Sentinel file was removed
    expect(await sentinelFileExists(testDir, sessionId)).toBe(false);
    const sentinelPath = join(testDir, 'streams', 'claude-code-session', `${sessionId}.flush`);
    expect(existsSync(sentinelPath)).toBe(false);
  });

  // -----------------------------------------------------------------------
  // Test 2: Session stays open during idle (no idle timeout)
  // -----------------------------------------------------------------------
  it('session stays open during idle, new data is picked up without reopening', async () => {
    writeFileSync(transcriptPath, '{"type":"first-batch"}\n');

    // Kill PID after several idle poll cycles
    const exitTime = POLL_INTERVAL_MS * 15;
    killPidAfter(exitTime);

    const promise = runStreamingLoop(makeArgs());

    // Advance past first poll to pick up data and open session
    await advanceTimeInSteps(POLL_INTERVAL_MS * 2);

    expect(mockOpenStreamWebSocket).toHaveBeenCalledTimes(1);
    expect(mockWrite).toHaveBeenCalledWith('{"type":"first-batch"}');

    // Advance several more idle polls — session should stay open
    await advanceTimeInSteps(POLL_INTERVAL_MS * 5);

    expect(mockOpenStreamWebSocket).toHaveBeenCalledTimes(1); // still just one open
    expect(mockClose).not.toHaveBeenCalled(); // not closed during idle

    // Write new data — same session picks it up
    appendFileSync(transcriptPath, '{"type":"second-batch"}\n');

    await advanceTimeInSteps(POLL_INTERVAL_MS * 3);

    // No new session opened — same session handles new data
    expect(mockOpenStreamWebSocket).toHaveBeenCalledTimes(1);
    expect(mockWrite).toHaveBeenCalledWith('{"type":"second-batch"}');

    // Let the loop exit via PID death
    await advanceTimeInSteps(exitTime);
    await promise;

    // Session closed once at exit
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // Test 3: PID death triggers flush and exit
  // -----------------------------------------------------------------------
  it('PID death triggers final flush of remaining lines and session close', async () => {
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
    // Session was closed (final flush + cleanup)
    expect(mockClose).toHaveBeenCalledTimes(1);
    // The session was opened since there was data
    expect(mockOpenStreamWebSocket).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Test 4: Zero-line session -- no session opened
  // -----------------------------------------------------------------------
  it('zero-line session: no session is opened when transcript has no data', async () => {
    // Do NOT create the transcript file at all -- simulating no data
    killPidAfter(POLL_INTERVAL_MS * 2 + 50);

    const promise = runStreamingLoop(makeArgs());
    await advanceTimeInSteps(POLL_INTERVAL_MS * 5);
    await promise;

    // openStreamWebSocket should never have been called
    expect(mockOpenStreamWebSocket).not.toHaveBeenCalled();
    expect(mockWrite).not.toHaveBeenCalled();
    expect(mockClose).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Test A: Watcher recovers after transient session failure
  // -----------------------------------------------------------------------
  it('watcher recovers after transient session failure', async () => {
    writeFileSync(transcriptPath, '{"type":"recover-test"}\n');

    // Set up two session objects: first write throws, second succeeds
    const mockWrite1 = vi.fn().mockImplementationOnce(() => {
      throw new Error('Simulated write failure');
    });
    const mockWrite2 = vi.fn();
    const mockClose1 = vi.fn().mockResolvedValue({
      filename: `${sessionId}.jsonl`,
      streamType: 'claude-code-session',
      lineCount: 0,
      status: 'complete'
    });
    const mockClose2 = vi.fn().mockResolvedValue({
      filename: `${sessionId}.jsonl`,
      streamType: 'claude-code-session',
      lineCount: 1,
      status: 'complete'
    });

    let openCount = 0;
    mockOpenStreamWebSocket.mockImplementation(async () => {
      openCount++;
      if (openCount === 1) return { write: mockWrite1, close: mockClose1, resumeFrom: 0, linesSent: 0 };
      return { write: mockWrite2, close: mockClose2, resumeFrom: 1, linesSent: 0 };
    });

    killPidAfter(POLL_INTERVAL_MS * 5 + 50);
    const promise = runStreamingLoop(makeArgs());

    // Poll 1 fires immediately (no timer advance needed) — session opens, write throws,
    // session is nulled, bytesRead is NOT advanced.
    await waitForLoopIdle();

    expect(mockOpenStreamWebSocket).toHaveBeenCalledTimes(1);
    expect(mockWrite1).toHaveBeenCalledTimes(1);
    // After write failure, session should be null — second open has not happened yet
    expect(mockWrite2).not.toHaveBeenCalled();

    // Advance one poll interval: loop sleep fires, poll 2 re-reads same line
    // (bytesRead rolled back), opens new session, write succeeds
    await advanceTimeInSteps(POLL_INTERVAL_MS);

    expect(mockOpenStreamWebSocket).toHaveBeenCalledTimes(2);
    expect(mockWrite2).toHaveBeenCalledWith('{"type":"recover-test"}');

    await advanceTimeInSteps(POLL_INTERVAL_MS * 5);
    await promise;
  });

  // -----------------------------------------------------------------------
  // Test B: Watcher retries after connection error on open
  // -----------------------------------------------------------------------
  it('watcher retries after connection error on open', async () => {
    writeFileSync(transcriptPath, '{"type":"conflict-test"}\n');

    // First call to createCardsClient throws (simulating connection error)
    let clientCallCount = 0;
    const mockClient = { openStreamWebSocket: mockOpenStreamWebSocket };
    mockCreateCardsClient.mockImplementation(async () => {
      clientCallCount++;
      if (clientCallCount === 1) {
        throw new Error('ApiError: Conflict');
      }
      return mockClient as never;
    });

    killPidAfter(POLL_INTERVAL_MS * 8 + 50);
    const promise = runStreamingLoop(makeArgs());

    // Poll 1 fires immediately — createCardsClient throws, tryOpenSession returns null, no write
    await waitForLoopIdle();

    expect(mockOpenStreamWebSocket).not.toHaveBeenCalled();
    expect(mockWrite).not.toHaveBeenCalled();

    // Advance one poll interval: loop sleep fires, poll 2 — createCardsClient succeeds,
    // session opens, line is written
    await advanceTimeInSteps(POLL_INTERVAL_MS);

    expect(mockOpenStreamWebSocket).toHaveBeenCalledTimes(1);
    expect(mockWrite).toHaveBeenCalledWith('{"type":"conflict-test"}');

    await advanceTimeInSteps(POLL_INTERVAL_MS * 8);
    await promise;
  });

  // -----------------------------------------------------------------------
  // Test C: Watcher continues after close failure during exit
  // -----------------------------------------------------------------------
  it('watcher continues after close failure during exit cleanup', async () => {
    writeFileSync(transcriptPath, '{"type":"close-fail-test"}\n');

    // close() throws
    mockClose.mockRejectedValueOnce(new Error('Simulated close failure'));

    killPidAfter(POLL_INTERVAL_MS * 3 + 50);

    const promise = runStreamingLoop(makeArgs());

    // Advance past first poll to write the initial line
    await advanceTimeInSteps(POLL_INTERVAL_MS * 2);

    expect(mockOpenStreamWebSocket).toHaveBeenCalledTimes(1);
    expect(mockWrite).toHaveBeenCalledWith('{"type":"close-fail-test"}');

    // Let the loop exit via PID death — close() will throw but should not propagate
    await advanceTimeInSteps(POLL_INTERVAL_MS * 5);
    await expect(promise).resolves.toBeUndefined();

    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // Test D: bytesRead rolls back on write failure
  // -----------------------------------------------------------------------
  it('bytesRead rolls back on write failure', async () => {
    writeFileSync(transcriptPath, '{"type":"line1"}\n{"type":"line2"}\n');

    // First write call throws; subsequent calls succeed
    mockWrite.mockImplementationOnce(() => {
      throw new Error('Simulated write failure on first batch');
    });

    // Use two distinct session objects so we can verify the re-read content
    const mockWrite2 = vi.fn();
    const mockClose2 = vi.fn().mockResolvedValue({
      filename: `${sessionId}.jsonl`,
      streamType: 'claude-code-session',
      lineCount: 2,
      status: 'complete'
    });
    let openCount = 0;
    mockOpenStreamWebSocket.mockImplementation(async () => {
      openCount++;
      if (openCount === 1) return { write: mockWrite, close: mockClose, resumeFrom: 0, linesSent: 0 };
      return { write: mockWrite2, close: mockClose2, resumeFrom: 0, linesSent: 0 };
    });

    killPidAfter(POLL_INTERVAL_MS * 8 + 50);
    const promise = runStreamingLoop(makeArgs());

    // Poll 1 fires immediately — session opens, first write throws, session nulled,
    // bytesRead NOT advanced.
    await waitForLoopIdle();

    expect(mockOpenStreamWebSocket).toHaveBeenCalledTimes(1);
    expect(mockWrite).toHaveBeenCalledTimes(1);
    expect(mockWrite).toHaveBeenCalledWith('{"type":"line1"}');
    // Second session not yet opened
    expect(mockWrite2).not.toHaveBeenCalled();

    // Advance one poll interval: loop sleep fires, poll 2 — bytesRead rolled back,
    // re-reads from beginning, opens new session, both lines written
    await advanceTimeInSteps(POLL_INTERVAL_MS);

    expect(mockOpenStreamWebSocket).toHaveBeenCalledTimes(2);
    // Both lines re-read and written to second session
    expect(mockWrite2).toHaveBeenCalledWith('{"type":"line1"}');
    expect(mockWrite2).toHaveBeenCalledWith('{"type":"line2"}');

    await advanceTimeInSteps(POLL_INTERVAL_MS * 8);
    await promise;
  });

  // -----------------------------------------------------------------------
  // Test E: Watcher recovers when first open fails (API unavailable)
  // -----------------------------------------------------------------------
  it('watcher recovers when first open fails', async () => {
    writeFileSync(transcriptPath, '{"type":"api-unavailable-test"}\n');

    // createCardsClient returns null on first call (API unavailable), then succeeds
    let clientCallCount = 0;
    const mockClient = { openStreamWebSocket: mockOpenStreamWebSocket };
    mockCreateCardsClient.mockImplementation(async () => {
      clientCallCount++;
      if (clientCallCount === 1) {
        return null as never;
      }
      return mockClient as never;
    });

    killPidAfter(POLL_INTERVAL_MS * 8 + 50);
    const promise = runStreamingLoop(makeArgs());

    // Poll 1 fires immediately — createCardsClient returns null, API unavailable, no session opened
    await waitForLoopIdle();

    expect(mockOpenStreamWebSocket).not.toHaveBeenCalled();
    expect(mockWrite).not.toHaveBeenCalled();

    // Advance one poll interval: loop sleep fires, poll 2 — createCardsClient succeeds,
    // session opens, line is written
    await advanceTimeInSteps(POLL_INTERVAL_MS);

    expect(mockOpenStreamWebSocket).toHaveBeenCalledTimes(1);
    expect(mockWrite).toHaveBeenCalledWith('{"type":"api-unavailable-test"}');

    await advanceTimeInSteps(POLL_INTERVAL_MS * 8);
    await promise;
  });
});
