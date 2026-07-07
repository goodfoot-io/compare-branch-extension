/**
 * Hybrid filesystem-watch installer for the transcript-sync engine.
 *
 * Ports the hybrid mechanism from `bin/transcript-watcher.ts`: a recursive
 * `fs.watch` is installed once `watchRoot` exists (retried at a fast interval
 * while it does not — `watchRoot` is typically created lazily by the runtime
 * on first write), with a full reconcile pass both immediately before and
 * immediately after arming the watch. `fs.watch` is best-effort — it can miss
 * the very first event on a freshly-created directory (especially on win32)
 * — so the pre-arm pass catches anything written during the wait, and the
 * post-arm pass closes the "arm gap": the window between the pre-arm pass and
 * the watch becoming live, during which a write would otherwise be silently
 * dropped for the whole session.
 *
 * Watch events are filtered by whether *some* manifest source matches the
 * changed relPath (via `./matcher.ts`) — no session-ID-prefix filtering, since
 * the manifest itself is the sole source of truth for what belongs to this
 * session. Matching events queue a full reconcile pass through the sync
 * chain (see `./sync-chain.ts`), never running concurrently with another pass.
 *
 * @summary fs.watch install-with-retry, arm-gap-closing reconcile passes
 * @module
 */

import type { FSWatcher } from 'node:fs';
import { watch } from 'node:fs';
import { access } from 'node:fs/promises';
import type { SessionSyncManifest } from '../manifest.js';
import { matchSource } from './matcher.js';
import type { Reconciler } from './reconciler.js';
import type { SyncChain } from './sync-chain.js';

/**
 * Dependencies required to install and manage the hybrid watch.
 */
export interface WatchInstallerDeps {
  manifest: SessionSyncManifest;
  reconciler: Reconciler;
  chain: SyncChain;
  warnFn: (message: string) => void;
  errorFn: (message: string) => void;
}

/**
 * Manages the lifecycle of the hybrid `fs.watch` install for one session.
 */
export class WatchInstaller {
  private fsWatcher: FSWatcher | null = null;
  private closed = false;

  constructor(private readonly deps: WatchInstallerDeps) {}

  /**
   * Reports whether `fs.watch` has been successfully installed.
   *
   * @returns True once `fs.watch` has been successfully installed.
   */
  isInstalled(): boolean {
    return this.fsWatcher !== null;
  }

  /**
   * Attempts to install the watch if not already installed. No-op (returns
   * the current installed state) if already installed or closed.
   *
   * @returns True if installed (whether by this call or a prior one).
   */
  async tryInstall(): Promise<boolean> {
    if (this.closed) return false;
    if (this.fsWatcher) return true;

    try {
      await access(this.deps.manifest.watchRoot);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }

    // Source dir now exists; capture anything written during the wait before arming.
    await this.deps.reconciler.reconcileOnce(this.deps.warnFn, this.deps.errorFn);

    try {
      const w = watch(this.deps.manifest.watchRoot, { recursive: true }, (_eventType, filename) => {
        if (this.closed || !filename) return;
        const relPath = (filename as string).replace(/\\/g, '/');
        if (!matchSource(relPath, this.deps.manifest.sources)) return;
        this.deps.chain.push(
          () => this.deps.reconciler.reconcileOnce(this.deps.warnFn, this.deps.errorFn),
          this.deps.warnFn
        );
      });
      w.on('error', (error) => {
        if (!this.closed) this.deps.warnFn(`fs.watch error: ${String(error)}`);
      });
      this.fsWatcher = w;

      // Close the arm-gap: re-run the reconcile pass through the serialized
      // chain (so it cannot race the watch callback's own reconcile) to catch
      // anything written during arming.
      this.deps.chain.push(
        () => this.deps.reconciler.reconcileOnce(this.deps.warnFn, this.deps.errorFn),
        this.deps.warnFn
      );
      return true;
    } catch (error) {
      this.deps.warnFn(`Failed to install fs.watch: ${String(error)}`);
      return false;
    }
  }

  /** Closes the watch, if installed. Idempotent. */
  close(): void {
    this.closed = true;
    if (this.fsWatcher) {
      try {
        this.fsWatcher.close();
      } catch (error) {
        this.deps.warnFn(`fsWatcher.close() error: ${String(error)}`);
      }
      this.fsWatcher = null;
    }
  }
}
