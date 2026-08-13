#!/usr/bin/env -S node --disable-warning=ExperimentalWarning --experimental-transform-types
/**
 * Build freshness gate: skip a package's build command when its outputs are
 * provably at least as new as its inputs.
 *
 * Why: the sdk, default-configuration, git-hooks, and agent-hooks packages
 * rebuilt unconditionally on every `yarn validate`, costing tens of seconds
 * of repeated work. This gate proves freshness by mtime — every output file
 * must exist and be at least as new as the newest input file — and skips the
 * build only then. It is fail-closed: missing or empty outputs, missing or
 * empty input roots, any stat/read error, or any throw during the proof all
 * fall through to running the command, with the reason logged. Unlike a
 * content-hash cache, an mtime proof checks the actual on-disk output pair
 * the build produced rather than trusting a hash of the inputs.
 *
 * Usage:
 * ```sh
 * build-unchanged --input <dir|file> ... --output <dir|file> ... [--manifest <file>] -- <command...>
 * ```
 *
 * Paths resolve against the package root (process.cwd()). Roots are stat'ed,
 * so a root that is itself a symlink is followed and read. Below the root,
 * files reached through symlinks are included but directory symlinks are not
 * recursed (no cycles). Hidden files are included.
 *
 * Freshness: fresh iff min(output mtimes) >= max(input mtimes) (inclusive).
 * On a skip, one console.log line names the outputs and inputs. On a rebuild,
 * the command is spawned with `shell: true` and `stdio: 'inherit'`, and its
 * exit code is propagated; a null status (killed by signal) is a failure.
 * A malformed invocation (unknown flag, no command after `--`) logs an error
 * and exits 1 — a wiring typo must be loud, not a silent un-gated build.
 *
 * With `--manifest <file>`, the gate also keeps a depfile-style completion
 * record: after a successful build it writes the exact input and output file
 * sets there, and a skip additionally requires the manifest to exist and
 * both sets to match the current walk exactly. That is what lets the gate
 * see what an mtime walk alone cannot — a build that failed partway after
 * cleaning its outputs leaves no manifest (it is written only after the
 * command exits 0), and a source or output file deleted since the last
 * build changes its recorded set — so both force a rebuild instead of
 * blessing partial or stale outputs. The manifest belongs inside a
 * directory the build itself wipes on rebuild: the clean step is what
 * invalidates it when a build starts, making a stale manifest impossible.
 *
 * @summary Skip a build command when outputs are newer than inputs, fail-closed
 * @module test-utils/src/bin/build-unchanged
 */

import { spawnSync } from 'node:child_process';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * One file collected during a freshness walk: its path and mtime.
 */
export interface CollectedFile {
  /** Absolute path of the file. */
  path: string;
  /** Modification time in milliseconds since epoch. */
  mtimeMs: number;
}

/**
 * The roots whose files participate in a freshness comparison.
 * Both sets must resolve to at least one file each for a proof to be possible.
 */
export interface FreshnessInputs {
  /** Directory or file roots to collect input files from. */
  inputRoots: string[];
  /** Directory or file roots to collect output files from. */
  outputRoots: string[];
  /**
   * Absolute path of the completion manifest recording the previous build's
   * input/output file sets. When provided, a skip additionally requires the
   * manifest to exist and both recorded sets to match the current walk
   * exactly — that is what detects a build that failed partway (no manifest
   * was written) and files deleted since the last build (set mismatch).
   */
  manifestPath?: string;
}

/**
 * The outcome of a freshness proof.
 */
export interface FreshnessResult {
  /** True when every output file is at least as new as every input file. */
  fresh: boolean;
  /** Why the proof failed, or null when fresh. */
  reason: string | null;
}

/** Parsed argv: the input/output roots as given (package-relative) and the command to run. */
interface ParsedArgs {
  inputRoots: string[];
  outputRoots: string[];
  /** Manifest path as given (package-relative), or null when not requested. */
  manifestPath: string | null;
  command: string[];
}

/**
 * Describe an unknown thrown value for logging.
 *
 * @param error - The thrown value.
 * @returns A human-readable description of the error.
 */
function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Parse `--input <path> ... --output <path> ... -- <command...>`.
 * Throws with a usage reason on any malformed invocation: an unknown flag,
 * a flag missing its value, no `--` separator, an empty command, or no
 * input/output roots — a wiring typo must be loud, not a silent un-gated
 * build.
 *
 * @param args - The argv slice after the script name.
 * @returns The parsed roots and command.
 * @throws {Error} On any malformed invocation.
 */
