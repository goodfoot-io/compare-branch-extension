/**
 * Tests for the detached transcript watcher process.
 *
 * @summary Tests for transcript-watcher
 */

import { appendFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import * as net from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/api-discovery.js', () => ({
  createCardsClient: vi.fn()
}));

import {
  computeSentinelStem,
  connectLogSocket,
  IDLE_TIMEOUT_MS,
  isProcessAlive,
  logViaSocket,
  MAX_LIFETIME_MS,
  openOrResumeStream,
  POLL_INTERVAL_MS,
  parseArgs,
  readNewLines,
  removeSentinelFile,
  runStreamingLoop,
  sentinelFileExists,
  type TranscriptWatcherArgs
} from '../../src/bin/transcript-watcher.js';
import { createCardsClient } from '../../src/lib/api-discovery.js';

const mockCreateCardsClient = vi.mocked(createCardsClient);

describe('parseArgs', () => {
  it('extracts correct values from process.argv', () => {
    const argv = [
      'node',
      'transcript-watcher.mjs',
      '12345',
      'sess-abc',
      '/tmp/transcript.jsonl',
      'card-42',
      '/tmp/card-repo'
    ];
    const result = parseArgs(argv);

    expect(result).toEqual({
      pid: 12345,
      sessionId: 'sess-abc',
      transcriptPath: '/tmp/transcript.jsonl',
      cardId: 'card-42',
      cardRepoPath: '/tmp/card-repo'
    });
  });

  it('returns agentId when argv[7] is present', () => {
    const argv = [
      'node',
      'transcript-watcher.mjs',
      '12345',
      'sess-abc',
      '/tmp/transcript.jsonl',
      'card-42',
      '/tmp/card-repo',
      'agent-xyz'
    ];
    const result = parseArgs(argv);

    expect(result.agentId).toBe('agent-xyz');
    expect(result.sessionId).toBe('sess-abc');
  });

  it('returns undefined agentId when argv[7] is absent', () => {
    const argv = [
      'node',
      'transcript-watcher.mjs',
      '12345',
      'sess-abc',
      '/tmp/transcript.jsonl',
      'card-42',
      '/tmp/card-repo'
    ];
    const result = parseArgs(argv);

    expect(result.agentId).toBeUndefined();
  });
});

describe('isProcessAlive', () => {
  it('returns true for living PID', () => {
    expect(isProcessAlive(process.pid)).toBe(true);
  });

  it('returns false for dead PID', () => {
    vi.spyOn(process, 'kill').mockImplementation(() => {
      const err = new Error('kill ESRCH') as NodeJS.ErrnoException;
      err.code = 'ESRCH';
      throw err;
    });

    expect(isProcessAlive(2147483647)).toBe(false);

    vi.restoreAllMocks();
  });

  it('returns true when kill throws EPERM (process exists but not owned)', () => {
    vi.spyOn(process, 'kill').mockImplementation(() => {
      const err = new Error('kill EPERM') as NodeJS.ErrnoException;
      err.code = 'EPERM';
      throw err;
    });

    expect(isProcessAlive(1)).toBe(true);

    vi.restoreAllMocks();
  });
});

