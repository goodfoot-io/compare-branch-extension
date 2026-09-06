/**
 * Integration coverage for the compiled Codex hook bundles.
 *
 * The vitest suites elsewhere in this package exercise hook handler functions
 * directly, which can never catch a whole class of failures: defects that live
 * in the compiled `.mjs` artifacts produced by `scripts/build.mjs`. This suite
 * runs the real build end-to-end and executes every emitted Codex bundle as a
 * subprocess, asserting each one loads and runs cleanly under Node.
 *
 * Motivating bug (card main-613): `@goodfoot/agent-hooks/codex` compiles ESM bundles
 * without a `require` bridge, so any bundled CommonJS dependency that
 * `require()`s a Node builtin (e.g. `mime-types` requiring `path`) crashed the
 * hook at module load — before reading stdin or initializing logging — with
 * `Error: Dynamic require of "path" is not supported`.
 *
 * @summary Compiled Codex hook bundles must load and run cleanly
 */

import { type ChildProcessWithoutNullStreams, spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync
} from 'node:fs';
import * as net from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it, vi } from 'vitest';

const packageRoot = resolve(fileURLToPath(import.meta.url), '..', '..', '..');

/** Every directory the build emits compiled Codex hook bundles into. */
const CODEX_HOOK_OUTPUT_DIRS = [
  '../../codex/cards/hooks',
  '../../codex/cards-assistant/hooks',
  '../../codex/runtime/hooks'
].map((rel) => resolve(packageRoot, rel));

const tempHomes: string[] = [];

interface LinuxProcessIdentity {
  parentPid: number;
  processGroupId: number;
  sessionId: number;
  executable: string;
}

interface SupervisorFixture {
  process: ChildProcessWithoutNullStreams;
  helperPid: number;
  workPid: number | undefined;
  completion: Promise<{ code: number | null; stderr: string; stdout: string }>;
}

/**
 * Stops the supervisor through its cleanup trap, then kills known job groups
 * if the shell cannot exit within the bound.
 *
 * @param fixture - Supervisor and child process groups to terminate.
 * @throws When the supervisor cannot be reaped within the cleanup deadline.
 */
async function stopSupervisorFixture(fixture: SupervisorFixture): Promise<void> {
  if (fixture.process.exitCode !== null || fixture.process.signalCode !== null) return;
  fixture.process.kill('SIGTERM');

  let gracefulTimer: ReturnType<typeof setTimeout> | undefined;
  const stoppedGracefully = await Promise.race([
    fixture.completion.then(() => true),
    new Promise<boolean>((resolvePromise) => {
      gracefulTimer = setTimeout(() => resolvePromise(false), 1_000);
    })
  ]);
  if (gracefulTimer !== undefined) clearTimeout(gracefulTimer);
  if (stoppedGracefully) return;

  for (const pid of [fixture.workPid, fixture.helperPid]) {
    if (pid === undefined) continue;
    try {
      process.kill(-pid, 'SIGKILL');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
    }
  }
  fixture.process.kill('SIGKILL');

  let forcedTimer: ReturnType<typeof setTimeout> | undefined;
  const stoppedForcibly = await Promise.race([
    fixture.completion.then(() => true),
    new Promise<boolean>((resolvePromise) => {
      forcedTimer = setTimeout(() => resolvePromise(false), 1_000);
    })
  ]);
  if (forcedTimer !== undefined) clearTimeout(forcedTimer);
  if (!stoppedForcibly) throw new Error('Codex supervisor fixture cleanup timed out');
}

/**
 * Reads the lifecycle fields that make the Linux fixture trustworthy.
 *
 * @param pid - Process whose kernel-backed identity is required.
 * @returns Stable ownership, process-group, session, and executable evidence.
 * @throws When procfs cannot provide a complete, valid process identity.
 */
function readLinuxProcessIdentity(pid: number): LinuxProcessIdentity {
  const raw = readFileSync(`/proc/${pid}/stat`, 'utf8').trim();
  const closeParen = raw.lastIndexOf(')');
  if (closeParen < 0) throw new Error(`malformed /proc/${pid}/stat`);
  const fields = raw.slice(closeParen + 2).split(/\s+/);
  const parentPid = Number.parseInt(fields[1] ?? '', 10);
  const processGroupId = Number.parseInt(fields[2] ?? '', 10);
  const sessionId = Number.parseInt(fields[3] ?? '', 10);
  if (![parentPid, processGroupId, sessionId].every(Number.isSafeInteger)) {
    throw new Error(`invalid lifecycle identity for PID ${pid}`);
  }
  return { parentPid, processGroupId, sessionId, executable: readlinkSync(`/proc/${pid}/exe`) };
}