function parseArgs(args: string[]): ParsedArgs {
  const inputRoots: string[] = [];
  const outputRoots: string[] = [];
  let manifestPath: string | null = null;
  let command: string[] | null = null;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === undefined) {
      continue; // unreachable; satisfies noUncheckedIndexedAccess
    }
    if (arg === '--') {
      command = args.slice(i + 1);
      break;
    }
    if (arg === '--input' || arg === '--output' || arg === '--manifest') {
      const value = args[i + 1];
      if (value === undefined || value === '--' || value.startsWith('--')) {
        throw new Error(`${arg} requires a path argument`);
      }
      if (arg === '--input') {
        inputRoots.push(value);
      } else if (arg === '--output') {
        outputRoots.push(value);
      } else {
        manifestPath = value;
      }
      i += 1;
      continue;
    }
    throw new Error(`unknown argument: ${arg}`);
  }
  if (command === null) {
    throw new Error('expected "--" followed by the build command');
  }
  if (command.length === 0) {
    throw new Error('no command given after "--"');
  }
  if (inputRoots.length === 0) {
    throw new Error('at least one --input root is required');
  }
  if (outputRoots.length === 0) {
    throw new Error('at least one --output root is required');
  }
  return { inputRoots, outputRoots, manifestPath, command };
}

/**
 * Recursively collect every file under the given roots.
 *
 * Roots are resolved via `stat`, so a root that is itself a symlink is
 * followed and read. Below the root, files reached through symlinks are
 * included, directory symlinks are not recursed, and hidden files are
 * included. Throws on any stat/read error — the caller must fail closed.
 *
 * @param roots - Absolute directory or file roots to collect from.
 * @returns Every collected file with its path and mtime.
 */
export async function collectFiles(roots: string[]): Promise<CollectedFile[]> {
  const files: CollectedFile[] = [];
  for (const root of roots) {
    const rootStat = await stat(root);
    if (rootStat.isDirectory()) {
      await walkDirectory(root, files);
    } else {
      files.push({ path: root, mtimeMs: rootStat.mtimeMs });
    }
  }
  return files;
}

/**
 * Recursively append every file under `root` to `files`.
 *
 * Directory entries walk depth-first. A symlinked entry is stat'ed to decide
 * its role: files reached through symlinks are included, directory symlinks
 * are not recursed (no cycles, and the shared `/workspace` trees are read
 * exactly once). Hidden files are included — unlike the retired step-9c
 * glob walk, which skipped dotfiles — so a hidden edit errs toward rebuild,
 * the fail-closed direction.
 *
 * @param root - The directory to walk.
 * @param files - The list to append found files to.
 */
async function walkDirectory(root: string, files: CollectedFile[]): Promise<void> {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      await walkDirectory(fullPath, files);
    } else if (entry.isFile()) {
      const fileStat = await stat(fullPath);
      files.push({ path: fullPath, mtimeMs: fileStat.mtimeMs });
    } else if (entry.isSymbolicLink()) {
      const targetStat = await stat(fullPath);
      if (targetStat.isFile()) {
        files.push({ path: fullPath, mtimeMs: targetStat.mtimeMs });
      }
    }
  }
}

/**
 * Decide whether every output file is at least as new as every input file.
 *
 * Fail-closed: missing or empty outputs, missing or empty inputs, any error
 * during collection, or (when a completion manifest is provided) a missing
 * or mismatched manifest all resolve to `fresh: false` with a reason
 * describing the failure, never to a skip.
 *
 * @param inputs - The input and output roots to compare.
 * @param cwd - The directory recorded paths are relative to.
 * @returns The freshness outcome, with a reason whenever not fresh.
 */
export async function isFresh(inputs: FreshnessInputs, cwd: string = process.cwd()): Promise<FreshnessResult> {
  const manifestPath = inputs.manifestPath;
  let inputFiles: CollectedFile[];
  let outputFiles: CollectedFile[];
  try {
    [inputFiles, outputFiles] = await Promise.all([collectFiles(inputs.inputRoots), collectFiles(inputs.outputRoots)]);
  } catch (error) {
    return { fresh: false, reason: `freshness proof failed: ${describeError(error)}` };
  }
  // The manifest is the gate's own record, not build output; it must not
  // participate in either set or in the mtime comparison.
  const isNotManifest = (file: CollectedFile): boolean => file.path !== manifestPath;
  inputFiles = inputFiles.filter(isNotManifest);
  outputFiles = outputFiles.filter(isNotManifest);
  if (inputFiles.length === 0) {
    return { fresh: false, reason: `no input files found under: ${inputs.inputRoots.join(', ')}` };
  }
  if (outputFiles.length === 0) {
    return { fresh: false, reason: `no output files found under: ${inputs.outputRoots.join(', ')}` };
  }
  if (manifestPath !== undefined) {
    const manifestResult = await checkManifest(manifestPath, inputFiles, outputFiles, cwd);
    if (!manifestResult.fresh) {
      return manifestResult;
    }
  }
  const newestInput = inputFiles.reduce((a, b) => (a.mtimeMs >= b.mtimeMs ? a : b));
  const oldestOutput = outputFiles.reduce((a, b) => (a.mtimeMs <= b.mtimeMs ? a : b));
  if (oldestOutput.mtimeMs < newestInput.mtimeMs) {
    return { fresh: false, reason: `${newestInput.path} is newer than ${oldestOutput.path}` };
  }
  return { fresh: true, reason: null };
}

