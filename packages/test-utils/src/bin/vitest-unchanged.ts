#!/usr/bin/env -S node --disable-warning=ExperimentalWarning --experimental-transform-types
/**
 * Smart test runner that skips vitest when no files have changed since the
 * last successful run. When files have changed (or args target specific tests),
 * runs vitest and caches the result on success.
 *
 * Intended usage in package.json:
 * ```json
 * "test": "vitest-unchanged"
 * ```
 *
 * Pass-through arguments run vitest directly (no cache check):
 * ```sh
 * yarn test test/foo.test.ts
 * ```
 *
 * @summary Run vitest with mtime-based caching — skip unchanged, pass-through args
 */

import { execFile, spawn } from 'node:child_process';
import { glob, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

interface Cache {
  fileCount: number;
  testCount: number;
}

const CACHE_DIR = join(process.cwd(), 'node_modules', '.vitest-unchanged-cache');
const CACHE_FILE = join(CACHE_DIR, 'summary.json');

function execCapture(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { cwd: process.cwd() }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

function runVitest(extraArgs: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['vitest', 'run', '--experimental.fsModuleCache', ...extraArgs], {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    child.on('close', (code) => resolve(code ?? 1));
  });
}

function countLines(output: string): number {
  const trimmed = output.trim();
  if (trimmed === '') return 0;
  return trimmed.split('\n').length;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function printSummary(cache: Cache, startTime: Date, durationMs: number): void {
  const dim = '\x1b[2m';
  const bold = '\x1b[1m';
  const green = '\x1b[32m';
  const gray = '\x1b[90m';
  const reset = '\x1b[0m';

  console.log('');
  console.log(
    `${dim} Test Files ${reset} ${bold}${green}${cache.fileCount} passed${reset}${gray} (${cache.fileCount})${reset}`
  );
  console.log(
    `${dim}      Tests ${reset} ${bold}${green}${cache.testCount} passed${reset}${gray} (${cache.testCount})${reset}`
  );
  console.log(`${dim}   Start at ${reset} ${formatTime(startTime)}`);
  console.log(`${dim}   Duration ${reset} ${formatDuration(durationMs)}`);
  console.log('');
}

async function readCache(): Promise<Cache | null> {
  try {
    const raw = await readFile(CACHE_FILE, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'fileCount' in parsed &&
      'testCount' in parsed &&
      typeof (parsed as Cache).fileCount === 'number' &&
      typeof (parsed as Cache).testCount === 'number'
    ) {
      return parsed as Cache;
    }
    return null;
  } catch {
    return null;
  }
}

async function writeCache(cache: Cache): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(cache), 'utf-8');
}

async function collectAndSaveCache(): Promise<void> {
  const [filesOutput, testsOutput] = await Promise.all([
    execCapture('npx', ['vitest', 'list', '--filesOnly']),
    execCapture('npx', ['vitest', 'list'])
  ]);
  await writeCache({
    fileCount: countLines(filesOutput),
    testCount: countLines(testsOutput)
  });
}

/**
 * Returns true if the cache file exists and no .ts files have been
 * modified since it was written.
 *
 * @returns Whether all .ts files are older than the cache
 */
async function isCacheValid(): Promise<boolean> {
  let cacheMtimeMs: number;
  try {
    const cacheStat = await stat(CACHE_FILE);
    cacheMtimeMs = cacheStat.mtimeMs;
  } catch {
    return false;
  }

  const cwd = process.cwd();
  for await (const entry of glob('**/*.ts', { cwd, exclude: (p) => basename(p) === 'node_modules' })) {
    const fileStat = await stat(join(cwd, entry));
    if (fileStat.mtimeMs > cacheMtimeMs) {
      return false;
    }
  }
  return true;
}

async function main(): Promise<void> {
  const startTime = new Date();
  const args = process.argv.slice(2);

  // When args are passed (e.g. yarn test test/foo.test.ts), always run vitest directly
  if (args.length > 0) {
    const code = await runVitest(args);
    process.exit(code);
  }

  // When DISABLE_TEST_CACHE is set, skip cache and run tests directly
  if (process.env['DISABLE_TEST_CACHE'] === 'true') {
    const code = await runVitest([]);
    process.exit(code);
  }

  // No args — check if cache is valid
  if (await isCacheValid()) {
    const cache = await readCache();
    if (cache) {
      const durationMs = Date.now() - startTime.getTime();
      console.log('No changed files. Cached results from previous run:');
      printSummary(cache, startTime, durationMs);
      process.exit(0);
    }
  }

  // Cache miss — run full suite
  const code = await runVitest([]);
  if (code === 0) {
    await collectAndSaveCache();
  }
  process.exit(code);
}

main();
