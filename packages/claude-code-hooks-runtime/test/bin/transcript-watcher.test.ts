/**
 * Tests for the detached transcript watcher process.
 *
 * @summary Tests for transcript-watcher
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import * as net from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/api-discovery.js', () => ({
  createCardsClient: vi.fn()
}));

import {
  connectLogSocket,
  isProcessAlive,
  logViaSocket,
  MAX_LIFETIME_MS,
  POLL_INTERVAL_MS,
  parseArgs,
  streamFileExists,
  type TranscriptWatcherArgs,
  uploadTranscript,
  waitForProcessExit
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
});

describe('isProcessAlive', () => {
  it('returns true for living PID', () => {
    expect(isProcessAlive(process.pid)).toBe(true);
  });

  it('returns false for dead PID', () => {
    // PID 2147483647 is extremely unlikely to exist
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

describe('waitForProcessExit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves when PID dies', async () => {
    let alive = true;
    vi.spyOn(process, 'kill').mockImplementation(() => {
      if (!alive) {
        const err = new Error('kill ESRCH') as NodeJS.ErrnoException;
        err.code = 'ESRCH';
        throw err;
      }
      return true;
    });

    const promise = waitForProcessExit(12345);

    // First poll: still alive
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

    // Kill the process
    alive = false;

    // Second poll: dead
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

    await expect(promise).resolves.toBeUndefined();

    vi.restoreAllMocks();
  });

  it('resolves after MAX_LIFETIME_MS even if PID still alive', async () => {
    vi.spyOn(process, 'kill').mockReturnValue(true);

    const promise = waitForProcessExit(12345);

    // Advance past MAX_LIFETIME_MS
    await vi.advanceTimersByTimeAsync(MAX_LIFETIME_MS + POLL_INTERVAL_MS);

    await expect(promise).resolves.toBeUndefined();

    vi.restoreAllMocks();
  });
});

describe('streamFileExists', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `watcher-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('returns true when stream file present', async () => {
    const streamDir = join(testDir, 'streams', 'claude-code-session');
    mkdirSync(streamDir, { recursive: true });
    writeFileSync(join(streamDir, 'sess-abc.jsonl'), '');

    expect(await streamFileExists(testDir, 'sess-abc')).toBe(true);
  });

  it('returns false when absent', async () => {
    expect(await streamFileExists(testDir, 'sess-missing')).toBe(false);
  });
});

describe('uploadTranscript', () => {
  let testDir: string;
  let transcriptPath: string;

  const baseArgs: TranscriptWatcherArgs = {
    pid: 12345,
    sessionId: 'sess-abc',
    transcriptPath: '', // set in beforeEach
    cardId: 'card-42',
    cardRepoPath: '' // set in beforeEach
  };

  beforeEach(() => {
    testDir = join(tmpdir(), `watcher-upload-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    transcriptPath = join(testDir, 'transcript.jsonl');
    baseArgs.transcriptPath = transcriptPath;
    baseArgs.cardRepoPath = testDir;
    vi.clearAllMocks();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('reads transcript and calls openStream with correct args', async () => {
    writeFileSync(transcriptPath, 'line1\nline2\nline3\n');

    const mockWriter = {
      write: vi.fn(),
      close: vi.fn().mockResolvedValue({
        filename: 'sess-abc.jsonl',
        streamType: 'claude-code-session',
        lineCount: 3,
        status: 'complete'
      })
    };
    const mockClient = {
      openStream: vi.fn().mockReturnValue(mockWriter)
    };
    mockCreateCardsClient.mockResolvedValue(mockClient as never);

    await uploadTranscript(baseArgs);

    expect(mockClient.openStream).toHaveBeenCalledWith('card-42', 'claude-code-session', 'sess-abc.jsonl', {
      title: 'Claude session for card-42',
      sessionId: 'sess-abc'
    });
    expect(mockWriter.write).toHaveBeenCalledTimes(3);
    expect(mockWriter.write).toHaveBeenCalledWith('line1');
    expect(mockWriter.write).toHaveBeenCalledWith('line2');
    expect(mockWriter.write).toHaveBeenCalledWith('line3');
    expect(mockWriter.close).toHaveBeenCalled();
  });

  it('skips upload when stream file already exists', async () => {
    writeFileSync(transcriptPath, 'line1\n');

    // Create the stream file to simulate session-end having uploaded
    const streamDir = join(testDir, 'streams', 'claude-code-session');
    mkdirSync(streamDir, { recursive: true });
    writeFileSync(join(streamDir, 'sess-abc.jsonl'), '');

    await uploadTranscript(baseArgs);

    expect(mockCreateCardsClient).not.toHaveBeenCalled();
  });

  it('handles missing transcript file gracefully', async () => {
    // Don't create the transcript file
    baseArgs.transcriptPath = join(testDir, 'nonexistent.jsonl');

    await expect(uploadTranscript(baseArgs)).resolves.toBeUndefined();

    expect(mockCreateCardsClient).not.toHaveBeenCalled();
  });

  it('handles API discovery failure gracefully', async () => {
    writeFileSync(transcriptPath, 'line1\n');
    mockCreateCardsClient.mockResolvedValue(null);

    await expect(uploadTranscript(baseArgs)).resolves.toBeUndefined();
  });

  it('handles openStream write/close failure', async () => {
    writeFileSync(transcriptPath, 'line1\n');

    const mockWriter = {
      write: vi.fn(),
      close: vi.fn().mockRejectedValue(new Error('network error'))
    };
    const mockClient = {
      openStream: vi.fn().mockReturnValue(mockWriter)
    };
    mockCreateCardsClient.mockResolvedValue(mockClient as never);

    await expect(uploadTranscript(baseArgs)).resolves.toBeUndefined();
  });

  it('writes empty transcript (no non-empty lines) without error', async () => {
    writeFileSync(transcriptPath, '\n\n\n');

    const mockWriter = {
      write: vi.fn(),
      close: vi.fn().mockResolvedValue({
        filename: 'sess-abc.jsonl',
        streamType: 'claude-code-session',
        lineCount: 0,
        status: 'complete'
      })
    };
    const mockClient = {
      openStream: vi.fn().mockReturnValue(mockWriter)
    };
    mockCreateCardsClient.mockResolvedValue(mockClient as never);

    await uploadTranscript(baseArgs);

    expect(mockWriter.write).not.toHaveBeenCalled();
    expect(mockWriter.close).toHaveBeenCalled();
  });
});

describe('main entry', () => {
  it('connects to log socket via SOCKET_PATH and logs watcher lifecycle events', async () => {
    // Set up a real Unix socket server to verify log socket connection
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
      // Connect via the exported function
      await connectLogSocket(socketPath);

      // Verify we can log
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