/** The recorded input/output sets of one completed build. */
interface ManifestRecord {
  inputFiles: string[];
  outputFiles: string[];
}

/**
 * First difference between two path sets, or null when they are equal.
 * `current` is the walk's view of the disk, `recorded` is the manifest's.
 *
 * @param current - The currently collected paths, sorted.
 * @param recorded - The manifest's recorded paths, sorted.
 * @returns A description of the first difference, or null when equal.
 */
function setDiff(current: string[], recorded: string[]): string | null {
  if (current.length === recorded.length && current.every((path, i) => path === recorded[i])) {
    return null;
  }
  const recordedSet = new Set(recorded);
  const currentSet = new Set(current);
  for (const path of current) {
    if (!recordedSet.has(path)) {
      return `+ ${path} is not in the manifest`;
    }
  }
  for (const path of recorded) {
    if (!currentSet.has(path)) {
      return `- ${path} is missing on disk`;
    }
  }
  return 'sets differ'; // same length but different contents; only reachable with duplicates
}

/**
 * Compare the recorded input/output sets of the last completed build
 * against the current walk.
 *
 * A missing manifest means the previous build did not finish (or never
 * ran): the build scripts wipe the manifest directory as their first
 * step, and the gate rewrites the manifest only after a successful run,
 * so its absence is proof that no complete build exists to bless. A
 * recorded set that differs from the current walk detects deletions and
 * additions on either side — exactly what a pure mtime comparison cannot
 * see.
 *
 * @param manifestPath - Absolute path of the completion manifest.
 * @param inputFiles - Currently collected input files.
 * @param outputFiles - Currently collected output files.
 * @param cwd - The directory recorded paths are relative to.
 * @returns Fresh when the manifest exists, parses, and matches both sets.
 */
async function checkManifest(
  manifestPath: string,
  inputFiles: CollectedFile[],
  outputFiles: CollectedFile[],
  cwd: string
): Promise<FreshnessResult> {
  let record: ManifestRecord;
  try {
    record = JSON.parse(await readFile(manifestPath, 'utf8')) as ManifestRecord;
  } catch (error) {
    const errno = error as NodeJS.ErrnoException;
    if (errno.code === 'ENOENT') {
      return {
        fresh: false,
        reason: `completion manifest not found at ${manifestPath} — the previous build may not have completed`
      };
    }
    return { fresh: false, reason: `completion manifest unreadable at ${manifestPath}: ${describeError(error)}` };
  }
  if (!Array.isArray(record.inputFiles) || !Array.isArray(record.outputFiles)) {
    return { fresh: false, reason: `completion manifest malformed at ${manifestPath}` };
  }
  const relativePaths = (files: CollectedFile[]): string[] => files.map((file) => relative(cwd, file.path)).sort();
  const inputDiff = setDiff(relativePaths(inputFiles), [...record.inputFiles].sort());
  if (inputDiff !== null) {
    return { fresh: false, reason: `input set changed since the last completed build: ${inputDiff}` };
  }
  const outputDiff = setDiff(relativePaths(outputFiles), [...record.outputFiles].sort());
  if (outputDiff !== null) {
    return { fresh: false, reason: `output set changed since the last completed build: ${outputDiff}` };
  }
  return { fresh: true, reason: null };
}

/**
 * Write the completion manifest recording this build's input and output sets.
 * Called only after the build command exits 0, so a manifest on disk is proof
 * a complete build ran with exactly the recorded sets.
 *
 * @param manifestPath - Absolute path of the manifest to write.
 * @param inputRoots - The input roots to record files from.
 * @param outputRoots - The output roots to record files from.
 * @param cwd - The directory recorded paths are relative to.
 */
