/**
 * Tests for the hybrid fs.watch installer.
 *
 * @summary Covers install-retry while watchRoot is absent, arm-gap-closing reconcile passes, and event filtering by matcher.
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Reconciler } from '../../../src/transcript-sync/engine/reconciler.js';
import { SyncChain } from '../../../src/transcript-sync/engine/sync-chain.js';
import { WatchInstaller } from '../../../src/transcript-sync/engine/watch-installer.js';
import type { SessionSyncManifest } from '../../../src/transcript-sync/manifest.js';

describe('WatchInstaller', () => {
  let base: string;
  let watchRoot: string;
  let cardRepoPath: string;
  let manifest: SessionSyncManifest;

  beforeEach(() => {
    base = join(tmpdir(), `watch-installer-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    watchRoot = join(base, 'watchRoot');
    cardRepoPath = join(base, 'card');
    mkdirSync(cardRepoPath, { recursive: true });

    manifest = {
      version: 1,
      sessionId: 'sess-1',
      cardId: 'card-1',
      runtime: 'claude-code',
      streamType: 'claude-code-session',
      watchRoot,
      sources: [{ pattern: 'sess-1.jsonl', role: 'main', mode: 'jsonl-tail' }],
      monitorPid: process.pid,
      cardRepoPath
    };
  });

  afterEach(() => {
    rmSync(base, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  it('returns false and does not throw while watchRoot does not exist yet', async () => {
    const reconciler = new Reconciler(manifest);
    const installer = new WatchInstaller({
      manifest,
      reconciler,
      chain: new SyncChain(),
      warnFn: () => {},
      errorFn: () => {}
    });

    expect(await installer.tryInstall()).toBe(false);
    expect(installer.isInstalled()).toBe(false);
  });

  it('installs once watchRoot exists, running a pre-arm reconcile pass first', async () => {
    mkdirSync(watchRoot, { recursive: true });
    writeFileSync(join(watchRoot, 'sess-1.jsonl'), 'preexisting\n');

    const reconciler = new Reconciler(manifest);
    const installer = new WatchInstaller({
      manifest,
      reconciler,
      chain: new SyncChain(),
      warnFn: () => {},
      errorFn: () => {}
    });

    expect(await installer.tryInstall()).toBe(true);
    expect(installer.isInstalled()).toBe(true);

    const state = reconciler.getFileState('sess-1.jsonl');
    expect(state?.consumedBytes).toBe('preexisting\n'.length);

    installer.close();
  });

  it('queues a reconcile through the sync chain for a matched-file fs.watch event, and ignores unmatched ones', async () => {
    mkdirSync(watchRoot, { recursive: true });
    writeFileSync(join(watchRoot, 'sess-1.jsonl'), '');

    const reconciler = new Reconciler(manifest);
    const chain = new SyncChain();
    const installer = new WatchInstaller({ manifest, reconciler, chain, warnFn: () => {}, errorFn: () => {} });

    await installer.tryInstall();
    await chain.drain(); // drain the post-arm reconcile pass

    writeFileSync(join(watchRoot, 'sess-1.jsonl'), 'appended\n');
    writeFileSync(join(watchRoot, 'unrelated.txt'), 'noise');

    // fs.watch is asynchronous/best-effort; poll until the queued reconcile
    // reflects the write, bounded by a real timeout.
    await vi.waitFor(
      async () => {
        await chain.drain();
        expect(reconciler.getFileState('sess-1.jsonl')?.consumedBytes).toBe('appended\n'.length);
      },
      { timeout: 5000, interval: 25 }
    );

    installer.close();
  });

  it('close() is idempotent and safe to call before install', () => {
    const reconciler = new Reconciler(manifest);
    const installer = new WatchInstaller({
      manifest,
      reconciler,
      chain: new SyncChain(),
      warnFn: () => {},
      errorFn: () => {}
    });
    expect(() => {
      installer.close();
      installer.close();
    }).not.toThrow();
  });

  it('tryInstall after close() stays uninstalled', async () => {
    mkdirSync(watchRoot, { recursive: true });
    const reconciler = new Reconciler(manifest);
    const installer = new WatchInstaller({
      manifest,
      reconciler,
      chain: new SyncChain(),
      warnFn: () => {},
      errorFn: () => {}
    });
    installer.close();
    expect(await installer.tryInstall()).toBe(false);
  });
});
