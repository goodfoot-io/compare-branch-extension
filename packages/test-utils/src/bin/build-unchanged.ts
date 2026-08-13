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
 * content-hash cache, an mtime proof checks the actual on-disk output pair,
 * which is what makes it correct for the shared `/workspace` symlink trees
 * these packages build into.
 *
 * Usage:
 * ```sh
 * build-unchanged --input <dir|file> ... --output <dir|file> ... -- <command...>
 * ```
 *
 * Paths resolve against the package root (process.cwd()). Roots are stat'ed,
 * so a root that is itself a symlink (all four dist trees and the hooks dirs
 * are) is followed and read. Below the root, files reached through symlinks
 * are included but directory symlinks are not recursed (no cycles, and the
 * shared trees are read exactly once). Hidden files are included.
 *
 * Freshness: fresh iff min(output mtimes) >= max(input mtimes) (inclusive).
 * On a skip, one console.log line names the outputs and inputs. On a rebuild,
 * the command is spawned with `shell: true` and `stdio: 'inherit'`, and its
 * exit code is propagated; a null status (killed by signal) is a failure.
 * A malformed invocation (unknown flag, no command after `--`) logs an error
 * and exits 1 — a wiring typo must be loud, not a silent un-gated build.
 *
 * @summary Skip a build command when outputs are newer than inputs, fail-closed
 * @module test-utils/src/bin/build-unchanged
 */

import { spawnSync } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
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
    if (arg === '--input' || arg === '--output') {
      const value = args[i + 1];
      if (value === undefined || value === '--' || value.startsWith('--')) {
        throw new Error(`${arg} requires a path argument`);
      }
      (arg === '--input' ? inputRoots : outputRoots).push(value);
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
  return { inputRoots, outputRoots, command };
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
 * Fail-closed: missing or empty outputs, missing or empty inputs, or any
 * error during collection resolve to `fresh: false` with a reason describing
 * the failure, never to a skip.
 *
 * @param inputs - The input and output roots to compare.
 * @returns The freshness outcome, with a reason whenever not fresh.
 */
export async function isFresh(inputs: FreshnessInputs): Promise<FreshnessResult> {
  let inputFiles: CollectedFile[];
  let outputFiles: CollectedFile[];
  try {
    [inputFiles, outputFiles] = await Promise.all([collectFiles(inputs.inputRoots), collectFiles(inputs.outputRoots)]);
  } catch (error) {
    return { fresh: false, reason: `freshness proof failed: ${describeError(error)}` };
  }
  if (inputFiles.length === 0) {
    return { fresh: false, reason: `no input files found under: ${inputs.inputRoots.join(', ')}` };
  }
  if (outputFiles.length === 0) {
    return { fresh: false, reason: `no output files found under: ${inputs.outputRoots.join(', ')}` };
  }
  const newestInput = inputFiles.reduce((a, b) => (a.mtimeMs >= b.mtimeMs ? a : b));
  const oldestOutput = outputFiles.reduce((a, b) => (a.mtimeMs <= b.mtimeMs ? a : b));
  if (oldestOutput.mtimeMs < newestInput.mtimeMs) {
    return { fresh: false, reason: `${newestInput.path} is newer than ${oldestOutput.path}` };
  }
  return { fresh: true, reason: null };
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
    console.error('usage: build-unchanged --input <dir|file> ... --output <dir|file> ... -- <command...>');
    return 1;
  }

  const inputs: FreshnessInputs = {
    inputRoots: parsed.inputRoots.map((root) => resolve(cwd, root)),
    outputRoots: parsed.outputRoots.map((root) => resolve(cwd, root))
  };

  const result = await isFresh(inputs);
  if (result.fresh) {
    console.log(
      `build-unchanged: outputs (${parsed.outputRoots.join(', ')}) are at least as new as inputs (${parsed.inputRoots.join(', ')}) — skipping build.`
    );
    return 0;
  }

  console.log(`build-unchanged: ${result.reason ?? 'outputs not proven fresh'} — rebuilding.`);
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
  return child.status;
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
