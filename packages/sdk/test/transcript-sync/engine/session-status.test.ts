/**
 * Tests for the session status file writer.
 *
 * @summary Covers path derivation, directory creation, and snapshot round-tripping.
 */

import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  type SessionStatusFile,
  sessionStatusPath,
  writeSessionStatus
} from '../../../src/transcript-sync/engine/session-status.js';
import type { SessionSyncManifest } from '../../../src/transcript-sync/manifest.js';

describe('session status file', () => {
  let cardRepoPath: string;
  let manifest: SessionSyncManifest;

  beforeEach(() => {
    cardRepoPath = join(tmpdir(), `session-status-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(cardRepoPath, { recursive: true });
    manifest = {
      version: 1,
      sessionId: 'sess-1',
      cardId: 'card-1',
      runtime: 'codex',
      streamType: 'codex-session',
      watchRoot: '/tmp/unused',
      sources: [{ pattern: 'rollout-1.jsonl', role: 'main', mode: 'jsonl-tail' }],
      monitorPid: process.pid,
      cardRepoPath
    };
  });

  afterEach(() => {
    rmSync(cardRepoPath, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  it('derives the path from streamType and sessionId', () => {
    expect(sessionStatusPath(manifest)).toBe(join(cardRepoPath, 'streams', 'codex-session', 'sess-1.session.json'));
  });

  it('writes a snapshot of the manifest plus status, creating parent directories', async () => {
    await writeSessionStatus(manifest, { startedAt: '2026-07-06T00:00:00.000Z', fileFailures: {} });

    const written = JSON.parse(readFileSync(sessionStatusPath(manifest), 'utf-8')) as SessionStatusFile;
    expect(written).toEqual({
      version: 1,
      manifest,
      status: { startedAt: '2026-07-06T00:00:00.000Z', fileFailures: {} }
    });
  });

  it('overwrites the file on a subsequent state transition', async () => {
    await writeSessionStatus(manifest, { startedAt: '2026-07-06T00:00:00.000Z', fileFailures: {} });
    await writeSessionStatus(manifest, {
      startedAt: '2026-07-06T00:00:00.000Z',
      closedAt: '2026-07-06T01:00:00.000Z',
      fileFailures: { 'rollout-1.jsonl': 'source shrank' }
    });

    const written = JSON.parse(readFileSync(sessionStatusPath(manifest), 'utf-8')) as SessionStatusFile;
    expect(written.status.closedAt).toBe('2026-07-06T01:00:00.000Z');
    expect(written.status.fileFailures).toEqual({ 'rollout-1.jsonl': 'source shrank' });
  });
});
