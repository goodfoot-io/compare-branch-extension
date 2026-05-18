#!/usr/bin/env -S node --disable-warning=ExperimentalWarning --experimental-transform-types
/**
 * Smart test runner that skips vitest when no files have changed since the
 * last successful run. When files have changed (or args target specific tests),
 * runs vitest and caches the result on success.
 *
 * Cache is stored centrally in the git common directory so that worktrees
 * sharing the same repository can reuse results. Cache identity is based on
 * a content hash of tracked files (via `git ls-files -s`), not filesystem
 * timestamps. A local mtime sentinel provides a fast-path to skip hash
 * computation when no local `.ts` files have changed.
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
 * @summary Run vitest with content-hash caching — skip unchanged, pass-through args
 */

import { execFile, execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { glob, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

interface Cache {
  fileCount: number;
  testCount: number;
}

// On Windows, `npx` is a `.cmd` shim. child_process spawn/execFile do not
// perform PATHEXT resolution (ENOENT for bare `npx`), and Node refuses to
// spawn a `.cmd` without a shell (EINVAL). Use the `.cmd` name and route
// through the shell on Windows.
const IS_WINDOWS = process.platform === 'win32';
const NPX = IS_WINDOWS ? 'npx.cmd' : 'npx';

const SENTINEL_DIR = join(process.cwd(), 'node_modules', '.vitest-unchanged-cache');
const SENTINEL_FILE = join(SENTINEL_DIR, 'sentinel');

function execCapture(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { cwd: process.cwd(), shell: IS_WINDOWS }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

function execGit(args: string[]): Promise<string> {
  return execCapture('git', args);
}

function runVitest(extraArgs: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(NPX, ['vitest', 'run', '--experimental.fsModuleCache', ...extraArgs], {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: IS_WINDOWS
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

async function getGitCommonDir(): Promise<string> {
  const output = await execGit(['rev-parse', '--git-common-dir']);
  return resolve(process.cwd(), output.trim());
}

async function computeContentHash(): Promise<string> {
  const cwd = process.cwd();
  const lsFilesOutput = await execGit(['ls-files', '-s', '--', cwd]);

  const dirtyOutput = await execGit(['diff', '--name-only', '--', cwd]);
  const dirtyTsFiles = dirtyOutput
    .trim()
    .split('\n')
    .filter((f) => f.endsWith('.ts'));

  let hashInput = lsFilesOutput;
  if (dirtyTsFiles.length > 0) {
    // git diff --name-only returns paths relative to the repo root
    const toplevel = (await execGit(['rev-parse', '--show-toplevel'])).trim();
    const statLines = await Promise.all(
      dirtyTsFiles.map(async (f) => {
        const filePath = join(toplevel, f);
        try {
          const fileStat = await stat(filePath);
          return `${f}:${fileStat.size}:${fileStat.mtimeMs}`;
        } catch (error: unknown) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return `${f}:deleted`;
          }
          throw error;
        }
      })
    );
    hashInput += `\n${statLines.join('\n')}`;
  }

  const hash = execFileSync('git', ['hash-object', '--stdin'], {
    cwd: process.cwd(),
    input: hashInput,
    encoding: 'utf-8'
  });
  return hash.trim();
}

async function getCentralCacheDir(): Promise<string> {
  const gitCommonDir = await getGitCommonDir();
  const cwd = process.cwd();
  let packageName: string;
  try {
    const pkgRaw = await readFile(join(cwd, 'package.json'), 'utf-8');
    const pkg: unknown = JSON.parse(pkgRaw);
    if (
      typeof pkg === 'object' &&
      pkg !== null &&
      'name' in pkg &&
      typeof (pkg as { name: unknown }).name === 'string'
    ) {
      packageName = (pkg as { name: string }).name.replace(/[/\\]/g, '__');
    } else {
      packageName = basename(cwd);
    }
  } catch {
    packageName = basename(cwd);
  }
  return join(gitCommonDir, '.vitest-unchanged-cache', packageName);
}

async function readCache(cachePath: string): Promise<Cache | null> {
  try {
    const raw = await readFile(cachePath, 'utf-8');
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
  const [centralDir, contentHash] = await Promise.all([getCentralCacheDir(), computeContentHash()]);
  const cachePath = join(centralDir, `${contentHash}.json`);

  await mkdir(centralDir, { recursive: true });

  // Atomic write: temp file then rename
  const tmpPath = join(centralDir, `.tmp-${randomUUID()}`);
  await writeFile(tmpPath, JSON.stringify(cache), 'utf-8');
  await rename(tmpPath, cachePath);

  // Update local sentinel with current hash
  await mkdir(SENTINEL_DIR, { recursive: true });
  await writeFile(SENTINEL_FILE, contentHash, 'utf-8');
}

async function collectAndSaveCache(): Promise<void> {
  const [filesOutput, testsOutput] = await Promise.all([
    execCapture(NPX, ['vitest', 'list', '--filesOnly']),
    execCapture(NPX, ['vitest', 'list'])
  ]);
  await writeCache({
    fileCount: countLines(filesOutput),
    testCount: countLines(testsOutput)
  });
}

/**
 * Check whether a valid cache entry exists for the current content.
 *
 * Fast path: if the local sentinel's mtime is newer than all `.ts` files,
 * read the stored hash and look up the central cache directly — no git
 * subprocess overhead.
 *
 * Slow path: compute the content hash from `git ls-files -s` and check
 * the central cache directory.
 *
 * @returns The path to the cache file if valid, or null if no cache hit
 */
async function findValidCache(): Promise<string | null> {
  const centralDir = await getCentralCacheDir();

  // Fast path: check sentinel mtime against all .ts files
  let sentinelHash: string | null = null;
  try {
    const sentinelStat = await stat(SENTINEL_FILE);
    const sentinelMtimeMs = sentinelStat.mtimeMs;

    let allOlder = true;
    const cwd = process.cwd();
    for await (const entry of glob('**/*.ts', { cwd, exclude: (p) => basename(p) === 'node_modules' })) {
      const fileStat = await stat(join(cwd, entry));
      if (fileStat.mtimeMs > sentinelMtimeMs) {
        allOlder = false;
        break;
      }
    }

    if (allOlder) {
      sentinelHash = (await readFile(SENTINEL_FILE, 'utf-8')).trim();
      const cachePath = join(centralDir, `${sentinelHash}.json`);
      try {
        await stat(cachePath);
        return cachePath;
      } catch {
        // Sentinel points to a hash that no longer exists centrally — fall through to slow path
      }
    }
  } catch {
    // No sentinel — fall through to slow path
  }

  // Slow path: compute content hash
  const contentHash = await computeContentHash();
  const cachePath = join(centralDir, `${contentHash}.json`);
  try {
    await stat(cachePath);
    return cachePath;
  } catch {
    return null;
  }
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
  const validCachePath = await findValidCache();
  if (validCachePath) {
    const cache = await readCache(validCachePath);
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