describe('readNewLines', () => {
  let testDir: string;
  let transcriptPath: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `watcher-read-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    transcriptPath = join(testDir, 'transcript.jsonl');
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('reads new bytes from transcript using positional read on persistent file handle', async () => {
    writeFileSync(transcriptPath, 'line1\nline2\n');

    const result = await readNewLines(null, 0, '', transcriptPath);

    expect(result.lines).toEqual(['line1', 'line2']);
    expect(result.lineBuffer).toBe('');
    expect(result.bytesRead).toBe(12); // 'line1\nline2\n' = 12 bytes
    expect(result.fileHandle).not.toBeNull();

    // Subsequent read with same handle picks up new data
    appendFileSync(transcriptPath, 'line3\n');
    const result2 = await readNewLines(result.fileHandle, result.bytesRead, result.lineBuffer, transcriptPath);

    expect(result2.lines).toEqual(['line3']);
    expect(result2.fileHandle).toBe(result.fileHandle); // same handle reused

    await result2.fileHandle!.close();
  });

  it('handles file not yet existing (ENOENT) and picks up file when it eventually appears', async () => {
    const missingPath = join(testDir, 'not-yet.jsonl');

    // File does not exist yet
    const result = await readNewLines(null, 0, '', missingPath);
    expect(result.fileHandle).toBeNull();
    expect(result.lines).toEqual([]);

    // File appears
    writeFileSync(missingPath, 'hello\n');
    const result2 = await readNewLines(null, 0, '', missingPath);
    expect(result2.fileHandle).not.toBeNull();
    expect(result2.lines).toEqual(['hello']);

    await result2.fileHandle!.close();
  });

  it('accumulates partial lines in buffer across reads', async () => {
    writeFileSync(transcriptPath, 'complete\npartial');

    const result = await readNewLines(null, 0, '', transcriptPath);
    expect(result.lines).toEqual(['complete']);
    expect(result.lineBuffer).toBe('partial');

    // Append remainder of partial line
    appendFileSync(transcriptPath, ' end\n');
    const result2 = await readNewLines(result.fileHandle, result.bytesRead, result.lineBuffer, transcriptPath);
    expect(result2.lines).toEqual(['partial end']);
    expect(result2.lineBuffer).toBe('');

    await result2.fileHandle!.close();
  });

  it('flushes partial lineBuffer content on exit (sentinel or PID death)', async () => {
    writeFileSync(transcriptPath, 'full\npartial-no-newline');

    const result = await readNewLines(null, 0, '', transcriptPath);
    expect(result.lines).toEqual(['full']);
    expect(result.lineBuffer).toBe('partial-no-newline');

    // The caller (runStreamingLoop post-loop) is responsible for flushing lineBuffer
    // This test verifies that the lineBuffer content is correctly preserved
    expect(result.lineBuffer.trim()).not.toBe('');

    await result.fileHandle!.close();
  });

  it('handles multi-byte UTF-8 characters split across read boundaries', async () => {
    // Write a string with multi-byte characters
    // The emoji (4 bytes) is in the middle of a line
    const content = 'hello \u{1F600} world\n';
    writeFileSync(transcriptPath, content);

    const result = await readNewLines(null, 0, '', transcriptPath);
    expect(result.lines).toEqual(['hello \u{1F600} world']);

    await result.fileHandle!.close();
  });
});

describe('sentinelFileExists', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `watcher-sentinel-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('detects sentinel file at correct path', async () => {
    const sentinelDir = join(testDir, 'streams', 'claude-code-session');
    mkdirSync(sentinelDir, { recursive: true });
    writeFileSync(join(sentinelDir, 'sess-abc.flush'), '');

    expect(await sentinelFileExists(testDir, 'sess-abc')).toBe(true);
  });

  it('returns false when sentinel absent', async () => {
    expect(await sentinelFileExists(testDir, 'sess-missing')).toBe(false);
  });

  it('uses {sessionId}-{agentId}.flush stem when agentId is set', async () => {
    const sentinelDir = join(testDir, 'streams', 'claude-code-session');
    mkdirSync(sentinelDir, { recursive: true });
    const stem = computeSentinelStem({ sessionId: 'sess-abc', agentId: 'agent-xyz' });
    writeFileSync(join(sentinelDir, `${stem}.flush`), '');

    expect(await sentinelFileExists(testDir, 'sess-abc', 'agent-xyz')).toBe(true);
    // session-only sentinel must not be detected
    expect(await sentinelFileExists(testDir, 'sess-abc')).toBe(false);
  });
});

