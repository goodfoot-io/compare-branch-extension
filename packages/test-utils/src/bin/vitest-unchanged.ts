#!/usr/bin/env -S node --disable-warning=ExperimentalWarning --experimental-transform-types
/**
 * Smart test runner that skips vitest when no files have changed since the
 * last successful run. When files have changed (or args target specific tests),
 * runs vitest and caches the result on success.
 *
 * Cache is stored centrally in the git common directory so that worktrees
 * sharing the same repository can reuse results. Cache identity is based on
 * a SHA-256 content hash that covers tracked files (`git ls-files -s`),
 * all dirty tracked files (stat-based: size + mtime), and all untracked
 * files (`git ls-files -o --exclude-standard`). A local mtime sentinel
 * provides a fast-path to skip hash computation when no local source files
 * have changed.
 *
 * File and test counts are captured from a vitest JSON reporter attached to
 * the same run — no separate `vitest list` invocation is needed.
 *
 * Vitest is spawned directly via `process.execPath` (the running Node binary)
 * using the locally-resolved vitest entry-point. No npx or shell is involved.
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

import { execFile, spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { glob, mkdir, readdir, readFile, rename, stat, unlink, utimes, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import { basename, join, resolve } from 'node:path';

interface Cache {
  fileCount: number;
  testCount: number;
}

interface CacheLookup {
  /** Path to a valid central cache entry, or null on cache miss. */
  cachePath: string | null;
  /** Content hash for the current state. GUARANTEED non-null whenever cachePath is null. */
  contentHash: string | null;
  /** Central cache directory for this package. */
  centralDir: string;
}

/**
 * Resolve the local vitest entry-point script.
 * Uses `createRequire` so we find the copy installed in this package's
 * node_modules rather than relying on PATH or npx resolution at spawn time.
 * Spawning `process.execPath` (the running Node binary) with the script
 * directly avoids shell quoting hazards on all platforms.
 * Resolved on first spawn, memoized for subsequent calls.
 * @returns Absolute path to the vitest entry-point script.
 */
function resolveVitestBin(): string {
  const req = createRequire(join(process.cwd(), 'package.json'));
  const vitestPkgPath: string = req.resolve('vitest/package.json');
  const vitestDir = resolve(vitestPkgPath, '..');
  // vitest's package.json bin field: { "vitest": "./vitest.mjs" }
  const vitestPkg = JSON.parse(readFileSync(vitestPkgPath, 'utf-8')) as {
    bin?: string | Record<string, string>;
  };
  const binField = vitestPkg.bin;
  const relBin = typeof binField === 'string' ? binField : (binField?.['vitest'] ?? './vitest.mjs');
  return join(vitestDir, relBin);
}

let vitestBin: string | null = null;

function getVitestBin(): string {
  if (vitestBin === null) {
    vitestBin = resolveVitestBin();
  }
  return vitestBin;
}

const SENTINEL_DIR = join(process.cwd(), 'node_modules', '.vitest-unchanged-cache');
const SENTINEL_FILE = join(SENTINEL_DIR, 'sentinel');

function execGit(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd: process.cwd(), maxBuffer: 64 * 1024 * 1024 }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

/** Shape of vitest's JSON reporter output (jest-compatible). */
interface VitestJsonReport {
  numTotalTests: number;
  testResults: unknown[];
}

/** Result returned by {@link runVitest}. */
interface VitestRunResult {
  code: number;
  /**
   * Present only when `collectCounts` was requested, the run succeeded, and
   * the JSON report was readable. `null` on any failure — the cache layer must
   * not turn a green run red.
   */
  counts: Cache | null;
}

/**
 * Spawn vitest using the locally-resolved binary (no npx, no shell) and
 * return its exit code. When `options.collectCounts` is true, additionally
 * attaches a JSON reporter, parses the report after a successful run, and
 * returns file/test counts derived from the report.
 *
 * Evidence for field names (from a sample run against this package):
 *   - `testResults.length` = 6  → number of test **files** run
 *   - `numTotalTests`      = 104 → all tests including skipped
 *   - `numTotalTestSuites` = 57  → describe-block suites, NOT files
 * @param extraArgs - Additional CLI arguments forwarded to `vitest run`.
 * @param options - Controls whether counts are collected from a JSON reporter.
 * @param options.collectCounts - When true, attach a JSON reporter and parse counts.
 * @returns The vitest exit code and, when requested and available, file/test counts.
 */