/**
 * Waits for a copied executable to replace the forked shell child.
 *
 * @param pid - Forked child PID.
 * @param executable - Exact executable path expected after exec.
 * @returns The verified Linux process identity.
 */
async function waitForExecutable(pid: number, executable: string): Promise<LinuxProcessIdentity> {
  const deadline = Date.now() + 2_000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const identity = readLinuxProcessIdentity(pid);
      if (identity.executable === executable) return identity;
      lastError = new Error(`PID ${pid} executable is ${identity.executable}, expected ${executable}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 10));
  }
  throw lastError instanceof Error ? lastError : new Error(`PID ${pid} did not exec ${executable}`);
}

/**
 * Starts the real hook below a copied Codex supervisor with bounded cleanup.
 *
 * Bash job control gives every background child its own process group while
 * retaining the supervisor's OS session. The supervisor pauses before the
 * hook until this test verifies the child identities through procfs.
 *
 * @param root - Disposable fixture directory.
 * @param bundle - Real emitted Stop-hook bundle.
 * @param hookInput - JSON hook input written to the bundle's stdin.
 * @param actionEnvironment - Real action subprocess environment.
 * @param helperPath - Long-lived helper executable to launch.
 * @param workPath - Optional genuine background-work executable.
 * @returns Running fixture after its topology has been verified.
 */
async function startSupervisorFixture(
  root: string,
  bundle: string,
  hookInput: string,
  actionEnvironment: Record<string, string>,
  helperPath: string,
  workPath?: string
): Promise<SupervisorFixture> {
  const agentPath = join(root, 'codex');
  copyFileSync('/bin/bash', agentPath);
  chmodSync(agentPath, 0o755);

  const script = String.raw`
set -euo pipefail
set -m
helper_pid=''
work_pid=''
cleanup() {
  if [[ -n "$work_pid" ]]; then kill -TERM -- "-$work_pid" 2>/dev/null || true; fi
  if [[ -n "$helper_pid" ]]; then kill -TERM -- "-$helper_pid" 2>/dev/null || true; fi
  if [[ -n "$work_pid" ]]; then wait "$work_pid" 2>/dev/null || true; fi
  if [[ -n "$helper_pid" ]]; then wait "$helper_pid" 2>/dev/null || true; fi
}
trap cleanup EXIT HUP INT TERM
"$1" 30 &
helper_pid=$!
if [[ -n "$2" ]]; then
  "$2" 30 &
  work_pid=$!
fi
printf 'READY %s %s\n' "$helper_pid" "$work_pid"
IFS= read -r command
[[ "$command" == 'GO' ]]
"$3" "$4" <<< "$5"
`;
  const child = spawn(
    agentPath,
    ['-c', script, 'codex-fixture', helperPath, workPath ?? '', process.execPath, bundle, hookInput],
    {
      cwd: root,
      env: actionEnvironment,
      stdio: ['pipe', 'pipe', 'pipe']
    }
  );
  if (child.pid === undefined) throw new Error('Codex supervisor did not receive a PID');

  let stdout = '';
  let stderr = '';
  let readyResolve: ((pids: { helperPid: number; workPid: number | undefined }) => void) | undefined;
  let readyReject: ((error: Error) => void) | undefined;
  const ready = new Promise<{ helperPid: number; workPid: number | undefined }>((resolvePromise, rejectPromise) => {
    readyResolve = resolvePromise;
    readyReject = rejectPromise;
  });
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
    const match = stdout.match(/^READY (\d+) ?(\d*)\n/);
    if (match) {
      readyResolve?.({
        helperPid: Number.parseInt(match[1] ?? '', 10),
        workPid: match[2] ? Number.parseInt(match[2], 10) : undefined
      });
      readyResolve = undefined;
    }
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });
  const completion = new Promise<{ code: number | null; stderr: string; stdout: string }>((resolvePromise) => {
    child.on('close', (code) => resolvePromise({ code, stderr, stdout }));
  });
  child.on('error', (error) => readyReject?.(error));

  const startupTimeout = setTimeout(
    () => readyReject?.(new Error('Codex supervisor fixture startup timed out')),
    2_000
  );
  let pids: { helperPid: number; workPid: number | undefined };
  try {
    pids = await ready;
  } catch (error) {
    child.kill('SIGTERM');
    let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
    const stopped = await Promise.race([
      completion.then(() => true),
      new Promise<boolean>((resolvePromise) => {
        cleanupTimer = setTimeout(() => resolvePromise(false), 1_000);
      })
    ]);
    if (cleanupTimer !== undefined) clearTimeout(cleanupTimer);
    if (!stopped) child.kill('SIGKILL');
    throw error;
  } finally {
    clearTimeout(startupTimeout);
  }

  const fixture = { process: child, helperPid: pids.helperPid, workPid: pids.workPid, completion };
  try {
    const agentIdentity = readLinuxProcessIdentity(child.pid);
    const helperIdentity = await waitForExecutable(pids.helperPid, helperPath);
    expect(helperIdentity).toMatchObject({
      parentPid: child.pid,
      processGroupId: pids.helperPid,
      sessionId: agentIdentity.sessionId
    });
    if (workPath !== undefined) {
      if (pids.workPid === undefined) throw new Error('background work PID was not reported');
      const workIdentity = await waitForExecutable(pids.workPid, workPath);
      expect(workIdentity).toMatchObject({
        parentPid: child.pid,
        processGroupId: pids.workPid,
        sessionId: agentIdentity.sessionId
      });
    }
  } catch (error) {
    await stopSupervisorFixture(fixture);
    throw error;
  }

  child.stdin.end('GO\n');
  return fixture;
}

/**
 * Isolated environment for spawned bundles: no Cards action variables (the
 * handlers take their no-action early paths) and a disposable HOME, so a hook
 * can never touch real card state. Hook logging goes to the null device.
 *
 * @returns A minimal environment safe for spawning any compiled hook bundle.
 */
function isolatedHookEnvironment(): Record<string, string> {
  const home = mkdtempSync(join(tmpdir(), 'cards-hook-bundle-'));
  tempHomes.push(home);
  return { HOME: home, CODEX_HOOKS_LOG_FILE: '/dev/null' };
}

/**
 * Runs one installed Stop-hook drain scenario through real marker and socket IO.
 *
 * @param helperPlacement - Whether the helper executable is adjacent to Codex.
 * @param includeBackgroundWork - Whether another verified-owned process remains.
 * @returns Messages observed by the action socket and the durable marker state.
 */
async function runStopDrainScenario(
  helperPlacement: 'adjacent' | 'non-adjacent',
  includeBackgroundWork: boolean
): Promise<{ markerPresent: boolean; received: Array<{ requestId: string; type: string }> }> {
  const root = mkdtempSync(join(tmpdir(), 'cards-codex-stop-drain-'));
  tempHomes.push(root);
  const scenarioName = `${helperPlacement}-${includeBackgroundWork ? 'busy' : 'idle'}`;
  const sessionId = `session-${scenarioName}-${randomUUID()}`;
  const requestId = `request-${scenarioName}`;
  const socketPath = join(root, 'action.sock');
  const bundle = resolve(packageRoot, '../../codex/runtime/hooks/stop-exit-when-done.mjs');
  const helperDirectory = helperPlacement === 'adjacent' ? root : join(root, 'unverified');
  mkdirSync(helperDirectory, { recursive: true });
  const helperPath = join(helperDirectory, 'codex-code-mode-host');
  copyFileSync('/bin/sleep', helperPath);
  chmodSync(helperPath, 0o755);
  const workPath = includeBackgroundWork ? join(root, 'background-work') : undefined;
  if (workPath !== undefined) {
    copyFileSync('/bin/sleep', workPath);
    chmodSync(workPath, 0o755);
  }

  const received: Array<{ requestId: string; type: string }> = [];
  const server = net.createServer((socket) => {
    let buffer = '';
    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.length > 0) received.push(JSON.parse(line));
      }
    });
  });
  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise);
    server.listen(socketPath, resolvePromise);
  });

  const originalHome = process.env['HOME'];
  process.env['HOME'] = root;
  let shutdownConfig: typeof import('@cards.management/sdk/config') | undefined;
  let fixture: SupervisorFixture | undefined;
  try {
    vi.resetModules();
    shutdownConfig = await import('@cards.management/sdk/config');
    shutdownConfig.writePendingShutdownRequest(sessionId, { version: 1, requestId, socketPath });
    const inheritedEnvironment = Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
    );
    fixture = await startSupervisorFixture(
      root,
      bundle,
      JSON.stringify({ session_id: sessionId }),
      {
        ...inheritedEnvironment,
        ACTION_NAME: 'Launch Cards',
        CARD_ID: 'main-651-2',
        CARD_REPO_PATH: root,
        CODEX_HOOKS_LOG_FILE: join(root, 'hook.log'),
        CONFIG_PATH: root,
        ENVIRONMENT: 'default',
        EXECUTION_MODE: 'interactive',
        EXIT_WHEN_DONE: 'true',
        EXTENSION_PATH: root,
        HOME: root,
        MARKETPLACE_PATH: root,
        REPO_ROOT: root
      },
      helperPath,
      workPath
    );

    let completionTimer: ReturnType<typeof setTimeout> | undefined;
    const completion = await Promise.race([
      fixture.completion,
      new Promise<never>((_resolvePromise, rejectPromise) => {
        completionTimer = setTimeout(
          () => rejectPromise(new Error('installed Stop hook did not exit within 15 seconds')),
          15_000
        );
      })
    ]).finally(() => {
      if (completionTimer !== undefined) clearTimeout(completionTimer);
    });
    expect(completion.code, completion.stderr).toBe(0);

    const expectsAcknowledgement = helperPlacement === 'adjacent' && !includeBackgroundWork;
    const messageDeadline = Date.now() + (expectsAcknowledgement ? 2_000 : 250);
    while (received.length === 0 && Date.now() < messageDeadline) {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 10));
    }
    const markerPresent = shutdownConfig.readPendingShutdownRequest(sessionId) !== undefined;
    if (helperPlacement === 'adjacent' && !includeBackgroundWork && received.length === 0) {
      const hookLog = existsSync(join(root, 'hook.log'))
        ? readFileSync(join(root, 'hook.log'), 'utf8')
        : '(no hook log)';
      throw new Error(
        `verified-helper scenario did not acknowledge; markerPresent=${markerPresent}; stdout=${completion.stdout}; stderr=${completion.stderr}; hookLog=${hookLog}`
      );
    }
    return { markerPresent, received };
  } finally {
    try {
      if (fixture !== undefined) await stopSupervisorFixture(fixture);
      await new Promise<void>((resolvePromise) => server.close(() => resolvePromise()));
      shutdownConfig?.clearPendingShutdownRequest(sessionId, requestId);
    } finally {
      if (originalHome === undefined) delete process.env['HOME'];
      else process.env['HOME'] = originalHome;
      vi.resetModules();
    }
  }
}

describe('compiled Codex hook bundles', () => {
  afterAll(() => {
    for (const home of tempHomes) {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('every emitted bundle loads without a dynamic require failure', () => {
    const bundles = CODEX_HOOK_OUTPUT_DIRS.flatMap((dir) =>
      readdirSync(dir)
        .filter((name) => name.endsWith('.mjs'))
        .map((name) => join(dir, name))
    );
    expect(bundles.length).toBeGreaterThan(0);

    const failures: string[] = [];
    for (const bundle of bundles) {
      const result = spawnSync(process.execPath, [bundle], {
        input: '{}\n',
        encoding: 'utf8',
        env: isolatedHookEnvironment(),
        timeout: 15_000
      });
      if (/Dynamic require of/.test(result.stderr ?? '')) {
        failures.push(`${bundle}: ${result.stderr?.split('\n').slice(0, 4).join('\n')}`);
      }
    }

    expect(failures, `${failures.length} bundle(s) crashed at load:\n${failures.join('\n\n')}`).toEqual([]);
  });

  it('runs the codex runtime SessionStart hook successfully', () => {
    const sessionStart = resolve(packageRoot, '../../codex/runtime/hooks/session-start.mjs');
    const result = spawnSync(process.execPath, [sessionStart], {
      input: '{}\n',
      encoding: 'utf8',
      env: isolatedHookEnvironment(),
      timeout: 15_000
    });

    expect(result.stderr ?? '').not.toMatch(/Dynamic require of/);
    expect(result.status).toBe(0);

    // Handler-level suites assert the payload shape; here parseable JSON on
    // stdout with a clean exit IS the contract — the artifact ran to
    // completion instead of dying during module load.
    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });

  describe.runIf(process.platform === 'linux').sequential('installed Stop hook strict drain integration', () => {
    it('acknowledges the correlated request and clears its marker with only a verified persistent helper', async () => {
      const result = await runStopDrainScenario('adjacent', false);

      expect(result.received).toEqual([{ type: 'shutdownReady', requestId: 'request-adjacent-idle' }]);
      expect(result.markerPresent).toBe(false);
    });

    it('retains the marker without acknowledgement while genuine background work remains', async () => {
      const result = await runStopDrainScenario('adjacent', true);

      expect(result.received).toEqual([]);
      expect(result.markerPresent).toBe(true);
    });

    it('retains the marker when a helper-named process lacks adjacent executable proof', async () => {
      const result = await runStopDrainScenario('non-adjacent', false);

      expect(result.received).toEqual([]);
      expect(result.markerPresent).toBe(true);
    });
  });
});