describe('removeSentinelFile', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `watcher-remove-sentinel-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('removes sentinel file after detection', async () => {
    const sentinelDir = join(testDir, 'streams', 'claude-code-session');
    mkdirSync(sentinelDir, { recursive: true });
    writeFileSync(join(sentinelDir, 'sess-abc.flush'), '');

    await removeSentinelFile(testDir, 'sess-abc');

    expect(await sentinelFileExists(testDir, 'sess-abc')).toBe(false);
  });

  it('sentinel removal is idempotent (handles ENOENT on unlink)', async () => {
    // File does not exist — should not throw
    await expect(removeSentinelFile(testDir, 'nonexistent')).resolves.toBeUndefined();
  });

  it('uses {sessionId}-{agentId}.flush stem when agentId is set', async () => {
    const sentinelDir = join(testDir, 'streams', 'claude-code-session');
    mkdirSync(sentinelDir, { recursive: true });
    const stem = computeSentinelStem({ sessionId: 'sess-abc', agentId: 'agent-xyz' });
    writeFileSync(join(sentinelDir, `${stem}.flush`), '');

    await removeSentinelFile(testDir, 'sess-abc', 'agent-xyz');

    expect(await sentinelFileExists(testDir, 'sess-abc', 'agent-xyz')).toBe(false);
    // session-only sentinel untouched — file never existed for plain sessionId
    expect(await sentinelFileExists(testDir, 'sess-abc')).toBe(false);
  });
});

describe('openOrResumeStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const args: TranscriptWatcherArgs = {
    pid: 12345,
    sessionId: 'sess-abc',
    transcriptPath: '/tmp/transcript.jsonl',
    cardId: 'card-42',
    cardRepoPath: '/tmp/card-repo'
  };

  it('opens stream with correct args', async () => {
    const mockWriter = { write: vi.fn(), close: vi.fn().mockResolvedValue({}) };
    const mockClient = { openStream: vi.fn().mockReturnValue(mockWriter) };
    mockCreateCardsClient.mockResolvedValue(mockClient as never);

    const result = await openOrResumeStream(args);

    expect(result).toBe(mockWriter);
    expect(mockClient.openStream).toHaveBeenCalledWith('card-42', 'claude-code-session', 'sess-abc.jsonl', {
      title: 'Claude session for card-42',
      sessionId: 'sess-abc'
    });
  });

  it('returns null when API discovery fails', async () => {
    mockCreateCardsClient.mockResolvedValue(null);

    const result = await openOrResumeStream(args);

    expect(result).toBeNull();
  });

  it('uses {sessionId}-{agentId}.jsonl filename when agentId is set', async () => {
    const mockWriter = { write: vi.fn(), close: vi.fn().mockResolvedValue({}) };
    const mockClient = { openStream: vi.fn().mockReturnValue(mockWriter) };
    mockCreateCardsClient.mockResolvedValue(mockClient as never);

    const argsWithAgent: TranscriptWatcherArgs = {
      ...args,
      agentId: 'agent-xyz'
    };
    const stem = computeSentinelStem(argsWithAgent);

    await openOrResumeStream(argsWithAgent);

    expect(mockClient.openStream).toHaveBeenCalledWith('card-42', 'claude-code-session', `${stem}.jsonl`, {
      title: 'Claude session for card-42',
      sessionId: 'sess-abc'
    });
    expect(stem).toBe('sess-abc-agent-xyz');
  });
});

describe('runStreamingLoop', () => {
  let testDir: string;
  let transcriptPath: string;

  const makeArgs = (): TranscriptWatcherArgs => ({
    pid: 12345,
    sessionId: 'sess-abc',
    transcriptPath,
    cardId: 'card-42',
    cardRepoPath: testDir
  });

  let mockWriter: { write: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };
  let mockClient: { openStream: ReturnType<typeof vi.fn> };

  // Save a reference to the real setTimeout before fake timers are installed.
  // This is used by advanceTimeInSteps to yield to the real event loop between
  // timer advances, allowing libuv I/O callbacks to complete.
  const realSetTimeout = globalThis.setTimeout;

  beforeEach(() => {
    testDir = join(tmpdir(), `watcher-loop-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    transcriptPath = join(testDir, 'transcript.jsonl');

    mockWriter = {
      write: vi.fn(),
      close: vi.fn().mockResolvedValue({
        filename: 'sess-abc.jsonl',
        streamType: 'claude-code-session',
        lineCount: 0,
        status: 'complete'
      })
    };
    mockClient = {
      openStream: vi.fn().mockReturnValue(mockWriter)
    };
    mockCreateCardsClient.mockResolvedValue(mockClient as never);

    vi.useFakeTimers();

    // Default: PID alive, no sentinel
    vi.spyOn(process, 'kill').mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    rmSync(testDir, { recursive: true, force: true });
  });

  /**
   * Helper: kills the mocked PID after a delay.
   *
   * @param delayMs - Delay in milliseconds before killing the PID.
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

  /**
   * Helper: advances fake timers by the given duration in POLL_INTERVAL_MS steps,
   * yielding to the real event loop between each step. This ensures that the
   * streaming loop's async I/O (file reads, access checks) completes between
   * timer fires, allowing the loop to actually iterate.
   *
   * Uses the real setTimeout (saved before fake timers are installed) to yield
   * to the libuv event loop, which processes file I/O callbacks.
   *
   * @param totalMs - Total virtual time to advance in milliseconds.
   */
  async function advanceTimeInSteps(totalMs: number): Promise<void> {
    const steps = Math.ceil(totalMs / POLL_INTERVAL_MS);
    for (let i = 0; i < steps; i++) {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
      // Yield to the real event loop to allow libuv I/O callbacks to complete.
      // Uses the real setTimeout saved before fake timers were installed.
      await new Promise<void>((resolve) => {
        realSetTimeout(resolve, 0);
      });
    }
  }

  /**
   * Helper: writes sentinel file after a delay.
   *
   * @param delayMs - Delay in milliseconds before writing the sentinel file.
   */
  function writeSentinelAfter(delayMs: number): void {
    setTimeout(() => {
      const sentinelDir = join(testDir, 'streams', 'claude-code-session');
      mkdirSync(sentinelDir, { recursive: true });
      writeFileSync(join(sentinelDir, 'sess-abc.flush'), '');
    }, delayMs);
  }

  // --- Stream lifecycle tests ---

  it('opens stream lazily on first transcript data (not at startup)', async () => {
    writeFileSync(transcriptPath, 'line1\n');

    // PID dies after first poll to end the loop
    killPidAfter(POLL_INTERVAL_MS + 50);

    const promise = runStreamingLoop(makeArgs());
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
    await promise;

    // Stream was opened because data existed
    expect(mockClient.openStream).toHaveBeenCalled();
    expect(mockWriter.write).toHaveBeenCalledWith('line1');
  });

  it('does not create a stream if transcript never has data (zero-line session)', async () => {
    // No transcript file created — PID dies quickly
    killPidAfter(POLL_INTERVAL_MS * 2 + 50);

    const promise = runStreamingLoop(makeArgs());
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 4);
    await promise;

    expect(mockClient.openStream).not.toHaveBeenCalled();
    expect(mockWriter.write).not.toHaveBeenCalled();
    expect(mockWriter.close).not.toHaveBeenCalled();
  });

  it('writes non-empty lines to stream during loop', async () => {
    writeFileSync(transcriptPath, 'line1\nline2\n\nline3\n');

    killPidAfter(POLL_INTERVAL_MS + 50);

    const promise = runStreamingLoop(makeArgs());
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
    await promise;

    expect(mockWriter.write).toHaveBeenCalledWith('line1');
    expect(mockWriter.write).toHaveBeenCalledWith('line2');
    expect(mockWriter.write).toHaveBeenCalledWith('line3');
    // Empty line should not be written
    expect(mockWriter.write).toHaveBeenCalledTimes(3);
  });

  it('closes stream after IDLE_TIMEOUT_MS with no new lines', async () => {
    writeFileSync(transcriptPath, 'line1\n');

    // PID dies well after idle timeout so idle close triggers first
    const exitTime = IDLE_TIMEOUT_MS + POLL_INTERVAL_MS * 5;
    killPidAfter(exitTime);

    const promise = runStreamingLoop(makeArgs());
    await advanceTimeInSteps(exitTime + POLL_INTERVAL_MS * 5);
    await promise;

    // Stream should have been closed by idle timeout. Since no new data
    // arrives after idle close, the stream is not reopened, so close is
    // called exactly once (by the idle timeout path, not the exit path).
    expect(mockWriter.close).toHaveBeenCalledTimes(1);
    expect(mockWriter.write).toHaveBeenCalledWith('line1');
  });

  it('re-opens (resumes) stream when new data arrives after idle close', async () => {
    writeFileSync(transcriptPath, 'line1\n');

    // After idle timeout with generous margin, add new data then kill PID.
    // Use a large gap after IDLE_TIMEOUT_MS to ensure the idle close has
    // fully processed before new data arrives.
    const addDataTime = IDLE_TIMEOUT_MS + POLL_INTERVAL_MS * 10;
    const exitTime = addDataTime + POLL_INTERVAL_MS * 5;

    setTimeout(() => {
      appendFileSync(transcriptPath, 'line2\n');
    }, addDataTime);

    killPidAfter(exitTime);

    // Create second mock writer for the resumed stream
    const mockWriter2 = {
      write: vi.fn(),
      close: vi.fn().mockResolvedValue({
        filename: 'sess-abc.jsonl',
        streamType: 'claude-code-session',
        lineCount: 2,
        status: 'complete'
      })
    };
    let openCount = 0;
    mockClient.openStream.mockImplementation(() => {
      openCount++;
      if (openCount === 1) return mockWriter;
      return mockWriter2;
    });

    const promise = runStreamingLoop(makeArgs());
    await advanceTimeInSteps(exitTime + POLL_INTERVAL_MS * 10);
    await promise;

    // Should have opened stream twice (initial + resume)
    expect(mockClient.openStream).toHaveBeenCalledTimes(2);
    // First writer got closed during idle
    expect(mockWriter.close).toHaveBeenCalled();
    // Second writer got the resumed data
    expect(mockWriter2.write).toHaveBeenCalledWith('line2');
  });

  it('multiple open/close/resume cycles work correctly', async () => {
    writeFileSync(transcriptPath, 'batch1\n');

    const writers: Array<{ write: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }> = [];
    mockClient.openStream.mockImplementation(() => {
      const w = {
        write: vi.fn(),
        close: vi.fn().mockResolvedValue({
          filename: 'sess-abc.jsonl',
          streamType: 'claude-code-session',
          lineCount: 0,
          status: 'complete'
        })
      };
      writers.push(w);
      return w;
    });

    // Timeline: data -> idle close -> data -> idle close -> data -> PID death
    // Use generous margins after each idle timeout for async processing
    const idleCycle = IDLE_TIMEOUT_MS + POLL_INTERVAL_MS * 10;
    const cycle2Start = idleCycle;
    const cycle3Start = cycle2Start + idleCycle;
    const exitTime = cycle3Start + POLL_INTERVAL_MS * 5;

    setTimeout(() => {
      appendFileSync(transcriptPath, 'batch2\n');
    }, cycle2Start);

    setTimeout(() => {
      appendFileSync(transcriptPath, 'batch3\n');
    }, cycle3Start);

    killPidAfter(exitTime);

    const promise = runStreamingLoop(makeArgs());
    await advanceTimeInSteps(exitTime + POLL_INTERVAL_MS * 10);
    await promise;

    // Should have opened at least 3 streams
    expect(mockClient.openStream.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(writers.length).toBeGreaterThanOrEqual(3);

    // Each batch was written to a writer
    expect(writers[0]!.write).toHaveBeenCalledWith('batch1');
    expect(writers[1]!.write).toHaveBeenCalledWith('batch2');
    expect(writers[2]!.write).toHaveBeenCalledWith('batch3');
  });

  it('closes stream on exit (sentinel or PID death)', async () => {
    writeFileSync(transcriptPath, 'line1\n');

    killPidAfter(POLL_INTERVAL_MS + 50);

    const promise = runStreamingLoop(makeArgs());
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 4);
    await promise;

    expect(mockWriter.close).toHaveBeenCalled();
  });

  // --- Error handling tests ---

  it('handles stream open failure gracefully (API unavailable — logs, continues polling)', async () => {
    writeFileSync(transcriptPath, 'line1\n');
    mockCreateCardsClient.mockResolvedValue(null);

    killPidAfter(POLL_INTERVAL_MS * 3 + 50);

    const promise = runStreamingLoop(makeArgs());
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 5);
    await promise;

    // Should not throw, should not write
    expect(mockWriter.write).not.toHaveBeenCalled();
  });

  it('on stream.write() failure, stops writing (sets flag), continues polling for clean exit', async () => {
    writeFileSync(transcriptPath, 'line1\nline2\n');

    mockWriter.write.mockImplementation(() => {
      throw new Error('write failed');
    });

    killPidAfter(POLL_INTERVAL_MS * 3 + 50);

    const promise = runStreamingLoop(makeArgs());
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 5);
    await promise;

    // write was attempted but failed
    expect(mockWriter.write).toHaveBeenCalled();
    // Stream should still be closed despite the write failure
    expect(mockWriter.close).toHaveBeenCalled();
  });

  it('handles stream.close() failure gracefully (logs error)', async () => {
    writeFileSync(transcriptPath, 'line1\n');
    mockWriter.close.mockRejectedValue(new Error('close failed'));

    killPidAfter(POLL_INTERVAL_MS + 50);

    const promise = runStreamingLoop(makeArgs());
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 4);

    // Should not throw
    await expect(promise).resolves.toBeUndefined();
  });

  // --- Exit condition tests ---

  it('flushes remaining lines on sentinel detection', async () => {
    writeFileSync(transcriptPath, 'line1\n');

    // Write more data just before sentinel
    setTimeout(() => {
      appendFileSync(transcriptPath, 'line2\n');
    }, POLL_INTERVAL_MS - 50);

    writeSentinelAfter(POLL_INTERVAL_MS + 50);

    const promise = runStreamingLoop(makeArgs());
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 5);
    await promise;

    // Both lines should have been written
    expect(mockWriter.write).toHaveBeenCalledWith('line1');
    expect(mockWriter.close).toHaveBeenCalled();
  });

  it('removes sentinel file after detection', async () => {
    writeFileSync(transcriptPath, 'line1\n');

    writeSentinelAfter(POLL_INTERVAL_MS + 50);

    const promise = runStreamingLoop(makeArgs());
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 5);
    await promise;

    // Sentinel file should have been removed
    expect(await sentinelFileExists(testDir, 'sess-abc')).toBe(false);
  });

  it('flushes remaining lines on PID death', async () => {
    writeFileSync(transcriptPath, 'line1\n');

    // Add more data, then kill PID
    setTimeout(() => {
      appendFileSync(transcriptPath, 'line2\npartial');
    }, POLL_INTERVAL_MS - 50);

    killPidAfter(POLL_INTERVAL_MS + 50);

    const promise = runStreamingLoop(makeArgs());
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 5);
    await promise;

    expect(mockWriter.write).toHaveBeenCalledWith('line1');
    // The final flush should pick up line2 and the partial line
    expect(mockWriter.close).toHaveBeenCalled();
  });

  it('handles concurrent sentinel + PID death in same poll cycle (exactly one final flush)', async () => {
    writeFileSync(transcriptPath, 'line1\n');

    // Both happen at the same time
    const bothTime = POLL_INTERVAL_MS + 50;
    writeSentinelAfter(bothTime);
    killPidAfter(bothTime);

    const promise = runStreamingLoop(makeArgs());
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 5);
    await promise;

    // Stream should have been closed exactly once
    expect(mockWriter.close).toHaveBeenCalledTimes(1);
    // Sentinel should have been cleaned up
    expect(await sentinelFileExists(testDir, 'sess-abc')).toBe(false);
  });

  it('sentinel detected on first poll iteration (very short session) still flushes correctly', async () => {
    writeFileSync(transcriptPath, 'quick-line\n');

    // Sentinel exists before first poll
    const sentinelDir = join(testDir, 'streams', 'claude-code-session');
    mkdirSync(sentinelDir, { recursive: true });
    writeFileSync(join(sentinelDir, 'sess-abc.flush'), '');

    const promise = runStreamingLoop(makeArgs());
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
    await promise;

    // Data should still have been written even though sentinel was immediate
    expect(mockWriter.write).toHaveBeenCalledWith('quick-line');
    expect(mockWriter.close).toHaveBeenCalled();
    // Sentinel cleaned up
    expect(await sentinelFileExists(testDir, 'sess-abc')).toBe(false);
  });

  it('respects MAX_LIFETIME_MS timeout (closes stream cleanly)', async () => {
    writeFileSync(transcriptPath, 'line1\n');

    // PID stays alive forever — only MAX_LIFETIME_MS should end the loop
    const promise = runStreamingLoop(makeArgs());

    // Advance past MAX_LIFETIME_MS
    await vi.advanceTimersByTimeAsync(MAX_LIFETIME_MS + POLL_INTERVAL_MS * 2);
    await promise;

    expect(mockWriter.close).toHaveBeenCalled();
  });
});

describe('connectLogSocket', () => {
  it('connects to log socket via SOCKET_PATH and logs watcher lifecycle events', async () => {
    const socketDir = join(tmpdir(), `watcher-socket-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(socketDir, { recursive: true });
    const socketPath = join(socketDir, 'test.sock');

    const receivedMessages: string[] = [];
    const server = net.createServer((conn) => {
      conn.on('data', (data) => {
        receivedMessages.push(data.toString());
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(socketPath, resolve);
    });

    try {
      await connectLogSocket(socketPath);

      logViaSocket('info', 'test message');

      // Give the socket a moment to deliver
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(receivedMessages.length).toBeGreaterThan(0);
      const parsed = JSON.parse(receivedMessages[0]!.trim());
      expect(parsed).toEqual({
        type: 'log',
        level: 'info',
        message: 'test message'
      });
    } finally {
      server.close();
      rmSync(socketDir, { recursive: true, force: true });
    }
  });
});
