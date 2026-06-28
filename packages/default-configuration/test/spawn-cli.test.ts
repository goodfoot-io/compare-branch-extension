import type { ChildProcess } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnAgentCli } from '../src/lib/spawn-cli.js';

/**
 * Tests for the cross-platform agent-CLI launcher.
 *
 * These exercise REAL spawn behavior (no `node:child_process` mock): a fake CLI
 * is written to a temp dir as both an extension-less POSIX shim and a `.cmd`
 * sibling that echoes its received argv as JSON, and the temp dir is prepended
 * to PATH. The win32 case proves the core fix — a bare CLI name resolves to its
 * PATHEXT `.cmd` shim (a bare `spawn('name')` would ENOENT and `spawn('name.cmd')`
 * without a shell would EINVAL), AND complex arguments containing cmd.exe
 * metacharacters and embedded quotes (the `--settings` JSON) survive intact
 * rather than being mangled by an unquoted `shell: true` concatenation. The POSIX
 * case proves the bare name is spawned directly with argv preserved verbatim.
 *
 * @summary Tests for spawnAgentCli cross-platform behavior
 */

const FAKE_CLI = 'cardsfakecli';
const isWin = process.platform === 'win32';

let tmpDir: string;
let savedPath: string | undefined;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'spawn-cli-test-'));

  // Echo received argv (everything after the script itself) as a single JSON line.
  const echoScript = `console.log(JSON.stringify(process.argv.slice(1)))`;

  // Windows launcher: a .cmd shim that forwards all args to node -e via `%*`.
  // The `--` terminator stops node from interpreting forwarded `--flag` tokens as
  // its own options (the fake CLI must echo them as argv, like the real agent).
  await fs.writeFile(path.join(tmpDir, `${FAKE_CLI}.cmd`), `@echo off\r\nnode -e "${echoScript}" -- %*\r\n`, 'utf-8');

  // POSIX shim: extension-less script that forwards "$@" to node -e.
  const posixShim = path.join(tmpDir, FAKE_CLI);
  await fs.writeFile(posixShim, `#!/bin/sh\nexec node -e '${echoScript}' -- "$@"\n`, 'utf-8');
  if (!isWin) {
    await fs.chmod(posixShim, 0o755);
  }

  savedPath = process.env['PATH'];
  process.env['PATH'] = `${tmpDir}${path.delimiter}${savedPath ?? ''}`;
});

afterEach(async () => {
  if (savedPath !== undefined) process.env['PATH'] = savedPath;
  else delete process.env['PATH'];
  await fs.rm(tmpDir, { recursive: true, force: true });
});

/**
 * Runs the fake CLI through spawnAgentCli, capturing the JSON argv it printed.
 *
 * @param args - Arguments to forward to the fake CLI.
 * @returns The argv array the child actually received.
 */
async function runAndCaptureArgv(args: string[]): Promise<string[]> {
  const child: ChildProcess = spawnAgentCli(FAKE_CLI, args, {
    cwd: tmpDir,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (chunk: Buffer) => {
    stdout += chunk.toString();
  });
  child.stderr?.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });
  const code = await new Promise<number | null>((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });
  if (code !== 0) {
    throw new Error(`fake CLI exited ${code}: ${stderr}`);
  }
  const line = stdout.trim().split(/\r?\n/).pop() ?? '';
  return JSON.parse(line) as string[];
}

describe('spawnAgentCli', () => {
  it.skipIf(!isWin)('resolves a bare CLI name to its PATHEXT .cmd shim and forwards argv (win32)', async () => {
    // A bare spawn('cardsfakecli') would ENOENT (no PATHEXT lookup) and
    // spawn('cardsfakecli.cmd') without a shell would EINVAL; routing through the
    // shell on win32 is what makes the shim runnable.
    const argv = await runAndCaptureArgv(['interview', '--print']);
    expect(argv).toEqual(['interview', '--print']);
  });

  it.skipIf(!isWin)('delivers a --settings JSON argument intact through the .cmd shim (win32)', async () => {
    // The regression this guards: under `shell: true` Node concatenates args
    // unquoted, so cmd.exe mangles the embedded quotes/braces of the settings
    // JSON and the agent rejects it ("Invalid JSON") before its session starts.
    // cross-spawn escapes each arg correctly, so it round-trips byte-for-byte.
    const settings = JSON.stringify({
      enabledPlugins: { 'runtime@cards.cards': true },
      extraKnownMarketplaces: { 'cards.management': { source: { source: 'directory', path: 'C:\\some path\\mp' } } }
    });
    const argv = await runAndCaptureArgv(['--print', '--settings', settings, 'say ok']);
    expect(argv).toEqual(['--print', '--settings', settings, 'say ok']);
  });

  it.skipIf(isWin)('spawns the bare extensionless CLI directly and preserves argv verbatim (posix)', async () => {
    const hostilePrompt = 'fix bug & echo OWNED; touch pwned';
    const argv = await runAndCaptureArgv([hostilePrompt, '--flag', 'a b c']);
    expect(argv[0]).toBe(hostilePrompt);
    expect(argv).toContain('--flag');
    expect(argv).toContain('a b c');
  });
});