async function runVitest(extraArgs: string[], options?: { collectCounts?: boolean }): Promise<VitestRunResult> {
  const collectCounts = options?.collectCounts === true;
  const tmpFile = collectCounts ? join(os.tmpdir(), `vitest-report-${randomUUID()}.json`) : null;

  const vitestArgs = ['run', '--experimental.fsModuleCache', ...extraArgs];
  if (tmpFile !== null) {
    vitestArgs.push('--reporter=default', '--reporter=json', `--outputFile=${tmpFile}`);
  }

  const code = await new Promise<number>((resolve) => {
    const child = spawn(process.execPath, [getVitestBin(), ...vitestArgs], {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    child.on('close', (exitCode) => resolve(exitCode ?? 1));
  });

  if (!collectCounts || tmpFile === null || code !== 0) {
    if (tmpFile !== null) {
      unlink(tmpFile).catch(() => undefined);
    }
    return { code, counts: null };
  }

  // Parse the JSON report to extract file and test counts.
  let counts: Cache | null = null;
  try {
    const raw = await readFile(tmpFile, 'utf-8');
    const report = JSON.parse(raw) as VitestJsonReport;
    if (typeof report.numTotalTests === 'number' && Array.isArray(report.testResults)) {
      counts = { fileCount: report.testResults.length, testCount: report.numTotalTests };
    } else {
      console.warn('vitest-unchanged: JSON report missing expected fields — counts not cached');
    }
  } catch (err) {
    console.warn(`vitest-unchanged: could not read/parse JSON report — counts not cached (${String(err)})`);
  }

  // Best-effort cleanup of the temp file.
  if (tmpFile !== null) {
    unlink(tmpFile).catch(() => undefined);
  }

  return { code, counts };
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

  // Run independent git commands concurrently
  const [lsFilesOutput, untrackedOutput, dirtyOutput] = await Promise.all([
    execGit(['ls-files', '-s', '--', cwd]),
    execGit(['ls-files', '-o', '--exclude-standard', '--', cwd]),
    execGit(['diff', '--name-only', '--', cwd])
  ]);

  const dirtyFiles = dirtyOutput
    .trim()
    .split('\n')
    .filter((f) => f !== '');

  const untrackedFiles = untrackedOutput
    .trim()
    .split('\n')
    .filter((f) => f !== '');

  let hashInput = lsFilesOutput;

  // Fold dirty tracked files into the hash (all extensions, not just .ts).
  // git diff --name-only returns paths relative to the repo root.
  if (dirtyFiles.length > 0) {
    const toplevel = (await execGit(['rev-parse', '--show-toplevel'])).trim();
    const statLines = await Promise.all(
      dirtyFiles.map(async (f) => {
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

  // Fold untracked files into the hash using path:size:mtimeMs lines.
  // git ls-files -o prints paths relative to cwd.
  if (untrackedFiles.length > 0) {
    const untrackedStatLines = await Promise.all(
      untrackedFiles.map(async (f) => {
        const filePath = join(cwd, f);
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
    hashInput += `\n${untrackedStatLines.join('\n')}`;
  }

  return createHash('sha256').update(hashInput).digest('hex');
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

async function writeCache(cache: Cache, contentHash: string, centralDir: string, startTime: Date): Promise<void> {
  const cachePath = join(centralDir, `${contentHash}.json`);

  await mkdir(centralDir, { recursive: true });

  // Atomic write: temp file then rename
  const tmpPath = join(centralDir, `.tmp-${randomUUID()}`);
  await writeFile(tmpPath, JSON.stringify(cache), 'utf-8');
  await rename(tmpPath, cachePath);

  // Update local sentinel with the pre-run content hash, mtime-anchored pre-run
  await writeSentinel(contentHash, centralDir, startTime);

  // Best-effort pruning: delete central cache entries older than 30 days.
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  let entries: string[];
  try {
    entries = await readdir(centralDir);
  } catch (error) {
    console.warn('vitest-unchanged: could not read cache directory for pruning.', error);
    return;
  }
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    const entryPath = join(centralDir, entry);
    try {
      const entryStat = await stat(entryPath);
      if (entryStat.mtimeMs < cutoff) {
        await unlink(entryPath);
      }
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(`vitest-unchanged: could not prune cache entry ${entry}`, error);
      }
    }
  }
}

/**
 * Read the local mtime sentinel. Returns parsed `{ hash, centralDir }` on
 * success, or `null` when the sentinel file is absent or contains invalid/
 * incomplete JSON. Unexpected I/O errors (other than ENOENT) are re-thrown.
 * @returns The parsed sentinel, or `null` when absent or malformed.
 */
async function readSentinel(): Promise<{ hash: string; centralDir: string } | null> {
  let raw: string;
  try {
    raw = await readFile(SENTINEL_FILE, 'utf-8');
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Malformed JSON — treat as a cache miss
    return null;
  }

  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'hash' in parsed &&
    'centralDir' in parsed &&
    typeof (parsed as { hash: unknown }).hash === 'string' &&
    typeof (parsed as { centralDir: unknown }).centralDir === 'string'
  ) {
    return parsed as { hash: string; centralDir: string };
  }

  // Incomplete or wrong shape (e.g. old bare-hash format) — cache miss
  return null;
}

/**
 * Write the local mtime sentinel as JSON `{ hash, centralDir }`.
 * Creates `SENTINEL_DIR` recursively if it does not exist.
 *
 * The sentinel's mtime is set to `referenceTime` — the moment the content
 * hash was computed, before the test run — so files modified while the suite
 * was running compare as newer than the sentinel and invalidate the fast path
 * (the hash describes pre-run content, so the mtime guard must too).
 * @param hash - Content hash to record.
 * @param centralDir - Central cache directory associated with the hash.
 * @param referenceTime - Pre-run timestamp to anchor the sentinel's mtime to.
 */
async function writeSentinel(hash: string, centralDir: string, referenceTime: Date): Promise<void> {
  await mkdir(SENTINEL_DIR, { recursive: true });
  await writeFile(SENTINEL_FILE, JSON.stringify({ hash, centralDir }), 'utf-8');
  await utimes(SENTINEL_FILE, referenceTime, referenceTime);
}

/** Directories whose contents should be excluded from the mtime walk. */
const EXCLUDED_DIR_NAMES = new Set(['node_modules', 'dist', 'out', 'build', 'coverage']);

/** How many concurrent stat calls to run during the mtime walk. */
const STAT_BATCH_SIZE = 32;

/**
 * Check whether a valid cache entry exists for the current content.
 *
 * Fast path: read the local sentinel (zero subprocesses). If present and no
 * local source file has an mtime >= the sentinel's mtime, look up the central
 * cache path recorded in the sentinel. Return it on a hit.
 *
 * Slow path (no sentinel, a newer file, or the central entry is missing):
 * call `getCentralCacheDir()` and `computeContentHash()` concurrently, then
 * check for the corresponding central cache file. The computed hash is always
 * returned so the caller can reuse it when writing the cache after the run.
 *
 * Self-heal: on a slow-path cache hit (e.g. fresh worktree, wiped node_modules,
 * or corrupt sentinel), the local sentinel is refreshed best-effort so that
 * the next run takes the fast path instead of paying the git subprocesses again.
 *
 * @returns A `CacheLookup` describing the result. `cachePath` is non-null on
 *   a hit. `contentHash` is non-null whenever `cachePath` is null (slow path).
 */
async function findValidCache(): Promise<CacheLookup> {
  const lookupStart = new Date();
  const cwd = process.cwd();
  const sentinel = await readSentinel();

  if (sentinel !== null) {
    // ── Fast path ────────────────────────────────────────────────────────────
    const sentinelStat = await stat(SENTINEL_FILE);
    const sentinelMtimeMs = sentinelStat.mtimeMs;

    // Collect all matching entries first, then stat in bounded concurrent batches.
    const entries: string[] = [];
    for await (const entry of glob('**/*.{ts,tsx,mts,cts,json,snap}', {
      cwd,
      exclude: (p) => EXCLUDED_DIR_NAMES.has(basename(p))
    })) {
      entries.push(entry);
    }

    let anyNewer = false;
    outer: for (let i = 0; i < entries.length; i += STAT_BATCH_SIZE) {
      const batch = entries.slice(i, i + STAT_BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (entry) => {
          try {
            const fileStat = await stat(join(cwd, entry));
            return fileStat.mtimeMs;
          } catch (error: unknown) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
              // File deleted between glob and stat — treat as changed (fail closed)
              return Infinity;
            }
            throw error;
          }
        })
      );
      for (const mtimeMs of results) {
        if (mtimeMs >= sentinelMtimeMs) {
          anyNewer = true;
          break outer;
        }
      }
    }

    if (!anyNewer) {
      const cachePath = join(sentinel.centralDir, `${sentinel.hash}.json`);
      try {
        await stat(cachePath);
        return { cachePath, contentHash: sentinel.hash, centralDir: sentinel.centralDir };
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
        // Central entry is gone — fall through to slow path
      }
    }
  }

  // ── Slow path ─────────────────────────────────────────────────────────────
  const [centralDir, contentHash] = await Promise.all([getCentralCacheDir(), computeContentHash()]);
  const cachePath = join(centralDir, `${contentHash}.json`);
  try {
    await stat(cachePath);
    // Slow-path hit: refresh the sentinel so subsequent runs take the fast path.
    try {
      await writeSentinel(contentHash, centralDir, lookupStart);
    } catch (error) {
      console.warn('vitest-unchanged: could not refresh sentinel.', error);
    }
    return { cachePath, contentHash, centralDir };
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
    return { cachePath: null, contentHash, centralDir };
  }
}

async function main(): Promise<void> {
  const startTime = new Date();
  const args = process.argv.slice(2);

  // Pass-through: when args are present, always run vitest directly (no cache).
  if (args.length > 0) {
    const { code } = await runVitest(args);
    process.exit(code);
  }

  // Pass-through: when DISABLE_TEST_CACHE is set, run vitest directly.
  if (process.env['DISABLE_TEST_CACHE'] === 'true') {
    const { code } = await runVitest([]);
    process.exit(code);
  }

  // Cache phase — fail-open: a cache-layer failure must never block tests.
  let lookup: CacheLookup | null = null;
  try {
    lookup = await findValidCache();
  } catch (error) {
    console.warn('vitest-unchanged: cache lookup failed; running tests.', error);
  }

  // Cache hit: print the saved summary and exit without running vitest.
  if (lookup?.cachePath != null) {
    const cache = await readCache(lookup.cachePath);
    if (cache != null) {
      const durationMs = Date.now() - startTime.getTime();
      console.log('No changed files. Cached results from previous run:');
      printSummary(cache, startTime, durationMs);
      process.exit(0);
    }
    // Corrupt cache entry — fall through to run vitest.
  }

  // Cache miss (or corrupt entry, or lookup failure): run the full suite.
  const { code, counts } = await runVitest([], { collectCounts: lookup !== null });

  if (code === 0 && lookup !== null && counts !== null) {
    // contentHash is guaranteed non-null when cachePath is null (CacheLookup contract).
    // On the corrupt-cache-entry path it is the sentinel hash, which is also non-null.
    const { contentHash, centralDir } = lookup;
    if (contentHash !== null) {
      try {
        await writeCache(counts, contentHash, centralDir, startTime);
      } catch (error) {
        console.warn('vitest-unchanged: failed to save cache.', error);
      }
    } else {
      console.warn('vitest-unchanged: contentHash is null; skipping cache write.');
    }
  }

  process.exit(code);
}

main().catch((error: unknown) => {
  console.error('vitest-unchanged: unexpected error', error);
  process.exit(1);
});
