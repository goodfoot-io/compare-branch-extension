/**
 * Durable handoff between the `cards shutdown` subprocess and a later Codex
 * Stop hook.
 *
 * @summary Pending Codex shutdown request storage and readiness delivery
 */

import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import * as net from 'node:net';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Versioned pending request persisted for a Codex session. */
export interface PendingShutdownRequest {
  version: 1;
  requestId: string;
  socketPath: string;
}

/** Readiness message sent back to the action dispatcher after strict drain. */
export interface ShutdownReadyMessage {
  type: 'shutdownReady';
  requestId: string;
}

const STATE_DIR = join(homedir(), '.cards', 'card-repo-commits');

function pendingShutdownPath(sessionId: string): string {
  return join(STATE_DIR, `${encodeURIComponent(sessionId)}.shutdown-request.json`);
}

/**
 * Atomically persist the request that a later Stop hook must acknowledge.
 *
 * @param sessionId - Codex session that will receive a later Stop event.
 * @param request - Versioned correlated request and its action socket.
 */
export function writePendingShutdownRequest(sessionId: string, request: PendingShutdownRequest): void {
  mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 });
  const destination = pendingShutdownPath(sessionId);
  const temporary = `${destination}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(request)}\n`, { encoding: 'utf8', mode: 0o600 });
  renameSync(temporary, destination);
}

/**
 * Read and validate the pending request for a session.
 *
 * @param sessionId - Codex session to inspect.
 * @returns The pending request, or undefined when none exists.
 * @throws When storage cannot be read or contains an invalid record.
 */
export function readPendingShutdownRequest(sessionId: string): PendingShutdownRequest | undefined {
  let raw: string;
  try {
    raw = readFileSync(pendingShutdownPath(sessionId), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
  const value = JSON.parse(raw) as Partial<PendingShutdownRequest>;
  if (value.version !== 1 || typeof value.requestId !== 'string' || typeof value.socketPath !== 'string') {
    throw new Error(`Invalid pending shutdown request for session ${sessionId}`);
  }
  return value as PendingShutdownRequest;
}

/**
 * Remove a request only when it still has the acknowledged opaque ID.
 *
 * @param sessionId - Codex session whose request was acknowledged.
 * @param requestId - Opaque ID that must still own the marker.
 */
export function clearPendingShutdownRequest(sessionId: string, requestId: string): void {
  const pending = readPendingShutdownRequest(sessionId);
  if (pending?.requestId === requestId) rmSync(pendingShutdownPath(sessionId), { force: true });
}

/**
 * Flush one shutdown-ready NDJSON line to the owning per-action socket.
 *
 * @param socketPath - Per-action socket captured in the pending marker.
 * @param message - Correlated readiness payload.
 */
export function sendShutdownReady(socketPath: string, message: ShutdownReadyMessage): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const socket = net.createConnection(socketPath, () => {
      socket.write(`${JSON.stringify(message)}\n`, (error) => {
        if (error) return reject(error);
        socket.end(resolve);
      });
    });
    socket.on('error', reject);
  });
}
