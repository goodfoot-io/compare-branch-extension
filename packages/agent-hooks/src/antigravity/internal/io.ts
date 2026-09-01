/**
 * Injectable filesystem seam for the Antigravity runtime hook handlers.
 *
 * Mirrors the OpenCode `OpencodeStateIo` pattern: every filesystem edge the
 * marker store and handlers touch is an injectable member with a real default
 * implementation, so tests run against real temporary directories instead of
 * module mocks.
 *
 * @summary Injectable filesystem seam for Antigravity runtime handlers
 * @module internal/io
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

/**
 * Every filesystem edge the Antigravity adapter touches, injectable so tests
 * run against real temporary trees.
 *
 * @summary Filesystem seam for Antigravity runtime handlers
 */
export interface AntigravityIo {
  /** `fs.mkdirSync(dir, { recursive: true })`. */
  ensureDirSync(dir: string): void;
  /** `fs.writeFileSync(path, data, 'utf8')`; throws on failure — callers handle. */
  writeTextFileSync(path: string, data: string): void;
  /** `fs.existsSync`. */
  existsSync(path: string): boolean;
  /** `fs.readFileSync(path, 'utf8')`; throws on failure — callers handle. */
  readTextFileSync(path: string): string;
  /** Best-effort removal of a file; absent files are a successful no-op. */
  removeSync(path: string): void;
}

/**
 * Real {@link AntigravityIo} over Node builtins.
 *
 * @summary Default filesystem seam backed by node:fs
 */
export const defaultAntigravityIo: AntigravityIo = {
  ensureDirSync: (dir) => mkdirSync(dir, { recursive: true }),
  writeTextFileSync: (path, data) => writeFileSync(path, data, 'utf8'),
  existsSync: (path) => existsSync(path),
  readTextFileSync: (path) => readFileSync(path, 'utf8'),
  removeSync: (path) => {
    rmSync(path, { force: true });
  }
};
