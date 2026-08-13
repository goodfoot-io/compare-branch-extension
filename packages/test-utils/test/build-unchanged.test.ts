/**
 * Tests for the build-unchanged freshness gate.
 *
 * Why: the gate must never skip a build it cannot prove fresh — missing or
 * empty outputs, missing or empty inputs, or any error must fall through to
 * running the command — and its file walk must handle the workspace's real
 * shapes (symlinked roots, nested directory symlinks, hidden files).
 *
 * Behavior: runs against real files in per-test mkdtemp directories under
 * os.tmpdir(), with mtimes set explicitly via utimes so freshness
 * comparisons are deterministic. Command-runner cases spawn the real bin
 * (node --experimental-transform-types) so argv parsing and exit-code
 * propagation are exercised end to end.
 *
 *
 * @summary Tests for the build-unchanged freshness gate
 * @module test-utils/test/build-unchanged.test
 */
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { collectFiles, isFresh } from '../src/bin/build-unchanged.js';

/** Absolute path of the bin under test, run as `node --experimental-transform-types`. */
const BIN_PATH = fileURLToPath(new URL('../src/bin/build-unchanged.ts', import.meta.url));

/** Directories created by tests, removed after each test. */
const tmpDirs: string[] = [];

async function makeTmpDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'build-unchanged-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tmpDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

/**
 * Write a file and pin its mtime so comparisons are deterministic.
 *
 * @param path - Absolute path of the file to write.
 * @param mtimeMs - The mtime to pin, in milliseconds since epoch.
 * @param content - The file contents.
 */
async function writeFileAt(path: string, mtimeMs: number, content = 'x'): Promise<void> {
  await writeFile(path, content);
  await utimes(path, new Date(mtimeMs), new Date(mtimeMs));
}

/**
 * Spawn the real bin and capture its output and exit status.
 *
 * @param cwd - The working directory to run the bin in.
 * @param args - The argv slice to pass to the bin.
 * @returns The bin's exit status and captured stdout/stderr.
 */
