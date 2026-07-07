/**
 * Tests for heartbeat construction and the main-file zero-consumption invariant.
 *
 * @summary Covers heartbeat payload shape and the multi-tick invariant check.
 */

import { describe, expect, it } from 'vitest';
import type { FileSyncState } from '../../../src/transcript-sync/engine/reconciler.js';
import { buildStatusHeartbeat, MainFileInvariantChecker } from '../../../src/transcript-sync/engine/status.js';

function fileState(overrides: Partial<FileSyncState> = {}): FileSyncState {
  return {
    relPath: 'sess-1.jsonl',
    role: 'main',
    mode: 'jsonl-tail',
    cursor: { offset: 0, pendingFragment: '' },
    sourceBytes: 0,
    consumedBytes: 0,
    lastSyncAt: null,
    sidecarWritten: false,
    ...overrides
  };
}

describe('buildStatusHeartbeat', () => {
  it('maps file states to the status payload, omitting "failed" when absent', () => {
    const heartbeat = buildStatusHeartbeat([
      fileState({ relPath: 'a.jsonl', sourceBytes: 10, consumedBytes: 10, lastSyncAt: 123 })
    ]);
    expect(heartbeat).toEqual({
      type: 'status',
      files: [{ relPath: 'a.jsonl', role: 'main', sourceBytes: 10, consumedBytes: 10, lastSyncAt: 123 }]
    });
  });

  it('includes "failed" when a file is marked failed', () => {
    const heartbeat = buildStatusHeartbeat([fileState({ relPath: 'b.jsonl', failed: 'source shrank' })]);
    expect(heartbeat.files[0]).toMatchObject({ relPath: 'b.jsonl', failed: 'source shrank' });
  });
});

describe('MainFileInvariantChecker', () => {
  it('does not report on a single tick of zero consumption', () => {
    const checker = new MainFileInvariantChecker();
    const result = checker.check(fileState({ sourceBytes: 100, consumedBytes: 0 }));
    expect(result).toBeNull();
  });

  it('reports once after more than one consecutive steady tick with zero consumption', () => {
    const checker = new MainFileInvariantChecker();
    expect(checker.check(fileState({ sourceBytes: 100, consumedBytes: 0 }))).toBeNull();
    const second = checker.check(fileState({ sourceBytes: 100, consumedBytes: 0 }));
    expect(second).not.toBeNull();
    expect(second).toMatch(/0 bytes consumed/);

    // Reported only once — a third tick in the same stuck state must not re-report.
    const third = checker.check(fileState({ sourceBytes: 100, consumedBytes: 0 }));
    expect(third).toBeNull();
  });

  it('does not report when the main file has no source bytes yet', () => {
    const checker = new MainFileInvariantChecker();
    checker.check(fileState({ sourceBytes: 0, consumedBytes: 0 }));
    expect(checker.check(fileState({ sourceBytes: 0, consumedBytes: 0 }))).toBeNull();
  });

  it('does not report once consumption resumes, and resets the counter', () => {
    const checker = new MainFileInvariantChecker();
    checker.check(fileState({ sourceBytes: 100, consumedBytes: 0 }));
    checker.check(fileState({ sourceBytes: 100, consumedBytes: 50 }));
    // Resumed consumption resets the streak; a subsequent single stuck tick
    // must not immediately re-report.
    expect(checker.check(fileState({ sourceBytes: 200, consumedBytes: 50 }))).toBeNull();
  });

  it('does not report when the main file state is not yet present', () => {
    const checker = new MainFileInvariantChecker();
    expect(checker.check(undefined)).toBeNull();
    expect(checker.check(undefined)).toBeNull();
  });
});