async function writeManifest(
  manifestPath: string,
  inputRoots: string[],
  outputRoots: string[],
  cwd: string
): Promise<void> {
  const [inputFiles, outputFiles] = await Promise.all([collectFiles(inputRoots), collectFiles(outputRoots)]);
  const record: ManifestRecord = {
    inputFiles: inputFiles.map((file) => relative(cwd, file.path)).sort(),
    outputFiles: outputFiles
      .filter((file) => file.path !== manifestPath)
      .map((file) => relative(cwd, file.path))
      .sort()
  };
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify(record, null, 2));
}

/**
 * Run the gate for the given argv against `cwd` (the package root) and
 * return the process exit code: 0 on a proven-fresh skip or a successful
 * command run, the command's exit code on a failed run, and 1 on a
 * malformed invocation or a command killed by a signal.
 *
 * @param args - The argv slice after the script name.
 * @param cwd - The package root to resolve paths against and run the command in.
 * @returns The process exit code.
 */
async function run(args: string[], cwd: string): Promise<number> {
  let parsed: ParsedArgs;
  try {
    parsed = parseArgs(args);
  } catch (error) {
    console.error(`build-unchanged: ${describeError(error)}`);
    console.error(
      'usage: build-unchanged --input <dir|file> ... --output <dir|file> ... [--manifest <file>] -- <command...>'
    );
    return 1;
  }

  const name = await packageName(cwd);
  const inputs: FreshnessInputs = {
    inputRoots: parsed.inputRoots.map((root) => resolve(cwd, root)),
    outputRoots: parsed.outputRoots.map((root) => resolve(cwd, root)),
    manifestPath: parsed.manifestPath === null ? undefined : resolve(cwd, parsed.manifestPath)
  };

  const result = await isFresh(inputs, cwd);
  if (result.fresh) {
    console.log(
      `build-unchanged [${name}]: outputs (${parsed.outputRoots.join(', ')}) are at least as new as inputs (${parsed.inputRoots.join(', ')}) — skipping build.`
    );
    return 0;
  }

  console.log(`build-unchanged [${name}]: ${result.reason ?? 'outputs not proven fresh'} — rebuilding.`);
  const commandLine = parsed.command.join(' ');
  // shell: true keeps `yarn` commands working on Windows the same way
  // scripts/validate.mjs spawns them; stdio: 'inherit' streams the build
  // output straight through.
  const child = spawnSync(commandLine, { cwd, shell: true, stdio: 'inherit' });
  if (child.error !== undefined) {
    console.error(`build-unchanged: could not spawn command "${commandLine}": ${child.error.message}`);
    return 1;
  }
  if (child.status === null) {
    console.error(`build-unchanged: command "${commandLine}" was killed by a signal.`);
    return 1;
  }
  if (child.status !== 0) {
    return child.status;
  }
  // The command completed. Record the build's exact input and output sets so
  // the next run can prove completion and detect deletions; a failure here
  // must fail the run, because without the record the next run would rebuild
  // every time (correct, but a silent slowdown the operator must see once).
  if (inputs.manifestPath !== undefined) {
    try {
      await writeManifest(inputs.manifestPath, inputs.inputRoots, inputs.outputRoots, cwd);
    } catch (error) {
      console.error(
        `build-unchanged: build succeeded but the completion manifest could not be written at ${inputs.manifestPath}: ${describeError(error)} — the next run will rebuild.`
      );
      return 1;
    }
  }
  return 0;
}

/**
 * Resolve the package name for log attribution: the `name` field of the
 * package.json in `cwd`, falling back to the directory name when the file
 * is absent (the gate may be used outside a package) and logging when a
 * present package.json is unreadable rather than silently mislabeling lines.
 *
 * @param cwd - The directory the gate runs from (the package root).
 * @returns The package name to attribute log lines to.
 */
async function packageName(cwd: string): Promise<string> {
  try {
    const pkg = JSON.parse(await readFile(join(cwd, 'package.json'), 'utf8')) as { name?: unknown };
    if (typeof pkg.name === 'string') {
      return pkg.name;
    }
    console.error(
      `build-unchanged: package.json in ${cwd} has no string "name" field; using directory name in log lines.`
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`build-unchanged: could not read package.json in ${cwd}: ${describeError(error)}`);
    }
  }
  return basename(cwd);
}

/**
 * Entry point: parse argv, run the freshness proof, and either skip or spawn
 * the build command. Sets the process exit code from the outcome.
 */
export async function main(): Promise<void> {
  process.exitCode = await run(process.argv.slice(2), process.cwd());
}

const isMainModule = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMainModule) {
  main().catch((error: unknown) => {
    console.error('build-unchanged: unexpected error', error);
    process.exitCode = 1;
  });
}