function runBin(cwd: string, args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(
    process.execPath,
    ['--disable-warning=ExperimentalWarning', '--experimental-transform-types', BIN_PATH, ...args],
    { cwd, encoding: 'utf-8' }
  );
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

/** A command that proves it ran by writing a marker file in the cwd. */
const MARKER_COMMAND = "node -e \"require('node:fs').writeFileSync('marker.txt','x')\"";

describe('build-unchanged', () => {
  describe('collectFiles()', () => {
    it('walks a symlinked output root (the real dist → /workspace shape)', async () => {
      const dir = await makeTmpDir();
      const realDir = join(dir, 'real-output');
      const linkPath = join(dir, 'output-link');
      await mkdir(realDir);
      await writeFileAt(join(realDir, 'out.txt'), 2000);
      await symlink(realDir, linkPath);

      const files = await collectFiles([linkPath]);

      expect(files.map((file) => file.path)).toContain(join(linkPath, 'out.txt'));
      expect(files.find((file) => file.path === join(linkPath, 'out.txt'))?.mtimeMs).toBe(2000);
    });

    it('does not recurse a nested directory symlink but includes a file symlink', async () => {
      const dir = await makeTmpDir();
      const root = join(dir, 'root');
      const outside = join(dir, 'outside');
      await mkdir(root);
      await mkdir(outside);
      await writeFileAt(join(root, 'a.txt'), 1000);
      await writeFileAt(join(outside, 'secret.txt'), 3000);
      await symlink(outside, join(root, 'linkdir'));
      await symlink(join(outside, 'secret.txt'), join(root, 'linkfile'));

      const files = await collectFiles([root]);
      const paths = files.map((file) => file.path);

      // Files reached through a symlink are included...
      expect(paths).toContain(join(root, 'linkfile'));
      // ...but directory symlinks are not recursed (no cycles, shared trees read once).
      expect(paths).not.toContain(join(root, 'linkdir', 'secret.txt'));
      expect(paths).toContain(join(root, 'a.txt'));
    });

    it('includes hidden files', async () => {
      const dir = await makeTmpDir();
      const root = join(dir, 'src');
      await mkdir(root);
      await writeFileAt(join(root, '.hidden.ts'), 3000);

      const files = await collectFiles([root]);

      expect(files.map((file) => file.path)).toContain(join(root, '.hidden.ts'));
    });

    it('collects a file-shaped root directly', async () => {
      const dir = await makeTmpDir();
      const inputFile = join(dir, 'settings.config.ts');
      await writeFileAt(inputFile, 1000);

      const files = await collectFiles([inputFile]);

      expect(files).toEqual([{ path: inputFile, mtimeMs: 1000 }]);
    });
  });

  describe('isFresh()', () => {
    it('skips when outputs are newer than inputs (fresh → skip)', async () => {
      const dir = await makeTmpDir();
      const inputDir = join(dir, 'src');
      const outputDir = join(dir, 'out');
      await mkdir(inputDir);
      await mkdir(outputDir);
      await writeFileAt(join(inputDir, 'a.ts'), 1000);
      await writeFileAt(join(outputDir, 'a.js'), 2000);

      const result = await isFresh({ inputRoots: [inputDir], outputRoots: [outputDir] });

      expect(result).toEqual({ fresh: true, reason: null });
    });

    it('rebuilds when any input is newer than any output (newer input → rebuild)', async () => {
      const dir = await makeTmpDir();
      const inputDir = join(dir, 'src');
      const outputDir = join(dir, 'out');
      await mkdir(inputDir);
      await mkdir(outputDir);
      await writeFileAt(join(inputDir, 'a.ts'), 3000);
      await writeFileAt(join(outputDir, 'a.js'), 2000);

      const result = await isFresh({ inputRoots: [inputDir], outputRoots: [outputDir] });

      expect(result.fresh).toBe(false);
      expect(result.reason).not.toBeNull();
    });

    it('skips on equal mtimes (inclusive comparison)', async () => {
      const dir = await makeTmpDir();
      const inputDir = join(dir, 'src');
      const outputDir = join(dir, 'out');
      await mkdir(inputDir);
      await mkdir(outputDir);
      await writeFileAt(join(inputDir, 'a.ts'), 2000);
      await writeFileAt(join(outputDir, 'a.js'), 2000);

      const result = await isFresh({ inputRoots: [inputDir], outputRoots: [outputDir] });

      expect(result.fresh).toBe(true);
    });

    it('rebuilds when an output file is missing', async () => {
      const dir = await makeTmpDir();
      const inputDir = join(dir, 'src');
      await mkdir(inputDir);
      await writeFileAt(join(inputDir, 'a.ts'), 1000);

      const result = await isFresh({
        inputRoots: [inputDir],
        outputRoots: [join(dir, 'missing.json')]
      });

      expect(result.fresh).toBe(false);
      expect(result.reason).toContain('missing.json');
    });

    it('rebuilds when an output directory is missing', async () => {
      const dir = await makeTmpDir();
      const inputDir = join(dir, 'src');
      await mkdir(inputDir);
      await writeFileAt(join(inputDir, 'a.ts'), 1000);

      const result = await isFresh({
        inputRoots: [inputDir],
        outputRoots: [join(dir, 'missing-out')]
      });

      expect(result.fresh).toBe(false);
      expect(result.reason).toContain('missing-out');
    });

    it('rebuilds when the input root is empty', async () => {
      const dir = await makeTmpDir();
      const inputDir = join(dir, 'empty-src');
      const outputDir = join(dir, 'out');
      await mkdir(inputDir);
      await mkdir(outputDir);
      await writeFileAt(join(outputDir, 'a.js'), 2000);

      const result = await isFresh({ inputRoots: [inputDir], outputRoots: [outputDir] });

      expect(result.fresh).toBe(false);
      expect(result.reason).toContain('empty-src');
    });

    it('rebuilds when the output root is empty', async () => {
      const dir = await makeTmpDir();
      const inputDir = join(dir, 'src');
      const outputDir = join(dir, 'empty-out');
      await mkdir(inputDir);
      await mkdir(outputDir);
      await writeFileAt(join(inputDir, 'a.ts'), 1000);

      const result = await isFresh({ inputRoots: [inputDir], outputRoots: [outputDir] });

      expect(result.fresh).toBe(false);
      expect(result.reason).toContain('empty-out');
    });

    it('rebuilds on a stat error (fail closed)', async () => {
      const dir = await makeTmpDir();
      const inputDir = join(dir, 'src');
      await mkdir(inputDir);
      await writeFileAt(join(inputDir, 'a.ts'), 1000);
      // A regular file used as a directory component makes stat throw ENOTDIR.
      const fileShaped = join(dir, 'plain-file.txt');
      await writeFileAt(fileShaped, 2000);

      const result = await isFresh({
        inputRoots: [inputDir],
        outputRoots: [join(fileShaped, 'child')]
      });

      expect(result.fresh).toBe(false);
      expect(result.reason).toContain('plain-file.txt');
    });

    it('compares file-shaped inputs and outputs directly', async () => {
      const dir = await makeTmpDir();
      const inputFile = join(dir, 'settings.config.ts');
      const outputFile = join(dir, 'settings.json');
      await writeFileAt(inputFile, 1000);
      await writeFileAt(outputFile, 2000);

      const result = await isFresh({ inputRoots: [inputFile], outputRoots: [outputFile] });

      expect(result.fresh).toBe(true);
    });

    it('counts a hidden input file toward freshness (errs toward rebuild)', async () => {
      const dir = await makeTmpDir();
      const inputDir = join(dir, 'src');
      const outputDir = join(dir, 'out');
      await mkdir(inputDir);
      await mkdir(outputDir);
      await writeFileAt(join(inputDir, '.hidden.ts'), 3000);
      await writeFileAt(join(outputDir, 'a.js'), 2000);

      const result = await isFresh({ inputRoots: [inputDir], outputRoots: [outputDir] });

      expect(result.fresh).toBe(false);
    });
  });

  describe('command runner', () => {
    it('skips without running the command when fresh, logging one skip line', async () => {
      const dir = await makeTmpDir();
      const inputDir = join(dir, 'src');
      const outputDir = join(dir, 'out');
      await mkdir(inputDir);
      await mkdir(outputDir);
      await writeFileAt(join(inputDir, 'a.ts'), 1000);
      await writeFileAt(join(outputDir, 'a.js'), 2000);

      const { status, stdout } = runBin(dir, ['--input', inputDir, '--output', outputDir, '--', MARKER_COMMAND]);

      expect(status).toBe(0);
      expect(stdout).toContain('skipping build');
      expect(stdout).toContain(outputDir);
      expect(stdout).toContain(inputDir);
      await expect(rm(join(dir, 'marker.txt'))).rejects.toThrow();
    });

    it('runs the command and exits 0 when inputs are newer', async () => {
      const dir = await makeTmpDir();
      const inputDir = join(dir, 'src');
      const outputDir = join(dir, 'out');
      await mkdir(inputDir);
      await mkdir(outputDir);
      await writeFileAt(join(inputDir, 'a.ts'), 3000);
      await writeFileAt(join(outputDir, 'a.js'), 2000);

      const { status, stdout } = runBin(dir, ['--input', inputDir, '--output', outputDir, '--', MARKER_COMMAND]);

      expect(status).toBe(0);
      expect(stdout).toContain('rebuilding');
      await expect(rm(join(dir, 'marker.txt'))).resolves.toBeUndefined();
    });

    it('propagates a non-zero command exit', async () => {
      const dir = await makeTmpDir();
      const inputDir = join(dir, 'src');
      const outputDir = join(dir, 'out');
      await mkdir(inputDir);
      await mkdir(outputDir);
      await writeFileAt(join(inputDir, 'a.ts'), 3000);
      await writeFileAt(join(outputDir, 'a.js'), 2000);

      const { status } = runBin(dir, ['--input', inputDir, '--output', outputDir, '--', 'node -e "process.exit(7)"']);

      expect(status).toBe(7);
    });

    it('treats a command killed by a signal (status: null) as failure', async () => {
      const dir = await makeTmpDir();
      const inputDir = join(dir, 'src');
      const outputDir = join(dir, 'out');
      await mkdir(inputDir);
      await mkdir(outputDir);
      await writeFileAt(join(inputDir, 'a.ts'), 3000);
      await writeFileAt(join(outputDir, 'a.js'), 2000);

      const { status } = runBin(dir, ['--input', inputDir, '--output', outputDir, '--', 'kill -9 $$']);

      expect(status).toBe(1);
    });

    it('exits 1 on an unknown flag', async () => {
      const dir = await makeTmpDir();

      const { status, stderr } = runBin(dir, ['--bogus']);

      expect(status).toBe(1);
      expect(stderr).toContain('--bogus');
    });

    it('exits 1 when no command follows "--"', async () => {
      const dir = await makeTmpDir();
      const inputDir = join(dir, 'src');
      await mkdir(inputDir);
      await writeFileAt(join(inputDir, 'a.ts'), 1000);

      const { status, stderr } = runBin(dir, ['--input', inputDir, '--output', join(dir, 'out'), '--']);

      expect(status).toBe(1);
      expect(stderr).toContain('command');
    });
  });
});
