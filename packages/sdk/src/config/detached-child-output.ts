/**
 * Combined raw-output capture for detached cleanup children.
 * @summary Prepares append-only combined-output capture for detached children.
 * @module
 */

import { randomUUID } from 'node:crypto';
import { closeSync, constants, mkdirSync, openSync, writeSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { resolveMainRepoRoot } from './main-repo-root.js';

/** Prefix distinguishing attribution records from arbitrary child output. */
export const DETACHED_CHILD_RECORD_PREFIX = '@@CARDS_DETACHED_CHILD_V1@@';

/** Default filename used by directory and repository-root resolution tiers. */
export const DETACHED_CHILD_LOG_FILENAME = 'cards-detached-child-stderr.log';

const MAX_IDENTITY_CODE_POINTS = 512;
const TRUNCATION_MARKER = '...[truncated]';

/** Identity attached to both parent and child attribution records. */
export interface DetachedChildCaptureIdentity {
  cardId: string;
  sessionId?: string | null;
  childKind: string;
}

/** Rich outcome of resolving the combined-output file. */
export type DetachedChildOutputPathResult = { ok: true; path: string } | { ok: false; reason: string };

/** Successful capture prepared before spawning a detached child. */
export interface DetachedChildOutputCapture {
  ok: true;
  path: string;
  fd: number;
  correlationId: string;
  preloadArg: string;
  close: () => void;
}

/** Capture preparation failure. Callers should warn and retain ignored sinks. */
export interface DetachedChildOutputCaptureFailure {
  ok: false;
  reason: string;
}

/** Result of preparing detached-child output capture. */
export type DetachedChildOutputCaptureResult = DetachedChildOutputCapture | DetachedChildOutputCaptureFailure;

interface NormalizedIdentity {
  correlationId: string;
  cardId: string;
  sessionId: string | null;
  childKind: string;
}

/**
 * Resolves the output path independently from structured hook logging.
 * @returns Exact-file, shared-directory, main-repository default, or failure.
 */
export function resolveDetachedChildOutputPath(): DetachedChildOutputPathResult {
  const exactFile = process.env['CARDS_DETACHED_STDERR_LOG_FILE'];
  if (exactFile !== undefined && exactFile.length > 0) {
    return { ok: true, path: exactFile };
  }

  const logDir = process.env['CARDS_LOG_DIR'];
  if (logDir !== undefined && logDir.length > 0) {
    return { ok: true, path: join(logDir, DETACHED_CHILD_LOG_FILENAME) };
  }

  const root = resolveMainRepoRoot();
  if (!root.ok) {
    return { ok: false, reason: `detached-child log path is disabled: ${root.reason}` };
  }

  return {
    ok: true,
    path: join(root.path, '.cards', 'logs', DETACHED_CHILD_LOG_FILENAME)
  };
}

/**
 * Bounds an identity by Unicode code points while preserving a visible marker.
 * @param value - Externally supplied identity.
 * @returns Identity containing at most 512 Unicode code points.
 */
function normalizeIdentity(value: string): string {
  const codePoints = Array.from(value);
  if (codePoints.length <= MAX_IDENTITY_CODE_POINTS) return value;
  const markerLength = Array.from(TRUNCATION_MARKER).length;
  return `${codePoints.slice(0, MAX_IDENTITY_CODE_POINTS - markerLength).join('')}${TRUNCATION_MARKER}`;
}

/**
 * Formats a failure as bounded single-line warning text.
 * @param error - Open or write failure.
 * @returns Safe caller-facing failure text.
 */
function describeFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const singleLine = message.replace(/[\r\n]+/gu, ' ').trim();
  return singleLine.length > 1024 ? `${singleLine.slice(0, 1009)}...[truncated]` : singleLine;
}

/**
 * Creates the child-side preload argument. It performs one synchronous write
 * before Node resolves the cleanup entry module.
 * @param identity - Normalized record identity.
 * @returns A Node `--import=data:` argument.
 */
function createPreloadArg(identity: NormalizedIdentity): string {
  const serializedIdentity = JSON.stringify(identity);
  const source =
    `import{writeSync}from'node:fs';` +
    `const i=${serializedIdentity};` +
    `writeSync(2,${JSON.stringify(DETACHED_CHILD_RECORD_PREFIX)}+JSON.stringify({phase:'started',...i,pid:process.pid,timestamp:new Date().toISOString()})+'\\n');`;
  return `--import=data:text/javascript,${encodeURIComponent(source)}`;
}

/**
 * Opens and attributes an append-only combined-output file before child spawn.
 * @param suppliedIdentity - Card, optional session, and child-kind identity.
 * @returns Capture resources or a non-throwing reason for fail-open fallback.
 */
export function prepareDetachedChildOutputCapture(
  suppliedIdentity: DetachedChildCaptureIdentity
): DetachedChildOutputCaptureResult {
  const resolved = resolveDetachedChildOutputPath();
  if (!resolved.ok) return resolved;

  const correlationId = randomUUID();
  const identity: NormalizedIdentity = {
    correlationId,
    cardId: normalizeIdentity(suppliedIdentity.cardId),
    sessionId:
      suppliedIdentity.sessionId === undefined || suppliedIdentity.sessionId === null
        ? null
        : normalizeIdentity(suppliedIdentity.sessionId),
    childKind: normalizeIdentity(suppliedIdentity.childKind)
  };

  let fd: number | null = null;
  try {
    mkdirSync(dirname(resolved.path), { recursive: true });
    fd = openSync(resolved.path, constants.O_APPEND | constants.O_CREAT | constants.O_WRONLY, 0o600);
    const spawnRecord = {
      phase: 'spawn',
      ...identity,
      timestamp: new Date().toISOString()
    };
    writeSync(fd, `${DETACHED_CHILD_RECORD_PREFIX}${JSON.stringify(spawnRecord)}\n`);
  } catch (error) {
    if (fd !== null) {
      try {
        closeSync(fd);
      } catch {
        // The original preparation failure is more useful to the caller.
      }
    }
    return {
      ok: false,
      reason: `unable to prepare detached-child output at ${JSON.stringify(resolved.path)}: ${describeFailure(error)}`
    };
  }

  let closed = false;
  return {
    ok: true,
    path: resolved.path,
    fd,
    correlationId,
    preloadArg: createPreloadArg(identity),
    close: () => {
      if (closed) return;
      closed = true;
      try {
        closeSync(fd);
      } catch {
        // Capture teardown must never prevent the caller from spawning cleanup.
      }
    }
  };
}
